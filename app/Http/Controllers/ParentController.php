<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\Semester;
use App\Models\Student;
use App\Models\SubjectAttendance;
use App\Models\LmsLearningObjective;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ParentController extends Controller
{
    public function dashboard()
    {
        $parent = Auth::user()->parent;
        $children = $parent->students()->with(['schoolClass'])->get();

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $childrenData = $children->map(function ($child) use ($activeYear, $activeSemester) {
            $assignments = LmsAssignment::whereHas('schoolClasses', function ($q) use ($child) { $q->where('school_classes.id', $child->school_class_id); })
                ->where('academic_year_id', $activeYear?->id)
                ->where('semester_id', $activeSemester?->id)
                ->get();

            $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
                ->where('student_id', $child->id)
                ->get();

            $totalAssignments = $assignments->count();
            $submitted = $submissions->count();
            $avgScore = $submissions->whereNotNull('score')->avg('score');

            $attendances = SubjectAttendance::where('student_id', $child->id)
                ->where('academic_year_id', $activeYear?->id)
                ->where('semester_id', $activeSemester?->id)
                ->get();

            $totalAttendance = $attendances->count();
            $present = $attendances->where('status', 'Hadir')->count();
            $attendancePct = $totalAttendance > 0 ? round(($present / $totalAttendance) * 100) : null;

            $gradeTrend = $submissions->whereNotNull('score')
                ->sortBy('submitted_at')
                ->take(-10)
                ->values()
                ->map(fn($s, $i) => [
                    'name' => 'Tugas ' . ($i + 1),
                    'score' => $s->score,
                ])->toArray();

            $attendanceBreakdownRaw = [
                ['name' => 'Hadir', 'value' => $present, 'fill' => '#10B981'], // emerald
                ['name' => 'Izin', 'value' => $attendances->where('status', 'Izin')->count(), 'fill' => '#F59E0B'], // amber
                ['name' => 'Sakit', 'value' => $attendances->where('status', 'Sakit')->count(), 'fill' => '#0EA5E9'], // sky
                ['name' => 'Alpa', 'value' => $attendances->where('status', 'Alpa')->count(), 'fill' => '#F43F5E'], // rose
            ];
            $attendanceBreakdown = array_values(array_filter($attendanceBreakdownRaw, fn($item) => $item['value'] > 0));
            if (empty($attendanceBreakdown)) {
                $attendanceBreakdown = [['name' => 'Belum Ada', 'value' => 1, 'fill' => '#E2E8F0']]; // slate-200
            }

            return [
                'id'                   => $child->id,
                'name'                 => $child->name,
                'nis'                  => $child->nis,
                'class_name'           => $child->schoolClass?->name ?? '-',
                'total_assignments'    => $totalAssignments,
                'submitted'            => $submitted,
                'pending'              => $totalAssignments - $submitted,
                'avg_score'            => $avgScore ? round($avgScore, 1) : null,
                'attendance_pct'       => $attendancePct,
                'grade_trend'          => $gradeTrend,
                'attendance_breakdown' => $attendanceBreakdown,
            ];
        });

        return Inertia::render('parent/dashboard', [
            'children' => $childrenData,
        ]);
    }

    public function child(Student $student)
    {
        $parent = Auth::user()->parent;
        $childIds = $parent->students()->pluck('students.id');

        if (!$childIds->contains($student->id)) {
            abort(403, 'Anda tidak memiliki akses ke data siswa ini.');
        }

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $assignments = LmsAssignment::with('subject')
            ->whereHas('schoolClasses', function ($q) use ($student) {
                $q->where('school_classes.id', $student->school_class_id);
            })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->where('student_id', $student->id)
            ->get();

        $attendances = SubjectAttendance::with(['schedule.teachingAssignment'])
            ->where('student_id', $student->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $report = $assignments->groupBy('subject_id')->map(function ($subjectAssignments) use ($submissions, $attendances, $student) {
            $subjectId = $subjectAssignments->first()->subject_id;
            $subjectKktp = get_kktp($subjectId);
            $subjectName = $subjectAssignments->first()->subject->name;

            $subjectAttendances = $attendances->filter(function ($a) use ($subjectId) {
                return $a->schedule?->teachingAssignment?->subject_id == $subjectId;
            });

            $totalMeetings = $subjectAttendances->count();
            $presentCount = $subjectAttendances->where('status', 'Hadir')->count();
            $attendancePercentage = $totalMeetings > 0 ? round(($presentCount / $totalMeetings) * 100) : 100;

            $items = $subjectAssignments->map(function ($assignment) use ($submissions) {
                $submission = $submissions->where('assignment_id', $assignment->id)->first();
                return [
                    'id'         => $assignment->id,
                    'title'      => $assignment->title,
                    'score'      => $submission?->score ?? '-',
                    'max_points' => $assignment->max_points,
                    'status'     => $submission ? 'Selesai' : 'Belum Mengerjakan',
                    'type'       => $assignment->assessment_type,
                    'tp_id'      => $assignment->learning_objective_id,
                ];
            });

            $summativeItems = $items->where('type', 'summative')->where('score', '!==', '-');
            $totalScore = $summativeItems->sum('score');
            $count = $summativeItems->count();
            $average = $count > 0 ? round($totalScore / $count) : 0;

            $description = 'Menunjukkan penguasaan yang baik dalam materi pembelajaran.';
            if ($count > 0) {
                $highest = $summativeItems->sortByDesc('score')->first();
                $lowest = $summativeItems->sortBy('score')->first();

                $highTp = LmsLearningObjective::find($highest['tp_id']);
                $lowTp = LmsLearningObjective::find($lowest['tp_id']);

                if ($highTp) {
                    $description = 'Menunjukkan penguasaan yang sangat baik dalam ' . $highTp->description . '.';
                }

                if ($lowTp && $lowest['score'] < $subjectKktp && $highest['id'] !== $lowest['id']) {
                    $description .= ' Perlu peningkatan dalam ' . $lowTp->description . '.';
                }
            }

            return [
                'subject_name'          => $subjectName,
                'assignments'           => $items->values(),
                'average'               => $average,
                'description'           => $description,
                'attendance_percentage' => $attendancePercentage,
                'total_meetings'        => $totalMeetings,
            ];
        })->values();

        return Inertia::render('parent/child', [
            'student' => [
                'id'         => $student->id,
                'name'       => $student->name,
                'nis'        => $student->nis,
                'class_name' => $student->schoolClass?->name ?? '-',
            ],
            'report' => $report,
            'period' => $activeYear?->name . ' - ' . $activeSemester?->name,
            'kktp'   => get_kktp(),
        ]);
    }
}
