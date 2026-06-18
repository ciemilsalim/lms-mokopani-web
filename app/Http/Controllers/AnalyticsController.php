<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use App\Services\EarlyWarningService;
use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index(AnalyticsService $analytics, EarlyWarningService $earlyWarning)
    {
        $user = Auth::user();
        $teacher = $user->teacher;

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ])
            ->unique(fn($t) => $t['subject_id'] . '-' . $t['class_id'])
            ->values();

        // Overview stats across all teachings
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $allStudents = Student::whereIn('school_class_id', $teachings->pluck('class_id')->unique())->count();
        $allAssignments = LmsAssignment::where('teacher_id', $teacher->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->count();

        $totalAtRisk = 0;
        foreach ($teachings as $t) {
            $risk = $earlyWarning->getClassRiskSummary($t['class_id'], $t['subject_id']);
            $totalAtRisk += $risk['at_risk_count'];
        }

        return Inertia::render('analytics/index', [
            'teachings'      => $teachings,
            'overview_stats' => [
                'total_students'  => $allStudents,
                'total_subjects'  => $teachings->pluck('subject_id')->unique()->count(),
                'total_classes'   => $teachings->pluck('class_id')->unique()->count(),
                'total_assignments' => $allAssignments,
                'total_at_risk'   => $totalAtRisk,
            ],
        ]);
    }

    public function show(int $subjectId, int $classId, AnalyticsService $analytics, EarlyWarningService $earlyWarning)
    {
        $subject = Subject::findOrFail($subjectId);
        $class = \App\Models\SchoolClass::findOrFail($classId);

        $performance = $analytics->getClassPerformance($subjectId, $classId);
        $scoreMatrix = $analytics->getStudentScoresMatrix($subjectId, $classId);
        $riskSummary = $earlyWarning->getClassRiskSummary($classId, $subjectId);

        // Question difficulty for last few objective-type assignments
        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->whereIn('instrument_type', ['quiz_survey', 'written_test'])
            ->orderByDesc('id')
            ->take(5)
            ->get();

        $questionAnalysis = [];
        foreach ($assignments as $a) {
            $analysis = $analytics->getQuestionDifficulty($a->id);
            if (!empty($analysis)) {
                $questionAnalysis[] = [
                    'assignment_id'    => $a->id,
                    'assignment_title' => $a->title,
                    'questions'        => $analysis,
                ];
            }
        }

        return Inertia::render('analytics/subject', [
            'subject'            => ['id' => $subject->id, 'name' => $subject->name],
            'class'              => ['id' => $class->id, 'name' => $class->name],
            'performance'        => $performance,
            'score_matrix'       => $scoreMatrix,
            'risk_summary'       => $riskSummary,
            'question_analysis'  => $questionAnalysis,
        ]);
    }
}
