<?php

namespace App\Http\Controllers;

use App\Models\LmsMaterial;
use App\Models\LmsStudentMaterial;
use App\Models\TeachingAssignment;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Services\AdaptiveLearningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MaterialController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $query = LmsMaterial::with(['subject', 'teacher', 'schoolClasses', 'learningObjective'])
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id);

        if ($user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        } elseif ($user->student) {
            $query->whereHas('schoolClasses', function ($q) use ($user) {
                $q->where('school_classes.id', $user->student->school_class_id);
            });
        }

        $models = $query->latest()->get();

        // ── Teacher: group by class → subject ────────────────────────
        if ($user->teacher) {
            $classMaterials = [];
            foreach ($models as $m) {
                foreach ($m->schoolClasses as $c) {
                    if (!isset($classMaterials[$c->id])) {
                        $classMaterials[$c->id] = [
                            'class' => $c,
                            'materials' => []
                        ];
                    }
                    $classMaterials[$c->id]['materials'][] = $m;
                }
            }

            $teacherGrouped = collect($classMaterials)->map(function ($item, $classId) {
                $subjectGroups = collect($item['materials'])->groupBy('subject_id');
                $subjects = $subjectGroups->map(function ($items, $subjectId) {
                    $firstItem = collect($items)->first();
                    
                    $tpGroups = collect($items)->groupBy('learning_objective_id');
                    $tps = $tpGroups->map(function ($tpItems, $tpId) {
                        $firstTpItem = collect($tpItems)->first();
                        $tp = $firstTpItem->learningObjective;
                        return [
                            'tp_id'          => $tp ? $tp->id : null,
                            'tp_code'        => $tp ? $tp->code : '-',
                            'tp_description' => $tp ? $tp->description : 'Tanpa Tujuan Pembelajaran',
                            'materials'      => collect($tpItems)->map(fn ($m) => [
                                'id'           => $m->id,
                                'title'        => $m->title,
                                'subject_name' => $m->subject?->name ?? '-',
                                'teacher_name' => $m->teacher?->name ?? '-',
                                'file_type'    => $m->file_type,
                                'created_at'   => $m->created_at->format('d M Y'),
                            ])->values(),
                        ];
                    })->values();

                    return [
                        'subject_id'   => (int) $subjectId,
                        'subject_name' => $firstItem->subject?->name ?? '-',
                        'tps'          => $tps,
                    ];
                })->values();

                return [
                    'class_id'   => (int) $classId,
                    'class_name' => $item['class']->name ?? 'Kelas',
                    'subjects'   => $subjects,
                ];
            })->values();

            return Inertia::render('materials/index', [
                'teacher_grouped' => $teacherGrouped,
                'active_year'     => $activeYear?->name,
                'active_semester' => $activeSemester?->name,
                'user_role'       => 'teacher',
            ]);
        }

        // ── Student (and admin): group by subject ────────────────────
        $accessibleTpIds = [];
        if ($user->role === 'student' && $user->student) {
            $accessibleTpIds = app(AdaptiveLearningService::class)->getStudentAccessibleTpIds($user->student->id, $user->student->school_class_id);
        }

        $grouped = $models->groupBy('subject_id')->map(function ($items, $subjectId) use ($accessibleTpIds, $user) {
            $first = $items->first();
            
            $tpGroups = $items->groupBy('learning_objective_id');
            $tps = $tpGroups->map(function ($tpItems, $tpId) use ($accessibleTpIds, $user) {
                $firstTpItem = collect($tpItems)->first();
                $tp = $firstTpItem->learningObjective;
                return [
                    'tp_id'          => $tp ? $tp->id : null,
                    'tp_code'        => $tp ? $tp->code : '-',
                    'tp_description' => $tp ? $tp->description : 'Tanpa Tujuan Pembelajaran',
                    'materials'      => collect($tpItems)->map(fn ($m) => [
                        'id'           => $m->id,
                        'title'        => $m->title,
                        'subject_name' => $m->subject?->name ?? '-',
                        'teacher_name' => $m->teacher?->name ?? '-',
                        'file_type'    => $m->file_type,
                        'created_at'   => $m->created_at->format('d M Y'),
                        'is_accessible'=> $user->role === 'admin' || !$m->learning_objective_id || in_array($m->learning_objective_id, $accessibleTpIds),
                    ])->values(),
                ];
            })->values();

            return [
                'subject_id'   => (int) $subjectId,
                'subject_name' => $first->subject?->name ?? '-',
                'tps'          => $tps,
                'total'        => $items->count(),
            ];
        })->values();

        return Inertia::render('materials/index', [
            'grouped_materials' => $grouped,
            'active_year'       => $activeYear?->name,
            'active_semester'   => $activeSemester?->name,
            'user_role'         => $user->role ?? 'student',
        ]);
    }

    public function create()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        // Ambil data pengampuan
        $teachings = \App\Models\TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->whereHas('schoolClass', function($q) use ($activeYear, $activeSemester) {
                $q->where('academic_year_id', $activeYear?->id)
                  ->where('semester_id', $activeSemester?->id);
            })
            ->get();

        // Ambil TP
        $objectives = \App\Models\LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        return Inertia::render('materials/create', [
            'teachings'  => $teachings,
            'objectives' => $objectives,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $validated = $request->validate([
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'school_classes'        => 'required|array|min:1',
            'school_classes.*'      => 'exists:mysql_absensi.school_classes,id',
            'learning_objective_id' => 'nullable|exists:lms_learning_objectives,id',
            'title'                 => 'required|string|max:255',
            'content'               => 'nullable|string',
            'external_link'         => 'nullable|url|max:255',
            'file'                  => 'nullable|file|max:10240', // 10MB
        ]);

        $filePath = null;
        $fileType = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('lms/materials', 'public');
            $fileType = $request->file('file')->getClientOriginalExtension();
        }

        $material = \App\Models\LmsMaterial::create([
            'teacher_id'            => $teacher->id,
            'subject_id'            => $validated['subject_id'],
            'learning_objective_id' => $validated['learning_objective_id'] ?? null,
            'academic_year_id'      => $activeYear?->id,
            'semester_id'           => $activeSemester?->id,
            'title'                 => $validated['title'],
            'content'               => $validated['content'] ?? null,
            'external_link'         => $validated['external_link'] ?? null,
            'file_path'             => $filePath,
            'file_type'             => $fileType,
        ]);

        $material->schoolClasses()->sync($validated['school_classes']);

        return redirect()->route('materials.index')->with('success', 'Materi berhasil diterbitkan.');
    }

    public function show(LmsMaterial $material)
    {
        $user = Auth::user();
        $material->load(['subject', 'teacher', 'learningObjective', 'resources', 'schoolClasses', 'semester', 'academicYear']);

        $readinessStatus = [
            'status' => 'ready', // ready, needs_intervention, not_taken
            'assessment_id' => null,
            'diagnostic_result' => null,
        ];

        if ($user->student) {
            $accessibleTpIds = app(\App\Services\AdaptiveLearningService::class)->getStudentAccessibleTpIds($user->student->id, $user->student->school_class_id);
            if ($material->learning_objective_id && !in_array($material->learning_objective_id, $accessibleTpIds)) {
                abort(403, 'Akses ditolak. Silakan selesaikan materi atau asesmen sebelumnya terlebih dahulu sesuai alur belajar.');
            }

            if ($material->learning_objective_id) {
                // Find initial cognitive assessment
                $initialCognitiveAssignment = \App\Models\LmsAssignment::where('learning_objective_id', $material->learning_objective_id)
                    ->where('assessment_type', 'initial')
                    ->where(function($q) {
                        $q->whereNull('instrument_type')
                          ->orWhere('instrument_type', 'quiz_survey');
                    })
                    ->first();

                if ($initialCognitiveAssignment) {
                    $readinessStatus['assessment_id'] = $initialCognitiveAssignment->id;
                    
                    $diagnosticResult = \App\Models\StudentDiagnosticResult::where('student_id', $user->student->id)
                        ->where('assignment_id', $initialCognitiveAssignment->id)
                        ->first();

                    if (!$diagnosticResult) {
                        $readinessStatus['status'] = 'not_taken';
                    } elseif (!$diagnosticResult->is_passed) {
                        $readinessStatus['status'] = 'needs_intervention';
                        $readinessStatus['diagnostic_result'] = [
                            'score' => $diagnosticResult->total_score,
                            'threshold' => $diagnosticResult->pass_threshold,
                            'recommendations' => $diagnosticResult->recommendations,
                            'topic_breakdown' => $diagnosticResult->topic_breakdown,
                        ];
                    } else {
                        $readinessStatus['status'] = 'ready';
                    }
                }
            }
        }

        // Ambil komentar untuk materi ini
        $comments = \App\Models\LmsComment::with('user')
            ->where('material_id', $material->id)
            ->latest()
            ->get()
            ->map(fn($c) => [
                'id'         => $c->id,
                'user_id'    => $c->user_id,
                'user_name'  => $c->user->name ?? 'User Terhapus',
                'user_role'  => $c->user ? ($c->user->role ?? ($c->user->teacher ? 'teacher' : 'student')) : 'student',
                'body'       => $c->body,
                'created_at' => $c->created_at->diffForHumans(),
            ]);

        // Ambil refleksi siswa jika ada
        $myReflection = null;
        $allReflections = [];
        $isCompleted = false;

        if ($user->student) {
            $myReflection = \App\Models\LmsReflection::where('material_id', $material->id)
                ->where('student_id', $user->student->id)
                ->first();
            
            // Cek penyelesaian dari dua sumber: refleksi ATAU tanda selesai eksplisit
            $studentMaterial = LmsStudentMaterial::where('student_id', $user->student->id)
                ->where('material_id', $material->id)
                ->first();

            $isCompleted = $myReflection !== null || ($studentMaterial && $studentMaterial->completed_at !== null);
        }

        if ($user->teacher || $user->role === 'admin') {
            $allReflections = \App\Models\LmsReflection::with('student')
                ->where('material_id', $material->id)
                ->latest()
                ->get()
                ->map(fn($r) => [
                    'id'                  => $r->id,
                    'student_name'        => $r->student->name ?? 'Siswa Terhapus',
                    'student_photo'       => ($r->student && $r->student->photo) ? asset('storage/' . $r->student->photo) : null,
                    'understanding_level' => $r->understanding_level,
                    'interesting_thing'   => $r->interesting_thing,
                    'difficulty'          => $r->difficulty,
                    'created_at'          => $r->created_at->diffForHumans(),
                ]);
        }

        // Ambil semua asesmen terkait materi ini (initial, formative, summative)
        $classId = $user->student ? $user->student->school_class_id : null;
        $assignmentsQuery = \App\Models\LmsAssignment::where('subject_id', $material->subject_id)
            ->where('learning_objective_id', $material->learning_objective_id);

        if ($classId) {
            $assignmentsQuery->whereHas('schoolClasses', function($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            });
        } else {
            $materialClassIds = $material->schoolClasses->pluck('id')->toArray();
            $assignmentsQuery->whereHas('schoolClasses', function($q) use ($materialClassIds) {
                $q->whereIn('school_classes.id', $materialClassIds);
            });
        }

        $assignments = $assignmentsQuery->get()
            ->map(fn($a) => [
                'id'                => $a->id,
                'assessment_type'   => $a->assessment_type,
                'instrument_type'   => $a->instrument_type,
                'instrument_config' => $a->instrument_config,
                'title'             => $a->title,
                'description'       => $a->description,
                'due_date'          => $a->due_date ? $a->due_date->format('Y-m-d') : null,
                'max_points'        => $a->max_points,
                'passing_grade'     => $a->passing_grade,
            ]);

        // Ambil nama sekolah dari settings
        $schoolNameSetting = \App\Models\Setting::where('key', 'school_name')->first();
        $schoolName = $schoolNameSetting ? $schoolNameSetting->value : 'SMA Negeri 1 Mokopani';

        // Ambil Kepala Sekolah dan NIP dari settings
        $headmasterNameSetting = \App\Models\Setting::where('key', 'school_headmaster_name')->first();
        $headmasterNipSetting = \App\Models\Setting::where('key', 'school_headmaster_nip')->first();
        $headmasterName = $headmasterNameSetting ? $headmasterNameSetting->value : 'Marlinda, S.Pd';
        $headmasterNip = $headmasterNipSetting ? $headmasterNipSetting->value : '19791116 200604 2 016';

        return Inertia::render('materials/show', [
            'material' => [
                'id'                     => $material->id,
                'title'                  => $material->title,
                'content'                => $material->content,
                'thumbnail'              => $material->thumbnail ? asset('storage/' . $material->thumbnail) : null,
                'file_path'              => $material->file_path,
                'file_type'              => $material->file_type,
                'external_link'          => $material->external_link,
                'subject_name'           => $material->subject?->name,
                'teacher_name'           => $material->teacher?->name,
                'teacher_id'             => $material->teacher_id,
                'teacher_nip'            => $material->teacher?->nip,
                'school_classes'         => $material->schoolClasses->map(fn($c) => ['id' => $c->id, 'name' => $c->name]),
                'fase'                   => $material->subject?->fase,
                'semester_name'          => $material->semester?->name,
                'academic_year_name'     => $material->academicYear?->name,
                'pedagogical_model'      => $material->pedagogical_model,
                'learning_environment'   => $material->learning_environment,
                'understanding_activity' => $material->understanding_activity,
                'application_activity'   => $material->application_activity,
                'reflection_activity'    => $material->reflection_activity,
                'image_prompt'           => $material->image_prompt,
                'lkpd'                   => $material->lkpd,
                'tp_code'                => $material->learningObjective?->code,
                'tp_desc'                => $material->learningObjective?->description,
                'subject_kktp'           => $material->subject?->kktp ?? 70,
                'resources'              => $material->resources->map(fn($r) => [
                    'id'        => $r->id,
                    'type'      => $r->type,
                    'title'     => $r->title,
                    'path'      => $r->path,
                    'file_type' => $r->file_type,
                ]),
                'created_at'             => $material->created_at->format('d M Y'),
            ],
            'comments'        => $comments,
            'my_reflection'   => $myReflection,
            'all_reflections' => $allReflections,
            'is_completed'    => $isCompleted,
            'user_role'       => $user->role ?? ($user->teacher ? 'teacher' : 'student'),
            'auth_id'         => $user->id,
            'assignments'     => $assignments,
            'school_name'     => $schoolName,
            'headmaster_name' => $headmasterName,
            'headmaster_nip'  => $headmasterNip,
            'readiness_status' => $readinessStatus,
        ]);
    }

    public function edit(LmsMaterial $material)
    {
        $teacher = Auth::user()->teacher;
        
        // Ensure user owns this material
        if ($material->teacher_id !== $teacher->id) {
            abort(403, 'Unauthorized action.');
        }

        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        // Ambil data pengampuan
        $teachings = \App\Models\TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->whereHas('schoolClass', function($q) use ($activeYear, $activeSemester) {
                $q->where('academic_year_id', $activeYear?->id)
                  ->where('semester_id', $activeSemester?->id);
            })
            ->get();

        // Ambil TP
        $objectives = \App\Models\LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $material->load('resources');
        return Inertia::render('materials/edit', [
            'material' => [
                'id' => $material->id,
                'title' => $material->title,
                'content' => $material->content,
                'thumbnail' => $material->thumbnail ? asset('storage/' . $material->thumbnail) : null,
                'subject_id' => $material->subject_id,
                'school_classes' => $material->schoolClasses->pluck('id'),
                'learning_objective_id' => $material->learning_objective_id,
                'resources' => $material->resources->map(fn($r) => [
                    'id' => $r->id,
                    'type' => $r->type,
                    'title' => $r->title,
                    'path' => $r->path,
                    'file_type' => $r->file_type,
                ]),
            ],
            'teachings'  => $teachings,
            'objectives' => $objectives,
        ]);
    }

    public function update(Request $request, LmsMaterial $material)
    {
        $teacher = Auth::user()->teacher;
        
        if ($material->teacher_id !== $teacher->id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'school_classes'        => 'required|array|min:1',
            'school_classes.*'      => 'exists:mysql_absensi.school_classes,id',
            'learning_objective_id' => 'nullable|exists:lms_learning_objectives,id',
            'title'                 => 'required|string|max:255',
            'content'               => 'nullable|string',
            'thumbnail'             => 'nullable|image|max:2048',
            'resources'             => 'nullable|array',
            'resources_to_delete'   => 'nullable|array',
        ]);

        $updateData = [
            'subject_id'            => $validated['subject_id'],
            'learning_objective_id' => $validated['learning_objective_id'] ?? null,
            'title'                 => $validated['title'],
            'content'               => $validated['content'] ?? null,
        ];

        if ($request->hasFile('thumbnail')) {
            if ($material->thumbnail) {
                Storage::disk('public')->delete($material->thumbnail);
            }
            $updateData['thumbnail'] = $request->file('thumbnail')->store('lms/thumbnails', 'public');
        }

        $material->update($updateData);
        $material->schoolClasses()->sync($validated['school_classes']);

        // Handle resources to delete
        if (!empty($validated['resources_to_delete'])) {
            $toDelete = \App\Models\LmsMaterialResource::whereIn('id', $validated['resources_to_delete'])
                            ->where('material_id', $material->id)->get();
            foreach ($toDelete as $res) {
                if ($res->type === 'file' && $res->path) {
                    Storage::disk('public')->delete($res->path);
                }
                $res->delete();
            }
        }

        // Handle new resources
        if (!empty($validated['resources'])) {
            foreach ($validated['resources'] as $index => $resData) {
                $type = $resData['type'] ?? 'link';
                $title = $resData['title'] ?? null;
                $path = null;
                $fileType = null;

                if ($type === 'link' || $type === 'youtube') {
                    $path = $resData['value'] ?? null;
                } else if ($type === 'file') {
                    if ($request->hasFile("resources.{$index}.file")) {
                        $file = $request->file("resources.{$index}.file");
                        $path = $file->store('lms/materials', 'public');
                        $fileType = $file->getClientOriginalExtension();
                    }
                }

                if ($path) {
                    \App\Models\LmsMaterialResource::create([
                        'material_id' => $material->id,
                        'type'        => $type,
                        'title'       => $title,
                        'path'        => $path,
                        'file_type'   => $fileType,
                    ]);
                }
            }
        }

        return redirect()->route('materials.show', $material->id)->with('success', 'Materi berhasil diperbarui.');
    }

    public function destroy(LmsMaterial $material)
    {
        if ($material->teacher_id !== Auth::user()->teacher?->id) {
            abort(403, 'Unauthorized action.');
        }

        DB::transaction(function () use ($material) {
            if ($material->file_path) {
                Storage::disk('public')->delete($material->file_path);
            }

            foreach ($material->resources as $res) {
                if ($res->type === 'file' && $res->path) {
                    Storage::disk('public')->delete($res->path);
                }
                $res->delete();
            }

            $material->delete();
        });

        return redirect()->route('materials.index')->with('success', 'Materi berhasil dihapus.');
    }

    public function complete(Request $request, LmsMaterial $material)
    {
        $student = Auth::user()->student;
        if (!$student) {
            return back()->with('error', 'Hanya siswa yang dapat menandai materi sebagai selesai.');
        }

        LmsStudentMaterial::updateOrCreate(
            ['student_id' => $student->id, 'material_id' => $material->id],
            ['completed_at' => now()]
        );

        return back()->with('success', 'Materi ditandai sebagai selesai.');
    }
}
