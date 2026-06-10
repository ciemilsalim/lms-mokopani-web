<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Services\AdaptiveLearningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdaptiveLearningController extends Controller
{
    public function __construct(
        protected AdaptiveLearningService $adaptiveLearning
    ) {}

    public function index()
    {
        $user = Auth::user();

        if ($user->student) {
            return Inertia::render('adaptive-learning/index', [
                'subjects' => \App\Models\TeachingAssignment::whereHas('schoolClass.students', fn ($q) => $q->where('id', $user->student->id))
                    ->with('subject')
                    ->get()
                    ->pluck('subject')
                    ->unique('id')
                    ->values()
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
                'student_id' => $user->student->id,
            ]);
        }

        if ($user->teacher) {
            $teachings = \App\Models\TeachingAssignment::with(['subject', 'schoolClass'])
                ->where('teacher_id', $user->teacher->id)
                ->get()
                ->map(fn ($t) => [
                    'subject_id'   => $t->subject_id,
                    'subject_name' => $t->subject->name,
                    'class_id'     => $t->school_class_id,
                    'class_name'   => $t->schoolClass->name,
                ])
                ->unique(fn ($t) => $t['subject_id'] . '-' . $t['class_id'])
                ->values();

            return Inertia::render('adaptive-learning/index', [
                'teachings' => $teachings,
            ]);
        }

        abort(403);
    }

    public function students($subjectId, $classId)
    {
        $subject = Subject::findOrFail($subjectId);
        $schoolClass = SchoolClass::findOrFail($classId);
        $students = Student::where('school_class_id', $classId)
            ->orderBy('name')
            ->get(['id', 'name', 'nis']);

        return Inertia::render('adaptive-learning/students', [
            'subject' => ['id' => $subject->id, 'name' => $subject->name],
            'kelas'   => $schoolClass->name,
            'students' => $students,
        ]);
    }

    public function summary(Request $request, $subjectId, $studentId)
    {
        $subject = Subject::findOrFail($subjectId);
        $student = Student::with('schoolClass')->findOrFail($studentId);

        $summary = $this->adaptiveLearning->getDiagnosticSummary((int) $subjectId, (int) $studentId);
        
        $nonCognitive = \App\Models\StudentNonCognitiveDiagnostic::where('student_id', $studentId)
            // Optional: you can filter by subject_id if your schema uses it strictly for non-cognitive, 
            // but usually non-cognitive is general per student. We'll just take the first one.
            ->first();

        $regenerate = $request->boolean('regenerate');

        $differentiatedStrategy = $this->adaptiveLearning->generateDifferentiatedStrategy($summary, $nonCognitive, $regenerate);

        return Inertia::render('adaptive-learning/summary', [
            'subject' => ['id' => $subject->id, 'name' => $subject->name],
            'student' => [
                'id'         => $student->id,
                'name'       => $student->name,
                'nis'        => $student->nis,
                'class_name' => $student->schoolClass?->name,
            ],
            'summary' => $summary,
            'non_cognitive' => $nonCognitive ? [
                'learning_style'        => $nonCognitive->learning_style,
                'learning_style_detail' => $nonCognitive->learning_style_detail,
                'motivation_level'      => $nonCognitive->motivation_level,
                'interests'             => $nonCognitive->interests,
                'family_background'     => $nonCognitive->family_background,
                'notes'                 => $nonCognitive->notes,
            ] : null,
            'differentiated_strategy' => $differentiatedStrategy,
        ]);
    }
}
