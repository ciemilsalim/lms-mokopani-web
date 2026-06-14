<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsLearningObjective;
use App\Models\LmsMaterial;
use App\Models\LmsAssignment;
use App\Models\LmsModulAjar;
use App\Models\LmsCapaianPembelajaran;
use App\Models\TeachingAssignment;
use App\Models\Semester;
use App\Services\InstructionalSmartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class LmsModulAjarController extends Controller
{
    /**
     * Tampilkan daftar Modul Ajar / RPP milik guru aktif.
     */
    public function index()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $modulAjars = LmsModulAjar::with(['subject', 'schoolClass', 'learningObjective', 'material'])
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->latest()
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'subject_name' => $m->subject?->name,
                'class_name' => $m->schoolClass?->name,
                'tp_code' => $m->learningObjective?->code,
                'tp_desc' => $m->learningObjective?->description,
                'material_title' => $m->material?->title,
                'pedagogical_model' => $m->pedagogical_model,
                'created_at' => $m->created_at->format('d M Y, H:i'),
            ]);

        return Inertia::render('modul-ajar/index', [
            'modulAjars' => $modulAjars,
            'period' => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    /**
     * Tampilkan halaman generator Modul Ajar baru.
     */
    public function create()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // Ambil data penugasan mengajar (Mapel & Kelas)
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

        // Ambil Tujuan Pembelajaran (TP)
        $objectives = LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Ambil materi pengajaran yang sudah pernah dibuat guru
        $materials = LmsMaterial::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'subject_id' => $m->subject_id,
                'learning_objective_id' => $m->learning_objective_id,
                'title' => $m->title,
            ]);

        return Inertia::render('modul-ajar/create', [
            'teachings'     => $teachings,
            'objectives'    => $objectives,
            'materials'     => $materials,
            'period'        => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    /**
     * Endpoint asinkronus untuk mengambil list asesmen terkait TP & Mapel.
     */
    public function getAssessments(Request $request)
    {
        $request->validate([
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
        ]);

        $teacher = Auth::user()->teacher;

        $assessments = LmsAssignment::where('learning_objective_id', $request->learning_objective_id)
            ->where('subject_id', $request->subject_id)
            ->where('teacher_id', $teacher->id)
            ->get()
            ->groupBy('assessment_type')
            ->map(function ($group) {
                return $group->map(fn($a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'instrument_type' => $a->instrument_type,
                ]);
            });

        return response()->json([
            'initial'   => $assessments->get('initial', collect()),
            'formative' => $assessments->get('formative', collect()),
            'summative' => $assessments->get('summative', collect()),
        ]);
    }

    /**
     * Endpoint asinkronus untuk asisten AI mandiri (autoSuggest) yang dipanggil oleh halaman Materi & Asesmen.
     */
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
            'quiz_mode'             => 'nullable|string',
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

            // Bersihkan tag editor untuk mengecek apakah konten kosong
            $trimmedContent = trim(strip_tags($materialContent));

            // Jika kosong, coba ambil materi yang berasosiasi dengan TP & Mapel
            if (empty($trimmedContent)) {
                $tp = LmsLearningObjective::find($request->learning_objective_id);
                $material = LmsMaterial::where('learning_objective_id', $request->learning_objective_id)
                    ->where('subject_id', $tp?->subject_id)
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
                $request->input('observation_mode'),
                $request->input('quiz_mode')
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

    /**
     * Panggil AI untuk menggenerasi 7 bagian Modul Ajar.
     */
    public function generate(Request $request, InstructionalSmartService $service)
    {
        $request->validate([
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            'material_id'           => 'required|exists:lms_materials,id',
            'pedagogical_model'     => 'nullable|string',
            'custom_prompt'         => 'nullable|string',
            'regenerate'            => 'nullable|boolean',
        ]);

        $regenerate = $request->boolean('regenerate', false);

        $draft = $service->generateDetailedModulAjar(
            $request->learning_objective_id,
            $request->material_id,
            $request->pedagogical_model,
            $request->custom_prompt,
            $regenerate
        );

        if (is_array($draft)) {
            $draft['ai_active'] = $service->isLastRequestOnline;
        }

        return response()->json($draft);
    }

    /**
     * Simpan Modul Ajar ke database.
     */
    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $validated = $request->validate([
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'school_class_id'       => 'required|exists:mysql_absensi.school_classes,id',
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            'material_id'           => 'required|exists:lms_materials,id',
            'pedagogical_model'     => 'nullable|string',
            'general_info'          => 'nullable|string', // Customization JSON
            'learning_design'       => 'nullable|string',
            'learning_steps'        => 'nullable|string',
            'assessment_plan'       => 'nullable|string',
            'kktp_details'          => 'nullable|string',
            'lkpd'                  => 'nullable|string',
            'learning_resources'    => 'nullable|string',
            'ai_prompt_used'        => 'nullable|string',
        ]);

        $modulAjar = LmsModulAjar::create(array_merge($validated, [
            'teacher_id'       => $teacher->id,
            'academic_year_id' => $activeYear?->id,
            'semester_id'      => $activeSemester?->id,
        ]));

        return redirect()->route('lesson-plans.index')
            ->with('success', 'Modul Ajar berhasil disimpan.');
    }

    /**
     * Tampilkan detail dokumen Modul Ajar (Print View).
     */
    public function show($id)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();
        
        $modulAjar = LmsModulAjar::with(['subject', 'schoolClass', 'learningObjective', 'material', 'material.resources'])
            ->where('teacher_id', $teacher->id)
            ->findOrFail($id);

        $assignments = LmsAssignment::where('learning_objective_id', $modulAjar->learning_objective_id)
            ->where('subject_id', $modulAjar->subject_id)
            ->where('teacher_id', $teacher->id)
            ->get();

        return Inertia::render('modul-ajar/show', [
            'modulAjar' => [
                'id' => $modulAjar->id,
                'subject_id' => $modulAjar->subject_id,
                'school_class_id' => $modulAjar->school_class_id,
                'learning_objective_id' => $modulAjar->learning_objective_id,
                'material_id' => $modulAjar->material_id,
                'subject_name' => $modulAjar->subject?->name,
                'class_name' => $modulAjar->schoolClass?->name,
                'semester_name' => $activeSemester?->name,
                'academic_year_name' => $activeYear?->name,
                'tp_code' => $modulAjar->learningObjective?->code,
                'tp_desc' => $modulAjar->learningObjective?->description,
                'material_title' => $modulAjar->material?->title,
                'pedagogical_model' => $modulAjar->pedagogical_model,
                'general_info' => $modulAjar->general_info, // Customization JSON
                'learning_design' => $modulAjar->learning_design,
                'learning_steps' => $modulAjar->learning_steps,
                'assessment_plan' => $modulAjar->assessment_plan,
                'kktp_details' => $modulAjar->kktp_details,
                'lkpd' => $modulAjar->lkpd,
                'learning_resources' => $modulAjar->learning_resources,
                'material_resources' => $modulAjar->material ? $modulAjar->material->resources->map(fn($r) => [
                    'id' => $r->id,
                    'type' => $r->type,
                    'title' => $r->title,
                    'path' => $r->path,
                    'file_type' => $r->file_type,
                ]) : [],
                'material_external_link' => $modulAjar->material?->external_link,
                'material_file_path' => $modulAjar->material?->file_path,
                // Kolom tambahan untuk UAR
                'understanding_activity' => $modulAjar->material?->understanding_activity,
                'application_activity' => $modulAjar->material?->application_activity,
                'reflection_activity' => $modulAjar->material?->reflection_activity,
                'image_prompt' => $modulAjar->material?->image_prompt,
                'thumbnail' => $modulAjar->material?->thumbnail ? asset('storage/' . $modulAjar->material->thumbnail) : null,
                
                'teacher_name' => $teacher->name,
                'teacher_nip' => $teacher->nip ?? '-',
                'school_name' => school_setting('school_name', 'Nama Sekolah'),
                'headmaster_name' => school_setting('school_headmaster_name', 'Nama Kepala Sekolah'),
                'headmaster_nip' => school_setting('school_headmaster_nip', 'NIP Kepala Sekolah'),
                'created_at' => $modulAjar->created_at->format('d M Y'),
                'subject_kktp' => $modulAjar->subject?->passing_grade ?? 70,
            ],
            'assignments' => $assignments
        ]);
    }

    /**
     * Tampilkan halaman edit Modul Ajar.
     */
    public function edit($id)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $modulAjar = LmsModulAjar::where('teacher_id', $teacher->id)->findOrFail($id);

        // Ambil data penugasan mengajar (Mapel & Kelas)
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

        // Ambil Tujuan Pembelajaran (TP)
        $objectives = LmsLearningObjective::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Ambil materi pengajaran
        $materials = LmsMaterial::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'subject_id' => $m->subject_id,
                'learning_objective_id' => $m->learning_objective_id,
                'title' => $m->title,
            ]);

        return Inertia::render('modul-ajar/edit', [
            'modulAjar'  => $modulAjar,
            'teachings'  => $teachings,
            'objectives' => $objectives,
            'materials'  => $materials,
            'period'     => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    /**
     * Update Modul Ajar yang sudah ada.
     */
    public function update(Request $request, $id)
    {
        $teacher = Auth::user()->teacher;
        $modulAjar = LmsModulAjar::where('teacher_id', $teacher->id)->findOrFail($id);

        $validated = $request->validate([
            'subject_id'            => 'required|exists:mysql_absensi.subjects,id',
            'school_class_id'       => 'required|exists:mysql_absensi.school_classes,id',
            'learning_objective_id' => 'required|exists:lms_learning_objectives,id',
            'material_id'           => 'required|exists:lms_materials,id',
            'pedagogical_model'     => 'nullable|string',
            'general_info'          => 'nullable|string',
            'learning_design'       => 'nullable|string',
            'learning_steps'        => 'nullable|string',
            'assessment_plan'       => 'nullable|string',
            'kktp_details'          => 'nullable|string',
            'lkpd'                  => 'nullable|string',
            'learning_resources'    => 'nullable|string',
            'ai_prompt_used'        => 'nullable|string',
        ]);

        $modulAjar->update($validated);

        return redirect()->route('lesson-plans.index')
            ->with('success', 'Modul Ajar berhasil diperbarui.');
    }

    /**
     * Hapus Modul Ajar.
     */
    public function destroy($id)
    {
        $teacher = Auth::user()->teacher;
        $modulAjar = LmsModulAjar::where('teacher_id', $teacher->id)->findOrFail($id);
        $modulAjar->delete();

        return redirect()->route('lesson-plans.index')
            ->with('success', 'Modul Ajar berhasil dihapus.');
    }

    /* Logika Prompt Management dari wizard lama agar tetap kompatibel */
    
    public function getPrompts()
    {
        $teacher = Auth::user()->teacher;
        $defaultPrompts = \App\Models\LmsAiPrompt::whereNull('teacher_id')->get();
        
        $prompts = $defaultPrompts->map(function ($default) use ($teacher) {
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
