<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\Semester;
use Illuminate\Support\Collection;

class RaporCalculationService
{
    /**
     * Cache for evaluated TPs during a request cycle to prevent repetitive DB queries.
     */
    protected array $tpCache = [];

    /**
     * Get evaluated Learning Objectives (TPs) for a specific class & subject.
     */
    public function getEvaluatedTpsForClass($subjectId, $classId, $activeYear = null, $activeSemester = null): Collection
    {
        $cacheKey = "{$subjectId}_{$classId}_" . ($activeYear?->id ?? 0) . '_' . ($activeSemester?->id ?? 0);
        if (isset($this->tpCache[$cacheKey])) {
            return $this->tpCache[$cacheKey];
        }

        $activeYear = $activeYear ?: AcademicYear::getActive();
        $activeSemester = $activeSemester ?: Semester::getActive();

        $tpQuery = LmsLearningObjective::with(['subObjectives'])
            ->where('subject_id', $subjectId)
            ->where(function ($q) use ($classId) {
                $q->where('school_class_id', $classId)
                    ->orWhereNull('school_class_id');
            });

        if ($activeYear && $activeSemester) {
            $tpQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $tpQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $allTps = $tpQuery->get();

        if ($allTps->isEmpty()) {
            return $this->tpCache[$cacheKey] = collect();
        }

        // 1. TPs explicitly assigned to this class
        $classSpecificTps = $allTps->where('school_class_id', $classId);

        // 2. TPs used in any assignments for this class
        $classAssignmentTpIds = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->pluck('learning_objective_id')
            ->filter()
            ->unique();
        $assignmentTps = $allTps->whereIn('id', $classAssignmentTpIds);

        if ($classSpecificTps->isNotEmpty() || $assignmentTps->isNotEmpty()) {
            $candidates = $classSpecificTps->merge($assignmentTps)->unique('id');
        } else {
            // Fallback: check unassigned (null school_class_id)
            $globalTps = $allTps->whereNull('school_class_id');
            if ($globalTps->isNotEmpty()) {
                $candidates = $globalTps;
            } else {
                $candidates = $allTps;
            }
        }

        // Determine evaluated TPs: top level vs sub-TPs
        $leafTps = collect();
        $topLevelTps = $candidates->whereNull('parent_id');

        if ($topLevelTps->isNotEmpty()) {
            foreach ($topLevelTps as $parentTp) {
                $subObjectives = $allTps->where('parent_id', $parentTp->id);
                // Check if any sub-objective is explicitly targeted by an assignment in this class
                $subTargeted = $subObjectives->filter(fn($s) => $classAssignmentTpIds->contains($s->id));
                if ($subTargeted->isNotEmpty()) {
                    foreach ($subTargeted as $subTp) {
                        $leafTps->push($subTp);
                    }
                } else {
                    $leafTps->push($parentTp);
                }
            }
        } else {
            $leafTps = $candidates;
        }

        // Include any candidate sub-TPs that are not yet in leafTps and have no children
        $unprocessedSubTps = $candidates->whereNotNull('parent_id')->whereNotIn('id', $leafTps->pluck('id'));
        foreach ($unprocessedSubTps as $orphan) {
            if (!$leafTps->contains('id', $orphan->id) && $orphan->subObjectives->isEmpty()) {
                $leafTps->push($orphan);
            }
        }

        $sorted = $leafTps->sort(function ($a, $b) {
            if ($a->order !== null && $b->order !== null && $a->order !== $b->order) {
                return $a->order <=> $b->order;
            }
            return strnatcasecmp($a->code ?? '', $b->code ?? '');
        })->values();

        return $this->tpCache[$cacheKey] = $sorted;
    }

    /**
     * Calculate student's unified subject report according to PPA Kurikulum Merdeka.
     */
    public function calculateStudentSubjectReport(
        $studentId,
        $subjectId,
        Collection $evaluatedTps,
        Collection $summativeAssignments,
        Collection $studentSubmissions,
        $sasScore = null,
        $kktp = 75
    ): array {
        $studentSubmissions = $studentSubmissions->where('student_id', $studentId);
        $mappedAssignmentIds = collect();

        // 1. Calculate score per evaluated TP
        $tpScoresList = $evaluatedTps->map(function ($tp) use ($summativeAssignments, $studentSubmissions, &$mappedAssignmentIds) {
            $tpAssignments = $summativeAssignments->where('learning_objective_id', $tp->id);
            if ($tpAssignments->isEmpty() && $tp->parent_id) {
                $parentAssignments = $summativeAssignments->where('learning_objective_id', $tp->parent_id);
                if ($parentAssignments->isNotEmpty()) {
                    $tpAssignments = $parentAssignments;
                }
            }
            if ($tpAssignments->isEmpty() && $tp->subObjectives && $tp->subObjectives->isNotEmpty()) {
                $childAssignments = $summativeAssignments->whereIn('learning_objective_id', $tp->subObjectives->pluck('id'));
                if ($childAssignments->isNotEmpty()) {
                    $tpAssignments = $childAssignments;
                }
            }

            foreach ($tpAssignments->pluck('id') as $id) {
                $mappedAssignmentIds->push($id);
            }

            $tpSubs = $studentSubmissions->whereIn('assignment_id', $tpAssignments->pluck('id'))
                ->filter(fn($s) => $s->score !== null && $s->score !== '');

            $hasAssignment = $tpAssignments->isNotEmpty();
            $score = null;
            if ($tpSubs->isNotEmpty()) {
                $score = round((float) $tpSubs->avg('score'), 1);
            } elseif ($hasAssignment) {
                $score = 0;
            }

            return [
                'tp_id'          => $tp->id,
                'code'           => $tp->code ?: 'TP',
                'description'    => $tp->description,
                'score'          => $score,
                'has_assignment' => $hasAssignment,
            ];
        });

        // 2. Capture any standalone summative assignments not linked to any evaluated TP
        $unmappedAssignments = $summativeAssignments->whereNotIn('id', $mappedAssignmentIds->unique());
        foreach ($unmappedAssignments as $unmapped) {
            $unmappedSubs = $studentSubmissions->where('assignment_id', $unmapped->id)
                ->filter(fn($s) => $s->score !== null && $s->score !== '');
            $score = $unmappedSubs->isNotEmpty() ? round((float) $unmappedSubs->avg('score'), 1) : 0;

            $tpScoresList->push([
                'tp_id'          => 'asm_' . $unmapped->id,
                'code'           => 'Sumatif',
                'description'    => $unmapped->title,
                'score'          => $score,
                'has_assignment' => true,
            ]);
        }

        // 3. Filter evaluated components (have assignments and evaluated score)
        $assessedComponents = $tpScoresList->filter(fn($item) => $item['has_assignment'] && $item['score'] !== null);
        $allSummativeSubs = $studentSubmissions->whereIn('assignment_id', $summativeAssignments->pluck('id'))
            ->filter(fn($s) => $s->score !== null && $s->score !== '');

        // 4. Calculate Sumatif Lingkup Materi ($avgTp)
        $avgTp = $assessedComponents->isNotEmpty() 
            ? round((float) $assessedComponents->avg('score'), 1) 
            : ($allSummativeSubs->isNotEmpty() ? round((float) $allSummativeSubs->avg('score'), 1) : null);

        // 5. Calculate Nilai Akhir (final_score)
        $finalScore = 0;
        if ($avgTp !== null) {
            if ($sasScore !== null && $sasScore !== '') {
                $finalScore = (int) round(((float) $avgTp + (float) $sasScore) / 2);
            } else {
                $finalScore = (int) round((float) $avgTp);
            }
        } elseif ($sasScore !== null && $sasScore !== '') {
            $finalScore = (int) round((float) $sasScore);
        }

        // 6. Generate Kurikulum Merdeka Qualitative Description
        $description = '';
        if ($assessedComponents->isNotEmpty() && $allSummativeSubs->isNotEmpty()) {
            $highest = $assessedComponents->sortByDesc('score')->first();
            $lowest = $assessedComponents->sortBy('score')->first();

            $highDesc = $highest['description'] ?: $highest['code'];
            $lowDesc = $lowest['description'] ?: $lowest['code'];

            if ($highest['score'] >= $kktp) {
                $description = "Menunjukkan penguasaan yang sangat baik dalam hal {$highDesc}.";
            } else {
                $description = "Menunjukkan penguasaan yang cukup dalam hal {$highDesc}.";
            }

            if ($lowest && $lowest['score'] < $kktp && $highest['tp_id'] !== $lowest['tp_id']) {
                $description .= " Perlu bimbingan lebih lanjut dalam hal {$lowDesc}.";
            }
        } else {
            $description = 'Siswa belum memiliki data penilaian sumatif yang mencukupi untuk membuat deskripsi capaian.';
        }

        return [
            'tp_scores'   => $tpScoresList,
            'tp_average'  => $avgTp,
            'sas_score'   => ($sasScore !== null && $sasScore !== '') ? (float) $sasScore : null,
            'final_score' => $finalScore,
            'description' => $description,
        ];
    }

    /**
     * Calculate final score using Average method.
     */
    public function calculateAverage(array $tpScores): float
    {
        if (empty($tpScores)) {
            return 0.0;
        }

        $scores = array_map('floatval', array_values($tpScores));
        $sum = array_sum($scores);
        $count = count($scores);

        return round($sum / $count, 2);
    }

    /**
     * Calculate final score using Weighted method.
     * $weights is array of floats/percentages that sum to 1.0 (or 100).
     */
    public function calculateWeighted(array $tpScores, array $weights = []): float
    {
        if (empty($tpScores)) {
            return 0.0;
        }

        $scores = array_map('floatval', array_values($tpScores));
        $count = count($scores);

        // If no weights provided or mismatch, create equal weights
        if (empty($weights) || count($weights) !== $count) {
            $weights = array_fill(0, $count, 1.0 / $count);
        } else {
            // Normalize weights to sum to 1.0
            $weightSum = array_sum($weights);
            if ($weightSum > 0) {
                $weights = array_map(fn($w) => $w / $weightSum, $weights);
            }
        }

        $totalScore = 0.0;
        foreach ($scores as $index => $score) {
            $totalScore += $score * ($weights[$index] ?? (1.0 / $count));
        }

        return round($totalScore, 2);
    }

    /**
     * Calculate final score using Percentage method (percentage of TPs mastered).
     */
    public function calculatePercentage(array $tpScores, float $threshold = 75.0): float
    {
        if (empty($tpScores)) {
            return 0.0;
        }

        $scores = array_map('floatval', array_values($tpScores));
        $totalTps = count($scores);
        $masteredCount = 0;

        foreach ($scores as $score) {
            if ($score >= $threshold) {
                $masteredCount++;
            }
        }

        return round(($masteredCount / $totalTps) * 100, 2);
    }

    /**
     * Generate Qualitative Description for Report Card based on PPA 2025.
     * $tpDetails: array of ['code' => 'TP 7.1', 'title' => '...', 'score' => 85]
     */
    public function generateQualitativeDescription(array $tpDetails, float $threshold = 75.0, string $studentName = 'Ananda'): string
    {
        $mastered = [];
        $needsImprovement = [];

        foreach ($tpDetails as $tp) {
            $title = $tp['title'] ?? $tp['name'] ?? ('materi ' . ($tp['code'] ?? ''));
            $score = (float)($tp['score'] ?? 0);

            if ($score >= $threshold) {
                $mastered[] = strtolower($title);
            } else {
                $needsImprovement[] = strtolower($title);
            }
        }

        $desc = '';

        if (!empty($mastered)) {
            $desc .= "{$studentName} menunjukkan penguasaan yang baik dalam " . implode(', ', $mastered) . ". ";
        } else {
            $desc .= "{$studentName} telah mengikuti seluruh proses pembelajaran. ";
        }

        if (!empty($needsImprovement)) {
            $desc .= "Namun, {$studentName} masih perlu bimbingan dan peningkatan dalam " . implode(', ', $needsImprovement) . ".";
        } else {
            $desc .= "Tingkatkan terus prestasi dan pertahankan capaian kompetensi ini.";
        }

        return trim($desc);
    }
}
