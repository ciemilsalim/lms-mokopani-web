<?php

namespace App\Http\Controllers;

use App\Models\LmsAssignment;
use App\Models\LmsMaterial;
use App\Models\LmsP5Project;
use App\Models\LmsP5ProjectScore;
use App\Models\LmsSubmission;
use App\Models\LmsAnnouncement;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\Schedule;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private array $chartColors = ['#7367f0', '#28c76f', '#ff9f43', '#ea5455', '#00cfe8', '#ff6b6b', '#2d3436', '#636e72'];
    private array $colorKeys = ['primary', 'success', 'warning', 'destructive', 'info'];

    public function index()
    {
        $user = Auth::user();
        $role = $user->role;

        if (!$role) {
            $role = $user->teacher ? 'teacher' : ($user->student ? 'student' : 'guest');
        }

        if ($role === 'parent') {
            return redirect()->route('parent.dashboard');
        }

        return match ($role) {
            'teacher' => $this->teacherDashboard($user),
            'student' => $this->studentDashboard($user),
            default   => $this->adminDashboard($user),
        };
    }

    // ─── ADMIN ───────────────────────────────────────────────────────

    private function adminDashboard($user)
    {
        $stats = [
            'total_students'      => Student::count(),
            'total_teachers'      => Teacher::count(),
            'total_subjects'      => Subject::count(),
            'total_materials'     => LmsMaterial::count(),
            'total_assignments'   => LmsAssignment::count(),
            'pending_submissions' => LmsSubmission::whereNull('score')->count(),
        ];

        $stats = array_merge($stats, $this->topicData());
        $stats = array_merge($stats, $this->assignmentProgress());
        $stats['popular_instructors'] = $this->popularInstructors();
        $stats['course_progress'] = $this->courseProgress();

        $recentActivities = $this->recentActivities(
            LmsMaterial::with('subject')->latest()->take(5)->get(),
            LmsAssignment::with('subject')->latest()->take(5)->get()
        );

        return Inertia::render('dashboard', [
            'stats'               => $stats,
            'identity'            => [
                'name'       => $user->name,
                'role'       => 'admin',
                'sekolah'    => school_setting('school_name', config('app.name')),
                'tahunAjaran' => AcademicYear::getActive()?->name,
                'semester'   => Semester::getActive()?->name,
            ],
            'recentActivities'    => $recentActivities,
            'recentAnnouncements' => $this->getAnnouncements($user),
            'todaySchedule'       => [],
            'todayName'           => $this->getTodayName(),
        ]);
    }

    // ─── TEACHER ─────────────────────────────────────────────────────

    private function teacherDashboard($user)
    {
        $teacher = $user->teacher;
        if (!$teacher) {
            $teacher = Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();
        }

        if (!$teacher) {
            \Illuminate\Support\Facades\Log::warning('[Dashboard] User memiliki peran guru namun data Teacher belum terhubung', [
                'user_id' => $user->id,
                'email'   => $user->email,
            ]);
            return $this->adminDashboard($user);
        }

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $teacher->loadMissing('subjects');

        $myMaterials = LmsMaterial::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        $myAssignments = LmsAssignment::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        $myAssignmentIds = (clone $myAssignments)->pluck('id');

        $teachingClassIds = TeachingAssignment::where('teacher_id', $teacher->id)
            ->pluck('school_class_id');

        $stats = [
            'total_students'      => Student::whereIn('school_class_id', $teachingClassIds)->count(),
            'total_teachers'      => 0,
            'total_subjects'      => TeachingAssignment::where('teacher_id', $teacher->id)->distinct('subject_id')->count('subject_id'),
            'total_materials'     => (clone $myMaterials)->count(),
            'total_assignments'   => (clone $myAssignments)->count(),
            'pending_submissions' => LmsSubmission::whereIn('assignment_id', $myAssignmentIds)->whereNull('score')->count(),
        ];

        $stats = array_merge($stats, $this->assignmentProgress($myAssignmentIds));
        $stats['course_progress'] = $this->courseProgress($teacher, $teachingClassIds);
        $stats['pending_grading_list'] = $this->pendingGradingList($teacher->id);
        $stats['class_performance'] = $this->classPerformance($teacher->id, $teachingClassIds);

        $recentActivities = $this->recentActivities(
            (clone $myMaterials)->with('subject')->latest()->take(5)->get(),
            (clone $myAssignments)->with('subject')->latest()->take(5)->get()
        );

        $todaySchedule = $this->getTeacherSchedule($user);

        $mapelList = $teacher->subjects ? $teacher->subjects->pluck('name')->join(', ') : '';
        $subjects = $teacher->subjects ? $teacher->subjects->values()->map(fn($s) => ['id' => $s->id, 'name' => $s->name]) : collect();
        $classes = \App\Models\SchoolClass::whereIn('id', $teachingClassIds)->get()->map(fn($c) => ['id' => $c->id, 'name' => $c->name]);

        return Inertia::render('dashboard', [
            'stats'               => $stats,
            'identity'            => [
                'name'       => $teacher->name ?? $user->name,
                'role'       => 'teacher',
                'idLabel'    => 'NIP',
                'idValue'    => $teacher->nip ?? '-',
                'extra'      => $mapelList ? "Mengajar: {$mapelList}" : null,
                'sekolah'    => school_setting('school_name', config('app.name')),
                'tahunAjaran' => $activeYear?->name,
                'semester'   => $activeSemester?->name,
            ],
            'subjects'            => $subjects,
            'classes'             => $classes,
            'recentActivities'    => $recentActivities,
            'recentAnnouncements' => $this->getAnnouncements($user),
            'todaySchedule'       => $todaySchedule,
            'todayName'           => $this->getTodayName(),
        ]);
    }

    // ─── STUDENT ─────────────────────────────────────────────────────

    private function studentDashboard($user)
    {
        $student = $user->student;
        if (!$student) {
            $student = Student::where('user_id', $user->id)->orWhere('email', $user->email)->first();
        }

        if (!$student) {
            \Illuminate\Support\Facades\Log::warning('[Dashboard] User memiliki peran siswa namun data Student belum terhubung', [
                'user_id' => $user->id,
            ]);
            return $this->adminDashboard($user);
        }
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $myMaterials = LmsMaterial::whereHas('schoolClasses', function ($q) use ($student) { $q->where('school_classes.id', $student->school_class_id); })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        $myAssignments = LmsAssignment::whereHas('schoolClasses', function ($q) use ($student) { $q->where('school_classes.id', $student->school_class_id); })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        $myAssignmentIds = (clone $myAssignments)->pluck('id');
        $submittedCount = LmsSubmission::where('student_id', $student->id)
            ->whereIn('assignment_id', $myAssignmentIds)->count();

        // ── P5 Summary ───────────────────────────────────────────────
        $p5Projects = LmsP5Project::where('school_class_id', $student->school_class_id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $p5TotalSubElements = $p5Projects->reduce(fn($carry, $p) => $carry + count($p->sub_element_ids ?? []), 0);
        $p5ScoredSubElements = 0;
        if ($p5TotalSubElements > 0) {
            $p5ScoredSubElements = LmsP5ProjectScore::whereIn('project_id', $p5Projects->pluck('id'))
                ->where('student_id', $student->id)
                ->distinct('sub_element_id')
                ->count('sub_element_id');
        }

        $p5Total = $p5TotalSubElements;
        $p5Scored = $p5ScoredSubElements;

        $stats = [
            'total_students'      => 0,
            'total_teachers'      => 0,
            'total_subjects'      => TeachingAssignment::where('school_class_id', $student->school_class_id)
                ->distinct('subject_id')->count('subject_id'),
            'total_materials'     => (clone $myMaterials)->count(),
            'total_assignments'   => (clone $myAssignments)->count(),
            'pending_submissions' => (clone $myAssignments)->count() - $submittedCount,
            'p5_total'            => $p5Total,
            'p5_scored'           => $p5Scored,
        ];

        $stats = array_merge($stats, $this->topicData(student: $student));
        $gradedCount = LmsSubmission::where('student_id', $student->id)
            ->whereIn('assignment_id', $myAssignmentIds)->whereNotNull('score')->count();

        $stats['assignment_progress'] = [
            'graded'      => $gradedCount,
            'ungraded'    => max(0, $submittedCount - $gradedCount),
            'unsubmitted' => max(0, (clone $myAssignments)->count() - $submittedCount),
            'total'       => max(1, (clone $myAssignments)->count()),
        ];
        $stats['course_progress'] = $this->courseProgress(student: $student);
        $stats['upcoming_deadlines'] = $this->upcomingDeadlines($student);
        $stats['grade_trend'] = $this->gradeTrend($student->id);
        $stats['p5_progress'] = $p5Total > 0 ? round(($p5Scored / $p5Total) * 100) : 0;

        $student->load('schoolClass');

        $recentActivities = $this->recentActivities(
            (clone $myMaterials)->with('subject')->latest()->take(5)->get(),
            (clone $myAssignments)->with('subject')->latest()->take(5)->get()
        );

        $todaySchedule = $this->getStudentSchedule($user);

        return Inertia::render('dashboard', [
            'stats'               => $stats,
            'identity'            => [
                'name'       => $student->name,
                'role'       => 'student',
                'idLabel'    => 'NIS',
                'idValue'    => $student->nis,
                'extra'      => "Kelas: {$student->schoolClass?->name}",
                'sekolah'    => school_setting('school_name', config('app.name')),
                'tahunAjaran' => $activeYear?->name,
                'semester'   => $activeSemester?->name,
            ],
            'recentActivities'    => $recentActivities,
            'recentAnnouncements' => $this->getAnnouncements($user),
            'todaySchedule'       => $todaySchedule,
            'todayName'           => $this->getTodayName(),
        ]);
    }

    // ─── SHARED DATA BUILDERS ────────────────────────────────────────

    private function topicData(?Teacher $teacher = null, ?\App\Models\Student $student = null): array
    {
        $query = Subject::query();

        if ($teacher) {
            $query->whereIn('id', LmsMaterial::where('teacher_id', $teacher->id)
                ->select('subject_id')->distinct());
        } elseif ($student) {
            $query->whereIn('id', LmsMaterial::whereHas('schoolClasses', function ($q) use ($student) { $q->where('school_classes.id', $student->school_class_id); })
                ->select('subject_id')->distinct());
        }

        $data = $query->withCount('materials')
            ->having('materials_count', '>', 0)
            ->get()
            ->values()
            ->map(fn ($s, $i) => [
                'name'  => $s->name,
                'value' => $s->materials_count,
                'color' => $this->chartColors[$i % count($this->chartColors)],
            ]);

        if ($data->isEmpty()) {
            $data = collect([['name' => 'Belum ada data', 'value' => 1, 'color' => '#e0e0e0']]);
        }

        return ['topic_data' => $data];
    }

    private function assignmentProgress($assignmentIds = null): array
    {
        $query = LmsSubmission::query();
        if ($assignmentIds !== null) {
            $query->whereIn('assignment_id', $assignmentIds);
        }

        $totalSubmissions = (clone $query)->count();
        $graded = (clone $query)->whereNotNull('score')->count();
        $ungraded = $totalSubmissions - $graded;

        return [
            'assignment_progress' => [
                'graded'      => $graded,
                'ungraded'    => max(0, $ungraded),
                'unsubmitted' => 0,
                'total'       => max(1, $totalSubmissions),
            ],
        ];
    }

    private function popularInstructors(): array
    {
        $top = LmsAssignment::select('teacher_id', DB::raw('count(*) as total'))
            ->groupBy('teacher_id')
            ->with('teacher')
            ->orderByDesc('total')
            ->take(5)
            ->get()
            ->values();

        if ($top->isEmpty()) {
            return [];
        }

        return $top->map(fn ($item, $i) => [
            'name'    => $item->teacher?->name ?? 'Unknown',
            'role'    => 'Guru',
            'lessons' => (int) $item->total,
            'color'   => $this->colorKeys[$i % count($this->colorKeys)],
        ])->toArray();
    }

    private function courseProgress(?Teacher $teacher = null, $classIds = null, ?\App\Models\Student $student = null): array
    {
        if ($student) {
            $student->load('schoolClass');
            $subjects = Subject::whereHas('teachingAssignments', function ($q) use ($student) {
                $q->where('school_class_id', $student->school_class_id);
            })->get();

            return $subjects->map(function ($subject) use ($student) {
                $assignmentIds = LmsAssignment::where('subject_id', $subject->id)->whereHas('schoolClasses', function ($q) use ($student) { $q->where('school_classes.id', $student->school_class_id); })
                    ->pluck('id');
                $total = $assignmentIds->count();
                $completed = LmsSubmission::where('student_id', $student->id)
                    ->whereIn('assignment_id', $assignmentIds)
                    ->whereNotNull('score')->count();

                return [
                    'student'    => $student->name,
                    'class_id'   => $student->school_class_id,
                    'class_name' => $student->schoolClass?->name,
                    'course'     => $subject->name,
                    'progress'   => $total > 0 ? round(($completed / $total) * 100) : 0,
                    'status'     => $total > 0 && $completed >= $total ? 'completed' : ($completed > 0 ? 'active' : 'pending'),
                ];
            })->filter()->values()->take(15)->toArray();
        }

        if ($teacher && $classIds) {
            $students = Student::whereIn('school_class_id', $classIds)->with('schoolClass')->get();
            $subjects = Subject::whereIn('id', TeachingAssignment::where('teacher_id', $teacher->id)
                ->select('subject_id')->distinct())->get();

            $result = [];
            foreach ($students as $student) {
                foreach ($subjects as $subject) {
                    $assignmentIds = LmsAssignment::where('subject_id', $subject->id)
                        ->where('teacher_id', $teacher->id)->pluck('id');
                    $total = $assignmentIds->count();
                    if ($total === 0) continue;
                    $completed = LmsSubmission::where('student_id', $student->id)
                        ->whereIn('assignment_id', $assignmentIds)
                        ->whereNotNull('score')->count();
                    $result[] = [
                        'student_id' => $student->id,
                        'student'    => $student->name,
                        'class_id'   => $student->school_class_id,
                        'class_name' => $student->schoolClass?->name,
                        'course'     => $subject->name,
                        'subject_id' => $subject->id,
                        'progress'   => round(($completed / $total) * 100),
                        'status'     => $completed >= $total ? 'completed' : ($completed > 0 ? 'active' : 'pending'),
                    ];
                }
            }
            return $result;
        }

        $subjects = Subject::whereHas('assignments')->take(5)->get();
        $students = Student::with('schoolClass')->take(5)->get();

        $result = [];
        foreach ($students as $student) {
            foreach ($subjects as $subject) {
                $assignmentIds = LmsAssignment::where('subject_id', $subject->id)->pluck('id');
                $total = $assignmentIds->count();
                if ($total === 0) continue;
                $completed = LmsSubmission::where('student_id', $student->id)
                    ->whereIn('assignment_id', $assignmentIds)
                    ->whereNotNull('score')->count();
                $result[] = [
                    'student'    => $student->name,
                    'class_id'   => $student->school_class_id,
                    'class_name' => $student->schoolClass?->name,
                    'course'     => $subject->name,
                    'progress'   => round(($completed / $total) * 100),
                    'status'     => $completed >= $total ? 'completed' : ($completed > 0 ? 'active' : 'pending'),
                ];
                if (count($result) >= 15) break 2;
            }
        }
        return $result;
    }

    private function pendingGradingList($teacherId): array
    {
        return LmsAssignment::where('teacher_id', $teacherId)
            ->withCount(['submissions as pending_count' => function ($query) {
                $query->whereNull('score');
            }])
            ->having('pending_count', '>', 0)
            ->with('subject', 'schoolClasses')
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'subject' => $a->subject?->name,
                'class' => $a->schoolClasses->pluck('name')->join(', '),
                'pending_count' => $a->pending_count,
            ])
            ->toArray();
    }

    private function classPerformance($teacherId, $classIds): array
    {
        $classes = \App\Models\SchoolClass::whereIn('id', $classIds)->get();
        $assignmentIds = LmsAssignment::where('teacher_id', $teacherId)->pluck('id');
        
        return $classes->map(function ($c) use ($assignmentIds) {
            $studentIds = Student::where('school_class_id', $c->id)->pluck('id');
            $avg = LmsSubmission::whereIn('student_id', $studentIds)
                ->whereIn('assignment_id', $assignmentIds)
                ->whereNotNull('score')
                ->avg('score');
            
            return [
                'name' => $c->name,
                'value' => round((float)$avg, 1),
                'color' => $this->chartColors[$c->id % count($this->chartColors)],
            ];
        })->filter(fn($c) => $c['value'] > 0)->values()->toArray();
    }

    private function upcomingDeadlines($student): array
    {
        return LmsAssignment::whereHas('schoolClasses', function ($q) use ($student) { 
                $q->where('school_classes.id', $student->school_class_id); 
            })
            ->whereNotNull('due_date')
            ->where('due_date', '>=', now())
            ->whereDoesntHave('submissions', function ($q) use ($student) {
                $q->where('student_id', $student->id);
            })
            ->with('subject')
            ->orderBy('due_date')
            ->take(5)
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'subject' => $a->subject?->name,
                'due_date' => \Carbon\Carbon::parse($a->due_date)->format('d M Y H:i'),
                'is_urgent' => \Carbon\Carbon::parse($a->due_date)->isBefore(now()->addDays(2)),
            ])
            ->toArray();
    }

    private function gradeTrend($studentId): array
    {
        $submissions = LmsSubmission::where('student_id', $studentId)
            ->whereNotNull('score')
            ->with('assignment')
            ->orderBy('submitted_at')
            ->take(10)
            ->get();
            
        return $submissions->map(fn($s, $i) => [
            'name' => 'Tugas ' . ($i + 1),
            'title' => $s->assignment?->title,
            'score' => $s->score,
        ])->toArray();
    }

    // ─── HELPERS ─────────────────────────────────────────────────────

    private function recentActivities($materials, $assignments): array
    {
        $mat = $materials->map(fn ($m) => [
            'id'         => $m->id,
            'type'       => 'material',
            'title'      => $m->title,
            'subject'    => $m->subject?->name ?? '-',
            'created_at' => $m->created_at->diffForHumans(),
        ]);

        $asgn = $assignments->map(fn ($a) => [
            'id'         => $a->id,
            'type'       => 'assignment',
            'title'      => $a->title,
            'subject'    => $a->subject?->name ?? '-',
            'created_at' => $a->created_at->diffForHumans(),
        ]);

        return collect($mat)->concat($asgn)
            ->sortByDesc('created_at')
            ->values()
            ->take(10)
            ->toArray();
    }

    private function getTodayName(): string
    {
        $days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return $days[now()->dayOfWeek];
    }

    private function getTodayNumber(): int
    {
        $day = now()->dayOfWeek; // 0=Sunday ... 6=Saturday
        return $day === 0 ? 7 : $day; // DB: 1=Senin ... 7=Minggu
    }

    private function getAnnouncements($user): array
    {
        return LmsAnnouncement::with('teacher')
            ->where(function ($q) use ($user) {
                if ($user->student) {
                    $q->where('school_class_id', $user->student->school_class_id)
                      ->orWhereNull('school_class_id');
                } elseif ($user->teacher) {
                    $q->where('teacher_id', $user->teacher->id);
                }
            })
            ->latest()
            ->take(3)
            ->get()
            ->map(fn ($a) => [
                'id'           => $a->id,
                'title'        => $a->title,
                'priority'     => $a->priority ?? 'info',
                'teacher_name' => $a->teacher?->name ?? 'Sistem',
                'created_at'   => $a->created_at->diffForHumans(),
            ])
            ->toArray();
    }

    private function getTeacherSchedule($user): array
    {
        $todayNumber = $this->getTodayNumber();
        return Schedule::whereHas('teachingAssignment', fn ($q) => $q->where('teacher_id', $user->teacher->id))
            ->where('day_of_week', $todayNumber)
            ->with(['teachingAssignment.subject', 'teachingAssignment.schoolClass'])
            ->orderBy('start_time')
            ->get()
            ->map(fn ($s) => [
                'subject'    => $s->teachingAssignment->subject->name,
                'class'      => $s->teachingAssignment->schoolClass->name,
                'time'       => substr($s->start_time, 0, 5) . ' - ' . substr($s->end_time, 0, 5),
                'is_current' => now()->between($s->start_time, $s->end_time),
            ])
            ->toArray();
    }

    private function getStudentSchedule($user): array
    {
        $todayNumber = $this->getTodayNumber();
        return Schedule::whereHas('teachingAssignment', fn ($q) => $q->where('school_class_id', $user->student->school_class_id))
            ->where('day_of_week', $todayNumber)
            ->with(['teachingAssignment.subject', 'teachingAssignment.teacher', 'teachingAssignment.schoolClass'])
            ->orderBy('start_time')
            ->get()
            ->map(fn ($s) => [
                'subject'    => $s->teachingAssignment->subject->name,
                'teacher'    => $s->teachingAssignment->teacher->name,
                'class'      => $s->teachingAssignment->schoolClass->name,
                'time'       => substr($s->start_time, 0, 5) . ' - ' . substr($s->end_time, 0, 5),
                'is_current' => now()->between($s->start_time, $s->end_time),
            ])
            ->toArray();
    }
}
