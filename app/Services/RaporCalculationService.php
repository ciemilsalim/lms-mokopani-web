<?php

namespace App\Services;

class RaporCalculationService
{
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
