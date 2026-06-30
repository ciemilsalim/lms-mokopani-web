<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Services\EarlyWarningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class EarlyWarningController extends Controller
{
    public function __construct(
        protected EarlyWarningService $earlyWarning
    ) {}

    public function index()
    {
        $user = Auth::user();
        
        $query = TeachingAssignment::with(['subject', 'schoolClass']);
        
        if ($user->role !== 'admin') {
            $teacher = $user->teacher;
            if (!$teacher) {
                abort(403, 'Akses ditolak.');
            }
            $query->where('teacher_id', $teacher->id);
        }

        $teachings = $query->get()
            ->map(fn ($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ])
            ->unique(fn ($t) => $t['subject_id'] . '-' . $t['class_id'])
            ->values();

        return Inertia::render('early-warning/index', [
            'teachings' => $teachings,
        ]);
    }

    public function show($subjectId, $classId)
    {
        $subject = Subject::findOrFail($subjectId);
        $class = SchoolClass::findOrFail($classId);

        $summary = $this->earlyWarning->getClassRiskSummary((int) $classId, (int) $subjectId);

        return Inertia::render('early-warning/show', [
            'subject' => ['id' => $subject->id, 'name' => $subject->name],
            'class'   => ['id' => $class->id, 'name' => $class->name],
            'summary' => $summary,
        ]);
    }

    public function student($subjectId, $studentId)
    {
        $student = \App\Models\Student::with('schoolClass')->findOrFail($studentId);
        $subject = Subject::findOrFail($subjectId);

        $flags = $this->earlyWarning->evaluateStudent(
            ['id' => $student->id, 'name' => $student->name, 'nis' => $student->nis],
            (int) $subjectId
        );

        return Inertia::render('early-warning/student', [
            'student' => [
                'id'         => $student->id,
                'name'       => $student->name,
                'nis'        => $student->nis,
                'class_name' => $student->schoolClass?->name,
            ],
            'subject' => ['id' => $subject->id, 'name' => $subject->name],
            'flags'   => $flags,
        ]);
    }
}
