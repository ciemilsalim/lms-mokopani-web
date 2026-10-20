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
        $user = Auth::user();
        if ($user->role !== 'admin') {
            $teacher = $user->teacher ?? \App\Models\Teacher::where('user_id', $user->id)->first();
            if (!$teacher) {
                abort(403, 'Akses khusus guru.');
            }
            $isAssigned = \App\Models\TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $subjectId)
                ->where('school_class_id', $classId)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas ini.');
            }
        }

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
        $user = Auth::user();
        $subject = Subject::findOrFail($subjectId);
        $student = Student::with('schoolClass')->findOrFail($studentId);

        if ($user->role === 'student' || $user->student) {
            if ((int)$user->student?->id !== (int)$studentId) {
                abort(403, 'Anda hanya dapat melihat ringkasan pembelajaran adaptif milik Anda sendiri.');
            }
        } elseif ($user->role === 'parent' || $user->parent) {
            $hasChild = $user->parent && $user->parent->students->contains('id', (int)$studentId);
            if (!$hasChild) {
                abort(403, 'Anda tidak memiliki hak akses ke data siswa ini.');
            }
        } elseif ($user->role !== 'admin') {
            $teacher = $user->teacher ?? \App\Models\Teacher::where('user_id', $user->id)->first();
            if (!$teacher) {
                abort(403, 'Akses ditolak.');
            }
            $isAssigned = \App\Models\TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $subjectId)
                ->where('school_class_id', $student->school_class_id)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas siswa ini.');
            }
        }

        $summary = $this->adaptiveLearning->getDiagnosticSummary((int) $subjectId, (int) $studentId);
        
        $nonCognitive = \App\Models\StudentNonCognitiveDiagnostic::where('student_id', $studentId)
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
