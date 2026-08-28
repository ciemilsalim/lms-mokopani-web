<?php

namespace App\Http\Controllers;

use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\Subject;
use App\Services\AdaptiveLearningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssignmentController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $query = LmsAssignment::with([
            'subject',
            'schoolClasses' => function ($q) {
                $q->withCount('students');
            },
            'learningObjective',
            'submissions.student'
        ])
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        if ($user->role === 'admin') {
            // admin can see all
        } elseif ($user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->student) {
            if ($user->student->school_class_id) {
                $query->whereHas('schoolClasses', function ($q) use ($user) {
                    $q->where('school_classes.id', $user->student->school_class_id);
                });
            }
        }

        $models = $query->latest()->get();

        $totalPendingGrading = 0;
        $totalActiveAssessments = $models->count();

        $studentSubmissions = [];
        if ($user && $user->student) {
            $studentSubmissions = \App\Models\LmsSubmission::whereIn('assignment_id', $models->pluck('id'))
                ->where('student_id', $user->student->id)
                ->get()
                ->keyBy('assignment_id');
        }

        if ($user->teacher) {
            $classAssignments = [];
            foreach ($models as $a) {
                foreach ($a->schoolClasses as $c) {
                    if (!isset($classAssignments[$c->id])) {
                        $classAssignments[$c->id] = [
                            'class' => $c,
                            'assignments' => []
                        ];
                    }
                    $classAssignments[$c->id]['assignments'][] = $a;
                }
            }

            $teacherGrouped = collect($classAssignments)->map(function ($item, $classId) use (&$totalPendingGrading) {
                $classItems = collect($item['assignments']);
                $firstClassItem = $classItems->first();
                $classStudentsCount = $item['class']->students_count ?? 0;
                
                $subjectGroups = $classItems->groupBy('subject_id')->map(function ($subjectItems, $subjectId) use ($classId, $classStudentsCount, &$totalPendingGrading) {
                    $firstSubjectItem = $subjectItems->first();
                    
                    $tpGroups = $subjectItems->groupBy(function ($item) {
                        return $item->learning_objective_id ?? 'null';
                    });
                    
                    $objectives = $tpGroups->map(function ($tpItems, $tpId) use ($classId, $classStudentsCount, &$totalPendingGrading) {
                        $firstTp = $tpItems->first();
                        return [
                            'objective_id'          => $firstTp->learning_objective_id,
                            'objective_code'        => $firstTp->learningObjective?->code ?: ('TP ' . ($firstTp->learningObjective?->order ?? '?')),
                            'objective_description' => $firstTp->learningObjective?->description ?? 'Tanpa TP',
                            'assignments'           => $tpItems->map(function ($a) use ($classId, $classStudentsCount, &$totalPendingGrading) {
                                $classSubmissions = $a->submissions->filter(fn ($s) => $s->student?->school_class_id == $classId);
                                $classPending = $classSubmissions->whereNull('score')->count();
                                $classGraded = $classSubmissions->whereNotNull('score')->count();
                                $totalPendingGrading += $classPending;

                                return [
                                    'id'                    => $a->id,
                                    'title'                 => $a->title,
                                    'description'           => $a->description,
                                    'subject_name'          => $a->subject?->name ?? '-',
                                    'subject_id'            => $a->subject_id,
                                    'due_date'              => $a->due_date?->format('d M Y'),
                                    'max_points'            => $a->max_points,
                                    'assessment_type'       => $a->assessment_type,
                                    'instrument_type'       => $a->instrument_type,
                                    'scoring_tool'          => $a->scoring_tool,
                                    'submissions_count'     => $classSubmissions->count(),
                                    'graded_count'          => $classGraded,
                                    'pending_grading_count' => $classPending,
                                    'students_count'        => $classStudentsCount,
                                ];
                            })->values(),
                        ];
                    })->values();
                    
                    return [
                        'subject_id'   => (int) $subjectId,
                        'subject_name' => $firstSubjectItem->subject?->name ?? 'Mata Pelajaran',
                        'objectives'   => $objectives,
                    ];
                })->values();

                return [
                    'class_id'       => (int) $classId,
                    'class_name'     => $item['class']->name ?? 'Kelas',
                    'students_count' => $classStudentsCount,
                    'subjects'       => $subjectGroups,
                ];
            })->values();

            // Count assignments by type
            $countsByType = [
                'all'       => $models->count(),
                'initial'   => $models->where('assessment_type', 'initial')->count(),
                'formative' => $models->where('assessment_type', 'formative')->count(),
                'summative' => $models->where('assessment_type', 'summative')->count(),
            ];

            return Inertia::render('assignments/index', [
                'teacher_grouped'  => $teacherGrouped,
                'active_year'      => $activeYear?->name,
                'active_semester'  => $activeSemester?->name,
                'user_role'        => 'teacher',
                'stats'            => [
                    'total_pending_grading' => $totalPendingGrading,
                    'total_active'          => $totalActiveAssessments,
                ],
                'counts_by_type'   => $countsByType,
            ]);
        }

        if (in_array($user->role, ['student', 'admin'])) {
            $accessibleTpIds = [];
            if ($user->role === 'student' && $user->student) {
                $accessibleTpIds = app(AdaptiveLearningService::class)->getStudentAccessibleTpIds($user->student->id, $user->student->school_class_id);
            }

            $grouped = $models->groupBy('subject_id')->map(function ($items, $subjectId) use ($accessibleTpIds, $user, $studentSubmissions) {
                $first = $items->first();
                $tpGroups = $items->groupBy(function ($item) {
                    return $item->learning_objective_id ?? 'null';
                });
                $objectives = $tpGroups->map(function ($tpItems, $tpId) use ($accessibleTpIds, $user, $studentSubmissions) {
                    $firstTp = $tpItems->first();
                    $isAccessible = true; // Selalu izinkan siswa mengklik dan melihat detail asesmen
                    return [
                        'objective_id'          => $firstTp->learning_objective_id,
                        'objective_code'        => $firstTp->learningObjective?->code ?: ('TP ' . ($firstTp->learningObjective?->order ?? '?')),
                        'objective_description' => $firstTp->learningObjective?->description ?? 'Tanpa TP',
                        'is_accessible'         => $isAccessible,
                        'assignments'           => $tpItems->map(fn ($a) => [
                            'id'                => $a->id,
                            'title'             => $a->title,
                            'description'       => $a->description,
                            'subject_name'      => $a->subject?->name ?? '-',
                            'subject_id'        => $a->subject_id,
                            'due_date'          => $a->due_date?->format('d M Y'),
                            'max_points'        => $a->max_points,
                            'assessment_type'   => $a->assessment_type,
                            'instrument_type'   => $a->instrument_type,
                            'scoring_tool'      => $a->scoring_tool,
                            'submissions_count' => $a->submissions_count,
                            'is_accessible'     => $isAccessible,
                            'student_submission'=> isset($studentSubmissions[$a->id]) ? [
                                'id'        => $studentSubmissions[$a->id]->id,
                                'is_graded' => $studentSubmissions[$a->id]->score !== null,
                            ] : null,
                        ])->values(),
                    ];
                })->values();

                return [
                    'subject_id'   => (int) $subjectId,
                    'subject_name' => $first->subject?->name ?? '-',
                    'objectives'   => $objectives,
                    'total'        => $items->count(),
                ];
            })->values();

            return Inertia::render('assignments/index', [
                'grouped_assignments' => $grouped,
                'active_year'         => $activeYear?->name,
                'active_semester'     => $activeSemester?->name,
                'user_role'           => $user->role ?? 'student',
            ]);
        }

        $accessibleTpIds = [];
        if ($user->role === 'student' && $user->student) {
            $accessibleTpIds = app(AdaptiveLearningService::class)->getStudentAccessibleTpIds($user->student->id, $user->student->school_class_id);
        }

        $assignments = $models->map(fn ($a) => [
            'id'                => $a->id,
            'title'             => $a->title,
            'description'       => $a->description,
            'subject_name'      => $a->subject?->name ?? '-',
            'due_date'          => $a->due_date?->format('d M Y'),
            'max_points'        => $a->max_points,
            'assessment_type'   => $a->assessment_type,
            'instrument_type'   => $a->instrument_type,
            'scoring_tool'      => $a->scoring_tool,
            'is_accessible'     => true, // Selalu izinkan siswa mengklik dan melihat detail asesmen
            'student_submission'=> isset($studentSubmissions[$a->id]) ? [
                'id'        => $studentSubmissions[$a->id]->id,
                'is_graded' => $studentSubmissions[$a->id]->score !== null,
            ] : null,
        ]);

        return Inertia::render('assignments/index', [
            'assignments'     => $assignments,
            'active_year'     => $activeYear?->name,
            'active_semester' => $activeSemester?->name,
            'user_role'       => $user->role ?? ($user->teacher ? 'teacher' : 'student')
        ]);
    }

    public function create()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();
        
        // Ambil data pengampuan (Subject + Class) dari tabel teaching_assignments di Absensi
        $teachings = \App\Models\TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->whereHas('schoolClass', function($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear?->id);
            })
            ->get()
            ->map(fn ($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ]);

        // Ambil data hari libur dari Kalender Pendidikan
        $holidays = \App\Models\Calendar::where('is_holiday', true)
            ->where('start_date', '>=', now()->startOfDay())
            ->get(['title', 'start_date', 'end_date'])
            ->map(fn($h) => [
                'title' => $h->title,
                'start' => $h->start_date->format('Y-m-d'),
                'end'   => $h->end_date ? $h->end_date->format('Y-m-d') : $h->start_date->format('Y-m-d'),
            ]);

        $objectives = \App\Models\LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->doesntHave('subObjectives')
            ->get();

        return Inertia::render('assignments/create', [
            'teachings'        => $teachings,
            'objectives'       => $objectives,
            'assessment_types' => [
                ['id' => 'initial', 'name' => 'Asesmen Awal'],
                ['id' => 'formative', 'name' => 'Asesmen Formatif'],
                ['id' => 'summative', 'name' => 'Asesmen Sumatif'],
            ],
            'instruments' => [
                'initial' => [
                    ['id' => 'quiz_survey',            'name' => 'Kuis Singkat / Survei',         'icon' => 'clipboard-check', 'desc' => 'Pemetaan pemahaman dasar sebelum topik baru'],
                    ['id' => 'observation_checklist',  'name' => 'Lembar Observasi & Ceklis',     'icon' => 'eye',             'desc' => 'Pengamatan kesiapan perilaku melalui kegiatan'],
                    ['id' => 'anecdotal_notes',        'name' => 'Catatan Anekdotal',             'icon' => 'file-text',       'desc' => 'Catatan singkat pengamatan kemampuan awal'],
                ],
                'formative' => [
                    ['id' => 'reflective_journal',     'name' => 'Jurnal Reflektif',              'icon' => 'book-open',       'desc' => 'Siswa menulis refleksi pemahaman sendiri'],
                    ['id' => 'self_assessment',        'name' => 'Penilaian Diri',                'icon' => 'user-check',      'desc' => 'Siswa menilai capaian belajar mandiri'],
                    ['id' => 'peer_assessment',        'name' => 'Penilaian Antarteman',          'icon' => 'users',           'desc' => 'Siswa mengevaluasi hasil kerja teman'],
                    ['id' => 'formative_quiz',         'name' => 'Tes/Penugasan Singkat',         'icon' => 'clipboard-check', 'desc' => 'Ujian singkat atau tugas sederhana untuk memantau penguasaan materi'],
                    ['id' => 'guided_discussion',      'name' => 'Diskusi Terpandu',              'icon' => 'message-square',  'desc' => 'Dialog terstruktur untuk menilai penalaran siswa'],
                    ['id' => 'structured_assignment',   'name' => 'Penugasan Terstruktur (LKPD)',  'icon' => 'file-text',       'desc' => 'Lembar kerja untuk menilai proses berpikir'],
                    ['id' => 'exit_ticket',            'name' => 'Exit Ticket / CATs',            'icon' => 'ticket',          'desc' => 'Evaluasi cepat sebelum kelas berakhir'],
                    ['id' => 'concept_map',            'name' => 'Peta Konsep',                   'icon' => 'git-branch',      'desc' => 'Pemetaan hubungan antar konsep'],
                    ['id' => 'performance_observation','name' => 'Observasi',                     'icon' => 'activity',        'desc' => 'Mengamati keterlibatan dan perilaku murid secara berkala selama kegiatan pembelajaran'],
                    ['id' => 'performance',           'name' => 'Kinerja',                       'icon' => 'presentation',    'desc' => 'Praktik, proyek, atau produk - murid mendemonstrasikan pemahaman melalui aplikasi pada konteks nyata'],
                ],
                'summative' => [
                    ['id' => 'written_test',           'name' => 'Tes Tertulis',                  'icon' => 'pen-tool',        'desc' => 'Pilihan ganda, esai, atau uraian'],
                    ['id' => 'oral_test',              'name' => 'Tes Lisan',                     'icon' => 'mic',             'desc' => 'Tanya jawab lisan secara langsung'],
                    ['id' => 'performance',            'name' => 'Penilaian Kinerja / Unjuk Kerja','icon' => 'presentation',   'desc' => 'Praktik, presentasi, atau demonstrasi'],
                    ['id' => 'project',                'name' => 'Penilaian Proyek & Produk',     'icon' => 'folder-kanban',   'desc' => 'Evaluasi hasil karya dari perencanaan hingga pelaporan'],
                    ['id' => 'portfolio',              'name' => 'Portofolio',                    'icon' => 'briefcase',       'desc' => 'Kumpulan rekam jejak capaian siswa'],
                    ['id' => 'assignment',             'name' => 'Penugasan (Laporan/Studi Kasus)','icon' => 'file-text',     'desc' => 'Evaluasi kemampuan analisis dan penyajian hasil pemecahan masalah'],
                ],
            ],
            'holidays'         => $holidays,
            'scoring_tools' => [
                ['id' => 'rubric',           'name' => 'Rubrik',              'icon' => 'list-checks',  'desc' => 'Panduan kriteria dan level capaian bertingkat'],
                ['id' => 'rating_scale',     'name' => 'Skala Penilaian',     'icon' => 'gauge',        'desc' => 'Skala numerik/deskriptif untuk mengukur tingkat capaian'],
                ['id' => 'checklist',        'name' => 'Checklist',           'icon' => 'check-square', 'desc' => 'Daftar periksa ya/tidak untuk aspek yang dinilai'],
                ['id' => 'anecdotal_notes',  'name' => 'Catatan Anekdotal',   'icon' => 'file-text',    'desc' => 'Catatan naratif pengamatan guru'],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $validated = $request->validate([
            'assessment_type'       => 'required|in:initial,formative,summative',
            'instrument_type'       => 'nullable|string|max:50',
            'instrument_config'     => 'nullable|array',
            'scoring_tool'          => 'nullable|string|max:50',
            'scoring_tool_config'   => 'nullable|array',
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'learning_objective_id' => 'nullable|exists:lms_learning_objectives,id',
            'school_classes'        => 'required|array|min:1',
            'school_classes.*'      => 'exists:mysql_absensi.school_classes,id',
            'title'                 => 'required|string|max:255',
            'description'           => 'required|string',
            'due_date'              => 'required|date',
            'max_points'            => 'nullable|integer|min:0',
            'passing_grade'         => 'nullable|integer|min:0',
        ]);

        $validated['teacher_id'] = $teacher->id;
        $validated['academic_year_id'] = $activeYear?->id;
        $validated['semester_id'] = $activeSemester?->id;

        $assignment = LmsAssignment::create($validated);
        $assignment->schoolClasses()->sync($validated['school_classes']);

        // Kirim notifikasi ke semua siswa di kelas ini
        $subject = \App\Models\Subject::find($validated['subject_id']);
        $students = \App\Models\Student::whereIn('school_class_id', $validated['school_classes'])->pluck('user_id')->filter();

        $assessmentLabels = [
            'initial' => 'Asesmen Awal',
            'formative' => 'Asesmen Formatif',
            'summative' => 'Asesmen Sumatif',
        ];

        foreach ($students as $userId) {
            \App\Models\Notification::create([
                'user_id'  => $userId,
                'type'     => 'assignment',
                'title'    => 'Tugas Baru: ' . $assignment->title,
                'message'  => ($subject?->name ?? 'Mapel') . ' — ' . ($assessmentLabels[$assignment->assessment_type] ?? $assignment->assessment_type),
                'data'     => [
                    'assignment_id' => $assignment->id,
                    'subject_name'  => $subject?->name,
                    'assessment_type' => $assignment->assessment_type,
                ],
            ]);
        }

        return redirect()->route('assignments.index')->with('success', 'Tugas berhasil dibuat.');
    }

    public function show(Request $request, LmsAssignment $assignment)
    {
        $user = Auth::user();
        $assignment->load(['subject', 'submissions.student', 'schoolClasses']);

        $assignedClasses = $assignment->schoolClasses;
        $assignedClassIds = $assignedClasses->pluck('id')->toArray();

        // Determine active class filter (e.g. from query param or default to the first class if multiple classes exist)
        $classParam = $request->query('class_id');
        if ($classParam && in_array((int)$classParam, $assignedClassIds)) {
            $selectedClassId = (int)$classParam;
        } elseif ($classParam === 'all') {
            $selectedClassId = 'all';
        } elseif (count($assignedClassIds) > 0) {
            $selectedClassId = $assignedClassIds[0];
        } else {
            $selectedClassId = null;
        }

        $readinessStatus = null;
        if ($user->student) {
            // Biarkan siswa membuka detail asesmen untuk melihat panduan, rubrik, atau hasil penilaian dari guru.

            // Get readiness status
            $diagnosticResult = \App\Models\StudentDiagnosticResult::where('student_id', $user->student->id)
                ->where('assignment_id', $assignment->id)
                ->first();

            $readinessStatus = [
                'status' => !$diagnosticResult ? 'not_taken' : ($diagnosticResult->is_passed ? 'ready' : 'needs_intervention'),
                'diagnostic_result' => $diagnosticResult ? [
                    'score' => $diagnosticResult->total_score,
                    'threshold' => $diagnosticResult->pass_threshold,
                    'recommendations' => $diagnosticResult->recommendations,
                    'topic_breakdown' => $diagnosticResult->topic_breakdown,
                ] : null,
            ];
        }

        // Ambil komentar untuk tugas ini
        $comments = \App\Models\LmsComment::with(['user.teacher', 'user.student'])
            ->where('assignment_id', $assignment->id)
            ->latest()
            ->get()
            ->map(fn($c) => [
                'id'          => $c->id,
                'user_id'     => $c->user_id,
                'user_name'   => $c->user->name,
                'user_avatar' => $c->user?->avatar_url,
                'user_role'   => $c->user->role ?? ($c->user->teacher ? 'teacher' : 'student'),
                'body'        => $c->body,
                'created_at'  => $c->created_at->diffForHumans(),
            ]);

        $mySubmission = null;
        $myReflection = null;
        if ($user->student) {
            $mySubmission = \App\Models\LmsSubmission::where('assignment_id', $assignment->id)
                ->where('student_id', $user->student->id)
                ->first();
            
            $myReflection = \App\Models\LmsReflection::where('assignment_id', $assignment->id)
                ->where('student_id', $user->student->id)
                ->first();
        }

        $students = [];
        if ($user->teacher) {
            $studentsQuery = \App\Models\Student::query();
            if ($selectedClassId && $selectedClassId !== 'all') {
                $studentsQuery->where('school_class_id', $selectedClassId);
            } elseif (!empty($assignedClassIds)) {
                $studentsQuery->whereIn('school_class_id', $assignedClassIds);
            }

            $students = $studentsQuery->with('schoolClass')
                ->orderBy('name')
                ->get()
                ->map(fn($s) => [
                    'id'              => $s->id,
                    'name'            => $s->name,
                    'nis'             => $s->nis,
                    'photo_url'       => $s->photo_url,
                    'school_class_id' => $s->school_class_id,
                    'school_class'    => $s->schoolClass?->name,
                ]);
        }

        // Available peers for peer assessment (student viewing)
        $availablePeers = [];
        if ($user->student && $assignment->instrument_type === 'peer_assessment' && $assignedClasses->count() > 0) {
            $classmates = \App\Models\Student::whereIn('school_class_id', $assignedClassIds)
                ->where('id', '!=', $user->student->id)
                ->orderBy('name')
                ->get();

            // Collect peer_student_ids already selected by other students
            $selectedPeerIds = \App\Models\LmsSubmission::where('assignment_id', $assignment->id)
                ->whereNotNull('content')
                ->get()
                ->map(function ($submission) {
                    $content = json_decode($submission->content, true);
                    return $content['peer_student_id'] ?? null;
                })
                ->filter()
                ->unique()
                ->values()
                ->toArray();

            // If current student already submitted, allow them to keep their selection
            if ($mySubmission && $mySubmission->content) {
                $myContent = json_decode($mySubmission->content, true);
                $myPeerId = $myContent['peer_student_id'] ?? null;
                $selectedPeerIds = array_values(array_filter($selectedPeerIds, fn($id) => (int) $id !== (int) $myPeerId));
            }

            $availablePeers = $classmates
                ->reject(fn($s) => in_array($s->id, $selectedPeerIds))
                ->values()
                ->map(fn($s) => [
                    'id'        => $s->id,
                    'name'      => $s->name,
                    'nis'       => $s->nis,
                    'photo_url' => $s->photo_url,
                ]);
        }

        $getIsPassed = function ($s) use ($assignment) {
            return $assignment->evaluateKetuntasan($s);
        };


        $instrumentConfig = $assignment->instrument_config;
        if (is_string($instrumentConfig)) {
            $instrumentConfig = json_decode($instrumentConfig, true) ?: [];
        }

        // If a student is accessing, apply shuffle settings if enabled
        if ($user->student && !empty($instrumentConfig['questions']) && is_array($instrumentConfig['questions'])) {
            $questions = $instrumentConfig['questions'];
            $seed = (int) $user->student->id + (int) $assignment->id + (int) ($mySubmission?->attempts ?? 0);

            if (!empty($instrumentConfig['shuffle_questions'])) {
                mt_srand($seed);
                for ($i = count($questions) - 1; $i > 0; $i--) {
                    $j = mt_rand(0, $i);
                    $tmp = $questions[$i];
                    $questions[$i] = $questions[$j];
                    $questions[$j] = $tmp;
                }
            }

            if (!empty($instrumentConfig['shuffle_options'])) {
                foreach ($questions as $qIdx => &$q) {
                    if (!empty($q['options']) && is_array($q['options'])) {
                        $opts = $q['options'];
                        mt_srand($seed + ($qIdx + 1) * 31);
                        for ($i = count($opts) - 1; $i > 0; $i--) {
                            $j = mt_rand(0, $i);
                            $tmp = $opts[$i];
                            $opts[$i] = $opts[$j];
                            $opts[$j] = $tmp;
                        }
                        $q['options'] = $opts;
                    }
                }
                unset($q);
            }

            $instrumentConfig['questions'] = $questions;
        }

        return Inertia::render('assignments/show', [
            'assignment' => [
                'id'                => $assignment->id,
                'title'             => $assignment->title,
                'description'       => $assignment->description,
                'subject'           => $assignment->subject?->name,
                'school_classes'    => $assignment->schoolClasses->map(fn($c) => ['id' => $c->id, 'name' => $c->name]),
                'due_date'          => $assignment->due_date?->format('d M Y, H:i'),
                'max_points'        => $assignment->max_points,
                'passing_grade'     => $assignment->passing_grade,
                'assessment_type'   => $assignment->assessment_type,
                'instrument_type'   => $assignment->instrument_type,
                'instrument_config' => $instrumentConfig,
                'scoring_tool'      => $assignment->scoring_tool,
                'scoring_tool_config' => $assignment->scoring_tool_config,
                'submissions'       => $assignment->submissions->map(fn ($s) => [
                    'id'               => $s->id,
                    'student_id'       => $s->student_id,
                    'student_name'     => $s->student?->name ?? 'Unknown',
                    'student_photo_url'=> $s->student?->photo_url,
                    'content'          => $s->content,
                    'file_path'        => $s->file_path,
                    'score'            => $s->score,
                    'attempts'         => $s->attempts,
                    'is_remedial_open' => (bool) $s->is_remedial_open,
                    'remedial_history' => $s->remedial_history,
                    'is_passed'        => $getIsPassed($s),
                    'feedback'         => $s->feedback,
                    'submitted_at'     => $s->created_at->format('d M Y, H:i'),
                ]),
            ],
            'students'      => $students,
            'comments'      => $comments,
            'my_submission' => $mySubmission ? [
                'id'               => $mySubmission->id,
                'content'          => $mySubmission->content,
                'file_path'        => $mySubmission->file_path,
                'score'            => $mySubmission->score,
                'attempts'         => $mySubmission->attempts,
                'is_remedial_open' => (bool) $mySubmission->is_remedial_open,
                'remedial_history' => $mySubmission->remedial_history,
                'is_passed'        => $getIsPassed($mySubmission),
                'feedback'         => $mySubmission->feedback,
                'submitted_at'     => $mySubmission->created_at->format('d M Y, H:i'),
            ] : null,
            'my_reflection'     => $myReflection,
            'user_role'         => $user->role ?? ($user->teacher ? 'teacher' : 'student'),
            'auth_id'           => $user->id,
            'available_peers'   => $availablePeers,
            'readiness_status'  => $readinessStatus,
            'selected_class_id' => $selectedClassId,
            'assigned_classes'  => $assignedClasses->map(fn($c) => [
                'id'             => $c->id,
                'name'           => $c->name,
                'students_count' => \App\Models\Student::where('school_class_id', $c->id)->count(),
            ]),
        ]);
    }

    public function submit(Request $request, LmsAssignment $assignment, AdaptiveLearningService $adaptiveService)
    {
        $student = Auth::user()->student;

        // Validasi batas akhir pengumpulan
        $isLate = false;
        if ($assignment->due_date && now()->gt($assignment->due_date)) {
            $isLate = true;
        }

        $validated = $request->validate([
            'content'               => 'nullable|string',
            'file'                  => 'nullable|file|mimes:pdf,doc,docx,png,jpg,jpeg|max:10240',
            'score'                 => 'nullable|integer',
            'is_offline_submission' => 'nullable|boolean',
        ]);

        $contentData = json_decode($validated['content'] ?? '{}', true);
        if (!empty($validated['is_offline_submission'])) {
            $contentData['submitted_offline'] = true;
        } else {
            unset($contentData['submitted_offline']);
        }
        $validated['content'] = json_encode($contentData);

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('submissions/' . $assignment->id, 'public');
        }

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->first();

        if ($assignment->assessment_type === 'summative' && $submission && !$submission->is_remedial_open) {
            return back()->withErrors(['content' => 'Anda tidak dapat memperbarui jawaban asesmen sumatif yang sudah dikirim kecuali remedial dibuka oleh guru.']);
        }

        $score = $request->score;

        // Auto-grade quizzes if score is not provided
        if ($score === null && in_array($assignment->instrument_type, ['written_test', 'formative_quiz', 'quiz_survey'])) {
            $config = is_array($assignment->instrument_config) ? $assignment->instrument_config : json_decode($assignment->instrument_config ?? '[]', true);
            $questions = $config['questions'] ?? [];
            $submittedData = json_decode($validated['content'] ?? '[]', true);
            $answers = $submittedData['answers'] ?? [];

            $calculatedScore = 0;
            $maxScore = 0;
            $allAutoGradable = true;

            foreach ($questions as $q) {
                $points = $q['points'] ?? 1;
                $maxScore += $points;

                if (($q['type'] ?? '') === 'multiple_choice') {
                    $correctAnswerId = null;
                    if (isset($q['answer']) && $q['answer'] !== '') {
                        $correctAnswerId = $q['answer'];
                    } else {
                        $correctOption = collect($q['options'] ?? [])->firstWhere('is_correct', true);
                        if ($correctOption) {
                            $correctAnswerId = $correctOption['id'] ?? null;
                        }
                    }

                    if ($correctAnswerId !== null) {
                        $studentAnswer = $answers[$q['id']] ?? null;
                        if ($studentAnswer !== null) {
                            $normStudent = strtolower(trim((string)$studentAnswer));
                            $normCorrect = strtolower(trim((string)$correctAnswerId));
                            if (
                                $normStudent === $normCorrect ||
                                (strlen($normStudent) === 1 && str_starts_with($normCorrect, $normStudent)) ||
                                (strlen($normCorrect) === 1 && str_starts_with($normStudent, $normCorrect))
                            ) {
                                $calculatedScore += $points;
                            }
                        }
                    } else {
                        $allAutoGradable = false;
                    }
                } else if (($q['type'] ?? '') === 'short_answer') {
                    $correctAnswer = null;
                    if (isset($q['answer']) && trim($q['answer']) !== '') {
                        $correctAnswer = trim($q['answer']);
                    } else if (isset($q['correct_answer']) && trim($q['correct_answer']) !== '') {
                        $correctAnswer = trim($q['correct_answer']);
                    }

                    if ($correctAnswer !== null) {
                        $studentAnswer = strtolower(trim($answers[$q['id']] ?? ''));
                        if (strtolower($studentAnswer) === strtolower($correctAnswer)) {
                            $calculatedScore += $points;
                        }
                    } else {
                        $allAutoGradable = false;
                    }
                } else {
                    // Essay or other types cannot be auto-graded perfectly
                    $allAutoGradable = false;
                }
            }

            if ($allAutoGradable && count($questions) > 0) {
                // Scale score to assignment's max_points
                if ($assignment->max_points > 0 && $maxScore > 0) {
                    $score = round(($calculatedScore / $maxScore) * $assignment->max_points);
                } else {
                    $score = $calculatedScore;
                }
            }
        }

        $submissionRecord = null;
        if ($submission) {
            $history = $submission->remedial_history ?? [];
            if ($submission->is_remedial_open || $assignment->instrument_type === 'formative_quiz') {
                $history[] = [
                    'attempt' => $submission->attempts,
                    'score' => $submission->score,
                    'submitted_at' => $submission->submitted_at ? $submission->submitted_at->toDateTimeString() : now()->toDateTimeString(),
                ];

                \App\Models\LmsRemedialRecord::where([
                    'assignment_id' => $assignment->id,
                    'student_id'    => $student->id,
                    'status'        => 'assigned',
                ])->update(['status' => 'in_progress']);
            }

            $submission->update([
                'content'          => $validated['content'],
                'file_path'        => $filePath ?? $submission->file_path,
                'submitted_at'     => now(),
                'attempts'         => $submission->attempts + 1,
                'score'            => $score,
                'is_remedial_open' => false,
                'remedial_history' => $history,
            ]);
            $submissionRecord = $submission;
        } else {
            $submissionRecord = LmsSubmission::create([
                'assignment_id'    => $assignment->id,
                'student_id'       => $student->id,
                'content'          => $validated['content'],
                'file_path'        => $filePath,
                'submitted_at'     => now(),
                'attempts'         => 1,
                'is_remedial_open' => false,
                'remedial_history' => null,
                'score'            => $score,
            ]);
        }

        // Kirim notifikasi ke guru bahwa ada tugas baru dikumpulkan / diperbarui
        if ($assignment->teacher_id && $assignment->teacher) {
            $isResubmission = $submission ? true : false;
            \App\Models\Notification::create([
                'user_id' => $assignment->teacher->user_id,
                'type'    => 'submission',
                'title'   => ($isResubmission ? 'Tugas Diperbarui: ' : 'Tugas Dikumpulkan: ') . $assignment->title,
                'message' => $student->name . ($isResubmission ? ' memperbarui tugas ' : ' mengumpulkan tugas ') . $assignment->title,
                'data'    => [
                    'assignment_id' => $assignment->id,
                    'student_id'    => $student->id,
                    'student_name'  => $student->name,
                ],
            ]);
        }

        // Auto-analyze diagnostic results for initial assessments
        if ($assignment->assessment_type === 'initial') {
            $adaptiveService->analyzeDiagnostic($submissionRecord);
        }

        if ($isLate) {
            return back()->with('success', 'Tugas berhasil dikumpulkan (terlambat — melewati batas akhir pengumpulan).');
        }

        return back()->with('success', 'Tugas berhasil dikumpulkan.');
    }

    /**
     * Upload physical proof by teacher on behalf of the student
     */
    public function uploadProof(Request $request, LmsAssignment $assignment)
    {
        $user = Auth::user();
        if (!$user->teacher) {
            abort(403, 'Hanya guru yang dapat mengunggah bukti fisik.');
        }

        $validated = $request->validate([
            'student_id' => 'required|exists:mysql_absensi.students,id',
            'file'       => 'required|file|mimes:pdf,doc,docx,png,jpg,jpeg|max:10240',
        ]);

        $filePath = $request->file('file')->store('submissions/' . $assignment->id, 'public');

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $validated['student_id'])
            ->first();

        if ($submission) {
            $submission->update([
                'file_path' => $filePath,
                'submitted_at' => now(),
            ]);
        } else {
            LmsSubmission::create([
                'assignment_id'    => $assignment->id,
                'student_id'       => $validated['student_id'],
                'content'          => json_encode(['submitted_offline' => true]),
                'file_path'        => $filePath,
                'submitted_at'     => now(),
                'attempts'         => 1,
                'is_remedial_open' => false,
            ]);
        }

        return back()->with('success', 'Bukti fisik berhasil diunggah.');
    }

    public function gradeView(Request $request, LmsAssignment $assignment)
    {
        $user = Auth::user();
        if (!$user->teacher) {
            abort(403, 'Hanya guru yang dapat mengakses halaman penilaian ini.');
        }

        $assignment->load(['subject', 'submissions.student', 'schoolClasses']);

        $assignedClasses = $assignment->schoolClasses;
        $assignedClassIds = $assignedClasses->pluck('id')->toArray();

        $classParam = $request->query('class_id');
        if ($classParam && in_array((int)$classParam, $assignedClassIds)) {
            $selectedClassId = (int)$classParam;
        } elseif ($classParam === 'all') {
            $selectedClassId = 'all';
        } elseif (count($assignedClassIds) > 0) {
            $selectedClassId = $assignedClassIds[0];
        } else {
            $selectedClassId = null;
        }

        $studentsQuery = \App\Models\Student::query();
        if ($selectedClassId && $selectedClassId !== 'all') {
            $studentsQuery->where('school_class_id', $selectedClassId);
        } elseif (!empty($assignedClassIds)) {
            $studentsQuery->whereIn('school_class_id', $assignedClassIds);
        }

        $students = $studentsQuery->with('schoolClass')
            ->orderBy('name')
            ->get()
            ->map(fn($s) => [
                'id'              => $s->id,
                'name'            => $s->name,
                'nis'             => $s->nis,
                'photo_url'       => $s->photo_url,
                'school_class_id' => $s->school_class_id,
                'school_class'    => $s->schoolClass?->name,
            ]);

        return Inertia::render('assignments/grade-split', [
            'assignment' => [
                'id'                => $assignment->id,
                'title'             => $assignment->title,
                'description'       => $assignment->description,
                'subject'           => $assignment->subject?->name,
                'max_points'        => $assignment->max_points,
                'instrument_type'   => $assignment->instrument_type,
                'instrument_config' => $assignment->instrument_config,
                'scoring_tool'      => $assignment->scoring_tool,
                'scoring_tool_config' => $assignment->scoring_tool_config,
                'submissions'       => $assignment->submissions->map(fn ($s) => [
                    'id'               => $s->id,
                    'student_id'       => $s->student_id,
                    'student_name'     => $s->student?->name ?? 'Unknown',
                    'content'          => $s->content,
                    'file_path'        => $s->file_path,
                    'score'            => $s->score,
                    'kktp_details'     => $s->kktp_details,
                    'feedback'         => $s->feedback,
                    'submitted_at'     => $s->created_at->format('d M Y, H:i'),
                ]),
            ],
            'students'          => $students,
            'selected_class_id' => $selectedClassId,
            'assigned_classes'  => $assignedClasses->map(fn($c) => [
                'id'             => $c->id,
                'name'           => $c->name,
                'students_count' => \App\Models\Student::where('school_class_id', $c->id)->count(),
            ]),
        ]);
    }

    public function grade(Request $request)
    {
        $validated = $request->validate([
            'assignment_id'     => 'required|exists:lms_assignments,id',
            'student_id'        => 'required|exists:mysql_absensi.students,id',
            'score'             => 'nullable|integer|min:0',
            'qualitative_score' => 'nullable|string',
            'kktp_details'      => 'nullable|array',
            'feedback'          => 'nullable|string',
            'content'           => 'nullable|string', // Untuk data observasi/kuis terstruktur
        ]);

        $submission = \App\Models\LmsSubmission::updateOrCreate(
            [
                'assignment_id' => $validated['assignment_id'],
                'student_id'    => $validated['student_id'],
            ],
            [
                'score'             => $validated['score'] ?? null,
                'qualitative_score' => $validated['qualitative_score'] ?? null,
                'kktp_details'      => $validated['kktp_details'] ?? null,
                'feedback'          => $validated['feedback'] ?? null,
                'content'           => $validated['content'] ?? null,
                'submitted_at'      => now(),
            ]
        );

        // Sync with LmsRemedialRecord if exists
        \App\Models\LmsRemedialRecord::where([
            'assignment_id' => $validated['assignment_id'],
            'student_id'    => $validated['student_id'],
        ])
        ->whereIn('status', ['assigned', 'in_progress'])
        ->update([
            'remedial_score' => $validated['score'],
            'status'         => 'completed',
        ]);

        // Auto-analyze diagnostic results for initial assessments
        $assignment = \App\Models\LmsAssignment::find($validated['assignment_id']);
        if ($assignment && $assignment->assessment_type === 'initial') {
            app(\App\Services\AdaptiveLearningService::class)->analyzeDiagnostic($submission);
        }

        return back()->with('success', 'Penilaian berhasil disimpan.');
    }

    public function openRemedial(Request $request)
    {
        $validated = $request->validate([
            'assignment_id' => 'required|exists:lms_assignments,id',
            'student_id'    => 'required|exists:mysql_absensi.students,id',
        ]);

        $submission = \App\Models\LmsSubmission::where('assignment_id', $validated['assignment_id'])
            ->where('student_id', $validated['student_id'])
            ->first();

        if ($submission) {
            $submission->update([
                'is_remedial_open' => true,
            ]);

            $assignment = LmsAssignment::find($validated['assignment_id']);
            \App\Models\LmsRemedialRecord::updateOrCreate(
                [
                    'assignment_id' => $validated['assignment_id'],
                    'student_id'    => $validated['student_id'],
                    'teacher_id'    => $assignment->teacher_id,
                ],
                [
                    'subject_id'    => $assignment->subject_id,
                    'type'          => 'remedial',
                    'initial_score' => $submission->score,
                    'status'        => 'assigned',
                ]
            );
        }

        return back()->with('success', 'Remedial berhasil dibuka untuk siswa ini.');
    }

    public function edit(LmsAssignment $assignment)
    {
        $teacher = Auth::user()->teacher;

        if ($assignment->teacher_id !== $teacher?->id) {
            abort(403, 'Unauthorized action.');
        }

        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $teachings = \App\Models\TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->whereHas('schoolClass', function($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear?->id);
            })
            ->get()
            ->map(fn ($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ]);

        $objectives = \App\Models\LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->where(function ($query) use ($assignment) {
                $query->doesntHave('subObjectives')
                      ->orWhere('id', $assignment->learning_objective_id);
            })
            ->get();

        $holidays = \App\Models\Calendar::where('is_holiday', true)
            ->where('start_date', '>=', now()->startOfDay())
            ->get(['title', 'start_date', 'end_date'])
            ->map(fn($h) => [
                'title' => $h->title,
                'start' => $h->start_date->format('Y-m-d'),
                'end'   => $h->end_date ? $h->end_date->format('Y-m-d') : $h->start_date->format('Y-m-d'),
            ]);

        return Inertia::render('assignments/edit', [
            'assignment' => [
                'id'                  => $assignment->id,
                'title'               => $assignment->title,
                'description'         => $assignment->description,
                'subject_id'          => $assignment->subject_id,
                'school_classes'      => $assignment->schoolClasses->pluck('id'),
                'learning_objective_id' => $assignment->learning_objective_id,
                'assessment_type'     => $assignment->assessment_type,
                'instrument_type'     => $assignment->instrument_type,
                'instrument_config'   => $assignment->instrument_config,
                'scoring_tool'        => $assignment->scoring_tool,
                'scoring_tool_config'  => $assignment->scoring_tool_config,
                'due_date'            => $assignment->due_date?->format('Y-m-d\TH:i'),
                'max_points'          => $assignment->max_points,
                'passing_grade'       => $assignment->passing_grade,
            ],
            'teachings'        => $teachings,
            'objectives'       => $objectives,
            'holidays'         => $holidays,
            'assessment_types' => [
                ['id' => 'initial', 'name' => 'Asesmen Awal'],
                ['id' => 'formative', 'name' => 'Asesmen Formatif'],
                ['id' => 'summative', 'name' => 'Asesmen Sumatif'],
            ],
            'instruments' => [
                'initial' => [
                    ['id' => 'quiz_survey',            'name' => 'Kuis Singkat / Survei',         'icon' => 'clipboard-check', 'desc' => 'Pemetaan pemahaman dasar sebelum topik baru'],
                    ['id' => 'observation_checklist',  'name' => 'Lembar Observasi & Ceklis',     'icon' => 'eye',             'desc' => 'Pengamatan kesiapan perilaku melalui kegiatan'],
                    ['id' => 'anecdotal_notes',        'name' => 'Catatan Anekdotal',             'icon' => 'file-text',       'desc' => 'Catatan singkat pengamatan kemampuan awal'],
                ],
                'formative' => [
                    ['id' => 'reflective_journal',     'name' => 'Jurnal Reflektif',              'icon' => 'book-open',       'desc' => 'Siswa menulis refleksi pemahaman sendiri'],
                    ['id' => 'self_assessment',        'name' => 'Penilaian Diri',                'icon' => 'user-check',      'desc' => 'Siswa menilai capaian belajar mandiri'],
                    ['id' => 'peer_assessment',        'name' => 'Penilaian Antarteman',          'icon' => 'users',           'desc' => 'Siswa mengevaluasi hasil kerja teman'],
                    ['id' => 'formative_quiz',         'name' => 'Tes/Penugasan Singkat',         'icon' => 'clipboard-check', 'desc' => 'Ujian singkat atau tugas sederhana untuk memantau penguasaan materi'],
                    ['id' => 'guided_discussion',      'name' => 'Diskusi Terpandu',              'icon' => 'message-square',  'desc' => 'Dialog terstruktur untuk menilai penalaran siswa'],
                    ['id' => 'structured_assignment',   'name' => 'Penugasan Terstruktur (LKPD)',  'icon' => 'file-text',       'desc' => 'Lembar kerja untuk menilai proses berpikir'],
                    ['id' => 'exit_ticket',            'name' => 'Exit Ticket / CATs',            'icon' => 'ticket',          'desc' => 'Evaluasi cepat sebelum kelas berakhir'],
                    ['id' => 'concept_map',            'name' => 'Peta Konsep',                   'icon' => 'git-branch',      'desc' => 'Pemetaan hubungan antar konsep'],
                    ['id' => 'performance_observation','name' => 'Observasi',                     'icon' => 'activity',        'desc' => 'Mengamati keterlibatan dan perilaku murid secara berkala selama kegiatan pembelajaran'],
                    ['id' => 'performance',           'name' => 'Kinerja',                       'icon' => 'presentation',    'desc' => 'Praktik, proyek, atau produk - murid mendemonstrasikan pemahaman melalui aplikasi pada konteks nyata'],
                ],
                'summative' => [
                    ['id' => 'written_test',           'name' => 'Tes Tertulis',                  'icon' => 'pen-tool',        'desc' => 'Pilihan ganda, esai, atau uraian'],
                    ['id' => 'oral_test',              'name' => 'Tes Lisan',                     'icon' => 'mic',             'desc' => 'Tanya jawab lisan secara langsung'],
                    ['id' => 'performance',            'name' => 'Penilaian Kinerja / Unjuk Kerja','icon' => 'presentation',   'desc' => 'Praktik, presentasi, atau demonstrasi'],
                    ['id' => 'project',                'name' => 'Penilaian Proyek & Produk',     'icon' => 'folder-kanban',   'desc' => 'Evaluasi hasil karya dari perencanaan hingga pelaporan'],
                    ['id' => 'portfolio',              'name' => 'Portofolio',                    'icon' => 'briefcase',       'desc' => 'Kumpulan rekam jejak capaian siswa'],
                    ['id' => 'assignment',             'name' => 'Penugasan (Laporan/Studi Kasus)','icon' => 'file-text',     'desc' => 'Evaluasi kemampuan analisis dan penyajian hasil pemecahan masalah'],
                ],
            ],
            'scoring_tools' => [
                ['id' => 'rubric',           'name' => 'Rubrik',              'icon' => 'list-checks',  'desc' => 'Panduan kriteria dan level capaian bertingkat'],
                ['id' => 'rating_scale',     'name' => 'Skala Penilaian',     'icon' => 'gauge',        'desc' => 'Skala numerik/deskriptif untuk mengukur tingkat capaian'],
                ['id' => 'checklist',        'name' => 'Checklist',           'icon' => 'check-square', 'desc' => 'Daftar periksa ya/tidak untuk aspek yang dinilai'],
                ['id' => 'anecdotal_notes',  'name' => 'Catatan Anekdotal',   'icon' => 'file-text',    'desc' => 'Catatan naratif pengamatan guru'],
            ],
        ]);
    }

    public function update(Request $request, LmsAssignment $assignment)
    {
        $teacher = Auth::user()->teacher;

        if ($assignment->teacher_id !== $teacher?->id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'assessment_type'       => 'required|in:initial,formative,summative',
            'instrument_type'       => 'nullable|string|max:50',
            'instrument_config'     => 'nullable|array',
            'scoring_tool'          => 'nullable|string|max:50',
            'scoring_tool_config'   => 'nullable|array',
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'learning_objective_id' => 'nullable|exists:lms_learning_objectives,id',
            'school_classes'        => 'required|array|min:1',
            'school_classes.*'      => 'exists:mysql_absensi.school_classes,id',
            'title'                 => 'required|string|max:255',
            'description'           => 'required|string',
            'due_date'              => 'required|date',
            'max_points'            => 'required|integer|min:0',
            'passing_grade'         => 'nullable|integer|min:0',
        ]);

        $assignment->update($validated);
        $assignment->schoolClasses()->sync($validated['school_classes']);

        return redirect()->route('assignments.show', $assignment->id)->with('success', 'Tugas berhasil diperbarui.');
    }

    public function destroy(LmsAssignment $assignment)
    {
        DB::transaction(function () use ($assignment) {
            \App\Models\StudentDiagnosticResult::where('assignment_id', $assignment->id)->delete();
            \App\Models\LmsRemedialRecord::where('assignment_id', $assignment->id)->delete();
            \App\Models\LmsReflection::where('assignment_id', $assignment->id)->delete();
            \App\Models\LmsComment::where('assignment_id', $assignment->id)->delete();
            $assignment->schoolClasses()->detach();
            $assignment->submissions()->delete();
            $assignment->delete();
        });

        return redirect()->route('assignments.index')->with('success', 'Tugas berhasil dihapus.');
    }
}
