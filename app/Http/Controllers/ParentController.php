<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\Semester;
use App\Models\Student;
use App\Models\SubjectAttendance;
use App\Models\LmsLearningObjective;
use App\Services\RaporCalculationService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ParentController extends Controller
{
    public function dashboard()
    {
        $parent = Auth::user()->parent;
        $children = $parent ? $parent->students()->with(['schoolClass'])->get() : collect();

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $childClassIds = $children->pluck('school_class_id')->filter()->unique();
        $childIds = $children->pluck('id');

        // T4 & T6: Batch prefetch assignments excluding teacher-only instruments
        $assignmentsQuery = LmsAssignment::whereHas('schoolClasses', function ($q) use ($childClassIds) {
                $q->whereIn('school_classes.id', $childClassIds);
            })
            ->forStudentPortal();

        if ($activeYear && $activeSemester) {
            $assignmentsQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $assignmentsQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $allAssignments = $assignmentsQuery->with('schoolClasses:id')->get();

        $allSubmissions = LmsSubmission::whereIn('student_id', $childIds)
            ->whereIn('assignment_id', $allAssignments->pluck('id'))
            ->get();

        $attendancesQuery = SubjectAttendance::whereIn('student_id', $childIds);

        if ($activeYear && $activeSemester) {
            $attendancesQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $attendancesQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $allAttendances = $attendancesQuery->get();

        $childrenData = $children->map(function ($child) use ($allAssignments, $allSubmissions, $allAttendances) {
            $assignments = $allAssignments->filter(fn($a) => $a->schoolClasses->contains('id', $child->school_class_id));
            $assignmentIds = $assignments->pluck('id');

            $submissions = $allSubmissions->where('student_id', $child->id)->whereIn('assignment_id', $assignmentIds);

            $totalAssignments = $assignments->count();
            $submitted = $submissions->count();
            $avgScore = $submissions->whereNotNull('score')->avg('score');

            $attendances = $allAttendances->where('student_id', $child->id);

            $totalAttendance = $attendances->count();
            $present = $attendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['hadir', 'present', 'h']))->count();
            $sick = $attendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['sakit', 'sick', 's']))->count();
            $permit = $attendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['izin', 'permit', 'dispensasi', 'i']))->count();
            $absent = $attendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['alpa', 'alpha', 'absen', 'bolos', 'a']))->count();
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
                ['name' => 'Izin', 'value' => $permit, 'fill' => '#F59E0B'], // amber
                ['name' => 'Sakit', 'value' => $sick, 'fill' => '#0EA5E9'], // sky
                ['name' => 'Alpa', 'value' => $absent, 'fill' => '#F43F5E'], // rose
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
                'pending'              => max(0, $totalAssignments - $submitted),
                'avg_score'            => $avgScore ? round($avgScore, 1) : null,
                'attendance_pct'       => $attendancePct,
                'grade_trend'          => $gradeTrend,
                'attendance_breakdown' => $attendanceBreakdown,
            ];
        });

        $user = Auth::user();
        $days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $todayName = $days[(int) date('w')];
        $todayDateText = now()->locale('id')->isoFormat('D MMMM Y');

        return Inertia::render('parent/dashboard', [
            'children'  => $childrenData,
            'identity'  => [
                'name'        => $user->name,
                'role'        => 'parent',
                'extra'       => count($childrenData) > 0 ? count($childrenData) . ' Anak Terhubung' : 'Portal Wali Murid',
                'sekolah'     => school_setting('school_name', config('app.name')),
                'tahunAjaran' => $activeYear?->name,
                'semester'    => $activeSemester?->name,
            ],
            'todayName' => $todayName,
            'dateText'  => $todayDateText,
        ]);
    }

    public function child(Student $student)
    {
        $parent = Auth::user()->parent;
        $childIds = $parent ? $parent->students()->pluck('students.id') : collect();

        if (!$childIds->contains($student->id)) {
            abort(403, 'Anda tidak memiliki akses ke data siswa ini.');
        }

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // T4: Exclude teacher-only instruments
        $assignmentsQuery = LmsAssignment::with('subject')
            ->whereHas('schoolClasses', function ($q) use ($student) {
                $q->where('school_classes.id', $student->school_class_id);
            })
            ->forStudentPortal();

        if ($activeYear && $activeSemester) {
            $assignmentsQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $assignmentsQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $assignments = $assignmentsQuery->get();

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->where('student_id', $student->id)
            ->get();

        $attendancesQuery = SubjectAttendance::with(['schedule.teachingAssignment'])
            ->where('student_id', $student->id);

        if ($activeYear && $activeSemester) {
            $attendancesQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $attendancesQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $attendances = $attendancesQuery->get();

        $finalScores = GradebookFinalScore::where('student_id', $student->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('subject_id');

        // T6: Pre-fetch all TPs for assignments in 1 query to prevent N+1 queries in loop
        $allTpIds = $assignments->pluck('learning_objective_id')->filter()->unique();
        $learningObjectives = LmsLearningObjective::whereIn('id', $allTpIds)->get()->keyBy('id');

        $report = $assignments->groupBy('subject_id')->map(function ($subjectAssignments) use ($submissions, $attendances, $student, $finalScores, $learningObjectives, $activeYear, $activeSemester) {
            $subjectId = $subjectAssignments->first()->subject_id;
            $subjectKktp = get_kktp($subjectId);
            $subjectName = $subjectAssignments->first()->subject?->name ?? 'Mata Pelajaran';

            $subjectAttendances = $attendances->filter(function ($a) use ($subjectId) {
                return $a->schedule?->teachingAssignment?->subject_id == $subjectId;
            });

            $totalMeetings = $subjectAttendances->count();
            $presentCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['hadir', 'present', 'h']))->count();
            // T5: Return null if total meetings is 0 to avoid false 100% attendance claim
            $attendancePercentage = $totalMeetings > 0 ? round(($presentCount / $totalMeetings) * 100) : null;

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

            $subjectSummativeAssignments = $subjectAssignments->where('assessment_type', 'summative');
            $subjectEvaluatedTps = app(RaporCalculationService::class)->getEvaluatedTpsForClass($subjectId, $student->school_class_id, $activeYear, $activeSemester);

            $calc = app(RaporCalculationService::class)->calculateStudentSubjectReport(
                $student->id,
                $subjectId,
                $subjectEvaluatedTps,
                $subjectSummativeAssignments,
                $submissions,
                $finalScores->get($subjectId)?->score,
                $subjectKktp
            );

            $average = $calc['tp_average'] ?? 0;
            $finalScore = $calc['final_score'];
            $sasScore = $calc['sas_score'];
            $description = $calc['description'];

            return [
                'subject_name'          => $subjectName,
                'assignments'           => $items->values(),
                'average'               => $finalScore,
                'tp_average'            => $average,
                'sas_score'             => $sasScore,
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
