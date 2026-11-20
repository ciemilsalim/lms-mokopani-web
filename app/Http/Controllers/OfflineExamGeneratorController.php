<?php

namespace App\Http\Controllers;

use App\Models\LmsLearningObjective;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Services\OfflineExamGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            // Admin fallback: use first available teacher or create virtual context
            $teacher = Teacher::first();
        }

        if (!$teacher) {
            abort(403, 'Akses terbatas hanya untuk Guru Mata Pelajaran.');
        }

        // 2. Discover Teaching Assignments (Classes & Subjects)
        $teachingAssignments = TeachingAssignment::with(['schoolClass', 'subject'])
            ->where('teacher_id', $teacher->id)
            ->get();

        // Distinct classes taught by teacher
        $classes = $teachingAssignments
            ->pluck('schoolClass')
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
            ]);

        // If admin has no direct teaching assignments, show all classes
        if ($classes->isEmpty() && $user->role === 'admin') {
            $classes = SchoolClass::orderBy('name')->get(['id', 'name']);
        }

        // Distinct subjects taught by teacher
        $subjects = $teachingAssignments
            ->pluck('subject')
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
            ]);

        if ($subjects->isEmpty() && $user->role === 'admin') {
            $subjects = Subject::orderBy('name')->get(['id', 'name', 'code']);
        }

        // 3. Discover Available Learning Objectives (TPs)
        $tpsQuery = LmsLearningObjective::with(['subject', 'schoolClass']);
        if ($user->role !== 'admin') {
            $tpsQuery->where('teacher_id', $teacher->id);
        }

        $tps = $tpsQuery->orderBy('order')
            ->orderBy('id')
            ->get()
            ->map(fn ($tp) => [
                'id' => $tp->id,
                'code' => $tp->code ?: ('TP ' . ($tp->order ?? $tp->id)),
                'description' => $tp->description,
                'competence' => $tp->competence,
                'content' => $tp->content,
                'subject_id' => $tp->subject_id,
                'subject_name' => $tp->subject?->name,
                'school_class_id' => $tp->school_class_id,
                'school_class_name' => $tp->schoolClass?->name,
            ]);

        return Inertia::render('offline-exams/index', [
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'nip' => $teacher->nip ?? '-',
            ],
            'classes' => $classes,
            'subjects' => $subjects,
            'tps' => $tps,
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

        $query = LmsLearningObjective::query();
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
            ->get(['id', 'code', 'description', 'competence', 'content', 'subject_id', 'school_class_id']);

        return response()->json($tps);
    }

    /**
     * Generate Exam Data and Dispatch Output (Preview, PDF, or DOCX).
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'school_class_id' => 'required|integer|exists:school_classes,id',
            'learning_objective_id' => 'required|integer|exists:lms_learning_objectives,id',
            'question_type' => 'required|string|in:multiple_choice,essay,mixed',
            'question_count' => 'required|integer|min:1|max:50',
            'output_format' => 'required|string|in:pdf,docx,preview',
            'time_limit' => 'nullable|string|max:50',
            'regenerate' => 'nullable|boolean',
        ], [
            'school_class_id.required' => 'Silakan pilih kelas terlebih dahulu.',
            'learning_objective_id.required' => 'Silakan pilih Tujuan Pembelajaran (TP).',
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

        $schoolClass = SchoolClass::findOrFail($validated['school_class_id']);
        $tp = LmsLearningObjective::with('subject')->findOrFail($validated['learning_objective_id']);

        // IDOR Authorization: Verify teacher owns this TP or teaches this class (unless admin)
        if ($user->role !== 'admin') {
            $isTpOwner = (int) $tp->teacher_id === (int) $teacher->id;
            $teachesClass = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('school_class_id', $schoolClass->id)
                ->exists();

            if (!$isTpOwner && !$teachesClass) {
                abort(403, 'Anda tidak memiliki hak akses terhadap Tujuan Pembelajaran atau Kelas yang dipilih.');
            }
        }

        $timeLimit = $validated['time_limit'] ?: '90 Menit';
        $regenerate = (bool) ($validated['regenerate'] ?? false);

        $examData = $this->generatorService->generateExamData(
            $teacher,
            $schoolClass,
            $tp,
            $validated['question_type'],
            (int) $validated['question_count'],
            $timeLimit,
            $regenerate
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
