<?php

namespace App\Services;

class PlanningService
{
    public bool $isLastRequestOnline = false;

    /**
     * Suggest TP descriptions by splitting CP description into sentences.
     */
    public function suggestDirectTp($description, bool $regenerate = false)
    {
        $this->isLastRequestOnline = false;
        if (empty($description)) return [];

        try {
            $gemini = app(\App\Services\GeminiApiService::class);
            if ($gemini->isConfigured()) {
                $suggestions = $gemini->suggestDirectTp($description, $regenerate);
                if (!empty($suggestions)) {
                    $this->isLastRequestOnline = true;
                    return $suggestions;
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AI suggestDirectTp failed, falling back to offline method', [
                'message' => $e->getMessage()
            ]);
        }

        $description = str_replace(["\r", "\n"], ' ', $description);
        
        $patterns = [
            '[;.]\s+',
            '\d+[\)\.]\s+',
            '[a-z][\)\.]\s+',
            '\s*-\s+'
        ];
        
        $combinedPattern = '/' . implode('|', $patterns) . '/';
        $sentences = preg_split($combinedPattern, $description, -1, PREG_SPLIT_NO_EMPTY);
        
        $results = array_map(function($s) {
            return trim($s, " \t\n\r\0\x0B.;");
        }, $sentences);

        return array_values(array_filter($results, fn($s) => strlen($s) > 10));
    }

    /**
     * Analyze text to extract Competence (verbs) and Content (nouns/topics).
     */
    public function analyzeCompetenceAndContent($text, bool $regenerate = false)
    {
        $this->isLastRequestOnline = false;
        if (empty($text)) {
            return [
                'competences' => [],
                'content' => '',
                'description' => ''
            ];
        }

        try {
            $gemini = app(\App\Services\GeminiApiService::class);
            if ($gemini->isConfigured()) {
                $analysis = $gemini->analyzeCompetenceAndContent($text, $regenerate);
                if (!empty($analysis)) {
                    $this->isLastRequestOnline = true;
                    return $analysis;
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AI analyzeCompetenceAndContent failed, falling back to offline method', [
                'message' => $e->getMessage()
            ]);
        }

        $competenceKeywords = [
            'C1' => ['mengenal', 'menyebutkan', 'menjelaskan', 'mendeskripsikan', 'mengidentifikasi', 'membaca', 'mencatat'],
            'C2' => ['memahami', 'mengklasifikasikan', 'mengilustrasikan', 'menyimpulkan', 'menerjemahkan', 'merangkum'],
            'C3' => ['menggunakan', 'menerapkan', 'menghitung', 'memecahkan', 'mendemonstrasikan', 'mengoperasikan'],
            'C4' => ['menganalisis', 'membandingkan', 'mengorganisasikan', 'menguji', 'menguraikan', 'menelaah'],
            'C5' => ['mengevaluasi', 'menilai', 'mengkritik', 'memvalidasi', 'memprediksi', 'mempertahankan'],
            'C6' => ['menciptakan', 'merancang', 'membangun', 'menyusun', 'membuat', 'memformulasikan', 'mengembangkan']
        ];

        $foundCompetences = [];
        $lowerText = strtolower($text);

        foreach ($competenceKeywords as $level => $verbs) {
            foreach ($verbs as $verb) {
                if (strpos($lowerText, $verb) !== false) {
                    $foundCompetences[] = [
                        'verb' => $verb,
                        'level' => $level
                    ];
                }
            }
        }

        $content = trim(preg_replace('/\b(' . implode('|', array_merge(...array_values($competenceKeywords))) . ')\b/i', '', $text));

        return [
            'competences' => $foundCompetences,
            'content' => $content,
            'description' => ''
        ];
    }

    /**
     * Suggest a combined TP from multiple CPs.
     */
    public function suggestCrossElementTp($cpDescriptions, bool $regenerate = false)
    {
        $this->isLastRequestOnline = false;
        if (empty($cpDescriptions)) return "";

        try {
            $gemini = app(\App\Services\GeminiApiService::class);
            if ($gemini->isConfigured()) {
                $suggestion = $gemini->suggestCrossElementTp($cpDescriptions, $regenerate);
                if (!empty($suggestion)) {
                    $this->isLastRequestOnline = true;
                    return $suggestion;
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AI suggestCrossElementTp failed, falling back to offline method', [
                'message' => $e->getMessage()
            ]);
        }

        return "Mengintegrasikan konsep " . implode(" dan ", array_map(fn($d) => substr($d, 0, 50) . "...", $cpDescriptions));
    }

    /**
     * Suggest sequence for TPs based on chosen method.
     */
    public function suggestSequence($objectives, $method = 'Otomatis')
    {
        $levels = ['C1' => 1, 'C2' => 2, 'C3' => 3, 'C4' => 4, 'C5' => 5, 'C6' => 6];

        return $objectives->sort(function($a, $b) use ($levels, $method) {
            $analysisA = $this->analyzeCompetenceAndContent($a->description);
            $analysisB = $this->analyzeCompetenceAndContent($b->description);

            $maxLevelA = !empty($analysisA['competences']) ? max(array_map(fn($c) => $levels[$c['level']], $analysisA['competences'])) : 0;
            $maxLevelB = !empty($analysisB['competences']) ? max(array_map(fn($c) => $levels[$c['level']], $analysisB['competences'])) : 0;

            // Method-specific heuristics
            switch ($method) {
                case 'Konkret ke Abstrak':
                case 'Mudah ke Sulit':
                case 'Scaffolding':
                case 'Otomatis':
                    // Primarily based on Bloom's level (Low to High)
                    if ($maxLevelA != $maxLevelB) return $maxLevelA - $maxLevelB;
                    break;

                case 'Deduktif':
                    // General to specific (often High level to Low level or based on content length)
                    if ($maxLevelA != $maxLevelB) return $maxLevelB - $maxLevelA;
                    break;

                case 'Prosedural':
                    // Look for sequential keywords
                    $seqKeywords = ['pertama', 'kedua', 'ketiga', 'akhir', 'awal', 'tahap', 'langkah'];
                    $scoreA = $this->getSequenceScore($a->description, $seqKeywords);
                    $scoreB = $this->getSequenceScore($b->description, $seqKeywords);
                    if ($scoreA != $scoreB) return $scoreB - $scoreA;
                    break;
            }

            // Tie-breaker: original order or description length
            return strlen($a->description) - strlen($b->description);
        })->values();
    }

    private function getSequenceScore($text, $keywords)
    {
        $score = 0;
        $lower = strtolower($text);
        foreach ($keywords as $index => $kw) {
            if (strpos($lower, $kw) !== false) {
                // Keywords like 'awal' or 'pertama' should come first (higher score for sorting)
                $score += (count($keywords) - $index);
            }
        }
        return $score;
    }
}
