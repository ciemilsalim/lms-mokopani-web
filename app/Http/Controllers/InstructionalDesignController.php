<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\LmsMaterial;
use App\Models\LmsMaterialResource;
use App\Models\Semester;
use App\Models\TeachingAssignment;
use App\Services\InstructionalSmartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\LmsCapaianPembelajaran;

class InstructionalDesignController extends Controller
{
    public function create()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn ($t) => [
                'id'              => $t->id,
                'subject_id'      => $t->subject_id,
                'subject_name'    => $t->subject?->name,
                'school_class_id' => $t->school_class_id,
                'class_name'      => $t->schoolClass?->name,
            ]);

        $objectives = LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $instruments = [
            'initial' => [
                ['id' => 'quiz_survey',            'name' => 'Kuis Singkat / Survei',         'icon' => 'clipboard-check', 'desc' => 'Pemetaan pemahaman dasar secara cepat', 'category' => 'cognitive'],
                ['id' => 'observation_checklist',  'name' => 'Observasi Ceklis',              'icon' => 'eye',             'desc' => 'Pengamatan kesiapan melalui aktivitas', 'category' => 'cognitive'],
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
        ];

        $scoringTools = [
            ['id' => 'rubric',           'name' => 'Rubrik',              'icon' => 'list-checks',  'desc' => 'Panduan kriteria dan level capaian bertingkat'],
            ['id' => 'rating_scale',     'name' => 'Skala Penilaian',     'icon' => 'gauge',        'desc' => 'Skala numerik/deskriptif untuk mengukur tingkat capaian'],
            ['id' => 'checklist',        'name' => 'Checklist',           'icon' => 'check-square', 'desc' => 'Daftar periksa ya/tidak untuk aspek yang dinilai'],
            ['id' => 'anecdotal_notes',  'name' => 'Catatan Anekdotal',   'icon' => 'file-text',    'desc' => 'Catatan naratif pengamatan guru'],
        ];

        $subjectIds = $teachings->pluck('subject_id')->unique();
        $cpList = LmsCapaianPembelajaran::with('subject')
            ->whereIn('subject_id', $subjectIds)
            ->get();

        return Inertia::render('instructional-design/create', [
            'teachings'     => $teachings,
            'objectives'    => $objectives,
            'instruments'   => $instruments,
            'scoring_tools' => $scoringTools,
            'cpList'        => $cpList,
            'period'        => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $validated = $request->validate([
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'school_class_id'       => 'required|exists:mysql_absensi.school_classes,id',
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            
            // Material & Activities
            'material.title'                  => 'required|string|max:255',
            'material.content'                => 'nullable|string',
            'material.pedagogical_model'      => 'nullable|string',
            'material.learning_environment'   => 'nullable|string',
            'material.understanding_activity' => 'nullable|string',
            'material.application_activity'   => 'nullable|string',
            'material.reflection_activity'    => 'nullable|string',
            'material.image_prompt'           => 'nullable|string',
            'material.lkpd'                   => 'nullable|string',
            'material.resources'              => 'nullable|array',
            'material.thumbnail'              => 'nullable|image|max:2048',

            // Assessments
            'initial.enabled'              => 'required|boolean',
            'initial.instrument_type'      => 'required_if:initial.enabled,true|nullable|string',
            'initial.instrument_config'    => 'nullable|array',
            'initial.scoring_tool'         => 'nullable|string',
            'initial.scoring_tool_config'  => 'nullable|array',
            'initial.title'                => 'required_if:initial.enabled,true|nullable|string|max:255',
            'initial.due_date'             => 'required_if:initial.enabled,true|nullable|date',

            'formative.enabled'                         => 'required|boolean',
            'formative.instruments'                     => 'nullable|array',
            'formative.instruments.*.instrument_type'   => 'required|string',
            'formative.instruments.*.instrument_config' => 'nullable|array',
            'formative.instruments.*.scoring_tool'      => 'nullable|string',
            'formative.instruments.*.scoring_tool_config' => 'nullable|array',
            'formative.instruments.*.title'             => 'required|string|max:255',
            'formative.instruments.*.due_date'          => 'required|date',

            'summative.enabled'                         => 'required|boolean',
            'summative.instruments'                     => 'nullable|array',
            'summative.instruments.*.instrument_type'   => 'required|string',
            'summative.instruments.*.instrument_config' => 'nullable|array',
            'summative.instruments.*.scoring_tool'      => 'nullable|string',
            'summative.instruments.*.scoring_tool_config' => 'nullable|array',
            'summative.instruments.*.title'             => 'required|string|max:255',
            'summative.instruments.*.due_date'          => 'required|date',
        ]);

        return DB::transaction(function () use ($request, $teacher, $activeYear, $activeSemester) {
            // 1. Create Material
            $materialData = $request->input('material');

            $thumbnailPath = null;
            if ($request->hasFile('material.thumbnail')) {
                $thumbnailPath = $request->file('material.thumbnail')->store('lms/thumbnails', 'public');
            }

            $material = LmsMaterial::create([
                'teacher_id'             => $teacher->id,
                'subject_id'             => $request->subject_id,
                'school_class_id'        => $request->school_class_id,
                'learning_objective_id'  => $request->learning_objective_id,
                'academic_year_id'       => $activeYear?->id,
                'semester_id'            => $activeSemester?->id,
                'title'                  => $materialData['title'],
                'content'                => $materialData['content'] ?? '',
                'pedagogical_model'      => $materialData['pedagogical_model'] ?? null,
                'learning_environment'   => $materialData['learning_environment'] ?? null,
                'understanding_activity' => $materialData['understanding_activity'] ?? null,
                'application_activity'   => $materialData['application_activity'] ?? null,
                'reflection_activity'    => $materialData['reflection_activity'] ?? null,
                'image_prompt'           => $materialData['image_prompt'] ?? null,
                'lkpd'                   => $materialData['lkpd'] ?? null,
                'thumbnail'              => $thumbnailPath,
            ]);

            // 1b. Create Resources
            if (!empty($materialData['resources'])) {
                foreach ($materialData['resources'] as $index => $resData) {
                    $type = $resData['type'];
                    $title = $resData['title'] ?? null;
                    $path = null;
                    $fileType = null;

                    if ($type === 'link') {
                        $path = $resData['value'];
                    } else if ($type === 'file') {
                        if ($request->hasFile("material.resources.{$index}.file")) {
                            $file = $request->file("material.resources.{$index}.file");
                            $path = $file->store('lms/materials', 'public');
                            $fileType = $file->getClientOriginalExtension();
                        }
                    }

                    if ($path) {
                        LmsMaterialResource::create([
                            'material_id' => $material->id,
                            'type'        => $type,
                            'title'       => $title,
                            'path'        => $path,
                            'file_type'   => $fileType,
                        ]);
                    }
                }
            }

            // 2. Create Assessments
            // Initial: single instrument
            $initialData = $request->input('initial');
            if ($initialData['enabled']) {
                $config = $initialData['instrument_config'] ?? [];
                
                if ($request->hasFile('initial.instrument_config.stimulus_image')) {
                    $stimulusImagePath = $request->file('initial.instrument_config.stimulus_image')->store('lms/stimulus', 'public');
                    $config['stimulus_image'] = $stimulusImagePath;
                }

                $instrumentType = $initialData['instrument_type'];
                $config['diagnostic_category'] = 'cognitive';

                LmsAssignment::create([
                    'teacher_id'            => $teacher->id,
                    'subject_id'            => $request->subject_id,
                    'school_class_id'       => $request->school_class_id,
                    'learning_objective_id' => $request->learning_objective_id,
                    'academic_year_id'      => $activeYear?->id,
                    'semester_id'           => $activeSemester?->id,
                    'assessment_type'       => 'initial',
                    'instrument_type'       => $instrumentType,
                    'instrument_config'     => $config,
                    'scoring_tool'          => $initialData['scoring_tool'] ?? null,
                    'scoring_tool_config'   => $initialData['scoring_tool_config'] ?? [],
                    'title'                 => $initialData['title'],
                    'description'           => $initialData['description'] ?? "Asesmen awal untuk materi " . $materialData['title'],
                    'due_date'              => $initialData['due_date'],
                    'max_points'            => 100,
                ]);
            }

            // Formative & Summative: multiple instruments
            foreach (['formative', 'summative'] as $type) {
                $assessmentData = $request->input($type);
                if ($assessmentData['enabled'] && !empty($assessmentData['instruments'])) {
                    foreach ($assessmentData['instruments'] as $inst) {
                        LmsAssignment::create([
                            'teacher_id'            => $teacher->id,
                            'subject_id'            => $request->subject_id,
                            'school_class_id'       => $request->school_class_id,
                            'learning_objective_id' => $request->learning_objective_id,
                            'academic_year_id'      => $activeYear?->id,
                            'semester_id'           => $activeSemester?->id,
                            'assessment_type'       => $type,
                            'instrument_type'       => $inst['instrument_type'],
                            'instrument_config'     => $inst['instrument_config'] ?? [],
                            'scoring_tool'          => $inst['scoring_tool'] ?? null,
                            'scoring_tool_config'   => $inst['scoring_tool_config'] ?? [],
                            'title'                 => $inst['title'],
                            'description'           => $inst['description'] ?? "Asesmen {$type} untuk materi " . $materialData['title'],
                            'due_date'              => $inst['due_date'],
                            'max_points'            => 100,
                        ]);
                    }
                }
            }

            return redirect()->route('materials.index')->with('success', 'Rancangan Pembelajaran berhasil diterbitkan.');
        });
    }

    public function autoSuggest(Request $request, InstructionalSmartService $service)
    {
        $request->validate([
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            'pedagogical_model'     => 'nullable|string',
            'suggest_type'          => 'nullable|string', // experiences, assessment, full_draft
            'instrument_type'       => 'nullable|string',
            'regenerate'            => 'nullable|boolean',
            'material_title'        => 'nullable|string',
            'material_content'      => 'nullable|string',
        ]);

        $suggestType = $request->input('suggest_type');
        $regenerate = $request->boolean('regenerate', false);

        if ($suggestType === 'full_draft') {
            $suggestions = $service->generateFullDraft(
                $request->learning_objective_id,
                $request->pedagogical_model,
                $regenerate
            );
        } elseif ($suggestType === 'assessment') {
            $materialTitle = $request->input('material_title');
            $materialContent = $request->input('material_content');

            // If empty, auto-fetch the actual material associated with this TP & Subject
            if (empty($materialContent)) {
                $material = \App\Models\LmsMaterial::where('learning_objective_id', $request->learning_objective_id)
                    ->where('subject_id', $request->input('subject_id'))
                    ->first();
                if ($material) {
                    $materialTitle = $material->title;
                    $materialContent = $material->content;
                }
            }

            $suggestions = $service->suggestAssessment(
                $request->learning_objective_id,
                $request->input('instrument_type', 'rubric'),
                $regenerate,
                $materialTitle,
                $materialContent,
                $request->input('observation_mode')
            );
        } else {
            $suggestions = $service->suggestExperiences(
                $request->learning_objective_id,
                $request->pedagogical_model,
                $regenerate
            );
        }

        if (is_array($suggestions)) {
            $suggestions['ai_active'] = $service->isLastRequestOnline;
        }

        return response()->json($suggestions);
    }

    public function getPrompts()
    {
        $teacher = Auth::user()->teacher;
        
        // Ambil default prompt (teacher_id IS NULL)
        $defaultPrompts = \App\Models\LmsAiPrompt::whereNull('teacher_id')->get();
        
        $prompts = $defaultPrompts->map(function ($default) use ($teacher) {
            // Ambil prompt kustom milik guru aktif jika ada
            $custom = \App\Models\LmsAiPrompt::where('key', $default->key)
                ->where('teacher_id', $teacher->id)
                ->first();
                
            return [
                'key'            => $default->key,
                'name'           => $default->name,
                'description'    => $default->description,
                'placeholders'   => $default->placeholders,
                'default_prompt' => $default->prompt_text,
                'custom_prompt'  => $custom ? $custom->prompt_text : null,
                'prompt_text'    => $custom ? $custom->prompt_text : $default->prompt_text,
                'is_custom'      => $custom !== null,
            ];
        });
        
        return response()->json($prompts);
    }
    
    public function savePrompt(Request $request)
    {
        $request->validate([
            'key'         => 'required|string',
            'prompt_text' => 'required|string',
        ]);
        
        $teacher = Auth::user()->teacher;
        
        // Ambil metadata dari default prompt
        $default = \App\Models\LmsAiPrompt::where('key', $request->key)
            ->whereNull('teacher_id')
            ->first();
            
        $prompt = \App\Models\LmsAiPrompt::updateOrCreate(
            [
                'teacher_id' => $teacher->id,
                'key'        => $request->key,
            ],
            [
                'name'         => $default ? $default->name : $request->key,
                'description'  => $default ? $default->description : '',
                'placeholders' => $default ? $default->placeholders : [],
                'prompt_text'  => $request->prompt_text,
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Prompt berhasil disimpan.',
            'prompt'  => $prompt
        ]);
    }
    
    public function resetPrompt(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
        ]);
        
        $teacher = Auth::user()->teacher;
        
        \App\Models\LmsAiPrompt::where('teacher_id', $teacher->id)
            ->where('key', $request->key)
            ->delete();
            
        return response()->json([
            'success' => true,
            'message' => 'Prompt berhasil di-reset ke default.'
        ]);
    }
}
