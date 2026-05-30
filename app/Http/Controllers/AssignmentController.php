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

        $query = LmsAssignment::with(['subject', 'schoolClass', 'learningObjective'])
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        if ($user->role === 'admin') {
            // admin can see all
        } elseif ($user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->student) {
            $query->where('school_class_id', $user->student->school_class_id);
        }

        $models = $query->withCount('submissions')->latest()->get();

        if ($user->teacher) {
            $teacherGrouped = $models->groupBy('school_class_id')->map(function ($classItems, $classId) {
                $first = $classItems->first();
                $tpGroups = $classItems->groupBy(function ($item) {
                    return $item->learning_objective_id ?? 'null';
                });
                $objectives = $tpGroups->map(function ($tpItems, $tpId) {
                    $firstTp = $tpItems->first();
                    return [
                        'objective_id'          => $firstTp->learning_objective_id,
                        'objective_code'        => $firstTp->learningObjective?->code ?: ('TP ' . ($firstTp->learningObjective?->order ?? '?')),
                        'objective_description' => $firstTp->learningObjective?->description ?? 'Tanpa TP',
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
                        ])->values(),
                    ];
                })->values();
                return [
                    'class_id'   => (int) $classId,
                    'class_name' => $first->schoolClass?->name ?? 'Kelas',
                    'objectives' => $objectives,
                ];
            })->values();

            return Inertia::render('assignments/index', [
                'teacher_grouped'  => $teacherGrouped,
                'active_year'      => $activeYear?->name,
                'active_semester'  => $activeSemester?->name,
                'user_role'        => 'teacher',
            ]);
        }

        if (in_array($user->role, ['student', 'admin'])) {
            $accessibleTpIds = [];
            if ($user->role === 'student' && $user->student) {
                $accessibleTpIds = app(AdaptiveLearningService::class)->getStudentAccessibleTpIds($user->student->id, $user->student->school_class_id);
            }

            $grouped = $models->groupBy('subject_id')->map(function ($items, $subjectId) use ($accessibleTpIds, $user) {
                $first = $items->first();
                $tpGroups = $items->groupBy(function ($item) {
                    return $item->learning_objective_id ?? 'null';
                });
                $objectives = $tpGroups->map(function ($tpItems, $tpId) use ($accessibleTpIds, $user) {
                    $firstTp = $tpItems->first();
                    $isAccessible = $user->role === 'admin' || $tpId === 'null' || in_array($firstTp->learning_objective_id, $accessibleTpIds);
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
            'submissions_count' => $a->submissions_count,
            'is_accessible'     => $user->role === 'admin' || $user->role === 'teacher' || !$a->learning_objective_id || in_array($a->learning_objective_id, $accessibleTpIds),
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
                    ['id' => 'formative_quiz',         'name' => 'Kuis Formatif',                 'icon' => 'clipboard-check', 'desc' => 'Tes singkat untuk mengecek pemahaman selama proses belajar'],
                    ['id' => 'guided_discussion',      'name' => 'Diskusi Terpandu',              'icon' => 'message-square',  'desc' => 'Dialog terstruktur untuk menilai penalaran siswa'],
                    ['id' => 'structured_assignment',   'name' => 'Penugasan Terstruktur (LKPD)',  'icon' => 'file-text',       'desc' => 'Lembar kerja untuk menilai proses berpikir'],
                    ['id' => 'exit_ticket',            'name' => 'Exit Ticket / CATs',            'icon' => 'ticket',          'desc' => 'Evaluasi cepat sebelum kelas berakhir'],
                    ['id' => 'concept_map',            'name' => 'Peta Konsep',                   'icon' => 'git-branch',      'desc' => 'Pemetaan hubungan antar konsep'],
                    ['id' => 'performance_observation','name' => 'Observasi Kinerja',             'icon' => 'activity',        'desc' => 'Pengamatan partisipasi dan diskusi siswa'],
                ],
                'summative' => [
                    ['id' => 'written_test',           'name' => 'Tes Tertulis',                  'icon' => 'pen-tool',        'desc' => 'Pilihan ganda, esai, atau uraian'],
                    ['id' => 'oral_test',              'name' => 'Tes Lisan',                     'icon' => 'mic',             'desc' => 'Tanya jawab lisan secara langsung'],
                    ['id' => 'performance',            'name' => 'Penilaian Kinerja / Unjuk Kerja','icon' => 'presentation',   'desc' => 'Praktik, presentasi, atau demonstrasi'],
                    ['id' => 'project',                'name' => 'Penilaian Proyek & Produk',     'icon' => 'folder-kanban',   'desc' => 'Evaluasi hasil karya dari perencanaan hingga pelaporan'],
                    ['id' => 'portfolio',              'name' => 'Portofolio',                    'icon' => 'briefcase',       'desc' => 'Kumpulan rekam jejak capaian siswa'],
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
            'school_class_id'       => 'required|exists:mysql_absensi.school_classes,id',
            'title'                 => 'required|string|max:255',
            'description'           => 'required|string',
            'due_date'              => 'required|date',
            'max_points'            => 'required|integer|min:0',
        ]);

        $validated['teacher_id'] = $teacher->id;
        $validated['academic_year_id'] = $activeYear?->id;
        $validated['semester_id'] = $activeSemester?->id;

        $assignment = LmsAssignment::create($validated);

        // Kirim notifikasi ke semua siswa di kelas ini
        $subject = \App\Models\Subject::find($validated['subject_id']);
        $students = \App\Models\Student::where('school_class_id', $validated['school_class_id'])->pluck('user_id')->filter();

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

    public function show(LmsAssignment $assignment)
    {
        $user = Auth::user();
        $assignment->load(['subject', 'submissions.student']);

        // Ambil komentar untuk tugas ini
        $comments = \App\Models\LmsComment::with('user')
            ->where('assignment_id', $assignment->id)
            ->latest()
            ->get()
            ->map(fn($c) => [
                'id'         => $c->id,
                'user_id'    => $c->user_id,
                'user_name'  => $c->user->name,
                'user_role'  => $c->user->role ?? ($c->user->teacher ? 'teacher' : 'student'),
                'body'       => $c->body,
                'created_at' => $c->created_at->diffForHumans(),
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
            $students = \App\Models\Student::where('school_class_id', $assignment->school_class_id)
                ->orderBy('name')
                ->get()
                ->map(fn($s) => [
                    'id'   => $s->id,
                    'name' => $s->name,
                    'nis'  => $s->nis,
                ]);
        }

        // Available peers for peer assessment (student viewing)
        $availablePeers = [];
        if ($user->student && $assignment->instrument_type === 'peer_assessment' && $assignment->school_class_id) {
            $classmates = \App\Models\Student::where('school_class_id', $assignment->school_class_id)
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
                    'id'   => $s->id,
                    'name' => $s->name,
                    'nis'  => $s->nis,
                ]);
        }

        return Inertia::render('assignments/show', [
            'assignment' => [
                'id'                => $assignment->id,
                'title'             => $assignment->title,
                'description'       => $assignment->description,
                'subject'           => $assignment->subject?->name,
                'school_class_id'   => $assignment->school_class_id,
                'due_date'          => $assignment->due_date?->format('d M Y, H:i'),
                'max_points'        => $assignment->max_points,
                'passing_grade'     => $assignment->passing_grade,
                'assessment_type'   => $assignment->assessment_type,
                'instrument_type'   => $assignment->instrument_type,
                'instrument_config' => $assignment->instrument_config,
                'scoring_tool'      => $assignment->scoring_tool,
                'scoring_tool_config' => $assignment->scoring_tool_config,
                'submissions'       => $assignment->submissions->map(fn ($s) => [
                    'id'           => $s->id,
                    'student_id'   => $s->student_id,
                    'student_name' => $s->student?->name ?? 'Unknown',
                    'content'      => $s->content,
                    'file_path'    => $s->file_path,
                    'score'        => $s->score,
                    'attempts'     => $s->attempts,
                    'is_passed'    => $s->score !== null && $s->score >= ($assignment->passing_grade ?? 70),
                    'feedback'     => $s->feedback,
                    'submitted_at' => $s->created_at->format('d M Y, H:i'),
                ]),
            ],
            'students'      => $students,
            'comments'      => $comments,
            'my_submission' => $mySubmission ? [
                'id'           => $mySubmission->id,
                'content'      => $mySubmission->content,
                'file_path'    => $mySubmission->file_path,
                'score'        => $mySubmission->score,
                'attempts'     => $mySubmission->attempts,
                'is_passed'    => $mySubmission->score !== null && $mySubmission->score >= ($assignment->passing_grade ?? 70),
                'feedback'     => $mySubmission->feedback,
                'submitted_at' => $mySubmission->created_at->format('d M Y, H:i'),
            ] : null,
            'my_reflection'   => $myReflection,
            'user_role'       => $user->role ?? ($user->teacher ? 'teacher' : 'student'),
            'auth_id'         => $user->id,
            'available_peers' => $availablePeers,
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
            'content' => 'nullable|string',
            'file'    => 'nullable|file|mimes:pdf,doc,docx,png,jpg,jpeg|max:10240',
            'score'   => 'nullable|integer',
        ]);

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('submissions/' . $assignment->id, 'public');
        }

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->first();

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
                        if ($studentAnswer == $correctAnswerId) {
                            $calculatedScore += $points;
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
            $submission->update([
                'content'      => $validated['content'],
                'file_path'    => $filePath ?? $submission->file_path,
                'submitted_at' => now(),
                'attempts'     => $submission->attempts + 1,
                'score'        => $score,
            ]);
            $submissionRecord = $submission;
        } else {
            $submissionRecord = LmsSubmission::create([
                'assignment_id' => $assignment->id,
                'student_id'    => $student->id,
                'content'       => $validated['content'],
                'file_path'     => $filePath,
                'submitted_at'  => now(),
                'attempts'      => 1,
                'score'         => $score,
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

    public function grade(Request $request)
    {
        $validated = $request->validate([
            'assignment_id' => 'required|exists:lms_assignments,id',
            'student_id'    => 'required|exists:mysql_absensi.students,id',
            'score'         => 'required|integer|min:0',
            'feedback'      => 'nullable|string',
            'content'       => 'nullable|string', // Untuk data observasi/kuis terstruktur
        ]);

        $submission = \App\Models\LmsSubmission::updateOrCreate(
            [
                'assignment_id' => $validated['assignment_id'],
                'student_id'    => $validated['student_id'],
            ],
            [
                'score'    => $validated['score'],
                'feedback' => $validated['feedback'],
                'content'  => $validated['content'] ?? null,
            ]
        );

        // Auto-analyze diagnostic results for initial assessments
        $assignment = \App\Models\LmsAssignment::find($validated['assignment_id']);
        if ($assignment && $assignment->assessment_type === 'initial') {
            app(\App\Services\AdaptiveLearningService::class)->analyzeDiagnostic($submission);
        }

        return back()->with('success', 'Penilaian berhasil disimpan.');
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
                'school_class_id'     => $assignment->school_class_id,
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
                    ['id' => 'formative_quiz',         'name' => 'Kuis Formatif',                 'icon' => 'clipboard-check', 'desc' => 'Tes singkat untuk mengecek pemahaman selama proses belajar'],
                    ['id' => 'guided_discussion',      'name' => 'Diskusi Terpandu',              'icon' => 'message-square',  'desc' => 'Dialog terstruktur untuk menilai penalaran siswa'],
                    ['id' => 'structured_assignment',   'name' => 'Penugasan Terstruktur (LKPD)',  'icon' => 'file-text',       'desc' => 'Lembar kerja untuk menilai proses berpikir'],
                    ['id' => 'exit_ticket',            'name' => 'Exit Ticket / CATs',            'icon' => 'ticket',          'desc' => 'Evaluasi cepat sebelum kelas berakhir'],
                    ['id' => 'concept_map',            'name' => 'Peta Konsep',                   'icon' => 'git-branch',      'desc' => 'Pemetaan hubungan antar konsep'],
                    ['id' => 'performance_observation','name' => 'Observasi Kinerja',             'icon' => 'activity',        'desc' => 'Pengamatan partisipasi dan diskusi siswa'],
                ],
                'summative' => [
                    ['id' => 'written_test',           'name' => 'Tes Tertulis',                  'icon' => 'pen-tool',        'desc' => 'Pilihan ganda, esai, atau uraian'],
                    ['id' => 'oral_test',              'name' => 'Tes Lisan',                     'icon' => 'mic',             'desc' => 'Tanya jawab lisan secara langsung'],
                    ['id' => 'performance',            'name' => 'Penilaian Kinerja / Unjuk Kerja','icon' => 'presentation',   'desc' => 'Praktik, presentasi, atau demonstrasi'],
                    ['id' => 'project',                'name' => 'Penilaian Proyek & Produk',     'icon' => 'folder-kanban',   'desc' => 'Evaluasi hasil karya dari perencanaan hingga pelaporan'],
                    ['id' => 'portfolio',              'name' => 'Portofolio',                    'icon' => 'briefcase',       'desc' => 'Kumpulan rekam jejak capaian siswa'],
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
            'school_class_id'       => 'required|exists:mysql_absensi.school_classes,id',
            'title'                 => 'required|string|max:255',
            'description'           => 'required|string',
            'due_date'              => 'required|date',
            'max_points'            => 'required|integer|min:0',
            'passing_grade'         => 'nullable|integer|min:0',
        ]);

        $assignment->update($validated);

        return redirect()->route('assignments.show', $assignment->id)->with('success', 'Tugas berhasil diperbarui.');
    }

    public function destroy(LmsAssignment $assignment)
    {
        DB::transaction(function () use ($assignment) {
            \App\Models\StudentDiagnosticResult::where('assignment_id', $assignment->id)->delete();
            $assignment->submissions()->delete();
            $assignment->delete();
        });

        return redirect()->route('assignments.index')->with('success', 'Tugas berhasil dihapus.');
    }
}
