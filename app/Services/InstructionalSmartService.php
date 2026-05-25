<?php

namespace App\Services;

use App\Models\LmsLearningObjective;
use App\Services\GeminiApiService;

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

        // 1. Try Gemini API
        $gemini = app(GeminiApiService::class);
        if ($gemini->isConfigured()) {
            try {
                $suggested = $gemini->generateFullOrchestratorDraft($subjectName, $className, $tpDescription, $model, $regenerate);
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
            'understanding' => $understanding,
            'application' => $application,
            'reflection' => $reflection,
            'lkpd' => $lkpd,
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

        // Integrasi Gemini API
        $gemini = app(GeminiApiService::class);
        if ($gemini->isConfigured()) {
            try {
                $suggested = $gemini->suggestLearningExperiences($description, $content, $subjectName, $model, $regenerate);
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
        ?string $materialContent = null
    ): array {
        $this->isLastRequestOnline = false;
        $tp = LmsLearningObjective::find($tpId);
        if (!$tp) return [];

        if ($type === 'formative_quiz') {
            $type = 'quiz_survey';
        } elseif ($type === 'guided_discussion') {
            $type = 'performance_observation';
        } elseif ($type === 'structured_assignment') {
            $type = 'concept_map';
        }

        $description = $tp->description ?? '';

        // Chaining Context: Gunakan judul & uraian materi riil hasil ketikan guru jika dikirim, fallback ke TP content jika kosong
        if (!empty($materialContent)) {
            $content = "Judul Materi: " . ($materialTitle ?? '') . "\nUraian Materi:\n" . strip_tags($materialContent);
        } else {
            $content = $tp->content ?? 'materi ini';
        }

        // Integrasi Gemini API
        $gemini = app(GeminiApiService::class);
        if ($gemini->isConfigured()) {
            try {
                $suggested = $gemini->suggestAssessment($description, $content, $type, $regenerate);
                if (!empty($suggested)) {
                    $this->isLastRequestOnline = true;
                    return $suggested;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('InstructionalSmartService Gemini Assessment Error: ' . $e->getMessage());
            }
        }
        
        if ($type === 'rubric' || $type === 'oral_qa') {
            return [
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
                'stimulus' => "Guru berkeliling mengamati proses kerja murid (individu/kelompok) saat melakukan aktivitas terkait {$content}.",
                'indicators' => [
                    ['name' => "Murid berkontribusi aktif dalam diskusi/pengerjaan tugas kelompok."],
                    ['name' => "Murid menunjukkan logika struktur yang tepat dalam menyusun solusi {$content}."],
                    ['name' => "Murid mampu merespons umpan balik lisan yang diberikan guru saat proses berlangsung."],
                    ['name' => "Murid membantu teman sejawat (peer-support) dalam memahami konsep."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Murid pasif dan sering kesulitan dengan logika dasar meskipun sudah dibimbing lisan."],
                    ['name' => 'Cukup', 'desc' => "Murid mencoba berkontribusi namun masih memerlukan umpan balik berulang untuk memperbaiki logika."],
                    ['name' => 'Baik', 'desc' => "Murid aktif dan mampu memperbaiki kesalahan logika segera setelah menerima umpan balik lisan."],
                    ['name' => 'Sangat Baik', 'desc' => "Murid sangat dominan dalam memberikan solusi logis dan mampu menjelaskan proses kerjanya dengan sangat jernih."],
                ],
                'teacher_notes' => "Berikan umpan balik lisan secara langsung jika melihat kesalahan logika atau hambatan proses. Fokus pada pengamatan berkesinambungan.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik',
                ]
            ];
        }

        if ($type === 'exit_ticket') {
            return [
                'stimulus' => "Sebelum mengakhiri sesi, silakan jawab beberapa pertanyaan refleksi singkat (Exit Ticket) berikut:",
                'questions' => [
                    ['text' => "Tuliskan 1 hal paling penting yang kamu pahami hari ini tentang {$content}."],
                    ['text' => "Bagian mana yang menurutmu paling menantang atau sulit dimengerti?"],
                    ['text' => "Sebutkan 1 pertanyaan yang ingin kamu tanyakan lebih lanjut pada pertemuan berikutnya."],
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

        if ($type === 'concept_map') {
            return [
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
                'stimulus' => "Bagaimana kita bisa menggunakan konsep {$content} untuk memecahkan masalah nyata di lingkungan kita? Rancang dan buatlah sebuah solusi kreatif!",
                'teacher_notes' => "Tahapan Projek: 1. Perencanaan (Ide & Desain), 2. Pelaksanaan (Pembuatan/Riset), 3. Pelaporan & Presentasi.",
                'phase_planning' => "Murid mampu menyusun jadwal, pembagian peran, dan desain awal projek terkait {$content}.",
                'phase_execution' => "Murid menunjukkan ketekunan dan kerjasama dalam merealisasikan desain menjadi produk nyata.",
                'phase_product' => "Produk akhir berfungsi dengan baik, estetis, dan menjawab pertanyaan utama projek.",
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Projek belum selesai atau banyak tahapan yang terlewati tanpa dokumentasi yang jelas."],
                    ['name' => 'Cukup', 'desc' => "Projek selesai namun beberapa bagian pada tahap pelaksanaan kurang optimal."],
                    ['name' => 'Baik', 'desc' => "Projek berhasil diselesaikan dengan baik di semua tahapan dan produk berfungsi."],
                    ['name' => 'Sangat Baik', 'desc' => "Projek menunjukkan inovasi luar biasa, dokumentasi lengkap, dan hasil produk sangat berkualitas."],
                ],
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'portfolio') {
            return [
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
                'stimulus' => "Demonstrasikan kemampuanmu dalam {$content} melalui unjuk kerja nyata atau presentasi di depan kelas/kelompok.",
                'indicators' => [
                    ['name' => "Kesesuaian hasil dengan instruksi/tujuan {$content}."],
                    ['name' => "Kualitas teknis dan kerapihan pengerjaan."],
                    ['name' => "Kemampuan menjelaskan alur proses pengerjaan."],
                    ['name' => "Kreativitas dan orisinalitas karya."],
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Karya/unjuk kerja belum memenuhi standar minimal dan memerlukan pendampingan intensif."],
                    ['name' => 'Cukup', 'desc' => "Karya/unjuk kerja memenuhi standar minimal namun masih ada beberapa bagian yang belum tuntas."],
                    ['name' => 'Baik', 'desc' => "Karya/unjuk kerja memenuhi seluruh standar dengan kualitas yang baik."],
                    ['name' => 'Sangat Baik', 'desc' => "Karya/unjuk kerja melampaui standar dengan inovasi atau kualitas yang luar biasa."],
                ],
                'teacher_notes' => "Fokus pada proses dan hasil akhir. Gunakan rubrik ini secara objektif selama pengamatan unjuk kerja.",
                'kktp' => [
                    'approach' => 'rubric',
                    'passing_level' => 'Baik'
                ]
            ];
        }

        if ($type === 'written_test') {
            return [
                'questions' => [
                    [
                        'id' => 'q1',
                        'type' => 'multiple_choice',
                        'text' => "Manakah pernyataan yang paling tepat mengenai konsep {$content}?",
                        'options' => [
                            ['id' => 'a', 'text' => "Definisi A yang menjelaskan {$content} secara mendalam."],
                            ['id' => 'b', 'text' => "Definisi B yang merujuk pada aspek teknis {$content}."],
                            ['id' => 'c', 'text' => "Definisi C yang merupakan implementasi praktis {$content}."],
                            ['id' => 'd', 'text' => "Semua jawaban di atas benar."]
                        ],
                        'answer' => 'a'
                    ],
                    [
                        'id' => 'q2',
                        'type' => 'multiple_choice',
                        'text' => "Apa fungsi utama dari {$content} dalam konteks pembelajaran saat ini?",
                        'options' => [
                            ['id' => 'a', 'text' => "Meningkatkan efisiensi kerja."],
                            ['id' => 'b', 'text' => "Sebagai dasar teori untuk materi selanjutnya."],
                            ['id' => 'c', 'text' => "Mengidentifikasi kesalahan umum dalam praktik."],
                            ['id' => 'd', 'text' => "Mempermudah proses dokumentasi."]
                        ],
                        'answer' => 'b'
                    ],
                    [
                        'id' => 'q3',
                        'type' => 'short_answer',
                        'text' => "Berikan satu contoh penerapan {$content} yang pernah kamu temui atau bayangkan dalam kehidupan nyata!",
                    ]
                ],
                'levels' => [
                    ['name' => 'Perlu Bimbingan', 'desc' => "Skor < 60: Murid belum mencapai kriteria ketuntasan minimal. Disarankan remedial materi {$content}."],
                    ['name' => 'Cukup', 'desc' => "Skor 60-75: Murid telah mencapai kriteria ketuntasan minimal namun masih perlu penguatan pemahaman konsep."],
                    ['name' => 'Baik', 'desc' => "Skor 76-90: Murid menguasai materi dengan baik dan mampu menjawab sebagian besar soal dengan benar."],
                    ['name' => 'Sangat Baik', 'desc' => "Skor > 90: Murid menunjukkan penguasaan materi yang sangat mendalam dan mampu memberikan analisis kritis."],
                ],
                'kktp' => [
                    'approach' => 'score_interval',
                    'intervals' => [
                        ['min' => 0, 'max' => 59, 'label' => 'Belum Mencapai', 'desc' => 'Perlu remedial'],
                        ['min' => 60, 'max' => 75, 'label' => 'Hampir Mencapai', 'desc' => 'Perlu penguatan'],
                        ['min' => 76, 'max' => 90, 'label' => 'Sudah Mencapai', 'desc' => 'Tuntas'],
                        ['min' => 91, 'max' => 100, 'label' => 'Sangat Baik', 'desc' => 'Perlu pengayaan'],
                    ],
                    'passing_min' => 60
                ]
            ];
        }

        return [];
    }
}
