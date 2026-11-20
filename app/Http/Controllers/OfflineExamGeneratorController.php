<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsLearningObjective;
use App\Models\LmsMaterial;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Services\OfflineExamGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OfflineExamGeneratorController extends Controller
{
    protected OfflineExamGeneratorService $generatorService;

    public function __construct(OfflineExamGeneratorService $generatorService)
    {
        $this->generatorService = $generatorService;
    }

    /**
     * Display the Offline Exam Generator form.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // 1. Resolve Teacher
        $teacher = $user->teacher;
        if (!$teacher && $user->role === 'admin') {
            $teacher = Teacher::first();
        }

        if (!$teacher) {
            abort(403, 'Akses terbatas hanya untuk Guru Mata Pelajaran.');
        }

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // 2. Discover Teaching Assignments (Classes & Subjects)
        $teachingAssignments = TeachingAssignment::with(['schoolClass', 'subject'])
            ->where('teacher_id', $teacher->id)
            ->get();

        // Distinct classes taught by teacher
        $classes = $teachingAssignments
            ->pluck('schoolClass')
            ->filter()
            ->unique('id')
            ->sortBy('name')
            ->values()
            ->map(function ($c) {
                $grade = $this->extractGradeLevel($c);
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'grade_level' => $grade['level'],
                    'grade_label' => $grade['label'],
                ];
            });

        if ($classes->isEmpty() && $user->role === 'admin') {
            $classes = SchoolClass::orderBy('name')->get()->map(function ($c) {
                $grade = $this->extractGradeLevel($c);
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'grade_level' => $grade['level'],
                    'grade_label' => $grade['label'],
                ];
            });
        }

        // Distinct subjects taught by teacher
        $subjects = $teachingAssignments
            ->pluck('subject')
            ->filter()
            ->unique('id')
            ->sortBy('name')
            ->values()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
            ]);

        if ($subjects->isEmpty() && $user->role === 'admin') {
            $subjects = Subject::orderBy('name')->get(['id', 'name', 'code']);
        }

        // 3. Discover Active Materials and their Linked TPs / Sub-TPs
        $activeMaterialsQuery = LmsMaterial::with([
            'learningObjective.parent',
            'learningObjective.subObjectives',
            'subject',
            'schoolClasses'
        ]);

        if ($activeYear && $activeSemester) {
            $activeMaterialsQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        }

        if ($user->role !== 'admin') {
            $activeMaterialsQuery->where('teacher_id', $teacher->id);
        }

        $activeMaterials = $activeMaterialsQuery->latest()->get();

        $tpsCollection = collect();

        // Prioritas 1: TPs & Sub-TPs dari Daftar Materi yang Sedang Aktif
        foreach ($activeMaterials as $mat) {
            $matClassIds = $mat->schoolClasses->pluck('id')->all();
            $tp = $mat->learningObjective;

            if ($tp) {
                $firstMatClass = $mat->schoolClasses->first();
                $grade = $this->extractGradeLevel($tp->schoolClass ?: $firstMatClass);

                $tpsCollection->push([
                    'id' => $tp->id,
                    'code' => $tp->code ?: ('TP ' . ($tp->order ?? $tp->id)),
                    'description' => $tp->description,
                    'competence' => $tp->competence,
                    'content' => $tp->content,
                    'subject_id' => $tp->subject_id ?: $mat->subject_id,
                    'subject_name' => $tp->subject?->name ?: $mat->subject?->name,
                    'grade_level' => $grade['level'],
                    'grade_label' => $grade['label'],
                    'school_class_ids' => $matClassIds,
                    'is_active_material' => true,
                    'material_title' => $mat->title,
                    'material_id' => $mat->id,
                    'is_sub_tp' => (bool) $tp->parent_id,
                    'parent_tp_code' => $tp->parent?->code,
                    'order' => $tp->order ?? 1,
                ]);

                // Jika TP ini memiliki sub-objectives, sertakan juga sebagai pilihan sub-TP
                if ($tp->subObjectives && $tp->subObjectives->isNotEmpty()) {
                    foreach ($tp->subObjectives as $subTp) {
                        $subGrade = $this->extractGradeLevel($subTp->schoolClass ?: ($tp->schoolClass ?: $firstMatClass));

                        $tpsCollection->push([
                            'id' => $subTp->id,
                            'code' => $subTp->code ?: ($tp->code . '.' . ($subTp->order ?? $subTp->id)),
                            'description' => $subTp->description,
                            'competence' => $subTp->competence ?: $tp->competence,
                            'content' => $subTp->content ?: $tp->content,
                            'subject_id' => $subTp->subject_id ?: $tp->subject_id,
                            'subject_name' => $tp->subject?->name ?: $mat->subject?->name,
                            'grade_level' => $subGrade['level'],
                            'grade_label' => $subGrade['label'],
                            'school_class_ids' => $matClassIds,
                            'is_active_material' => true,
                            'material_title' => $mat->title . ' (Sub-Materi)',
                            'material_id' => $mat->id,
                            'is_sub_tp' => true,
                            'parent_tp_code' => $tp->code,
                            'order' => ($tp->order ?? 1) * 100 + ($subTp->order ?? 1),
                        ]);
                    }
                }
            }
        }

        // Prioritas 2: TPs Lainnya yang Dimiliki Guru / Terdaftar di Master
        $allTpsQuery = LmsLearningObjective::with(['subject', 'schoolClass', 'parent.schoolClass', 'subObjectives']);
        if ($user->role !== 'admin') {
            $allTpsQuery->where('teacher_id', $teacher->id);
        }

        $allTps = $allTpsQuery->orderBy('order')->orderBy('id')->get();
        foreach ($allTps as $tp) {
            $grade = $this->extractGradeLevel($tp->schoolClass ?: $tp->parent?->schoolClass);

            $tpsCollection->push([
                'id' => $tp->id,
                'code' => $tp->code ?: ('TP ' . ($tp->order ?? $tp->id)),
                'description' => $tp->description,
                'competence' => $tp->competence,
                'content' => $tp->content,
                'subject_id' => $tp->subject_id,
                'subject_name' => $tp->subject?->name,
                'grade_level' => $grade['level'],
                'grade_label' => $grade['label'],
                'school_class_ids' => $tp->school_class_id ? [$tp->school_class_id] : [],
                'is_active_material' => false,
                'material_title' => null,
                'material_id' => null,
                'is_sub_tp' => (bool) $tp->parent_id,
                'parent_tp_code' => $tp->parent?->code,
                'order' => $tp->order ?? 99,
            ]);

            if ($tp->subObjectives && $tp->subObjectives->isNotEmpty()) {
                foreach ($tp->subObjectives as $subTp) {
                    $subGrade = $this->extractGradeLevel($subTp->schoolClass ?: ($tp->schoolClass ?: $tp->parent?->schoolClass));

                    $tpsCollection->push([
                        'id' => $subTp->id,
                        'code' => $subTp->code ?: ($tp->code . '.' . ($subTp->order ?? $subTp->id)),
                        'description' => $subTp->description,
                        'competence' => $subTp->competence ?: $tp->competence,
                        'content' => $subTp->content ?: $tp->content,
                        'subject_id' => $subTp->subject_id ?: $tp->subject_id,
                        'subject_name' => $tp->subject?->name,
                        'grade_level' => $subGrade['level'],
                        'grade_label' => $subGrade['label'],
                        'school_class_ids' => $subTp->school_class_id ? [$subTp->school_class_id] : [],
                        'is_active_material' => false,
                        'material_title' => null,
                        'material_id' => null,
                        'is_sub_tp' => true,
                        'parent_tp_code' => $tp->code,
                        'order' => ($tp->order ?? 99) * 100 + ($subTp->order ?? 1),
                    ]);
                }
            }
        }

        // Deduplikasi berdasarkan ID TP dan urutkan: yang aktif di materi tampil paling atas
        $sortedTps = $tpsCollection->unique('id')
            ->sort(function ($a, $b) {
                if ($a['is_active_material'] !== $b['is_active_material']) {
                    return $b['is_active_material'] <=> $a['is_active_material'];
                }
                return $a['order'] <=> $b['order'];
            })
            ->values();

        return Inertia::render('offline-exams/index', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'nip' => $teacher->nip ?? '-',
            ],
            'classes' => $classes,
            'subjects' => $subjects,
            'tps' => $sortedTps,
            'school_name' => school_setting('school_name', config('app.name', 'SMP Negeri 1 Biau')),
            'default_time_limit' => '90 Menit',
        ]);
    }

    /**
     * API to fetch TPs filtered by class or subject.
     */
    public function getTps(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?: ($user->role === 'admin' ? Teacher::first() : null);

        if (!$teacher) {
            return response()->json([], 403);
        }

        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');

        $query = LmsLearningObjective::with(['parent']);
        if ($user->role !== 'admin') {
            $query->where('teacher_id', $teacher->id);
        }

        if ($subjectId) {
            $query->where('subject_id', $subjectId);
        }

        if ($classId) {
            $query->where(function ($q) use ($classId) {
                $q->where('school_class_id', $classId)
                    ->orWhereNull('school_class_id');
            });
        }

        $tps = $query->orderBy('order')
            ->get(['id', 'code', 'description', 'competence', 'content', 'subject_id', 'school_class_id', 'parent_id']);

        return response()->json($tps);
    }

    /**
     * Determine Grade Level (Jenjang) from a SchoolClass model.
     * E.g. "Kelas 8A" -> ['level' => '8', 'label' => 'Kelas 8 SMP', 'education_level' => 'SMP', 'phase' => 'Fase D']
     */
    protected function extractGradeLevel(?SchoolClass $class): array
    {
        if (!$class) {
            return ['level' => null, 'label' => 'Umum', 'education_level' => 'SMP', 'phase' => 'Fase D'];
        }

        $name = trim($class->name);
        $num = null;

        // 1. Check Arabic numeral (e.g. Kelas 7A, 8B, 8C, 9, 10-1)
        if (preg_match('/(?:kelas\s*|tingkat\s*)?(\d+)/i', $name, $matches)) {
            $num = (int) $matches[1];
        } elseif (preg_match('/\b(VII|VIII|IX|X|XI|XII)\b/i', $name, $matches)) {
            // 2. Check Roman numerals
            $romanMap = [
                'VII' => 7,
                'VIII' => 8,
                'IX' => 9,
                'X' => 10,
                'XI' => 11,
                'XII' => 12,
            ];
            $upper = strtoupper($matches[1]);
            if (isset($romanMap[$upper])) {
                $num = $romanMap[$upper];
            }
        } elseif (!empty($class->level_id)) {
            // 3. Fallback to level_id
            try {
                $level = DB::table('levels')->where('id', $class->level_id)->first();
                if ($level && preg_match('/(\d+)/', $level->name, $lm)) {
                    $num = (int) $lm[1];
                }
            } catch (\Throwable $e) {
                // Ignore DB error if table not exists
            }
            if ($num === null && is_numeric($class->level_id)) {
                $num = (int) $class->level_id;
            }
        }

        if ($num !== null) {
            if ($num >= 7 && $num <= 9) {
                return [
                    'level' => (string) $num,
                    'label' => "Kelas {$num} SMP",
                    'education_level' => 'SMP',
                    'phase' => 'Fase D',
                ];
            } elseif ($num >= 10 && $num <= 12) {
                return [
                    'level' => (string) $num,
                    'label' => "Kelas {$num} SMA",
                    'education_level' => 'SMA',
                    'phase' => $num === 10 ? 'Fase E' : 'Fase F',
                ];
            } elseif ($num >= 1 && $num <= 6) {
                return [
                    'level' => (string) $num,
                    'label' => "Kelas {$num} SD",
                    'education_level' => 'SD',
                    'phase' => $num <= 2 ? 'Fase A' : ($num <= 4 ? 'Fase B' : 'Fase C'),
                ];
            }
            return [
                'level' => (string) $num,
                'label' => "Kelas {$num}",
                'education_level' => 'Umum',
                'phase' => 'Kurikulum Merdeka',
            ];
        }

        return ['level' => null, 'label' => $name, 'education_level' => 'SMP', 'phase' => 'Fase D'];
    }

    /**
     * Generate Exam Data and Dispatch Output (Preview, PDF, or DOCX).
     */
    public function generate(Request $request)
    {
        @ini_set('max_execution_time', '180');
        @set_time_limit(180);

        // Support both school_class_ids (array) and legacy school_class_id (single int)
        $classIds = $request->input('school_class_ids');
        if (empty($classIds) && $request->filled('school_class_id')) {
            $classIds = [(int) $request->input('school_class_id')];
        }
        $request->merge(['school_class_ids' => $classIds]);

        // Support both learning_objective_ids (array) and legacy learning_objective_id (single int)
        $tpIds = $request->input('learning_objective_ids');
        if (empty($tpIds) && $request->filled('learning_objective_id')) {
            $tpIds = [(int) $request->input('learning_objective_id')];
        } elseif (!is_array($tpIds) && !empty($tpIds)) {
            $tpIds = [(int) $tpIds];
        }
        $request->merge(['learning_objective_ids' => $tpIds]);

        $validated = $request->validate([
            'school_class_ids' => 'required|array|min:1',
            'school_class_ids.*' => 'integer|exists:school_classes,id',
            'learning_objective_ids' => 'required|array|min:1',
            'learning_objective_ids.*' => 'integer|exists:lms_learning_objectives,id',
            'question_type' => 'required|string|in:multiple_choice,essay,mixed',
            'question_count' => 'required|integer|min:1|max:50',
            'output_format' => 'required|string|in:pdf,docx,preview',
            'time_limit' => 'nullable|string|max:50',
            'regenerate' => 'nullable|boolean',
            'generation_engine' => 'nullable|string|in:fast,ai',
            'cognitive_level' => 'nullable|string|in:all,lots,mots,hots',
        ], [
            'school_class_ids.required' => 'Silakan pilih minimal satu kelas target.',
            'school_class_ids.min' => 'Silakan centang minimal satu kelas target.',
            'learning_objective_ids.required' => 'Silakan pilih minimal satu Tujuan Pembelajaran (TP) / Materi.',
            'learning_objective_ids.min' => 'Silakan centang minimal satu Tujuan Pembelajaran (TP) / Materi.',
            'question_type.required' => 'Pilih jenis soal (Pilihan Ganda, Esai, atau Campuran).',
            'question_count.required' => 'Tentukan jumlah soal yang akan digenerate.',
            'output_format.required' => 'Pilih format output (PDF atau DOCS).',
        ]);

        $user = Auth::user();
        $teacher = $user->teacher;

        if (!$teacher && $user->role === 'admin') {
            $teacher = Teacher::first();
        }

        if (!$teacher) {
            abort(403, 'Akses ditolak. Fitur ini hanya untuk guru mapel.');
        }

        $schoolClasses = SchoolClass::whereIn('id', $validated['school_class_ids'])->orderBy('name')->get();
        if ($schoolClasses->isEmpty()) {
            abort(404, 'Kelas yang dipilih tidak ditemukan.');
        }

        $tps = LmsLearningObjective::with(['subject', 'schoolClass'])
            ->whereIn('id', $validated['learning_objective_ids'])
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        if ($tps->isEmpty()) {
            abort(404, 'Tujuan Pembelajaran yang dipilih tidak ditemukan.');
        }

        // IDOR Authorization: Verify teacher owns at least one TP or teaches at least one selected class (unless admin)
        if ($user->role !== 'admin') {
            $teachesClasses = TeachingAssignment::where('teacher_id', $teacher->id)
                ->whereIn('school_class_id', $schoolClasses->pluck('id'))
                ->exists();

            $ownsAnyTp = $tps->contains(fn ($tp) => (int) $tp->teacher_id === (int) $teacher->id);

            if (!$ownsAnyTp && !$teachesClasses) {
                abort(403, 'Anda tidak memiliki hak akses terhadap Tujuan Pembelajaran atau Kelas yang dipilih.');
            }
        }

        $timeLimit = !empty($validated['time_limit']) ? $validated['time_limit'] : '90 Menit';
        $regenerate = (bool) ($validated['regenerate'] ?? false);
        $engine = $validated['generation_engine'] ?? 'fast';
        $cognitiveLevel = $validated['cognitive_level'] ?? 'all';

        $examData = $this->generatorService->generateExamData(
            $teacher,
            $schoolClasses,
            $tps,
            $validated['question_type'],
            (int) $validated['question_count'],
            $timeLimit,
            $regenerate,
            $engine,
            $cognitiveLevel
        );

        if ($validated['output_format'] === 'pdf') {
            return $this->generatorService->exportPdf($examData);
        }

        if ($validated['output_format'] === 'docx') {
            return $this->generatorService->exportDocx($examData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Soal offline berhasil dibuat.',
            'exam' => $examData,
        ]);
    }

    /**
     * Download PDF from pre-generated exam data.
     */
    public function exportPdf(Request $request)
    {
        $examData = $request->validate([
            'exam_data' => 'required|array',
            'exam_data.school_name' => 'required|string',
            'exam_data.questions' => 'required|array',
            'exam_data.blueprint' => 'required|array',
            'exam_data.answer_keys' => 'required|array',
        ])['exam_data'];

        return $this->generatorService->exportPdf($examData);
    }

    /**
     * Download DOCX from pre-generated exam data.
     */
    public function exportDocx(Request $request)
    {
        $examData = $request->validate([
            'exam_data' => 'required|array',
            'exam_data.school_name' => 'required|string',
            'exam_data.questions' => 'required|array',
            'exam_data.blueprint' => 'required|array',
            'exam_data.answer_keys' => 'required|array',
        ])['exam_data'];

        return $this->generatorService->exportDocx($examData);
    }
}
