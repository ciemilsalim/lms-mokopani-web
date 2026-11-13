<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudentDiagnosticResult;
use App\Models\SubjectAttendance;

class AnalyticsService
{
    public function getClassPerformance(int $subjectId, int $classId, ?int $semesterId = null, ?string $startDate = null, ?string $endDate = null, bool $allSemesters = false): array
    {
        $activeYear = AcademicYear::getActive();
        $targetSemesterId = $allSemesters ? null : ($semesterId ?? Semester::getActive()?->id);

        $query = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            });

        if (!$allSemesters) {
            if ($semesterId !== null) {
                $query->where('semester_id', $semesterId);
            } else {
                $query->where('academic_year_id', $activeYear?->id)
                    ->where('semester_id', $targetSemesterId);
            }
        }

        if ($startDate) {
            $query->whereDate('due_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('due_date', '<=', $endDate);
        }

        $assignments = $query->orderBy('due_date')->get();

        $students = Student::where('school_class_id', $classId)->orderBy('name')->get(['id', 'name', 'nis']);
        $studentIds = $students->pluck('id');

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $studentIds)
            ->get();

        // ── Score per assignment (class average) ──
        $assignmentScores = [];
        foreach ($assignments as $a) {
            $scores = $submissions->where('assignment_id', $a->id)->pluck('score')->filter(fn ($s) => $s !== null);
            $assignmentScores[] = [
                'id'             => $a->id,
                'title'          => $a->title,
                'assessment_type' => $a->assessment_type,
                'max_points'     => $a->max_points,
                'passing_grade'  => $a->passing_grade ?? 70,
                'avg_score'      => $scores->isNotEmpty() ? round($scores->avg(), 1) : null,
                'submission_count' => $scores->count(),
                'student_count'  => $students->count(),
                'due_date'       => $a->due_date?->format('Y-m-d'),
            ];
        }

        // ── Score distribution ──
        $kktp = get_kktp($subjectId);
        $lowThreshold = round($kktp * 0.6);
        $midThreshold = $kktp;
        $highThreshold = round($kktp + (100 - $kktp) * 0.6);
        $distributionBuckets = [0, 0, 0, 0, 0];
        $allScores = $submissions->pluck('score')->filter(fn ($s) => $s !== null);
        foreach ($allScores as $s) {
            if ($s < $lowThreshold) $distributionBuckets[0]++;
            elseif ($s < $midThreshold) $distributionBuckets[1]++;
            elseif ($s < $highThreshold) $distributionBuckets[2]++;
            elseif ($s < 90) $distributionBuckets[3]++;
            else $distributionBuckets[4]++;
        }

        // ── Submission rate ──
        $totalAssignments = $assignments->count();
        $totalPossible = $totalAssignments * $students->count();
        $totalSubmitted = $submissions->count();
        $submissionRate = $totalPossible > 0 ? round(($totalSubmitted / $totalPossible) * 100) : 0;

        return [
            'kktp'               => $kktp,
            'total_assignments'  => $totalAssignments,
            'total_students'     => $students->count(),
            'class_avg_score'    => $allScores->isNotEmpty() ? round($allScores->avg(), 1) : null,
            'submission_rate'    => $submissionRate,
            'assignment_scores'  => $assignmentScores,
            'score_distribution' => [
                ['range' => "0-{$lowThreshold}", 'count' => $distributionBuckets[0], 'label' => 'Perlu Remedial'],
                ['range' => "{$lowThreshold}-" . ($midThreshold - 1), 'count' => $distributionBuckets[1], 'label' => 'Kurang'],
                ['range' => "{$midThreshold}-" . ($highThreshold - 1), 'count' => $distributionBuckets[2], 'label' => 'Cukup'],
                ['range' => "{$highThreshold}-89", 'count' => $distributionBuckets[3], 'label' => 'Baik'],
                ['range' => "90-100", 'count' => $distributionBuckets[4], 'label' => 'Sangat Baik'],
            ],
        ];
    }

    public function getStudentScoresMatrix(int $subjectId, int $classId, ?int $semesterId = null, ?string $startDate = null, ?string $endDate = null, bool $allSemesters = false): array
    {
        $activeYear = AcademicYear::getActive();
        $targetSemesterId = $allSemesters ? null : ($semesterId ?? Semester::getActive()?->id);

        $query = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            });

        if (!$allSemesters) {
            if ($semesterId !== null) {
                $query->where('semester_id', $semesterId);
            } else {
                $query->where('academic_year_id', $activeYear?->id)
                    ->where('semester_id', $targetSemesterId);
            }
        }

        if ($startDate) {
            $query->whereDate('due_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('due_date', '<=', $endDate);
        }

        $assignments = $query->orderBy('due_date')->get(['id', 'title', 'passing_grade', 'max_points']);

        $students = Student::where('school_class_id', $classId)->orderBy('name')->get(['id', 'name', 'nis']);

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        $matrix = [];
        foreach ($students as $s) {
            $studentSubmissions = $submissions->where('student_id', $s->id)->keyBy('assignment_id');
            $scores = [];
            $totalScore = 0;
            $totalCount = 0;

            foreach ($assignments as $a) {
                $sub = $studentSubmissions->get($a->id);
                $score = $sub?->score;
                $passing = $a->passing_grade ?? 70;
                if ($score !== null) {
                    $totalScore += $score;
                    $totalCount++;
                }
                $scores[] = [
                    'score'   => $score,
                    'is_passed'   => $a->evaluateKetuntasan($sub),
                    'passing_grade' => $passing,
                ];
            }

            $matrix[] = [
                'id'          => $s->id,
                'name'        => $s->name,
                'nis'         => $s->nis,
                'scores'      => $scores,
                'average'     => $totalCount > 0 ? round($totalScore / $totalCount, 1) : null,
            ];
        }

        return [
            'assignments' => $assignments->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'max_points' => $a->max_points]),
            'students'    => $matrix,
        ];
    }

    public function getQuestionDifficulty(int $assignmentId): array
    {
        $assignment = LmsAssignment::find($assignmentId);
        if (!$assignment) return [];

        $config = $assignment->instrument_config ?? [];
        $questions = $config['questions'] ?? [];

        if (empty($questions)) return [];

        $submissions = LmsSubmission::where('assignment_id', $assignmentId)
            ->whereNotNull('score')
            ->get();

        $result = [];
        foreach ($questions as $q) {
            $qType = $q['type'] ?? 'unknown';
            if (!in_array($qType, ['multiple_choice', 'short_answer'], true)) {
                continue;
            }

            $correct = 0;
            $total = 0;

            foreach ($submissions as $sub) {
                $content = is_array($sub->content)
                    ? $sub->content
                    : (is_string($sub->content) ? json_decode($sub->content, true) : []);
                $content = is_array($content) ? $content : [];
                $answers = $content['answers'] ?? [];
                $studentAns = $answers[$q['id']] ?? null;

                $isMcq = $qType === 'multiple_choice';
                $correctOpt = null;
                if ($isMcq) {
                    foreach ($q['options'] ?? [] as $opt) {
                        if (!empty($opt['is_correct'])) $correctOpt = $opt;
                    }
                }
                $isCorrect = $isMcq
                    ? ($correctOpt && $correctOpt['id'] == $studentAns)
                    : (!empty($q['correct_answer'])
                        && strtolower(trim((string) $studentAns)) === strtolower(trim((string) $q['correct_answer'])));

                if ($studentAns !== null && $studentAns !== '') {
                    $total++;
                    if ($isCorrect) $correct++;
                }
            }

            $difficultyIndex = $total > 0 ? round(($correct / $total) * 100) : null;
            $result[] = [
                'id'               => $q['id'],
                'text'             => mb_substr(strip_tags($q['text'] ?? $q['question'] ?? ''), 0, 100),
                'type'             => $qType,
                'correct_count'    => $correct,
                'total_answers'    => $total,
                'difficulty_index' => $difficultyIndex,
                'difficulty_level' => $difficultyIndex === null ? 'unknown' :
                    ($difficultyIndex >= 70 ? 'mudah' : ($difficultyIndex >= 40 ? 'sedang' : 'sulit')),
            ];
        }

        return $result;
    }

    public function getEngagementMetrics(int $studentId, int $subjectId): array
    {
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->orderBy('id')
            ->get(['id', 'title', 'due_date']);

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->where('student_id', $studentId)
            ->get()
            ->keyBy('assignment_id');

        $lateCount = 0;
        $onTimeCount = 0;
        $missingCount = 0;

        foreach ($assignments as $a) {
            $sub = $submissions->get($a->id);
            if (!$sub) {
                $missingCount++;
            } elseif ($a->due_date && $sub->submitted_at && $sub->submitted_at->gt($a->due_date)) {
                $lateCount++;
            } else {
                $onTimeCount++;
            }
        }

        $total = $assignments->count();

        return [
            'total_assignments' => $total,
            'on_time'           => $onTimeCount,
            'late'              => $lateCount,
            'missing'           => $missingCount,
            'engagement_rate'   => $total > 0 ? round((($onTimeCount + $lateCount) / $total) * 100) : 0,
            'on_time_rate'      => $total > 0 ? round(($onTimeCount / $total) * 100) : 0,
        ];
    }
}
