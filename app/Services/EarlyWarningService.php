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
    public function evaluateStudent(array $student, int $subjectId): array
    {
        $flags = [];
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

        // ── 1. Academic Risk: score < passing_grade in 2+ consecutive assignments ──
        $consecutiveFails = 0;
        $maxConsecutiveFails = 0;
        foreach ($assignments as $a) {
            $sub = $submissions->get($a->id);
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
            $sub = $submissions->get($a->id);
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
        $studentModel = Student::find($student['id']);
        $materialIds = LmsMaterial::where('subject_id', $subjectId)
            ->where('school_class_id', $studentModel?->school_class_id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->pluck('id');

        $reflections = LmsReflection::whereIn('material_id', $materialIds)
            ->where('student_id', $student['id'])
            ->orderBy('id')
            ->get();

        $lowUnderstandingCount = $reflections->filter(fn($r) => ($r->understanding_level ?? 3) <= 2)->count();
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
        $attendances = SubjectAttendance::where('student_id', $student['id'])
            ->whereHas('schedule.teachingAssignment', fn($q) => $q->where('subject_id', $subjectId));

        $totalAttendance = (clone $attendances)->count();
        $hadir = (clone $attendances)->where('status', 'Hadir')->count();

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
        $failedDiagnostics = StudentDiagnosticResult::where('student_id', $student['id'])
            ->where('subject_id', $subjectId)
            ->where('is_passed', false)
            ->count();

        if ($failedDiagnostics >= 2) {
            $flags[] = [
                'type'    => 'prerequisite',
                'level'   => 'medium',
                'label'   => 'Prasyarat',
                'message' => "{$failedDiagnostics} asesmen diagnostik belum tuntas",
                'icon'    => 'alert-triangle',
            ];
        }

        return $flags;
    }

    public function getClassRiskSummary(int $classId, int $subjectId): array
    {
        $students = Student::where('school_class_id', $classId)->get(['id', 'name', 'nis']);
        $total = $students->count();
        $atRisk = [];

        foreach ($students as $s) {
            $flags = $this->evaluateStudent(['id' => $s->id, 'name' => $s->name, 'nis' => $s->nis], $subjectId);
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
