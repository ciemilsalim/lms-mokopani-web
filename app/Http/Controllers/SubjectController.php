<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Services\AdaptiveLearningService;
use Inertia\Inertia;

class SubjectController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $query = Subject::query();

        if ($user && $user->role === 'student' && $user->student) {
            $classId = $user->student->school_class_id;
            $query->whereIn('id', function($q) use ($classId) {
                $q->select('subject_id')
                  ->from('teaching_assignments')
                  ->where('school_class_id', $classId);
            });
        }

        $subjects = $query->withCount([
            'materials' => function($q) use ($user) {
                if ($user && $user->role === 'student' && $user->student) {
                    $q->whereHas('schoolClasses', function ($query) use ($user) { $query->where('school_classes.id', $user->student->school_class_id); });
                }
            },
            'assignments' => function($q) use ($user) {
                if ($user && $user->role === 'student' && $user->student) {
                    $q->whereHas('schoolClasses', function ($query) use ($user) { $query->where('school_classes.id', $user->student->school_class_id); });
                }
            }
        ])->with(['teachingAssignments' => function($q) use ($user) {
            if ($user && $user->role === 'student' && $user->student) {
                $q->where('school_class_id', $user->student->school_class_id)->with('teacher');
            }
        }])->get()->map(fn ($s) => [
            'id'                => $s->id,
            'name'              => $s->name,
            'code'              => $s->code,
            'description'       => $s->description,
            'materials_count'   => $s->materials_count,
            'assignments_count' => $s->assignments_count,
            'teacher'           => ($user && $user->role === 'student' && $s->teachingAssignments->first()) ? [
                'name'  => $s->teachingAssignments->first()->teacher?->name,
                'photo' => $s->teachingAssignments->first()->teacher?->photo ? asset('storage/' . $s->teachingAssignments->first()->teacher->photo) : null,
            ] : null,
        ]);

        return Inertia::render('subjects/index', ['subjects' => $subjects]);
    }

    public function show(Subject $subject, AdaptiveLearningService $adaptiveService)
    {
        $user = auth()->user();
        $studentClassId = ($user && $user->role === 'student' && $user->student) ? $user->student->school_class_id : null;

        $tpQuery = \App\Models\LmsLearningObjective::where('subject_id', $subject->id);
        
        // Filter TP berdasarkan kelas siswa agar hanya menampilkan TP yang aktif untuk kelasnya
        if ($studentClassId) {
            $tpQuery->where('school_class_id', $studentClassId);
        }

        $tps = $tpQuery->orderBy('order')
            ->orderBy('code')
            ->get();

        // Eager-load all assignments and materials for these TPs
        $tpIds = $tps->pluck('id');

        $assignmentQuery = \App\Models\LmsAssignment::whereIn('learning_objective_id', $tpIds);
        $materialQuery = \App\Models\LmsMaterial::whereIn('learning_objective_id', $tpIds);

        // Filter berdasarkan kelas siswa
        if ($studentClassId) {
            $assignmentQuery->whereHas('schoolClasses', function ($q) use ($studentClassId) { $q->where('school_classes.id', $studentClassId); });
            $materialQuery->whereHas('schoolClasses', function ($q) use ($studentClassId) { $q->where('school_classes.id', $studentClassId); });
        }

        $allAssignments = $assignmentQuery->orderBy('order')
            ->get()
            ->groupBy('learning_objective_id');

        $allMaterials = $materialQuery->orderBy('order')
            ->get()
            ->groupBy('learning_objective_id');

        // Eager-load submissions for the current student (if applicable)
        $submissions = collect();
        if ($user && $user->role === 'student' && $user->student) {
            $assignmentIds = $allAssignments->flatten()->pluck('id');
            $submissions = \App\Models\LmsSubmission::whereIn('assignment_id', $assignmentIds)
                ->where('student_id', $user->student->id)
                ->get()
                ->keyBy('assignment_id');
        }

        // Eager-load reflections for the current student (if applicable)
        $reflections = collect();
        $studentMaterials = collect();
        if ($user && $user->role === 'student' && $user->student) {
            $materialIds = $allMaterials->flatten()->pluck('id');
            $reflections = \App\Models\LmsReflection::whereIn('material_id', $materialIds)
                ->where('student_id', $user->student->id)
                ->get()
                ->keyBy('material_id');
            
            // Juga cek LmsStudentMaterial untuk konsistensi dengan MaterialController
            $studentMaterials = \App\Models\LmsStudentMaterial::whereIn('material_id', $materialIds)
                ->where('student_id', $user->student->id)
                ->whereNotNull('completed_at')
                ->get()
                ->keyBy('material_id');
        }

        $result = $tps->map(function ($tp) use ($user, $allAssignments, $allMaterials, $submissions, $reflections, $studentMaterials) {
            $assignments = collect($allAssignments->get($tp->id, []))->map(function ($a) use ($user, $submissions) {
                $submission = $submissions->get($a->id);

                $type = strtolower($a->assessment_type);
                $weight = 3;
                if ($type === 'initial') $weight = 1;
                if ($type === 'summative') $weight = 4;

                return [
                    'id'              => $a->id,
                    'title'           => $a->title,
                    'type'            => 'assignment',
                    'assessment_type' => $a->assessment_type,
                    'is_submitted'    => !!$submission,
                    'is_graded'       => $submission && $submission->score !== null,
                    'is_passed'       => $a->evaluateKetuntasan($submission),
                    'score'           => $submission?->score,
                    'attempts'        => $submission?->attempts ?? 0,
                    'passing_grade'   => $a->passing_grade ?? 70,
                    'weight'          => $weight,
                    'order_in_type'   => $a->order,
                ];
            });

            $materials = collect($allMaterials->get($tp->id, []))->map(function ($m) use ($reflections, $studentMaterials) {
                $isCompleted = $reflections->has($m->id) || $studentMaterials->has($m->id);

                return [
                    'id' => $m->id,
                    'title' => $m->title,
                    'type' => 'material',
                    'file_type' => $m->file_type,
                    'is_completed' => $isCompleted,
                    'weight' => 2,
                    'order_in_type' => $m->order,
                ];
            });

            $items = $materials->concat($assignments)
                ->sortBy(function ($item) {
                    return sprintf('%d-%05d', $item['weight'], $item['order_in_type']);
                })
                ->values();

            $is_completed = false;

            if ($user && $user->role === 'student') {
                $allAssignmentsSubmitted = $assignments->isEmpty() || $assignments->every(fn($a) => $a['is_submitted']);
                $allMaterialsCompleted = $materials->isEmpty() || $materials->every(fn($m) => $m['is_completed']);
                $is_completed = $allAssignmentsSubmitted && $allMaterialsCompleted;

                if ($assignments->isEmpty() && $materials->isEmpty()) {
                    $is_completed = false;
                }
            } else {
                $is_completed = true;
            }

            return [
                'id' => $tp->id,
                'code' => $tp->code,
                'description' => $tp->description,
                'items' => $items,
                'is_completed' => $is_completed,
            ];
        });

        // Get diagnostic summary for students
        $diagnosticSummary = null;
        if ($user && $user->role === 'student' && $user->student) {
            $diagnosticSummary = $adaptiveService->getDiagnosticSummary($subject->id, $user->student->id);
        }

        return Inertia::render('subjects/show', [
            'subject' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'description' => $subject->description,
            ],
            'learning_path' => $result,
            'diagnostic_summary' => $diagnosticSummary,
        ]);
    }
}
