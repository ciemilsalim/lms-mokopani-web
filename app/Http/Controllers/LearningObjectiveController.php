<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsCapaianPembelajaran;
use App\Models\LmsLearningObjective;
use App\Models\Semester;
use App\Models\TeachingAssignment;
use App\Services\PlanningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LearningObjectiveController extends Controller
{
    protected $planningService;

    public function __construct(PlanningService $planningService)
    {
        $this->planningService = $planningService;
    }

    public function index()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $objectives = LmsLearningObjective::with(['subject', 'schoolClass', 'capaianPembelajaran', 'capaianPembelajarans'])
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->orderBy('order')
            ->get();

        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $subjects = TeachingAssignment::with('subject')
            ->where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->pluck('subject')
            ->unique('id');

        $cpList = LmsCapaianPembelajaran::with('subject')
            ->whereIn('subject_id', $subjects->pluck('id'))
            ->get();

        return Inertia::render('learning-objectives/index', [
            'objectives' => $objectives,
            'subjects'   => $subjects->values(),
            'cpList'     => $cpList,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $validated = $request->validate([
            'subject_id'         => 'required|exists:mysql_absensi.subjects,id',
            'school_class_id'    => 'required|exists:mysql_absensi.school_classes,id',
            'code'               => 'nullable|string',
            'description'        => 'required|string',
            'cp_id'              => 'nullable|exists:lms_capaian_pembelajaran,id',
            'cp_ids'             => 'nullable|array',
            'cp_ids.*'           => 'exists:lms_capaian_pembelajaran,id',
            'competence'         => 'nullable|string',
            'content'            => 'nullable|string',
            'formulation_method' => 'required|in:direct,analysis,cross_element',
        ]);

        $order = LmsLearningObjective::where('subject_id', $validated['subject_id'])
                            ->where('school_class_id', $validated['school_class_id'])
                            ->count() + 1;

        $objective = LmsLearningObjective::create([
            'subject_id'         => $validated['subject_id'],
            'school_class_id'    => $validated['school_class_id'],
            'teacher_id'         => $teacher->id,
            'academic_year_id'   => $activeYear?->id,
            'semester_id'        => $activeSemester?->id,
            'code'               => $validated['code'] ?: ('TP-' . $order),
            'description'        => $validated['description'],
            'cp_id'              => $validated['cp_id'],
            'competence'         => $validated['competence'],
            'content'            => $validated['content'],
            'formulation_method' => $validated['formulation_method'],
            'order'              => $order,
        ]);

        if (!empty($validated['cp_ids'])) {
            $objective->capaianPembelajarans()->sync($validated['cp_ids']);
        }

        return back()->with('success', 'Tujuan Pembelajaran berhasil ditambahkan.');
    }

    public function update(Request $request, LmsLearningObjective $objective)
    {
        if ($objective->teacher_id !== Auth::user()->teacher->id) {
            abort(403);
        }

        $validated = $request->validate([
            'code'               => 'nullable|string',
            'description'        => 'required|string',
            'cp_id'              => 'nullable|exists:lms_capaian_pembelajaran,id',
            'cp_ids'             => 'nullable|array',
            'cp_ids.*'           => 'exists:lms_capaian_pembelajaran,id',
            'competence'         => 'nullable|string',
            'content'            => 'nullable|string',
            'formulation_method' => 'required|in:direct,analysis,cross_element',
        ]);

        $objective->update($validated);

        if (!empty($validated['cp_ids'])) {
            $objective->capaianPembelajarans()->sync($validated['cp_ids']);
        }

        return back()->with('success', 'Tujuan Pembelajaran berhasil diperbarui.');
    }

    public function updateOrder(Request $request)
    {
        $request->validate([
            'orders'   => 'required|array',
            'orders.*.id'    => 'required|exists:lms_learning_objectives,id',
            'orders.*.order' => 'required|integer',
            'sequencing_method' => 'nullable|string',
        ]);

        foreach ($request->orders as $item) {
            LmsLearningObjective::where('id', $item['id'])->update([
                'order' => $item['order'],
                'sequencing_method' => $request->sequencing_method
            ]);
        }

        return back()->with('success', 'Urutan ATP berhasil diperbarui.');
    }

    public function autoSuggest(Request $request)
    {
        $request->validate([
            'method'     => 'required|in:direct,analysis,cross_element',
            'cp_id'      => 'nullable|exists:lms_capaian_pembelajaran,id',
            'cp_ids'     => 'nullable|array',
            'cp_ids.*'   => 'exists:lms_capaian_pembelajaran,id',
            'subject_id' => 'required',
            'regenerate' => 'nullable|boolean',
        ]);

        $teacher = Auth::user()->teacher;
        $method = $request->input('method');
        $cpId = $request->input('cp_id');
        $cpIds = $request->input('cp_ids', []);
        $subjectId = $request->input('subject_id');
        $regenerate = $request->boolean('regenerate', false);

        if ($method === 'direct' && $cpId) {
            $cp = LmsCapaianPembelajaran::find($cpId);
            $rawSuggestions = $this->planningService->suggestDirectTp($cp->deskripsi, $regenerate);
            
            $usedDescriptions = LmsLearningObjective::where('teacher_id', $teacher->id)
                ->where('subject_id', $subjectId)
                ->pluck('description')
                ->toArray();

            $suggestions = array_map(function($s) use ($usedDescriptions) {
                return [
                    'text' => $s,
                    'is_used' => in_array($s, $usedDescriptions)
                ];
            }, $rawSuggestions);

            return response()->json([
                'suggestions' => $suggestions,
                'ai_active' => $this->planningService->isLastRequestOnline
            ]);
        }

        if ($method === 'analysis' && $cpId) {
            $cp = LmsCapaianPembelajaran::find($cpId);
            $analysis = $this->planningService->analyzeCompetenceAndContent($cp->deskripsi, $regenerate);
            if (is_array($analysis)) {
                $analysis['ai_active'] = $this->planningService->isLastRequestOnline;
            }
            return response()->json(['analysis' => $analysis]);
        }

        if ($method === 'cross_element' && !empty($cpIds)) {
            $cps = LmsCapaianPembelajaran::whereIn('id', $cpIds)->pluck('deskripsi')->toArray();
            $suggestion = $this->planningService->suggestCrossElementTp($cps, $regenerate);
            return response()->json([
                'suggestion' => $suggestion,
                'ai_active' => $this->planningService->isLastRequestOnline
            ]);
        }

        return response()->json(['error' => 'Invalid parameters'], 400);
    }

    public function autoSequence(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $subjectId = $request->input('subject_id');
        $classId = $request->input('school_class_id');
        $method = $request->input('method', 'Otomatis');

        $objectives = LmsLearningObjective::with(['subject', 'capaianPembelajaran'])
            ->where('teacher_id', $teacher->id)
            ->where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->get();

        $sequenced = $this->planningService->suggestSequence($objectives, $method);

        return response()->json(['sequenced' => $sequenced]);
    }

    public function destroy(LmsLearningObjective $objective)
    {
        if ($objective->teacher_id !== Auth::user()->teacher->id) {
            abort(403);
        }

        $objective->delete();

        return back()->with('success', 'Tujuan Pembelajaran berhasil dihapus.');
    }
}
