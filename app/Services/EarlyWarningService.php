<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsMaterial;
use App\Models\LmsReflection;
use App\Models\LmsSubmission;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudentDiagnosticResult;
use App\Models\SubjectAttendance;

class EarlyWarningService
{
    /**
     * Evaluates a single student using pre-loaded in-memory collections (O(1) lookups).
     */
    public function evaluateStudentFromData(
        int $studentId,
        $assignments,
        $studentSubmissions,
        $studentReflections,
        $studentAttendances,
        int $failedDiagnosticsCount
    ): array {
        $flags = [];

        // ── 1. Academic Risk: score < passing_grade in 2+ consecutive assignments ──
        $consecutiveFails = 0;
        $maxConsecutiveFails = 0;
        foreach ($assignments as $a) {
            $sub = $studentSubmissions->get($a->id);
            if (!$sub || $sub->score === null || $sub->score < ($a->passing_grade ?? 70)) {
                $consecutiveFails++;
                $maxConsecutiveFails = max($maxConsecutiveFails, $consecutiveFails);
            } else {
                $consecutiveFails = 0;
            }
        }

        if ($maxConsecutiveFails >= 2) {
            $flags[] = [
                'type'    => 'academic',
                'level'   => $maxConsecutiveFails >= 3 ? 'high' : 'medium',
                'label'   => 'Akademik',
                'message' => "Nilai di bawah KKTP pada {$maxConsecutiveFails} asesmen beruntun",
                'icon'    => 'graduation-cap',
            ];
        }

        // ── 2. Late/Missing submissions ──
        $lateOrMissing = 0;
        foreach ($assignments as $a) {
            $sub = $studentSubmissions->get($a->id);
            if (!$sub) {
                $lateOrMissing++;
            } elseif ($a->due_date && $sub->submitted_at && $sub->submitted_at->gt($a->due_date)) {
                $lateOrMissing++;
            }
        }

        if ($lateOrMissing >= 3) {
            $flags[] = [
                'type'    => 'discipline',
                'level'   => $lateOrMissing >= 5 ? 'high' : 'medium',
                'label'   => 'Disiplin',
                'message' => "{$lateOrMissing} tugas tidak dikumpulkan atau terlambat",
                'icon'    => 'clock',
            ];
        }

        // ── 3. Understanding/Reflection risk ──
        $lowUnderstandingCount = $studentReflections->filter(fn($r) => ($r->understanding_level ?? 3) <= 2)->count();
        if ($lowUnderstandingCount >= 2) {
            $flags[] = [
                'type'    => 'comprehension',
                'level'   => 'medium',
                'label'   => 'Kesulitan',
                'message' => "Tingkat pemahaman diri rendah pada {$lowUnderstandingCount} materi",
                'icon'    => 'book-open',
            ];
        }

        // ── 4. Attendance risk (< 75%) ──
        $totalAttendance = $studentAttendances->count();
        $hadir = $studentAttendances->filter(fn($a) => in_array(strtolower($a->status ?? ''), ['hadir', 'present', 'h']))->count();

        if ($totalAttendance > 0) {
            $attendancePct = round(($hadir / $totalAttendance) * 100);
            if ($attendancePct < 75) {
                $flags[] = [
                    'type'    => 'attendance',
                    'level'   => $attendancePct < 60 ? 'high' : 'medium',
                    'label'   => 'Absensi',
                    'message' => "Kehadiran {$attendancePct}% (minimal 75%)",
                    'icon'    => 'users',
                ];
            }
        }

        // ── 5. Diagnostic risk ──
        if ($failedDiagnosticsCount >= 2) {
            $flags[] = [
                'type'    => 'prerequisite',
                'level'   => 'medium',
                'label'   => 'Prasyarat',
                'message' => "{$failedDiagnosticsCount} asesmen diagnostik belum tuntas",
                'icon'    => 'alert-triangle',
            ];
        }

        return $flags;
    }

    /**
     * Evaluates a single student by querying their specific data.
     */
    public function evaluateStudent(array $student, int $subjectId): array
    {
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->orderBy('id')
            ->get();

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->where('student_id', $student['id'])
            ->get()
            ->keyBy('assignment_id');

        $studentModel = Student::find($student['id']);
        $materialIds = LmsMaterial::where('subject_id', $subjectId)
            ->when($studentModel?->school_class_id, function ($q, $classId) {
                $q->whereHas('schoolClasses', function ($sq) use ($classId) {
                    $sq->where('school_classes.id', $classId);
                });
            })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->pluck('id');

        $reflections = $materialIds->isNotEmpty()
            ? LmsReflection::whereIn('material_id', $materialIds)
                ->where('student_id', $student['id'])
                ->get()
            : collect();

        $attendances = SubjectAttendance::where('student_id', $student['id'])
            ->whereHas('schedule.teachingAssignment', fn($q) => $q->where('subject_id', $subjectId))
            ->get(['student_id', 'status']);

        $failedDiagnostics = StudentDiagnosticResult::where('student_id', $student['id'])
            ->where('subject_id', $subjectId)
            ->where('is_passed', false)
            ->count();

        return $this->evaluateStudentFromData(
            $student['id'],
            $assignments,
            $submissions,
            $reflections,
            $attendances,
            $failedDiagnostics
        );
    }

    /**
     * Optimized batch calculation of class risk summary without N+1 queries.
     */
    public function getClassRiskSummary(int $classId, int $subjectId): array
    {
        $students = Student::where('school_class_id', $classId)->get(['id', 'name', 'nis']);
        $total = $students->count();
        if ($total === 0) {
            return [
                'total_students'    => 0,
                'at_risk_count'     => 0,
                'high_risk_count'   => 0,
                'medium_risk_count' => 0,
                'students'          => [],
            ];
        }

        $studentIds = $students->pluck('id');
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // 1. Single query: Assignments for this subject in the active period
        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->orderBy('id')
            ->get();
        $assignmentIds = $assignments->pluck('id');

        // 2. Single query: Submissions for all students in this class for these assignments
        $submissions = $assignmentIds->isNotEmpty()
            ? LmsSubmission::whereIn('assignment_id', $assignmentIds)
                ->whereIn('student_id', $studentIds)
                ->get()
                ->groupBy('student_id')
            : collect();

        // 3. Single query: Materials for this subject & class
        $materialIds = LmsMaterial::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->pluck('id');

        // 4. Single query: Reflections for all students in this class for these materials
        $reflections = $materialIds->isNotEmpty()
            ? LmsReflection::whereIn('material_id', $materialIds)
                ->whereIn('student_id', $studentIds)
                ->get()
                ->groupBy('student_id')
            : collect();

        // 5. Single query: Attendances for all students in this class for this subject
        $attendances = SubjectAttendance::whereIn('student_id', $studentIds)
            ->whereHas('schedule.teachingAssignment', fn($q) => $q->where('subject_id', $subjectId))
            ->get(['student_id', 'status'])
            ->groupBy('student_id');

        // 6. Single query: Failed diagnostics aggregated per student
        $failedDiagnostics = StudentDiagnosticResult::whereIn('student_id', $studentIds)
            ->where('subject_id', $subjectId)
            ->where('is_passed', false)
            ->selectRaw('student_id, count(*) as count')
            ->groupBy('student_id')
            ->pluck('count', 'student_id');

        $atRisk = [];
        foreach ($students as $s) {
            $studentSubs = $submissions->get($s->id, collect())->keyBy('assignment_id');
            $studentRefs = $reflections->get($s->id, collect());
            $studentAtts = $attendances->get($s->id, collect());
            $failedDiagCount = (int) ($failedDiagnostics->get($s->id) ?? 0);

            $flags = $this->evaluateStudentFromData(
                $s->id,
                $assignments,
                $studentSubs,
                $studentRefs,
                $studentAtts,
                $failedDiagCount
            );

            if (!empty($flags)) {
                $highestLevel = 'low';
                foreach ($flags as $f) {
                    if ($f['level'] === 'high') $highestLevel = 'high';
                    elseif ($f['level'] === 'medium' && $highestLevel !== 'high') $highestLevel = 'medium';
                }
                $atRisk[] = [
                    'id'            => $s->id,
                    'name'          => $s->name,
                    'nis'           => $s->nis,
                    'flags'         => $flags,
                    'highest_risk'  => $highestLevel,
                    'risk_count'    => count($flags),
                ];
            }
        }

        $highCount = count(array_filter($atRisk, fn($r) => $r['highest_risk'] === 'high'));
        $mediumCount = count(array_filter($atRisk, fn($r) => $r['highest_risk'] === 'medium'));

        return [
            'total_students'    => $total,
            'at_risk_count'     => count($atRisk),
            'high_risk_count'   => $highCount,
            'medium_risk_count' => $mediumCount,
            'students'          => $atRisk,
        ];
    }
}
