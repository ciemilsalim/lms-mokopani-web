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

        $questions = $config['questions'] ?? [];
        $q1Correct = false;
        $q2Correct = false;
        $q3Correct = false;

        $parsed = json_decode($submission->content, true);
        if ($parsed && !empty($questions)) {
            $answers = $parsed['answers'] ?? [];
            
            // Q1 (Level 1)
            if (isset($questions[0])) {
                $q1 = $questions[0];
                $ans = $answers[$q1['id']] ?? null;
                $correctVal = $q1['correct_answer'] ?? ($q1['answer'] ?? null);
                $q1Correct = (!empty($correctVal) && strtolower(trim((string) $ans)) === strtolower(trim((string) $correctVal)));
            }
            // Q2 (Level 2)
            if (isset($questions[1])) {
                $q2 = $questions[1];
                $ans = $answers[$q2['id']] ?? null;
                $correctVal = $q2['correct_answer'] ?? ($q2['answer'] ?? null);
                $q2Correct = (!empty($correctVal) && strtolower(trim((string) $ans)) === strtolower(trim((string) $correctVal)));
            }
            // Q3 (Level 3)
            if (isset($questions[2])) {
                $q3 = $questions[2];
                $ans = $answers[$q3['id']] ?? null;
                $correctVal = $q3['correct_answer'] ?? ($q3['answer'] ?? null);
                $q3Correct = (!empty($correctVal) && strtolower(trim((string) $ans)) === strtolower(trim((string) $correctVal)));
            }
        }

        $categoryRating = 1; // 1 = Belum Siap, 2 = Siap, 3 = Sangat Siap
        if ($q1Correct && $q2Correct && $q3Correct) {
            $categoryRating = 3;
        } elseif ($q1Correct && $q2Correct) {
            $categoryRating = 2;
        }

        // Use the explicitly graded score if it has been graded by the teacher
        if ($submission->score !== null) {
            if ($submission->score == 3) {
                $categoryRating = 3;
            } elseif ($submission->score == 2) {
                $categoryRating = 2;
            } elseif ($submission->score == 1) {
                $categoryRating = 1;
            } else {
                $categoryRating = $submission->score >= 70 ? 2 : 1;
            }
        }

        $score = $categoryRating;
        $isPassed = $score >= 2; // Siap and Sangat Siap are passed to start the material

        $topicBreakdown = [
            'q1_correct' => $q1Correct,
            'q2_correct' => $q2Correct,
            'q3_correct' => $q3Correct,
            'category' => $score == 3 ? 'Sangat Siap' : ($score == 2 ? 'Siap' : 'Belum Siap'),
        ];
        
        $recommendations = $this->buildRecommendations($submission, $isPassed, $score, $topicBreakdown, $config);

        return StudentDiagnosticResult::updateOrCreate(
            [
                'student_id'    => $submission->student_id,
                'assignment_id' => $assignment->id,
            ],
            [
                'subject_id'            => $assignment->subject_id,
                'learning_objective_id' => $assignment->learning_objective_id,
                'total_score'           => $score,
                'pass_threshold'        => 2, // Standard Siap threshold
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
    private function buildRecommendations(LmsSubmission $submission, bool $isPassed, float $score, array $topicBreakdown, array $config): array
    {
        $assignment = $submission->assignment;
        $recommendations = [];

        $category = $topicBreakdown['category'] ?? ($score == 3 ? 'Sangat Siap' : ($score == 2 ? 'Siap' : 'Belum Siap'));

        if ($category === 'Sangat Siap') {
            $recommendations[] = [
                'type'    => 'skip',
                'message' => 'Luar biasa! Kamu berada di kelompok SANGAT SIAP. Kamu diperbolehkan mendampingi teman-temanmu sebagai tutor sebaya atau mengerjakan proyek pengayaan.',
                'icon'    => 'zap',
            ];
        } elseif ($category === 'Siap') {
            $recommendations[] = [
                'type'    => 'skip',
                'message' => 'Bagus! Kamu berada di kelompok SIAP. Kamu bisa langsung memulai mempelajari materi inti.',
                'icon' => 'book-open',
            ];
        } else {
            $recommendations[] = [
                'type'    => 'remedial',
                'message' => 'Kamu berada di kelompok BELUM SIAP. Jangan khawatir, Guru akan mendampingimu untuk mempelajari konsep prasyarat terlebih dahulu sebelum masuk ke materi inti.',
                'icon'    => 'alert-triangle',
            ];

            // Integrasi Asesmen Non-Kognitif
            $nonCognitive = \App\Models\StudentNonCognitiveDiagnostic::where('student_id', $submission->student_id)
                ->where('subject_id', $assignment->subject_id)
                ->first();

            if ($nonCognitive) {
                $style = strtolower($nonCognitive->learning_style ?? 'visual');
                $styleMsg = "";
                if ($style === 'visual') {
                    $styleMsg = "Gunakan media visual seperti infografis, diagram, atau video dengan teks saat melakukan remedial.";
                } elseif (in_array($style, ['auditori', 'auditory'])) {
                    $styleMsg = "Dengarkan rekaman penjelasan materi, podcast, atau lakukan diskusi lisan dengan guru saat remedial.";
                } elseif (in_array($style, ['kinestetik', 'kinesthetic'])) {
                    $styleMsg = "Gunakan alat peraga fisik, lakukan eksperimen langsung, atau proyek mandiri saat remedial.";
                }

                if ($styleMsg) {
                    $recommendations[] = [
                        'type'    => 'differentiation_style',
                        'message' => "Rekomendasi Gaya Belajar ({$nonCognitive->learning_style}): {$styleMsg}",
                        'icon'    => 'compass',
                    ];
                }

                if ($nonCognitive->interests && is_array($nonCognitive->interests)) {
                    $interestsStr = implode(', ', $nonCognitive->interests);
                    $recommendations[] = [
                        'type'    => 'differentiation_interest',
                        'message' => "Minat Kamu ({$interestsStr}): Hubungkan materi prasyarat dengan minat kamu agar remedial lebih menyenangkan.",
                        'icon'    => 'sparkles',
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
     * Generate Differentiated Learning Strategy based on Cognitive and Non-Cognitive profiles (PPA 2026).
     */
    public function generateDifferentiatedStrategy(array $cognitiveSummary, ?\App\Models\StudentNonCognitiveDiagnostic $nonCognitive, bool $regenerate = false): ?array
    {
        $studentId = $nonCognitive?->student_id ?? 0;
        
        $subjectId = 0;
        if (!empty($cognitiveSummary['results'])) {
            $subjectId = $cognitiveSummary['results'][0]['subject_id'] ?? 0;
        }

        $hash = md5('diff_strategy_' . $subjectId . '_' . $studentId);

        // 1. Jika tidak dipaksa regenerate, coba ambil dari cache database
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded)) {
                    return [
                        'content' => $decoded['content'] ?? [],
                        'process' => $decoded['process'] ?? [],
                        'product' => $decoded['product'] ?? [],
                        'is_cached' => true,
                    ];
                }
            }
            
            // Jika belum ada di cache dan tidak meregenerate, kembalikan null agar tombol muncul
            return null;
        }

        // 2. Dapatkan strategi cadangan (rule-based)
        $fallbackStrategy = $this->getRuleBasedDifferentiatedStrategy($cognitiveSummary, $nonCognitive);

        try {
            // 3. Periksa apakah AI terkonfigurasi dan aktif
            $aiManager = app(\App\Services\AiManager::class);
            $aiProvider = $aiManager->getActiveProvider();

            if ($aiProvider && $aiProvider->isConfigured()) {
                // Siapkan data kognitif
                $averageScore = $cognitiveSummary['average_score'] ?? 'Belum ada nilai';
                
                $cognitiveCategory = 'Belum Siap';
                $weakTopics = [];
                if (!empty($cognitiveSummary['results'])) {
                    $latestResult = end($cognitiveSummary['results']);
                    if (isset($latestResult['topic_breakdown'])) {
                        if (is_array($latestResult['topic_breakdown'])) {
                            // Check if it's the array-of-objects structure
                            if (isset($latestResult['topic_breakdown'][0]['topic'])) {
                                foreach ($latestResult['topic_breakdown'] as $topic) {
                                    if (($topic['mastery_level'] ?? '') === 'rendah' || ($topic['mastery_pct'] ?? 0) < 60) {
                                        $weakTopics[] = $topic['topic'];
                                    }
                                }
                            } else {
                                // Or if it's key-value category structure
                                $cognitiveCategory = $latestResult['topic_breakdown']['category'] ?? 'Belum Siap';
                            }
                        }
                    }
                    if (empty($cognitiveCategory)) {
                        $cognitiveCategory = $latestResult['is_passed'] ? 'Siap' : 'Belum Siap';
                    }
                }
                
                $weakTopicsList = !empty($weakTopics) ? implode(', ', $weakTopics) : 'Tidak ada (siswa menguasai materi prasyarat)';

                // Siapkan data non-kognitif
                $learningStyle = $nonCognitive?->learning_style ?? 'Visual';
                
                $interestsList = '-';
                if ($nonCognitive && $nonCognitive->interests) {
                    $interests = $nonCognitive->interests;
                    if (is_array($interests)) {
                        if (isset($interests['daftar']) && is_array($interests['daftar'])) {
                            $list = $interests['daftar'];
                            if (!empty($interests['lainnya'])) {
                                $list[] = $interests['lainnya'];
                            }
                            $interestsList = implode(', ', $list);
                        } else {
                            $interestsList = implode(', ', $interests);
                        }
                    }
                }

                $motivationList = '-';
                if ($nonCognitive && $nonCognitive->motivation_level) {
                    $motivation = $nonCognitive->motivation_level;
                    if (is_array($motivation)) {
                        $parts = [];
                        if (isset($motivation['intrinsik'])) $parts[] = 'Intrinsik: ' . $motivation['intrinsik'];
                        if (isset($motivation['intrinsic'])) $parts[] = 'Intrinsik: ' . $motivation['intrinsic'];
                        if (isset($motivation['ekstrinsik'])) $parts[] = 'Ekstrinsik: ' . $motivation['ekstrinsik'];
                        if (isset($motivation['extrinsic'])) $parts[] = 'Ekstrinsik: ' . $motivation['extrinsic'];
                        $motivationList = implode(', ', $parts);
                    } else {
                        $motivationList = (string) $motivation;
                    }
                }

                $notes = $nonCognitive?->notes ?? 'Tidak ada catatan tambahan';

                // Buat prompt sesuai dengan PPA 2026
                $prompt = "Sebagai asisten AI pendidikan profesional yang ahli dalam Kurikulum Merdeka (Panduan Pembelajaran dan Asesmen / PPA 2026), buatlah rekomendasi strategi pembelajaran terdiferensiasi (Diferensiasi Konten, Diferensiasi Proses, Diferensiasi Produk) untuk siswa berdasarkan profil berikut:\n\n" .
                    "PROFIL KOGNITIF (Hasil Asesmen Awal):\n" .
                    "- Rata-rata Skor Kesiapan: {$averageScore} (Skala 1-3, di mana 1=Belum Siap, 2=Siap, 3=Sangat Siap)\n" .
                    "- Kategori Kesiapan: {$cognitiveCategory}\n" .
                    "- Topik/Materi yang Belum Dikuasai: {$weakTopicsList}\n\n" .
                    "PROFIL NON-KOGNITIF:\n" .
                    "- Gaya Belajar Utama: {$learningStyle}\n" .
                    "- Minat & Hobi: {$interestsList}\n" .
                    "- Tingkat Motivasi: {$motivationList}\n" .
                    "- Catatan Guru: {$notes}\n\n" .
                    "Berdasarkan PPA 2026, buatlah rekomendasi strategi diferensiasi yang konkret, praktis, dan dapat segera diterapkan guru di kelas.\n" .
                    "Format jawaban HARUS berupa JSON valid dengan struktur berikut (jangan berikan kalimat pembuka/penutup, markdown fence, atau penjelasan ekstra, langsung kembalikan raw JSON saja):\n" .
                    "{\n" .
                    "  \"content\": [\n" .
                    "    \"Rekomendasi diferensiasi konten 1...\",\n" .
                    "    \"Rekomendasi diferensiasi konten 2...\"\n" .
                    "  ],\n" .
                    "  \"process\": [\n" .
                    "    \"Rekomendasi diferensiasi proses 1...\",\n" .
                    "    \"Rekomendasi diferensiasi proses 2...\"\n" .
                    "  ],\n" .
                    "  \"product\": [\n" .
                    "    \"Rekomendasi diferensiasi produk 1...\",\n" .
                    "    \"Rekomendasi diferensiasi produk 2...\"\n" .
                    "  ]\n" .
                    "}";

                $response = $aiProvider->generateContent($prompt);

                if ($response) {
                    $response = preg_replace('/^```(?:json)?\s*/i', '', $response);
                    $response = preg_replace('/\s*```$/i', '', $response);
                    $response = trim($response);

                    $decoded = json_decode($response, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $strategyResult = [
                            'content' => $decoded['content'] ?? [],
                            'process' => $decoded['process'] ?? [],
                            'product' => $decoded['product'] ?? [],
                        ];

                        \App\Models\LmsAiCache::setCache($hash, 'differentiated_strategy', [
                            'subject_id' => $subjectId,
                            'student_id' => $studentId,
                        ], json_encode($strategyResult));

                        $strategyResult['is_cached'] = true;
                        return $strategyResult;
                    }
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AI Differentiated Strategy Error: ' . $e->getMessage());
        }

        // Jika AI tidak terkonfigurasi/error, simpan fallback agar tidak terus-menerus memanggil API
        \App\Models\LmsAiCache::setCache($hash, 'differentiated_strategy', [
            'subject_id' => $subjectId,
            'student_id' => $studentId,
        ], json_encode($fallbackStrategy));

        $fallbackStrategy['is_cached'] = true;
        return $fallbackStrategy;
    }

    /**
     * Fallback rule-based differentiated strategy generation.
     */
    private function getRuleBasedDifferentiatedStrategy(array $cognitiveSummary, ?\App\Models\StudentNonCognitiveDiagnostic $nonCognitive): array
    {
        $strategy = [
            'content' => [],
            'process' => [],
            'product' => [],
        ];

        $weakTopics = [];
        if (!empty($cognitiveSummary['results'])) {
            $latestResult = end($cognitiveSummary['results']);
            if (isset($latestResult['topic_breakdown'])) {
                if (is_array($latestResult['topic_breakdown'])) {
                    if (isset($latestResult['topic_breakdown'][0]['topic'])) {
                        foreach ($latestResult['topic_breakdown'] as $topic) {
                            if (($topic['mastery_level'] ?? '') === 'rendah') {
                                $weakTopics[] = $topic['topic'];
                            }
                        }
                    } else {
                        $category = $latestResult['topic_breakdown']['category'] ?? '';
                        if ($category === 'Belum Siap') {
                            $weakTopics[] = 'Materi Prasyarat';
                        }
                    }
                }
            }
        }

        $style = strtolower($nonCognitive?->learning_style ?? 'visual');

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

        $firstMotivation = '-';
        if ($nonCognitive && $nonCognitive->motivation_level) {
            $motivationVal = $nonCognitive->motivation_level;
            if (is_array($motivationVal)) {
                $firstMotivation = strtolower(reset($motivationVal));
            } else {
                $firstMotivation = strtolower((string) $motivationVal);
            }
        }
        if (in_array($firstMotivation, ['rendah', 'low'])) {
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
        } else {
            $strategy['product'][] = "Siswa dibebaskan memilih bentuk produk akhir (esai, poster, audio, atau video).";
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
            ->whereHas('schoolClasses', function ($q) use ($schoolClassId) { $q->where('school_classes.id', $schoolClassId); })
            ->get()->groupBy('learning_objective_id');
            
        $materials = \App\Models\LmsMaterial::whereIn('learning_objective_id', $tpIds)
            ->whereHas('schoolClasses', function ($q) use ($schoolClassId) { $q->where('school_classes.id', $schoolClassId); })
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
