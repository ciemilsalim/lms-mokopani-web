<?php

namespace App\Services;

use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\Student;
use App\Models\StudentDiagnosticResult;
use App\Models\Subject;

class AdaptiveLearningService
{
    /**
     * Analyze a diagnostic submission, calculate score, and save result.
     */
    public function analyzeDiagnostic(LmsSubmission $submission): StudentDiagnosticResult
    {
        $assignment = $submission->assignment;
        $config = $assignment->instrument_config ?? [];
        $maxPoints = $assignment->max_points ?? 100;
        $passThreshold = $config['pass_threshold'] ?? 60;

        $score = $this->calculateScore($submission->content, $config, $maxPoints);
        $isPassed = $score >= $passThreshold;

        $topicBreakdown = $this->buildTopicBreakdown($submission->content, $config);
        $recommendations = $this->buildRecommendations($assignment, $isPassed, $score, $topicBreakdown, $config);

        return StudentDiagnosticResult::updateOrCreate(
            [
                'student_id'    => $submission->student_id,
                'assignment_id' => $assignment->id,
            ],
            [
                'subject_id'            => $assignment->subject_id,
                'learning_objective_id' => $assignment->learning_objective_id,
                'total_score'           => $score,
                'pass_threshold'        => $passThreshold,
                'is_passed'             => $isPassed,
                'topic_breakdown'       => $topicBreakdown,
                'recommendations'       => $recommendations,
            ]
        );
    }

    /**
     * Get aggregated diagnostic summary for a student on a subject.
     */
    public function getDiagnosticSummary(int $subjectId, int $studentId): array
    {
        $results = StudentDiagnosticResult::where('subject_id', $subjectId)
            ->where('student_id', $studentId)
            ->get();

        if ($results->isEmpty()) {
            return [
                'has_diagnostic' => false,
                'mastered_tp_ids' => [],
                'average_score'  => null,
                'results'        => [],
            ];
        }

        $masteredTpIds = $results->filter(fn($r) => $r->is_passed)
            ->pluck('learning_objective_id')
            ->filter()
            ->values()
            ->toArray();

        return [
            'has_diagnostic' => true,
            'mastered_tp_ids' => $masteredTpIds,
            'average_score'  => round($results->avg('total_score'), 1),
            'results'        => $results->map(fn($r) => [
                'id'              => $r->id,
                'assignment_id'   => $r->assignment_id,
                'learning_objective_id' => $r->learning_objective_id,
                'total_score'     => $r->total_score,
                'is_passed'       => $r->is_passed,
                'topic_breakdown' => $r->topic_breakdown,
                'recommendations' => $r->recommendations,
            ]),
        ];
    }

    /**
     * Calculate score from submission content (replicates frontend logic).
     */
    private function calculateScore(?string $content, array $config, int $maxPoints): float
    {
        if (!$content) return 0;

        $parsed = json_decode($content, true);
        if (!$parsed) return 0;

        // quiz_response or written_test with questions
        if (in_array($parsed['type'] ?? '', ['quiz_response', 'written_test'])) {
            $questions = $config['questions'] ?? [];
            $answers = $parsed['answers'] ?? [];
            $total = 0;

            foreach ($questions as $q) {
                $studentAns = $answers[$q['id']] ?? null;
                
                // Fallback: If individual question points is missing or 0, distribute maxPoints evenly among all questions
                $points = (int) ($q['points'] ?? (count($questions) > 0 ? round($maxPoints / count($questions)) : 0));

                $isMcq = ($q['type'] ?? '') === 'multiple_choice';
                
                if ($isMcq) {
                    $correctOpt = $this->findCorrectOption($q['options'] ?? []);
                    $correctAnswerId = $correctOpt ? $correctOpt['id'] : ($q['answer'] ?? null);
                    $isCorrect = ($correctAnswerId !== null && $correctAnswerId == $studentAns);
                } else {
                    $correctAnswerText = $q['correct_answer'] ?? ($q['answer'] ?? null);
                    $isCorrect = (!empty($correctAnswerText)
                        && strtolower(trim((string) $studentAns)) === strtolower(trim((string) $correctAnswerText)));
                }

                if ($isCorrect) {
                    $total += $points;
                }
            }

            return min((float) $maxPoints, (float) $total);
        }

        // observation_checklist: count "muncul" indicators
        if (($parsed['type'] ?? '') === 'observation') {
            $indicators = $config['indicators'] ?? [];
            $checklist = $parsed['checklist'] ?? [];
            if (empty($indicators)) return 0;

            $muncul = 0;
            foreach ($indicators as $ind) {
                if (!empty($checklist[$ind['id']])) $muncul++;
            }

            return round(($muncul / count($indicators)) * $maxPoints);
        }

        // Fallback to stored auto_score
        return (float) ($parsed['auto_score'] ?? 0);
    }

    /**
     * Build per-topic breakdown from submission content.
     */
    private function buildTopicBreakdown(?string $content, array $config): array
    {
        if (!$content) return [];

        $parsed = json_decode($content, true);
        if (!$parsed) return [];

        $questions = $config['questions'] ?? [];
        $answers = $parsed['answers'] ?? [];

        // Group questions by topic
        $topics = [];
        foreach ($questions as $q) {
            $topic = $q['topic'] ?? 'Umum';
            if (!isset($topics[$topic])) {
                $topics[$topic] = ['total' => 0, 'earned' => 0];
            }
            $points = (int) ($q['points'] ?? 0);
            $topics[$topic]['total'] += $points;

            $studentAns = $answers[$q['id']] ?? null;
            $isMcq = ($q['type'] ?? '') === 'multiple_choice';
            $correctOpt = $isMcq ? $this->findCorrectOption($q['options'] ?? []) : null;
            $isCorrect = $isMcq
                ? ($correctOpt && $correctOpt['id'] == $studentAns)
                : (($q['type'] ?? '') === 'short_answer'
                    && !empty($q['correct_answer'])
                    && strtolower(trim((string) $studentAns)) === strtolower(trim($q['correct_answer'])));

            if ($isCorrect) $topics[$topic]['earned'] += $points;
        }

        $result = [];
        foreach ($topics as $name => $data) {
            $pct = $data['total'] > 0 ? round(($data['earned'] / $data['total']) * 100) : 0;
            $result[] = [
                'topic'         => $name,
                'score'         => $data['earned'],
                'max_score'     => $data['total'],
                'mastery_pct'   => $pct,
                'mastery_level' => $pct >= 80 ? 'tinggi' : ($pct >= 60 ? 'sedang' : 'rendah'),
            ];
        }

        return $result;
    }

    /**
     * Generate recommendations based on diagnostic result.
     */
    private function buildRecommendations(LmsAssignment $assignment, bool $isPassed, float $score, array $topicBreakdown, array $config): array
    {
        $recommendations = [];

        if ($isPassed) {
            $recommendations[] = [
                'type'    => 'skip',
                'message' => $config['follow_up_high'] ?? 'Kamu sudah menguasai materi ini. Langsung lanjut ke materi berikutnya.',
                'icon'    => 'zap',
            ];

            if ($score >= 90) {
                $recommendations[] = [
                    'type'    => 'enrichment',
                    'message' => 'Nilai kamu sangat baik! Coba tantang diri dengan soal pengayaan.',
                    'icon'    => 'star',
                ];
            }
        } else {
            $recommendations[] = [
                'type'    => 'remedial',
                'message' => $config['follow_up_low'] ?? 'Pelajari ulang materi prasyarat sebelum lanjut ke topik berikutnya.',
                'icon'    => 'book-open',
            ];

            foreach ($topicBreakdown as $topic) {
                if ($topic['mastery_level'] === 'rendah') {
                    $recommendations[] = [
                        'type'    => 'focus',
                        'topic'   => $topic['topic'],
                        'message' => "Fokus pelajari kembali topik \"{$topic['topic']}\" (pencapaian {$topic['mastery_pct']}%).",
                        'icon'    => 'target',
                    ];
                }
            }
        }

        return $recommendations;
    }

    private function findCorrectOption(array $options): ?array
    {
        foreach ($options as $opt) {
            if (!empty($opt['is_correct'])) return $opt;
        }
        return null;
    }

    /**
     * Generate Differentiated Learning Strategy based on Cognitive and Non-Cognitive profiles (PPA 2025).
     */
    public function generateDifferentiatedStrategy(array $cognitiveSummary, ?\App\Models\StudentNonCognitiveDiagnostic $nonCognitive): array
    {
        $strategy = [
            'content' => [],
            'process' => [],
            'product' => [],
        ];

        // 1. Identify weak topics from cognitive summary
        $weakTopics = [];
        if (!empty($cognitiveSummary['results'])) {
            // Get the latest diagnostic result
            $latestResult = end($cognitiveSummary['results']);
            if (isset($latestResult['topic_breakdown'])) {
                foreach ($latestResult['topic_breakdown'] as $topic) {
                    if ($topic['mastery_level'] === 'rendah') {
                        $weakTopics[] = $topic['topic'];
                    }
                }
            }
        }

        $style = strtolower($nonCognitive?->learning_style ?? 'visual'); // Default visual if none
        $styleDisplay = ucfirst($style);

        // Content Differentiation
        if ($style === 'visual') {
            $strategy['content'][] = "Gunakan media visual seperti infografis, diagram, atau mind map.";
            $strategy['content'][] = "Sediakan materi bacaan bergambar atau video dengan teks.";
        } elseif ($style === 'auditori' || $style === 'auditory') {
            $strategy['content'][] = "Sediakan rekaman penjelasan materi atau podcast.";
            $strategy['content'][] = "Gunakan instruksi lisan secara langsung.";
        } elseif ($style === 'kinestetik' || $style === 'kinesthetic') {
            $strategy['content'][] = "Sediakan alat peraga fisik atau bahan manipulatif.";
            $strategy['content'][] = "Gunakan materi yang berhubungan dengan kehidupan nyata.";
        } else {
            $strategy['content'][] = "Gunakan kombinasi teks, gambar, dan media interaktif.";
        }

        if (!empty($weakTopics)) {
            $topicsStr = implode(', ', $weakTopics);
            $strategy['content'][] = "Siapkan modul remedial khusus yang menyederhanakan topik: {$topicsStr}.";
        } else {
            $strategy['content'][] = "Sediakan modul pengayaan karena siswa sudah menguasai kompetensi dasar.";
        }

        // Process Differentiation
        if ($style === 'visual') {
            $strategy['process'][] = "Minta siswa membuat peta konsep (mind mapping) dari materi yang dipelajari.";
        } elseif ($style === 'auditori' || $style === 'auditory') {
            $strategy['process'][] = "Fasilitasi diskusi kelompok atau izinkan siswa menjelaskan materi kepada temannya (tutor sebaya).";
        } elseif ($style === 'kinestetik' || $style === 'kinesthetic') {
            $strategy['process'][] = "Berikan tugas proyek, role-play, atau eksperimen langsung.";
        }

        if (in_array(strtolower($nonCognitive?->motivation_level[0] ?? ''), ['rendah', 'low'])) {
            $strategy['process'][] = "Berikan pendampingan lebih intensif dan umpan balik positif secara berkala.";
        } else {
            $strategy['process'][] = "Berikan kebebasan lebih dalam memilih cara mengeksplorasi materi (mandiri).";
        }

        // Product Differentiation
        if ($style === 'visual') {
            $strategy['product'][] = "Asesmen sumatif bisa berupa poster, infografis, atau presentasi slide.";
        } elseif ($style === 'auditori' || $style === 'auditory') {
            $strategy['product'][] = "Asesmen bisa berbentuk presentasi lisan, debat, atau rekaman audio.";
        } elseif ($style === 'kinestetik' || $style === 'kinesthetic') {
            $strategy['product'][] = "Asesmen berupa pembuatan maket, demonstrasi, atau portofolio karya fisik.";
        }

        return $strategy;
    }

    /**
     * Get accessible Learning Objective (TP) IDs for a student based on sequential learning path.
     */
    public function getStudentAccessibleTpIds(int $studentId, int $schoolClassId): array
    {
        $accessibleTpIds = [];
        $tpsBySubject = \App\Models\LmsLearningObjective::where('school_class_id', $schoolClassId)
            ->orderBy('order')
            ->orderBy('code')
            ->get()
            ->groupBy('subject_id');

        $tpIds = $tpsBySubject->flatten()->pluck('id');
        
        $assignments = \App\Models\LmsAssignment::whereIn('learning_objective_id', $tpIds)
            ->where('school_class_id', $schoolClassId)
            ->get()->groupBy('learning_objective_id');
            
        $materials = \App\Models\LmsMaterial::whereIn('learning_objective_id', $tpIds)
            ->where('school_class_id', $schoolClassId)
            ->get()->groupBy('learning_objective_id');

        $submissions = \App\Models\LmsSubmission::whereIn('assignment_id', $assignments->flatten()->pluck('id'))
            ->where('student_id', $studentId)
            ->get()->groupBy('assignment_id');

        $reflections = \App\Models\LmsReflection::whereIn('material_id', $materials->flatten()->pluck('id'))
            ->where('student_id', $studentId)
            ->get()->groupBy('material_id');
            
        $studentMaterials = \App\Models\LmsStudentMaterial::whereIn('material_id', $materials->flatten()->pluck('id'))
            ->where('student_id', $studentId)
            ->whereNotNull('completed_at')
            ->get()->groupBy('material_id');

        $diagnosticResults = \App\Models\StudentDiagnosticResult::where('student_id', $studentId)
            ->where('is_passed', true)
            ->pluck('learning_objective_id')
            ->toArray();

        foreach ($tpsBySubject as $subjectId => $tps) {
            $previousCompleted = true;
            
            foreach ($tps as $tp) {
                if ($previousCompleted || in_array($tp->id, $diagnosticResults)) {
                    $accessibleTpIds[] = $tp->id;
                } else {
                    continue;
                }
                
                if (in_array($tp->id, $diagnosticResults)) {
                    $previousCompleted = true;
                    continue;
                }
                
                $tpAssignments = $assignments->get($tp->id, collect());
                $tpMaterials = $materials->get($tp->id, collect());
                
                $assignmentsCompleted = $tpAssignments->isEmpty() || $tpAssignments->every(function($a) use ($submissions) {
                    return $submissions->has($a->id);
                });
                
                $materialsCompleted = $tpMaterials->isEmpty() || $tpMaterials->every(function($m) use ($reflections, $studentMaterials) {
                    return $reflections->has($m->id) || $studentMaterials->has($m->id);
                });
                
                if ($tpAssignments->isEmpty() && $tpMaterials->isEmpty()) {
                    $previousCompleted = false;
                } else {
                    $previousCompleted = $assignmentsCompleted && $materialsCompleted;
                }
            }
        }
        
        return $accessibleTpIds;
    }
}
