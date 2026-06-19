<?php

namespace App\Services;

use App\Models\LmsLearningObjective;
use App\Services\AiManager;

class InstructionalSmartService
{
    public bool $isLastRequestOnline = false;

    /**
     * Generate complete Lesson Design (RPP, Assessment, LKPD) in one call.
     */
    public function generateFullDraft(int $tpId, ?string $model = null, bool $regenerate = false): array
    {
        $this->isLastRequestOnline = false;
        $tp = LmsLearningObjective::with(['subject', 'schoolClass'])->find($tpId);
        if (!$tp) {
            return [];
        }

        $subjectName = $tp->subject?->name ?? 'Mata Pelajaran';
        $className = $tp->schoolClass?->name ?? 'Kelas X';
        $tpDescription = $tp->description ?? 'Tujuan Pembelajaran';
        $content = $tp->content ?? 'Materi Inti';
        $competence = $tp->competence ?? 'mempelajari';

        // 1. Try AI via Manager
        $aiManager = app(AiManager::class);
        $ai = $aiManager->getActiveProvider();

        if ($ai->isConfigured()) {
            try {
                $suggested = $ai->generateFullOrchestratorDraft($subjectName, $className, $tpDescription, $model, $regenerate);
                if (!empty($suggested)) {
                    $this->isLastRequestOnline = true;
                    return $suggested;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('InstructionalSmartService Orchestrator Error: ' . $e->getMessage());
            }
        }

        // 2. Offline Fallback (Comprehensive & Premium)
        $title = "Pemahaman Mendalam: " . ($tp->content ?? "Konsep Utama");
        $pedModel = $model ?? 'Inquiry/Direct';
        
        $materialContent = "<h3>Konsep Inti " . htmlspecialchars($content) . "</h3>" .
            "<p>Pembelajaran mengenai <strong>" . htmlspecialchars($content) . "</strong> merupakan bagian krusial dalam memahami kompetensi pada mata pelajaran " . htmlspecialchars($subjectName) . ". " .
            "Melalui materi ini, murid diajak untuk mengeksplorasi secara kritis bagaimana prinsip-prinsip dasar dari " . htmlspecialchars($content) . " diterapkan dalam kehidupan sehari-hari maupun industri nyata.</p>" .
            "<p>Kunci dari penguasaan materi ini terletak pada kemampuan murid dalam mengidentifikasi pola, melakukan analisis fungsional, dan memecahkan masalah kontekstual yang dihadapi. Dengan pendekatan pedagogis " . htmlspecialchars($pedModel) . ", diharapkan murid memiliki pemahaman mendalam yang melampaui sekadar hafalan teoritis.</p>";

        $understanding = "Guru menyajikan contoh riil atau stimulus kontekstual terkait " . $content . ". Murid diajak mengamati dan menjawab beberapa pertanyaan pemantik lisan untuk menumbuhkan rasa ingin tahu serta mengungkap pemahaman awal mereka secara kolaboratif.";
        
        $application = "Dalam kelompok kecil, murid melakukan aktivitas praktis atau proyek sederhana untuk mengaplikasikan konsep " . $content . " dalam memecahkan masalah nyata yang relevan. Hasil akhir dipaparkan secara kreatif.";
        
        $reflection = "Murid menyusun refleksi pribadi mengenai pengalaman belajarnya, mencatat tantangan terberat yang dihadapi dalam menguasai " . $content . ", serta bagaimana strategi mereka dalam mengatasi kendala tersebut untuk pembelajaran ke depan.";

        $lkpd = "<h3>LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>" .
            "<table>" .
            "<tr><td><strong>Mata Pelajaran</strong></td><td>: " . htmlspecialchars($subjectName) . "</td></tr>" .
            "<tr><td><strong>Materi</strong></td><td>: " . htmlspecialchars($content) . "</td></tr>" .
            "<tr><td><strong>Kelas/Semester</strong></td><td>: " . htmlspecialchars($className) . "</td></tr>" .
            "<tr><td><strong>Model Pembelajaran</strong></td><td>: " . htmlspecialchars($pedModel) . "</td></tr>" .
            "</table>" .
            "<h4>A. Petunjuk Belajar</h4>" .
            "<p>1. Bacalah uraian materi utama secara seksama.<br>2. Diskusikan tugas kelompok bersama rekan sejawat Anda.<br>3. Jawablah pertanyaan eksploratif pada lembar jawaban yang disediakan.</p>" .
            "<h4>B. Langkah Aktivitas</h4>" .
            "<p>Lakukan analisis mendalam mengenai penerapan " . htmlspecialchars($content) . " di lingkungan sekitar Anda. Temukan 1 masalah konkret dan formulasikan 3 solusi alternatif yang kreatif.</p>" .
            "<h4>C. Kriteria Penilaian</h4>" .
            "<ul><li>Ketepatan analisis (40%)</li><li>Kreativitas solusi (40%)</li><li>Kompak kolaborasi (20%)</li></ul>";

        return [
            'title' => $title,
            'content' => $materialContent,
            'image_prompt' => "Minimalist educational vector illustration representing " . $content . " in clean, harmonious colors.",
            'initial' => [
                'instrument_type' => 'quiz_survey',
                'title' => "Asesmen Diagnostik Awal: " . $content,
                'instrument_config' => [
                    'stimulus' => "Jawablah pertanyaan kuis singkat berikut untuk mengetahui pemahaman awalmu mengenai " . $content,
                    'questions' => [
                        [
                            'id' => 'q1',
                            'type' => 'multiple_choice',
                            'text' => "Apakah kamu pernah mendengar istilah " . $content . " sebelumnya?",
                            'options' => [
                                ['id' => 'a', 'text' => "Belum pernah sama sekali."],
                                ['id' => 'b', 'text' => "Pernah dengar, tapi belum paham."],
                                ['id' => 'c', 'text' => "Paham konsep dasarnya."],
                                ['id' => 'd', 'text' => "Sangat paham dan bisa menerapkannya."]
                            ]
                        ],
                        [
                            'id' => 'q2',
                            'type' => 'short_answer',
                            'text' => "Tuliskan satu contoh penggunaan " . $content . " yang kamu ketahui dalam kehidupan sehari-hari!"
                        ]
                    ],
                    'levels' => [
                        ['name' => 'Perlu Bimbingan', 'desc' => "Murid masih sangat asing dengan konsep dasar."],
                        ['name' => 'Cukup', 'desc' => "Murid mengetahui istilah namun belum paham fungsionalitasnya."],
                        ['name' => 'Baik', 'desc' => "Murid memahami konsep dasar dengan baik."],
                        ['name' => 'Sangat Baik', 'desc' => "Murid menguasai konsep secara mendalam."]
                    ],
                    'kktp' => ['approach' => 'rubric', 'passing_level' => 'Baik']
                ]
            ],
            'formative' => [
                'instrument_type' => 'reflective_journal',
                'title' => "Jurnal Reflektif Formatif: " . $content,
                'instrument_config' => [
                    'stimulus' => "Tuliskan jurnal reflektif singkat menggunakan format 3-2-1:",
                    'questions' => [
                        ['text' => "Tuliskan 3 konsep penting yang baru saja kamu pahami tentang " . $content . "."],
                        ['text' => "Tuliskan 2 pertanyaan yang masih membingungkan bagimu."],
                        ['text' => "Tuliskan 1 aksi nyata yang akan kamu lakukan untuk memperdalam materi ini."]
                    ],
                    'levels' => [
                        ['name' => 'Perlu Bimbingan', 'desc' => "Refleksi sangat dangkal dan tidak terarah."],
                        ['name' => 'Cukup', 'desc' => "Refleksi relevan namun belum menunjukkan kedalaman analisis."],
                        ['name' => 'Baik', 'desc' => "Refleksi mendalam dan mampu mengaitkan dengan aksi nyata."],
                        ['name' => 'Sangat Baik', 'desc' => "Refleksi sangat kritis, analitis, dan memiliki rencana tindakan terukur."]
                    ],
                    'kktp' => ['approach' => 'criteria_description', 'min_criteria' => 2]
                ]
            ],
            'summative' => [
                'instrument_type' => 'written_test',
                'title' => "Asesmen Sumatif Akhir: " . $content,
                'instrument_config' => [
                    'stimulus' => "Selesaikan tes tertulis berikut untuk menguji pemahaman akhirmu mengenai " . $content,
                    'questions' => [
                        [
                            'id' => 'q1',
                            'type' => 'multiple_choice',
                            'text' => "Manakah yang merupakan fungsi utama dari " . $content . "?",
                            'options' => [
                                ['id' => 'a', 'text' => "Sebagai elemen dekoratif belaka."],
                                ['id' => 'b', 'text' => "Sebagai fondasi struktural pemecahan masalah."],
                                ['id' => 'c', 'text' => "Hanya digunakan saat ujian sekolah."],
                                ['id' => 'd', 'text' => "Semua jawaban salah."]
                            ],
                            'answer' => 'b'
                        ],
                        [
                            'id' => 'q2',
                            'type' => 'short_answer',
                            'text' => "Jelaskan mengapa pemahaman yang baik tentang " . $content . " sangat krusial dalam pemecahan masalah modern!"
                        ]
                    ],
                    'levels' => [
                        ['name' => 'Perlu Bimbingan', 'desc' => "Skor < 60: Murid belum mencapai Kriteria Ketuntasan Minimal (KKM)."],
                        ['name' => 'Cukup', 'desc' => "Skor 60-75: Murid mencapai KKM namun perlu penguatan konsep."],
                        ['name' => 'Baik', 'desc' => "Skor 76-90: Murid menguasai materi dengan baik dan tuntas."],
                        ['name' => 'Sangat Baik', 'desc' => "Skor > 90: Murid menunjukkan performa sangat luar biasa dan siap pengayaan."]
                    ],
                    'kktp' => ['approach' => 'score_interval', 'passing_min' => 60]
                ]
            ]
        ];
    }

    /**
     * Suggest learning experiences based on TP and Pedagogical Model.
     */
    public function suggestExperiences(int $tpId, ?string $model = null, bool $regenerate = false): array
    {
        $this->isLastRequestOnline = false;
        $tp = LmsLearningObjective::with('subject')->find($tpId);
        if (!$tp) {
            return [
                'understanding' => '',
                'application' => '',
                'reflection' => '',
            ];
        }

        $competence = $tp->competence ?? 'mempelajari';
        $content = $tp->content ?? 'materi ini';
        $subjectName = $tp->subject?->name ?? 'Mata Pelajaran';
        $description = $tp->description ?? '';

        // Integrasi API Manager
        $aiManager = app(AiManager::class);
        $ai = $aiManager->getActiveProvider();

        if ($ai->isConfigured()) {
            try {
                $suggested = $ai->suggestLearningExperiences($description, $content, $subjectName, $model, $regenerate);
                if (!empty($suggested['understanding']) || !empty($suggested['application']) || !empty($suggested['reflection'])) {
                    $this->isLastRequestOnline = true;
                    return $suggested;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('InstructionalSmartService Gemini Error: ' . $e->getMessage());
            }
        }

        return [
            'understanding' => $this->generateUnderstanding($competence, $content, $subjectName, $model),
            'application' => $this->generateApplication($competence, $content, $subjectName, $model),
            'reflection' => $this->generateReflection($competence, $content, $subjectName, $model),
        ];
    }

    private function generateUnderstanding(string $competence, string $content, string $subject, ?string $model): string
    {
        $intro = "Guru membawa media atau contoh nyata terkait {$content} ke dalam kelas (misalnya gambar, video, atau objek fisik). ";
        $prompt = "Guru memberikan pertanyaan pemantik seperti \"Apa yang kalian amati dari {$content}?\" atau \"Bagaimana kaitan {$content} dengan kehidupan sehari-hari?\" untuk menstimulasi rasa ingin tahu murid.";
        
        if (str_contains(strtolower($subject), 'informatika')) {
            return "Guru menyajikan dataset atau fenomena digital terkait {$content}. Murid diminta mencermati data tersebut dan menjawab pertanyaan pemantik untuk mengidentifikasi pola atau karakteristik {$content} secara mandiri.";
        }

        if ($model === 'Inquiry' || $model === 'Discovery') {
            return "Murid melakukan observasi mandiri terhadap fenomena {$content} di lingkungan sekolah. Guru memfasilitasi diskusi agar murid aktif mengonstruksi pemahaman tentang \"mengapa\" dan \"bagaimana\" {$content} bekerja.";
        }

        return $intro . $prompt;
    }

    private function generateApplication(string $competence, string $content, string $subject, ?string $model): string
    {
        $base = "Murid menerapkan pengetahuan tentang {$content} dalam situasi nyata. ";
        
        if ($model === 'PjBL') {
            return "Murid merancang dan membuat sebuah proyek/produk kreatif yang mengintegrasikan konsep {$content} untuk memecahkan masalah di lingkungan sekitar. Hasil akhirnya berupa karya orisinal yang dipresentasikan.";
        }

        if ($model === 'PBL') {
            return "Murid diberikan sebuah studi kasus atau masalah konkret terkait {$content}. Secara berkelompok, murid melakukan analisis dan merumuskan solusi inovatif yang dapat diaplikasikan langsung.";
        }

        if (str_contains(strtolower($subject), 'matematika')) {
            return "Murid menyimulasikan kegiatan yang melibatkan penghitungan {$content} menggunakan data riil (seperti brosur belanja atau data statistik sekolah) untuk membuat keputusan atau rencana.";
        }

        return $base . "Murid melakukan praktik langsung untuk {$competence} {$content}, yang hasilnya berupa produk atau unjuk kerja yang dapat dievaluasi.";
    }

    private function generateReflection(string $competence, string $content, string $subject, ?string $model): string
    {
        $base = "Setelah kegiatan selesai, murid mengevaluasi proses dan hasil belajarnya. ";
        $journal = "Murid menyusun jurnal reflektif atau melakukan diskusi kelas mengenai tantangan yang dihadapi saat {$competence} {$content} serta strategi yang mereka temukan untuk mengatasinya.";
        $meta = "Murid juga memikirkan bagaimana pengetahuan tentang {$content} ini dapat mereka terapkan di situasi baru atau dalam kehidupan sehari-hari di masa depan.";

        return $base . $journal . " " . $meta;
    }

    public function suggestAssessment(
        int $tpId, 
        string $type, 
        bool $regenerate = false,
        ?string $materialTitle = null,
        ?string $materialContent = null,
        ?string $observationMode = null,
        ?string $quizMode = null
    ): array {
        $this->isLastRequestOnline = false;
        $tp = LmsLearningObjective::find($tpId);
        if (!$tp) return [];

        $description = $tp->description ?? '';

        // Chaining Context: Gunakan judul & uraian materi riil hasil ketikan guru jika dikirim, fallback ke TP content jika kosong
        if (!empty($materialContent)) {
            $content = "Judul Materi: " . ($materialTitle ?? '') . "\nUraian Materi:\n" . strip_tags($materialContent);
        } else {
            $content = $tp->content ?? 'materi ini';
        }

        // Integrasi API Manager
        $aiManager = app(AiManager::class);
        $ai = $aiManager->getActiveProvider();

        if ($ai->isConfigured()) {
            try {
                $suggested = $ai->suggestAssessment($description, $content, $type, $regenerate, $observationMode, $quizMode);
                if (!empty($suggested)) {
                    $this->isLastRequestOnline = true;
                    return $suggested;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('InstructionalSmartService Gemini Assessment Error: ' . $e->getMessage());
            }
        }
        
        if ($type === 'oral_test') {
            return [
                'description' => "Guru akan mengajukan pertanyaan secara lisan. Jawablah dengan percaya diri menggunakan bahasamu sendiri!",
                'stimulus' => "Tes lisan mengenai pemahaman materi {$content}. Guru mengajukan pertanyaan secara langsung dan menilai jawaban siswa.",
                'questions' => [
                    ['text' => "Jelaskan konsep dasar {$content} dengan bahasamu sendiri!", 'answer_guide' => "Cari pemaparan yang mencakup definisi, fungsi, dan contoh penerapan {$content}."],
                    ['text' => "Apa tantangan terbesar dalam penerapan {$content} dan bagaimana cara mengatasinya?", 'answer_guide' => "Jawaban harus mencakup identifikasi minimal 1 tantangan konkret dan solusi yang logis."],
                    ['text' => "Bandingkan {$content} dengan konsep lain yang sudah dipelajari. Apa persamaan dan perbedaannya?", 'answer_guide' => "Siswa harus mampu menyebutkan minimal 2 persamaan dan 1 perbedaan dengan konsep terkait."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Jawaban sangat dangkal, tidak relevan, atau tidak mampu menjelaskan konsep dasar {$content}."],
                    ['name' => 'Cukup', 'desc' => "Jawaban cukup relevan namun belum mendalam, masih memerlukan bimbingan guru saat ditanya lanjutan."],
                    ['name' => 'Baik', 'desc' => "Jawaban menunjukkan pemahaman yang baik, mampu menjelaskan konsep dengan jelas dan memberikan contoh."],
                    ['name' => 'Sangat Baik', 'desc' => "Jawaban sangat mendalam, analitis, kreatif, dan mampu mengaitkan dengan konteks nyata secara otomatis."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik',
                ]
            ];
        }

        if ($type === 'formative_quiz') {
            $mode = $quizMode ?? 'mcq';
            $questions = [];
            if ($mode === 'essay') {
                $questions = array_map(fn($i) => [
                    'id' => 'q' . $i,
                    'type' => 'essay',
                    'text' => "Pertanyaan Esai {$i}: Deskripsikan pemahamanmu mengenai {$content}.",
                    'answer' => "Pedoman jawaban ideal untuk pertanyaan esai {$i}.",
                    'points' => 5
                ], range(1, 5));
            } elseif ($mode === 'mixed') {
                $questions = array_merge(
                    array_map(fn($i) => [
                        'id' => 'q' . $i,
                        'type' => 'multiple_choice',
                        'text' => "Pertanyaan PG {$i}: Pilih konsep yang tepat tentang {$content}.",
                        'options' => [
                            ['id' => 'a', 'text' => "Opsi A tentang {$content}"],
                            ['id' => 'b', 'text' => "Opsi B tentang {$content}"],
                            ['id' => 'c', 'text' => "Opsi C tentang {$content}"],
                            ['id' => 'd', 'text' => "Opsi D tentang {$content}"]
                        ],
                        'answer' => 'a',
                        'points' => 1
                    ], range(1, 5)),
                    array_map(fn($i) => [
                        'id' => 'q' . ($i + 5),
                        'type' => 'essay',
                        'text' => "Pertanyaan Esai {$i}: Jelaskan penerapan {$content}.",
                        'answer' => "Pedoman jawaban ideal.",
                        'points' => 5
                    ], range(1, 3))
                );
            } else {
                $questions = array_map(fn($i) => [
                    'id' => 'q' . $i,
                    'type' => 'multiple_choice',
                    'text' => "Soal {$i}: Pilih pernyataan yang paling tepat mengenai konsep {$content} (soal ke-{$i}).",
                    'options' => [
                        ['id' => 'a', 'text' => "Jawaban A tentang {$content} - definisi dasar."],
                        ['id' => 'b', 'text' => "Jawaban B tentang {$content} - penerapan praktis."],
                        ['id' => 'c', 'text' => "Jawaban C tentang {$content} - analisis kritis."],
                        ['id' => 'd', 'text' => "Semua jawaban di atas benar."]
                    ],
                    'answer' => ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd', 'a', 'b'][$i - 1] ?? 'a',
                    'points' => 1
                ], range(1, 10));
            }

            return [
                'description' => "Kerjakan soal-soal berikut dengan teliti untuk mengukur pemahamanmu terhadap materi ini.",
                'quiz_mode' => $mode,
                'questions' => $questions,
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Skor < 60: Pemahaman dasar belum tercapai."],
                    ['name' => 'Cukup', 'desc' => "Skor 60-75: Pemahaman cukup namun belum tuntas."],
                    ['name' => 'Baik', 'desc' => "Skor 76-90: Pemahaman baik (Tuntas)."],
                    ['name' => 'Sangat Baik', 'desc' => "Skor > 90: Pemahaman sangat baik (Pengayaan)."],
                ],
                'kktp' => [
                    'approach' => 'percentage',
                    'threshold' => 75
                ]
            ];
        }

        if ($type === 'rubric' || $type === 'oral_qa') {
            return [
                'description' => "Amati dua contoh yang diberikan guru, lalu jawablah pertanyaan pemantik dengan pendapatmu sendiri.",
                'stimulus' => "Guru menyajikan dua contoh kontras terkait {$content} (misalnya: benar vs salah, fakta vs hoaks, atau efektif vs tidak efektif). Guru mengajukan pertanyaan pemantik: \"Menurut kalian mana yang lebih tepat? Mengapa? Bagaimana kalian membuktikannya?\"",
                'criteria' => "Kemampuan Analisis Awal " . $content,
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Murid belum mampu mengidentifikasi perbedaan atau elemen dasar dari {$content} yang disajikan."],
                    ['name' => 'Cukup', 'desc' => "Murid mampu mengidentifikasi/memilih contoh yang tepat terkait {$content}, namun belum mampu memberikan alasan logis atas pilihannya."],
                    ['name' => 'Baik', 'desc' => "Murid mampu mengidentifikasi contoh yang tepat dan memberikan alasan logis sederhana mengapa hal tersebut dianggap benar/sesuai."],
                    ['name' => 'Sangat Baik', 'desc' => "Murid mampu mengidentifikasi, memberikan alasan logis yang mendalam, dan mampu menjelaskan langkah verifikasi atau cara membuktikan kebenaran terkait {$content}."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik',
                ]
            ];
        }

        if ($type === 'quiz_survey') {
            return [
                'description' => "Jawablah beberapa pertanyaan berikut sesuai dengan pemahamanmu saat ini. Tidak perlu khawatir jika ada yang belum bisa — ini hanya untuk mengetahui sejauh mana pengetahuan awalku terkait materi ini.",
                'questions' => [
                    [
                        'id' => 'q1',
                        'type' => 'multiple_choice',
                        'text' => "Manakah dari pernyataan berikut yang paling menggambarkan pemahamanmu tentang {$content}?",
                        'options' => [
                            ['id' => 'a', 'text' => "Saya belum pernah mendengar tentang {$content}."],
                            ['id' => 'b', 'text' => "Saya tahu namanya, tapi belum paham apa fungsinya."],
                            ['id' => 'c', 'text' => "Saya paham fungsinya secara umum."],
                            ['id' => 'd', 'text' => "Saya sudah sangat paham dan bisa menjelaskannya ke orang lain."]
                        ]
                    ],
                    [
                        'id' => 'q2',
                        'type' => 'short_answer',
                        'text' => "Sebutkan satu hal yang ingin kamu ketahui lebih dalam tentang {$content}!",
                    ],
                    [
                        'id' => 'q3',
                        'type' => 'multiple_choice',
                        'text' => "Jika kamu menemui masalah terkait {$content}, apa langkah pertama yang akan kamu lakukan?",
                        'options' => [
                            ['id' => 'a', 'text' => "Bertanya langsung ke guru."],
                            ['id' => 'b', 'text' => "Mencoba mencari tahu sendiri di buku/internet."],
                            ['id' => 'c', 'text' => "Berdiskusi dengan teman."],
                            ['id' => 'd', 'text' => "Menunggu penjelasan lebih lanjut."]
                        ]
                    ]
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Skor < 40: Murid masih sangat asing dengan konsep {$content}."],
                    ['name' => 'Cukup', 'desc' => "Skor 40-60: Murid mengenal istilah {$content} namun belum memahami cara kerjanya."],
                    ['name' => 'Baik', 'desc' => "Skor 61-80: Murid memahami konsep {$content} dan bisa menjawab pertanyaan dasar dengan benar."],
                    ['name' => 'Sangat Baik', 'desc' => "Skor > 80: Murid menguasai konsep {$content} dengan sangat baik."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik',
                ]
            ];
        }

        if ($type === 'observation_checklist') {
            return [
                'description' => "Lembar observasi untuk mengamati keterlibatan dan partisipasi siswa selama kegiatan pembelajaran.",
                'indicators' => [
                    ['name' => "Murid dapat menjelaskan konsep dasar {$content} secara lisan."],
                    ['name' => "Murid mampu mengidentifikasi komponen utama dari {$content}."],
                    ['name' => "Murid menunjukkan antusiasme dan rasa ingin tahu terhadap topik {$content}."],
                    ['name' => "Murid dapat memberikan contoh penerapan {$content} dalam kehidupan sehari-hari."],
                    ['name' => "Murid mampu bekerja sama dalam kelompok untuk mendiskusikan {$content}."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Hanya 1-2 indikator yang terlihat muncul selama observasi."],
                    ['name' => 'Cukup', 'desc' => "3 indikator mulai terlihat konsisten muncul."],
                    ['name' => 'Baik', 'desc' => "4 indikator terlihat muncul dengan sangat jelas."],
                    ['name' => 'Sangat Baik', 'desc' => "Seluruh indikator (5 poin) muncul dan murid sangat aktif."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik',
                ]
            ];
        }

        if ($type === 'performance_observation') {
            return [
                'description' => "Lembar pengamatan untuk mencatat keterlibatan dan perilaku siswa selama proses pembelajaran.",
                'observation_mode' => $observationMode ?? 'checklist',
                'stimulus' => "Guru berkeliling mengamati keterlibatan dan perilaku murid (individu/kelompok) saat melakukan aktivitas terkait {$content}.",
                'indicators' => [
                    ['name' => "Murid berkontribusi aktif dalam diskusi/pengerjaan tugas kelompok."],
                    ['name' => "Murid menunjukkan keterlibatan yang konsisten selama kegiatan pembelajaran berlangsung."],
                    ['name' => "Murid mampu merespons umpan balik dan petunjuk guru saat proses belajar berlangsung."],
                    ['name' => "Murid membantu teman sejawat (peer-support) dalam memahami konsep."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Murid pasif dan jarang menunjukkan keterlibatan selama kegiatan."],
                    ['name' => 'Cukup', 'desc' => "Murid mulai berkontribusi namun masih memerlukan pengingat berkala dari guru."],
                    ['name' => 'Baik', 'desc' => "Murid aktif dan menunjukkan keterlibatan yang konsisten selama kegiatan."],
                    ['name' => 'Sangat Baik', 'desc' => "Murid sangat aktif, inisiatif tinggi, dan mampu membantu teman selama pembelajaran."],
                ],
                'teacher_notes' => "Catatan anekdotal: Amati dan catat perilaku spesifik murid selama kegiatan berlangsung. Fokus pada keterlibatan, interaksi, dan respons terhadap pembelajaran.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 2,
                ]
            ];
        }

        if ($type === 'guided_discussion') {
            return [
                'description' => "Panduan observasi untuk mengamati partisipasi siswa selama diskusi terpandu.",
                'observation_mode' => $observationMode ?? 'checklist',
                'stimulus' => "Amati dan catat keterlibatan siswa selama diskusi terpandu berlangsung mengenai {$content}.",
                'indicators' => [
                    ['name' => "Keaktifan: Siswa aktif bertanya, menjawab, atau memberikan tanggapan selama diskusi."],
                    ['name' => "Keberanian Berpendapat: Siswa berani menyampaikan gagasan atau pandangan pribadi di depan kelas."],
                    ['name' => "Kualitas Argumen: Siswa mampu menyampaikan argumen yang logis, relevan, dan didukung bukti/contoh."],
                    ['name' => "Keterlibatan Sosial: Siswa mendengarkan pendapat teman dan memberikan apresiasi atau tanggapan yang membangun."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Siswa sangat pasif, jarang memberikan tanggapan, dan sulit diajak berdiskusi."],
                    ['name' => 'Cukup', 'desc' => "Siswa mulai memberikan tanggapan namun masih perlu dorongan aktif dari guru."],
                    ['name' => 'Baik', 'desc' => "Siswa aktif berdiskusi, menyampaikan argumen, dan merespons teman dengan baik."],
                    ['name' => 'Sangat Baik', 'desc' => "Siswa sangat aktif, mampu memandu diskusi, menyampaikan argumen berkualitas tinggi, dan menghargai perbedaan pendapat."],
                ],
                'teacher_notes' => "Amati keaktifan, keberanian berpendapat, dan kualitas argumen siswa selama diskusi. Gunakan catatan anekdotal atau ceklis untuk dokumentasi.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 2,
                ]
            ];
        }

        if ($type === 'exit_ticket') {
            return [
                'description' => "Sebelum mengakhiri pembelajaran hari ini, jawablah beberapa pertanyaan refleksi singkat berikut dengan jujur ya!",
                'assessment_mode' => 'default',
                'stimulus' => "Sebelum mengakhiri sesi, silakan jawab beberapa pertanyaan refleksi singkat (Exit Ticket) berikut:",
                'questions' => [
                    ['text' => "Apa 1 hal paling penting yang kamu pelajari hari ini tentang {$content}?"],
                    ['text' => "Bagian mana yang menurutmu paling sulit atau bikin kamu bingung?"],
                    ['text' => "Apa 1 pertanyaan yang ingin kamu tanyakan di pertemuan berikutnya?"],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Jawaban sangat singkat, tidak relevan, atau menunjukkan miskonsepsi mendasar."],
                    ['name' => 'Cukup', 'desc' => "Jawaban relevan namun masih bersifat permukaan dan belum menunjukkan kedalaman refleksi."],
                    ['name' => 'Baik', 'desc' => "Jawaban menunjukkan pemahaman yang baik dan mampu mengidentifikasi hambatan belajar secara spesifik."],
                    ['name' => 'Sangat Baik', 'desc' => "Jawaban sangat reflektif, menunjukkan pemahaman mendalam, dan mampu merumuskan pertanyaan lanjutan yang kritis."],
                ],
                'teacher_notes' => "Gunakan jawaban murid untuk memetakan kebutuhan remedial atau pengayaan pada pertemuan selanjutnya.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 2
                ]
            ];
        }

        if ($type === 'self_assessment') {
            return [
                'description' => "Nilai dirimu sendiri secara jujur dengan menandai pernyataan yang paling sesuai dengan kondisimu saat ini.",
                'assessment_mode' => 'default',
                'stimulus' => "Refleksikan pemahamanmu mengenai {$content}. Tandai setiap pernyataan yang paling menggambarkan kondisimu saat ini.",
                'indicators' => [
                    ['name' => "Saya sudah memahami konsep dasar {$content} dengan baik."],
                    ['name' => "Saya bisa menyelesaikan tugas {$content} tanpa bantuan guru."],
                    ['name' => "Saya mampu menjelaskan cara kerja {$content} kepada teman sekelas."],
                    ['name' => "Saya tahu apa yang harus saya pelajari lebih lanjut untuk lebih ahli di materi ini."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Belum mampu memenuhi sebagian besar kriteria yang ditetapkan."],
                    ['name' => 'Cukup', 'desc' => "Mampu memenuhi 1-2 kriteria namun masih memerlukan bantuan untuk hal-hal kompleks."],
                    ['name' => 'Baik', 'desc' => "Mampu memenuhi sebagian besar kriteria dengan baik secara mandiri."],
                    ['name' => 'Sangat Baik', 'desc' => "Mampu memenuhi seluruh kriteria dan menunjukkan kepercayaan diri tinggi dalam menjelaskan konsep."],
                ],
                'teacher_notes' => "Penilaian diri membantu murid menumbuhkan metakognisi. Berikan apresiasi atas kejujuran mereka dalam menilai diri sendiri.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 3
                ]
            ];
        }

        if ($type === 'reflective_journal') {
            return [
                'description' => "Tuliskan refleksi pribadimu menggunakan kerangka 4P (Peristiwa, Perasaan, Pembelajaran, Penerapan) dengan jujur dan mendalam.",
                'stimulus' => "Tuliskan refleksi pribadimu mengenai perjalanan belajar {$content} hari ini menggunakan kerangka 4P:",
                'questions' => [
                    ['text' => "Peristiwa: Ceritakan apa yang kamu lakukan dalam aktivitas hari ini."],
                    ['text' => "Perasaan: Apa yang kamu rasakan saat menghadapi tantangan atau keberhasilan hari ini?"],
                    ['text' => "Pembelajaran: Apa pelajaran berharga atau konsep baru yang paling membekas di pikiranmu?"],
                    ['text' => "Penerapan: Bagaimana kamu akan menggunakan ilmu ini dalam situasi nyata atau tugas selanjutnya?"],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Hanya menuliskan peristiwa tanpa adanya refleksi perasaan atau pembelajaran."],
                    ['name' => 'Cukup', 'desc' => "Menuliskan peristiwa dan perasaan namun pembelajaran yang didapat masih bersifat umum."],
                    ['name' => 'Baik', 'desc' => "Refleksi mencakup 4P dengan jelas dan menunjukkan keterkaitan antar poin tersebut."],
                    ['name' => 'Sangat Baik', 'desc' => "Refleksi sangat mendalam, menunjukkan transformasi pemikiran, dan rencana penerapan yang konkret."],
                ],
                'teacher_notes' => "Jurnal ini bersifat kualitatif. Fokus pada kedalaman refleksi murid daripada sekadar ketepatan jawaban teknis.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 2
                ]
            ];
        }

        if ($type === 'peer_assessment') {
            return [
                'description' => "Berikan penilaian dan apresiasi terhadap kontribusi teman kelompokmu secara objektif dan membangun.",
                'assessment_mode' => 'default',
                'stimulus' => "Berikan penilaian objektif dan apresiasi kepada rekan kelompokmu atas kolaborasi dalam materi {$content}.",
                'indicators' => [
                    ['name' => "Rekan berkontribusi aktif dalam pembagian tugas kelompok."],
                    ['name' => "Rekan menghargai ide dan pendapat anggota kelompok lain."],
                    ['name' => "Rekan menyelesaikan tanggung jawab tugasnya sesuai kesepakatan."],
                    ['name' => "Rekan memberikan bantuan atau solusi saat ada hambatan bersama."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Rekan jarang berkontribusi atau cenderung pasif dalam kerja kelompok."],
                    ['name' => 'Cukup', 'desc' => "Rekan berkontribusi namun terkadang masih memerlukan dorongan dari anggota lain."],
                    ['name' => 'Baik', 'desc' => "Rekan berkontribusi aktif dan bekerja sama dengan baik sepanjang aktivitas."],
                    ['name' => 'Sangat Baik', 'desc' => "Rekan menjadi inspirator kelompok, sangat solutif, dan sangat menghargai dinamika tim."],
                ],
                'teacher_notes' => "Gunakan data ini untuk memberikan nilai sikap sosial (Gotong Royong). Pastikan identitas penilai tetap terjaga kerahasiaannya jika diperlukan.",
                'kktp' => [
                    'approach' => 'criteria_description',
                    'min_criteria' => 3
                ]
            ];
        }

        if ($type === 'structured_assignment') {
            return [
                'description' => "Kerjakan LKPD berikut sesuai petunjuk yang diberikan dengan teliti dan bertanggung jawab.",
                'stimulus' => "Deskripsikan tugas LKPD (Lembar Kerja Peserta Didik) yang harus dikerjakan siswa terkait {$content}. Sertakan petunjuk pengerjaan, ketentuan, dan kriteria penilaian.",
                'indicators' => [
                    ['name' => "Kelengkapan isi LKPD sesuai instruksi yang diberikan."],
                    ['name' => "Ketepatan konsep dan penerapan materi {$content}."],
                    ['name' => "Keteraturan dan kerapihan penyajian jawaban."],
                    ['name' => "Kemampuan menjelaskan proses berpikir dalam mengerjakan tugas."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "LKPD belum memenuhi standar minimal, banyak bagian yang kosong atau tidak sesuai instruksi."],
                    ['name' => 'Cukup', 'desc' => "LKPD cukup memenuhi instruksi namun belum lengkap dan masih ada kesalahan konsep."],
                    ['name' => 'Baik', 'desc' => "LKPD lengkap, menunjukkan pemahaman yang baik terhadap materi."],
                    ['name' => 'Sangat Baik', 'desc' => "LKPD sangat lengkap, analitis, kreatif, dan mampu menjelaskan proses berpikir dengan jelas."],
                ],
                'teacher_notes' => "Evaluasi berdasarkan kelengkapan, ketepatan konsep, keteraturan, dan kemampuan menjelaskan proses berpikir siswa.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'concept_map') {
            return [
                'description' => "Buatlah peta konsep yang menunjukkan hubungan antar ide pokok dalam materi ini dengan kata penghubung yang tepat.",
                'stimulus' => "Gambarkan hubungan antar konsep utama dalam {$content} ke dalam sebuah peta konsep. Hubungkan setiap ide dengan kata penghubung yang bermakna.",
                'indicators' => [
                    ['name' => "Kelengkapan Kata Kunci (Concepts)"],
                    ['name' => "Ketepatan Kata Penghubung (Propositions)"],
                    ['name' => "Kualitas Struktur Hierarki"],
                    ['name' => "Kekayaan Hubungan Silang (Cross-links)"],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Konsep yang muncul sangat terbatas dan hubungan antar konsep belum terbentuk atau banyak yang keliru."],
                    ['name' => 'Cukup', 'desc' => "Konsep utama sudah ada namun hubungan antar konsep masih sangat linier dan belum menunjukkan hierarki yang jelas."],
                    ['name' => 'Baik', 'desc' => "Hubungan antar konsep sudah hierarkis dan sebagian besar proposisi (kata hubung) sudah tepat dan logis."],
                    ['name' => 'Sangat Baik', 'desc' => "Peta konsep menunjukkan pemahaman mendalam dengan struktur yang kompleks, hierarkis, dan memiliki hubungan silang yang kreatif."],
                ],
                'teacher_notes' => "Peta konsep adalah jendela cara berpikir murid. Perhatikan jika ada 'miskonsepsi' pada kata hubung yang mereka gunakan.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'project') {
            return [
                'description' => "Kerjakan proyek ini secara berkelompok, tunjukkan kreativitas dan kerja sama tim yang baik!",
                'stimulus' => "Bagaimana kita bisa menggunakan konsep {$content} untuk memecahkan masalah nyata di lingkungan kita? Rancang dan buatlah sebuah solusi kreatif!",
                'teacher_notes' => "Tahapan Projek: 1. Perencanaan (Ide & Desain), 2. Pelaksanaan (Pembuatan/Riset), 3. Pelaporan & Presentasi.",
                'phase_planning' => "Murid mampu menyusun jadwal, pembagian peran, dan desain awal projek terkait {$content}.",
                'phase_execution' => "Murid menunjukkan ketekunan dan kerjasama dalam merealisasikan desain menjadi produk nyata.",
                'phase_product' => "Produk akhir berfungsi dengan baik, estetis, dan menjawab pertanyaan utama projek.",
                'criteria' => [
                    ['id' => 'c1', 'text' => 'Perencanaan Proyek', 'weight' => 30, 'descriptions' => ['l1' => 'Tidak ada perencanaan', 'l2' => 'Perencanaan kurang detail', 'l3' => 'Perencanaan baik dan terstruktur', 'l4' => 'Perencanaan sangat matang dan inovatif']],
                    ['id' => 'c2', 'text' => 'Pelaksanaan Proyek', 'weight' => 40, 'descriptions' => ['l1' => 'Tidak terlaksana', 'l2' => 'Terlaksana sebagian', 'l3' => 'Terlaksana dengan baik sesuai jadwal', 'l4' => 'Terlaksana sangat baik dengan kolaborasi efektif']],
                    ['id' => 'c3', 'text' => 'Produk/Hasil Proyek', 'weight' => 30, 'descriptions' => ['l1' => 'Tidak ada produk', 'l2' => 'Produk kurang lengkap', 'l3' => 'Produk sesuai kriteria dan berfungsi', 'l4' => 'Produk inovatif dan berkualitas tinggi']],
                ],
                'levels' => [
                    ['id' => 'l1', 'name' => 'Perlu Bimbingan', 'desc' => "Projek belum selesai atau banyak tahapan yang terlewati tanpa dokumentasi yang jelas.", 'score' => 25],
                    ['id' => 'l2', 'name' => 'Cukup', 'desc' => "Projek selesai namun beberapa bagian pada tahap pelaksanaan kurang optimal.", 'score' => 50],
                    ['id' => 'l3', 'name' => 'Baik', 'desc' => "Projek berhasil diselesaikan dengan baik di semua tahapan dan produk berfungsi.", 'score' => 75],
                    ['id' => 'l4', 'name' => 'Sangat Baik', 'desc' => "Projek menunjukkan inovasi luar biasa, dokumentasi lengkap, dan hasil produk sangat berkualitas.", 'score' => 100],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'portfolio') {
            return [
                'description' => "Kumpulkan hasil karyamu dan jelaskan perkembangan belajarmu melalui refleksi diri.",
                'stimulus' => "Pilihlah 3 hasil karya terbaikmu selama mempelajari {$content}. Jelaskan mengapa kamu memilih karya tersebut.",
                'teacher_notes' => "Pertanyaan Refleksi: 1. Apa tantangan terbesar saat membuat karya ini? 2. Bagaimana pemahamanmu tentang {$content} berkembang?",
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Koleksi belum lengkap dan refleksi diri sangat minim atau hanya bersifat deskriptif."],
                    ['name' => 'Cukup', 'desc' => "Koleksi lengkap namun refleksi masih kurang mendalam dalam menghubungkan progres belajar."],
                    ['name' => 'Baik', 'desc' => "Koleksi lengkap dan menunjukkan progres yang jelas serta refleksi diri yang jujur."],
                    ['name' => 'Sangat Baik', 'desc' => "Koleksi sangat komprehensif, menunjukkan pertumbuhan kompetensi yang signifikan, dan refleksi sangat mendalam."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'performance') {
            return [
                'description' => "Tunjukkan keterampilan praktikmu sesuai prosedur dan kriteria yang telah ditentukan!",
                'performance_mode' => 'rubric',
                'stimulus' => "Demonstrasikan kemampuanmu dalam {$content} melalui praktik, proyek, atau produk nyata yang dapat dievaluasi.",
                'indicators' => [
                    ['name' => "Kesesuaian hasil dengan instruksi/tujuan {$content}."],
                    ['name' => "Kualitas teknis dan kerapihan pengerjaan."],
                    ['name' => "Kemampuan menjelaskan alur proses pengerjaan."],
                    ['name' => "Kreativitas dan orisinalitas karya/produk."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Karya/unjuk kerja belum memenuhi standar minimal dan memerlukan pendampingan intensif."],
                    ['name' => 'Cukup', 'desc' => "Karya/unjuk kerja memenuhi standar minimal namun masih ada beberapa bagian yang belum tuntas."],
                    ['name' => 'Baik', 'desc' => "Karya/unjuk kerja memenuhi seluruh standar dengan kualitas yang baik."],
                    ['name' => 'Sangat Baik', 'desc' => "Karya/unjuk kerja melampaui standar dengan inovasi atau kualitas yang luar biasa."],
                ],
                'development_levels' => [
                    ['name' => 'Belum Mulai', 'desc' => "Murid belum menunjukkan pemahaman atau keterampilan dasar terkait konsep."],
                    ['name' => 'Sedang Berkembang', 'desc' => "Murid mulai memahami konsep namun masih memerlukan bimbingan dalam penerapannya."],
                    ['name' => 'Berkembang Baik', 'desc' => "Murid mampu menerapkan konsep secara mandiri dengan hasil yang memadai."],
                    ['name' => 'Mandiri', 'desc' => "Murid mampu menerapkan konsep secara kreatif dan menjelaskan proses penerapannya."],
                ],
                'teacher_notes' => "Fokus pada proses dan hasil akhir. Gunakan rubrik ini secara objektif selama pengamatan unjuk kerja.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'assignment') {
            return [
                'description' => "Analisis studi kasus berikut dan susun laporan pemecahan masalah secara sistematis dan rapi.",
                'stimulus' => "Analisis studi kasus berikut dan susun laporan pemecahan masalah secara sistematis. Gunakan format laporan yang terstruktur: Identifikasi Masalah, Analisis, Solusi, dan Kesimpulan.",
                'indicators' => [
                    ['name' => "Ketepatan identifikasi masalah dan akar permasalahan dari studi kasus {$content}."],
                    ['name' => "Kualitas analisis dan penggunaan konsep teori yang relevan dalam pemecahan masalah."],
                    ['name' => "Kelengkapan solusi, rekomendasi, dan rencana tindak lanjut yang diusulkan."],
                    ['name' => "Keteraturan penyajian laporan, kualitas visualisasi data, dan kerapian dokumen."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Laporan belum memenuhi standar minimal, identifikasi masalah tidak tepat, dan analisis sangat dangkal."],
                    ['name' => 'Cukup', 'desc' => "Laporan cukup memenuhi instruksi namun analisis belum mendalam dan solusi kurang relevan."],
                    ['name' => 'Baik', 'desc' => "Laporan lengkap, analisis baik dengan konsep teori yang relevan, solusi relevan dan dapat diterapkan."],
                    ['name' => 'Sangat Baik', 'desc' => "Laporan sangat komprehensif, analisis kritis mendalam, solusi inovatif, dan penyajian sangat rapi."],
                ],
                'teacher_notes' => "Evaluasi berdasarkan 4 aspek: ketepatan identifikasi masalah, kualitas analisis, kelengkapan solusi, dan keteraturan penyajian laporan.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'written_test') {
            return [
                'description' => "Kerjakan soal-soal berikut dengan teliti dan percaya diri! Pilihlah jawaban yang paling tepat.",
                'quiz_mode' => 'mcq',
                'questions' => array_map(fn($i) => [
                    'id' => 'q' . $i,
                    'type' => 'multiple_choice',
                    'text' => "Soal {$i}: Pilih pernyataan yang paling tepat mengenai konsep {$content} (soal ke-{$i}).",
                    'options' => [
                        ['id' => 'a', 'text' => "Jawaban A tentang {$content} - definisi dasar."],
                        ['id' => 'b', 'text' => "Jawaban B tentang {$content} - penerapan praktis."],
                        ['id' => 'c', 'text' => "Jawaban C tentang {$content} - analisis kritis."],
                        ['id' => 'd', 'text' => "Semua jawaban di atas benar."]
                    ],
                    'answer' => ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd', 'a', 'b'][$i - 1] ?? 'a',
                    'points' => 1
                ], range(1, 10)),
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Skor < 60: Murid belum mencapai kriteria ketuntasan minimal. Disarankan remedial materi {$content}."],
                    ['name' => 'Cukup', 'desc' => "Skor 60-75: Murid telah mencapai kriteria ketuntasan minimal namun masih perlu penguatan pemahaman konsep."],
                    ['name' => 'Baik', 'desc' => "Skor 76-90: Murid menguasai materi dengan baik dan mampu menjawab sebagian besar soal dengan benar."],
                    ['name' => 'Sangat Baik', 'desc' => "Skor > 90: Murid menunjukkan penguasaan materi yang sangat mendalam dan mampu memberikan analisis kritis."],
                ],
                'kktp' => [
                    'approach' => 'score_interval',
                    'intervals' => [
                        ['min' => 0, 'max' => 59, 'label' => 'Perlu Bimbingan', 'desc' => 'Perlu remedial'],
                        ['min' => 60, 'max' => 75, 'label' => 'Cukup', 'desc' => 'Perlu penguatan'],
                        ['min' => 76, 'max' => 90, 'label' => 'Baik', 'desc' => 'Tuntas'],
                        ['min' => 91, 'max' => 100, 'label' => 'Sangat Baik', 'desc' => 'Pengayaan'],
                    ],
                    'passing_min' => 60
                ]
            ];
        }

        return [];
    }

    /**
     * Generate detailed Modul Ajar (RPP PPA 2026) in one call.
     */
    public function generateDetailedModulAjar(
        int $tpId,
        int $materialId,
        ?string $model = null,
        ?string $customPrompt = null,
        bool $regenerate = false
    ): array {
        $this->isLastRequestOnline = false;
        
        $tp = LmsLearningObjective::with(['subject', 'schoolClass'])->find($tpId);
        $material = \App\Models\LmsMaterial::find($materialId);
        
        if (!$tp || !$material) {
            return [];
        }

        $subjectName = $tp->subject?->name ?? 'Mata Pelajaran';
        $className = $tp->schoolClass?->name ?? 'Kelas X';
        $tpDescription = $tp->description ?? 'Tujuan Pembelajaran';
        $materialTitle = $material->title ?? 'Materi Inti';
        $materialContent = strip_tags($material->content ?? 'Materi Inti');
        $pedModel = $model ?? 'Umum/Direct';
        
        // Fetch all assessments associated with this TP
        $teacher = \Illuminate\Support\Facades\Auth::user()->teacher;
        $allAssessments = \App\Models\LmsAssignment::where('learning_objective_id', $tpId)
            ->where('subject_id', $tp->subject_id)
            ->where('teacher_id', $teacher->id)
            ->get();
            
        $initialAsms = $allAssessments->where('assessment_type', 'initial')->pluck('title')->implode(', ');
        $formativeAsms = $allAssessments->where('assessment_type', 'formative')->pluck('title')->implode(', ');
        $summativeAsms = $allAssessments->where('assessment_type', 'summative')->pluck('title')->implode(', ');
        
        if (empty($initialAsms)) {
            $initialAsms = 'Belum didefinisikan (akan ditentukan lewat proses belajar)';
        }
        if (empty($formativeAsms)) {
            $formativeAsms = 'Belum didefinisikan (akan ditentukan lewat proses belajar)';
        }
        if (empty($summativeAsms)) {
            $summativeAsms = 'Belum didefinisikan (akan ditentukan lewat proses belajar)';
        }

        $hash = md5('modul_ajar_' . $tpId . '_' . $materialId . '_' . $pedModel . '_' . md5($customPrompt ?? ''));

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        // 1. Try AI via Manager
        $aiManager = app(AiManager::class);
        $ai = $aiManager->getActiveProvider();

        if ($ai->isConfigured()) {
            try {
                // If customPrompt is provided, use it directly. Otherwise, load from database/fallback.
                $template = $customPrompt;
                if (empty($template)) {
                    $template = \App\Models\LmsAiPrompt::getPromptFor('modul_ajar', $teacher->id);
                }

                $prompt = str_replace([
                    '{subject}',
                    '{class}',
                    '{tp}',
                    '{material}',
                    '{pedagogical_model}',
                    '{initial_assessments}',
                    '{formative_assessments}',
                    '{summative_assessments}'
                ], [
                    $subjectName,
                    $className,
                    $tpDescription,
                    $materialTitle . ': ' . $materialContent,
                    $pedModel,
                    $initialAsms,
                    $formativeAsms,
                    $summativeAsms
                ], $template);

                $prompt .= "\n\nPENTING: Susunlah RPP Modul Ajar ini dengan menggunakan PENDEKATAN PEMBELAJARAN MENDALAM (DEEP LEARNING) sesuai panduan PPA 2026. Pastikan setiap langkah relevan, mendalam, dan terstruktur sesuai standar tersebut.";

                $response = $ai->generateContent($prompt);

                if (!empty($response)) {
                    // Parse JSON response
                    $response = preg_replace('/^```(?:json)?\s*/i', '', $response);
                    $response = preg_replace('/\s*```$/i', '', $response);
                    $response = trim($response);
                    
                    $result = json_decode($response, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($result)) {
                        $this->isLastRequestOnline = true;
                        
                        // Set cache
                        \App\Models\LmsAiCache::setCache($hash, 'modul_ajar', [
                            'tp_id' => $tpId,
                            'material_id' => $materialId,
                            'pedagogical_model' => $pedModel
                        ], json_encode($result));
                        
                        return $result;
                    } else {
                        \Illuminate\Support\Facades\Log::warning('InstructionalSmartService JSON parse error: ' . json_last_error_msg() . ' Raw: ' . substr($response, 0, 500));
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('InstructionalSmartService Detailed Modul Ajar AI Error: ' . $e->getMessage());
            }
        }

        // 2. Offline Fallback (Comprehensive & Premium standard PPA 2026)
        $result = [
            'alokasi_waktu' => '2 JP x 40 menit',
            'jumlah_pertemuan' => '1 kali pertemuan',
            'dimensi_profil' => 'Beriman, bertakwa kepada Tuhan YME, berakhlak mulia, Mandiri, Bernalar Kritis, dan Kreatif.',
            'lingkungan_pembelajaran' => 'Ruang kelas / Laboratorium dengan koneksi internet.',
            'kemitraan_pembelajaran' => 'Kolaborasi antarguru sejenis dan pendampingan orang tua.',
            'pemanfaatan_digital' => 'Penggunaan LMS, presentasi digital, dan sumber belajar daring.',
            'media_ilustrasi' => "Minimalist educational vector illustration representing " . strip_tags($materialTitle) . " in clean, harmonious colors.",
            'understanding' => "<p><strong>Orientasi Masalah:</strong> Guru menyajikan ilustrasi kontekstual mengenai " . htmlspecialchars($materialTitle) . " (misal dari kasus sehari-hari).</p>",
            'application' => "<p><strong>Penyelidikan Mandiri/Kelompok:</strong> Siswa berkolaborasi mengumpulkan data dan mencari solusi pemecahan masalah dengan dipandu LKPD.</p>",
            'reflection' => "<p><strong>Penyajian Hasil & Evaluasi:</strong> Perwakilan kelompok mempresentasikan hasil analisis mereka di depan kelas. Guru memberikan umpan balik konstruktif.</p>",
            'lkpd' => "<h2>Lembar Kerja Peserta Didik (LKPD)</h2>" .
                "<h3>Langkah Kegiatan Kelompok:</h3>" .
                "<p><strong>Nama Anggota Kelompok:</strong> ____________________________________</p>" .
                "<p><strong>Tujuan Aktivitas:</strong> Menyelidiki aplikasi nyata dari " . htmlspecialchars($materialTitle) . " secara kolaboratif.</p>" .
                "<h4>Tugas & Instruksi:</h4>" .
                "<ol>" .
                "<li>Cermati kasus pemicu yang dibagikan oleh guru di papan tulis.</li>" .
                "<li>Diskusikan bersama kelompokmu: Apa penyebab utama masalah tersebut dan kaitannya dengan " . htmlspecialchars($materialTitle) . "?</li>" .
                "<li>Tuliskan 3 alternatif solusi logis di kolom di bawah ini.</li>" .
                "<li>Persiapkan bahan presentasi singkat (maksimal 3 slide / lembar kertas karton).</li>" .
                "</ol>" .
                "<h4>Lembar Jawab Diskusi:</h4>" .
                "<p style='border:1px solid #ccc; height:150px; padding:10px;'>Tulis jawaban kelompok di sini...</p>"
        ];

        return $result;
    }
}
