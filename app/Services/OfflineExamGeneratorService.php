<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\LmsAiCache;
use App\Models\LmsLearningObjective;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\JcTable;
use PhpOffice\PhpWord\SimpleType\TblWidth;

class OfflineExamGeneratorService
{
    protected AiManager $aiManager;

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Clean text for XML output inside Microsoft Word .docx to prevent XML entity corruption.
     * Strips illegal XML 1.0 control characters while preserving valid formatting.
     */
    public function cleanWordText(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        // Strip illegal XML 1.0 control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F)
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $text);

        return trim($cleaned);
    }

    /**
     * Calculate equal question allocation across selected TPs.
     * E.g. 10 questions and 2 TPs -> 5 questions each (1-5 for TP1, 6-10 for TP2).
     */
    public function calculateTpQuestionAllocation(Collection|array $tps, int $questionCount): array
    {
        $tpsList = $tps instanceof Collection ? $tps->values()->all() : array_values($tps);
        $tpCount = count($tpsList);
        if ($tpCount === 0) {
            return [];
        }

        $baseCount = intdiv($questionCount, $tpCount);
        $remainder = $questionCount % $tpCount;

        $allocations = [];
        $startNumber = 1;

        foreach ($tpsList as $index => $tp) {
            $allocated = $baseCount + ($index < $remainder ? 1 : 0);
            if ($allocated <= 0) {
                continue;
            }
            $endNumber = $startNumber + $allocated - 1;

            $allocations[] = [
                'tp' => $tp,
                'tp_id' => $tp->id,
                'tp_code' => $tp->code ?: ('TP ' . ($tp->order ?? ($index + 1))),
                'content' => $tp->content ?: $tp->description,
                'description' => $tp->description,
                'count' => $allocated,
                'start_number' => $startNumber,
                'end_number' => $endNumber,
            ];

            $startNumber = $endNumber + 1;
        }

        return $allocations;
    }

    /**
     * Generate complete exam data (questions, blueprint, answer key, and metadata).
     * Supports single SchoolClass/TP or Collection/Array of SchoolClasses and TPs.
     */
    public function generateExamData(
        Teacher $teacher,
        SchoolClass|Collection|array $schoolClasses,
        LmsLearningObjective|Collection|array $tps,
        string $questionType = 'multiple_choice',
        int $questionCount = 10,
        ?string $timeLimit = '90 Menit',
        bool $regenerate = false,
        string $generationEngine = 'fast',
        string $cognitiveLevel = 'all'
    ): array {
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // Resolve class names and class IDs
        if ($schoolClasses instanceof SchoolClass) {
            $classList = collect([$schoolClasses]);
        } elseif (is_array($schoolClasses)) {
            $classList = collect($schoolClasses);
        } else {
            $classList = $schoolClasses;
        }

        $classIds = $classList->pluck('id')->filter()->values()->all();
        $classNames = $classList->pluck('name')->filter()->join(', ');
        if (empty($classNames)) {
            $classNames = 'Semua Kelas Target';
        }

        // Resolve TPs list
        if ($tps instanceof LmsLearningObjective) {
            $tpList = collect([$tps]);
        } elseif (is_array($tps)) {
            $tpList = collect($tps);
        } else {
            $tpList = $tps;
        }

        $tpAllocations = $this->calculateTpQuestionAllocation($tpList, $questionCount);
        $primaryTp = $tpList->first();

        $subject = $primaryTp?->subject ?: Subject::find($primaryTp?->subject_id);
        $subjectName = $subject?->name ?? 'Mata Pelajaran';
        $periodName = ($activeYear?->name ?? date('Y') . '/' . (date('Y') + 1)) .
            ($activeSemester ? ' - Semester ' . $activeSemester->name : '');

        $schoolName = school_setting('school_name', config('app.name', 'SMP Negeri 1 Biau'));
        $schoolAddress = school_setting('school_address', 'Jl. Trans Sulawesi, Buol');
        $schoolPhone = school_setting('school_phone', '-');
        $schoolEmail = school_setting('school_email', '-');
        $headmasterName = school_setting('school_headmaster_name', 'Hj. Sitti Rahma, S.Pd., M.Pd.');
        $headmasterNip = school_setting('school_headmaster_nip', '19750812 200003 2 001');

        $classKey = implode('_', $classIds);
        $tpKey = $tpList->pluck('id')->sort()->implode('_');
        $levelInfo = $this->resolveEducationLevel($classList, $classNames);
        $cacheHash = md5("offline_exam_v13_{$tpKey}_{$classKey}_{$questionType}_{$questionCount}_{$generationEngine}_{$cognitiveLevel}_{$levelInfo['grade_label']}");

        if (!$regenerate) {
            $cachedJson = LmsAiCache::getCache($cacheHash);
            if ($cachedJson) {
                $decoded = json_decode($cachedJson, true);
                if (is_array($decoded) && !empty($decoded['questions'])) {
                    // Enforce strict question type filtering even on cached payload
                    $filtered = $this->enforceStrictQuestionType($decoded, $tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);
                    return $this->formatExamPayload(
                        $filtered,
                        $teacher,
                        $classIds,
                        $classNames,
                        $subjectName,
                        $tpList,
                        $tpAllocations,
                        $periodName,
                        $timeLimit,
                        $schoolName,
                        $schoolAddress,
                        $schoolPhone,
                        $schoolEmail,
                        $headmasterName,
                        $headmasterNip,
                        $cognitiveLevel,
                        $levelInfo
                    );
                }
            }
        }

        // If 'fast' engine or testing environment, immediately use deterministic pedagogical generator (0.05s, 0 token cost, 100% no 503 timeout)
        if ($generationEngine === 'fast' || app()->environment('testing')) {
            $aiResult = $this->buildPedagogicalFallback($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);
        } else {
            // Try AI generation first
            $aiResult = $this->callAiForExam($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);

            if (!$aiResult || empty($aiResult['questions'])) {
                // Fallback: Generate structured pedagogical questions deterministically
                $aiResult = $this->buildPedagogicalFallback($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);
            }
        }

        // Post-validation: Enforce STRICT question type consistency and TP allocation
        $aiResult = $this->enforceStrictQuestionType($aiResult, $tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);

        // Cache successful output
        try {
            LmsAiCache::setCache($cacheHash, 'offline_exam', [
                'tp_ids' => $tpList->pluck('id')->all(),
                'class_ids' => $classIds,
                'type' => $questionType,
                'count' => $questionCount,
                'engine' => $generationEngine,
                'cognitive_level' => $cognitiveLevel,
                'grade_level' => $levelInfo['grade_label'],
            ], json_encode($aiResult));
        } catch (\Throwable $e) {
            Log::warning('Failed saving exam cache: ' . $e->getMessage());
        }

        return $this->formatExamPayload(
            $aiResult,
            $teacher,
            $classIds,
            $classNames,
            $subjectName,
            $tpList,
            $tpAllocations,
            $periodName,
            $timeLimit,
            $schoolName,
            $schoolAddress,
            $schoolPhone,
            $schoolEmail,
            $headmasterName,
            $headmasterNip,
            $cognitiveLevel,
            $levelInfo
        );
    }

    /**
     * Resolve education level (SD, SMP, SMA) and grade information from target classes.
     * E.g. "Kelas 8A, Kelas 8B" -> ['grade' => 8, 'grade_label' => 'Kelas 8 SMP', 'level_name' => 'SMP', 'phase' => 'Fase D', 'pedagogical_tone' => 'smp']
     */
    public function resolveEducationLevel(Collection|array $schoolClasses, string $classNames = ''): array
    {
        $classList = $schoolClasses instanceof Collection ? $schoolClasses : collect($schoolClasses);
        $names = $classList->pluck('name')->filter()->values()->all();
        if (empty($names) && $classNames !== '') {
            $names = array_map('trim', explode(',', $classNames));
        }

        $grades = [];
        foreach ($names as $name) {
            $name = trim($name);
            if (preg_match('/(?:kelas\s*|tingkat\s*)?(\d+)/i', $name, $matches)) {
                $grades[] = (int) $matches[1];
            } elseif (preg_match('/\b(VII|VIII|IX|X|XI|XII)\b/i', $name, $matches)) {
                $romanMap = ['VII' => 7, 'VIII' => 8, 'IX' => 9, 'X' => 10, 'XI' => 11, 'XII' => 12];
                $upper = strtoupper($matches[1]);
                if (isset($romanMap[$upper])) {
                    $grades[] = $romanMap[$upper];
                }
            }
        }

        $grades = array_values(array_unique(array_filter($grades)));
        $mainGrade = !empty($grades) ? $grades[0] : 8; // Default 8 (SMP) for SMP Negeri 1 Biau

        if ($mainGrade >= 7 && $mainGrade <= 9) {
            $levelName = 'SMP';
            $fullLevel = 'Sekolah Menengah Pertama (SMP / MTs)';
            $phase = 'Fase D';
            $age = '12 - 15 tahun';
            $gradeLabel = "Kelas {$mainGrade} SMP";
            $pedagogicalTone = 'smp';
        } elseif ($mainGrade >= 10 && $mainGrade <= 12) {
            $levelName = 'SMA';
            $fullLevel = 'Sekolah Menengah Atas (SMA / SMK / MA)';
            $phase = $mainGrade === 10 ? 'Fase E' : 'Fase F';
            $age = '15 - 18 tahun';
            $gradeLabel = "Kelas {$mainGrade} SMA";
            $pedagogicalTone = 'sma';
        } elseif ($mainGrade >= 1 && $mainGrade <= 6) {
            $levelName = 'SD';
            $fullLevel = 'Sekolah Dasar (SD / MI)';
            $phase = $mainGrade <= 2 ? 'Fase A' : ($mainGrade <= 4 ? 'Fase B' : 'Fase C');
            $age = '7 - 12 tahun';
            $gradeLabel = "Kelas {$mainGrade} SD";
            $pedagogicalTone = 'sd';
        } else {
            $levelName = 'SMP';
            $fullLevel = 'Sekolah Menengah Pertama (SMP / MTs)';
            $phase = 'Fase D';
            $age = '12 - 15 tahun';
            $gradeLabel = "Kelas {$mainGrade} SMP";
            $pedagogicalTone = 'smp';
        }

        return [
            'grade' => $mainGrade,
            'grades' => $grades,
            'level_name' => $levelName,
            'full_level' => $fullLevel,
            'phase' => $phase,
            'age_range' => $age,
            'grade_label' => $gradeLabel,
            'pedagogical_tone' => $pedagogicalTone,
        ];
    }

    /**
     * Enforce strict question type filtering and ensure even question distribution across TPs.
     * If user requested 'essay', MUST NOT contain multiple_choice questions.
     * If user requested 'multiple_choice', MUST NOT contain essay questions.
     */
    protected function enforceStrictQuestionType(
        array $rawExam,
        Collection|array $tps,
        string $subjectName,
        string $className,
        string $questionType,
        int $questionCount,
        array $tpAllocations,
        string $cognitiveLevel = 'all',
        ?array $levelInfo = null
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);
        $questions = $rawExam['questions'] ?? [];

        // Build a lookup map of question number -> TP allocation
        $allocMap = [];
        foreach ($tpAllocations as $alloc) {
            for ($n = $alloc['start_number']; $n <= $alloc['end_number']; $n++) {
                $allocMap[$n] = $alloc;
            }
        }

        if ($questionType === 'essay') {
            // Strictly remove any non-essay questions
            $questions = array_values(array_filter($questions, fn($q) => ($q['type'] ?? '') === 'essay'));
            while (count($questions) < $questionCount) {
                $num = count($questions) + 1;
                $currentAlloc = $allocMap[$num] ?? ($tpAllocations[0] ?? null);
                $targetTp = $currentAlloc ? $currentAlloc['tp'] : ($tps instanceof Collection ? $tps->first() : $tps[0]);
                $variant = $currentAlloc ? max(0, $num - $currentAlloc['start_number']) : ($num - 1);
                $q = $this->buildSingleEssayQuestion($targetTp, $subjectName, $className, $num, $cognitiveLevel, $questionCount, $variant, $levelInfo);
                if ($currentAlloc) {
                    $q['tp_code'] = $currentAlloc['tp_code'];
                    $q['material'] = $currentAlloc['content'];
                }
                $questions[] = $q;
            }
            $questions = array_slice($questions, 0, $questionCount);
        } elseif ($questionType === 'multiple_choice') {
            // Strictly remove any non-multiple_choice questions
            $questions = array_values(array_filter($questions, fn($q) => ($q['type'] ?? '') === 'multiple_choice'));

            // Deduplicate existing questions so no two questions share the same stem
            $seenStems = [];
            $uniqueQuestions = [];
            foreach ($questions as $q) {
                $sig = $this->generateStemSignature($q['question'] ?? '');
                if ($sig !== '' && !isset($seenStems[$sig])) {
                    $seenStems[$sig] = true;
                    $uniqueQuestions[] = $q;
                }
            }
            $questions = $uniqueQuestions;

            while (count($questions) < $questionCount) {
                $num = count($questions) + 1;
                $currentAlloc = $allocMap[$num] ?? ($tpAllocations[0] ?? null);
                $targetTp = $currentAlloc ? $currentAlloc['tp'] : ($tps instanceof Collection ? $tps->first() : $tps[0]);
                $variant = $currentAlloc ? max(0, $num - $currentAlloc['start_number']) : ($num - 1);
                $q = $this->buildSingleMcQuestion($targetTp, $subjectName, $className, $num, $cognitiveLevel, $questionCount, $variant, $levelInfo, $seenStems);
                if ($currentAlloc) {
                    $q['tp_code'] = $currentAlloc['tp_code'];
                    $q['material'] = $currentAlloc['content'];
                }
                $questions[] = $q;
            }
            $questions = array_slice($questions, 0, $questionCount);
        } else {
            // Mixed
            if (count($questions) < $questionCount) {
                $fallback = $this->buildPedagogicalFallback($tps, $subjectName, $className, 'mixed', $questionCount, $tpAllocations, $cognitiveLevel, $levelInfo);
                $questions = $fallback['questions'];
            }
            $questions = array_slice($questions, 0, $questionCount);
        }

        // Renumber questions sequentially 1..N and assign appropriate TP allocation
        foreach ($questions as $idx => &$q) {
            $num = $idx + 1;
            $q['number'] = $num;
            $alloc = $allocMap[$num] ?? ($tpAllocations[0] ?? null);
            if ($alloc) {
                $q['tp_code'] = $alloc['tp_code'];
                $q['material'] = $alloc['content'];
            }
        }
        unset($q);

        // Synchronize blueprint and answer keys to match the exact filtered questions
        $blueprint = [];
        $answerKeys = [];

        foreach ($questions as $q) {
            $num = $q['number'];
            $isMc = ($q['type'] ?? '') === 'multiple_choice';
            $typeLabel = $isMc ? 'Pilihan Ganda' : 'Esai / Uraian';
            $alloc = $allocMap[$num] ?? ($tpAllocations[0] ?? null);

            $tpCode = $q['tp_code'] ?? ($alloc['tp_code'] ?? 'TP');
            $material = $q['material'] ?? ($alloc['content'] ?? $subjectName);

            $blueprint[] = [
                'number' => $num,
                'tp_code' => $tpCode,
                'material' => $material,
                'indicator' => $q['indicator'] ?? "Peserta didik mampu memahami dan menganalisis materi {$material}.",
                'question_type' => $typeLabel,
                'cognitive_level' => $q['cognitive_level'] ?? ($isMc ? 'C3' : 'C4'),
            ];

            $answerKeys[] = [
                'number' => $num,
                'question_type' => $typeLabel,
                'answer' => $q['answer'] ?? ($isMc ? 'A' : 'Uraian terstruktur sesuai kriteria penilaian'),
                'explanation' => $q['explanation'] ?? 'Pembahasan materi konseptual.',
                'max_score' => $q['score'] ?? ($isMc ? 2 : 10),
            ];
        }

        return [
            'title' => $rawExam['title'] ?? 'LEMBAR SOAL ASESMEN SUMATIF OFFLINE',
            'instructions' => $rawExam['instructions'] ?? [
                'Berdoalah sebelum mulai mengerjakan soal.',
                'Tuliskan identitas Anda secara lengkap dan rapi pada kolom yang telah disediakan.',
                'Periksa dan bacalah setiap butir soal dengan saksama sebelum memberikan jawaban.',
                'Dahulukan menjawab butir soal yang Anda anggap lebih mudah.',
                'Periksa kembali kelengkapan seluruh jawaban Anda sebelum diserahkan kepada pengawas ujian.',
            ],
            'questions' => $questions,
            'blueprint' => $blueprint,
            'answer_keys' => $answerKeys,
        ];
    }

    /**
     * Call AI to generate exam questions, blueprint, and keys in structured JSON format.
     */
    protected function callAiForExam(
        Collection|array $tps,
        string $subjectName,
        string $className,
        string $questionType,
        int $questionCount,
        array $tpAllocations,
        string $cognitiveLevel = 'all',
        ?array $levelInfo = null
    ): ?array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);

        $typeInstruction = match ($questionType) {
            'essay' => "PERINGATAN KHUSUS: Jenis soal WAJIB 100% 'essay' (Esai / Uraian) sebanyak {$questionCount} nomor. DILARANG KERAS menghasilkan soal pilihan ganda ataupun opsi A/B/C/D!",
            'mixed' => "Jenis soal adalah 'mixed' (Campuran Pilihan Ganda & Esai) dengan total {$questionCount} nomor (misal 70% Pilihan Ganda, 30% Esai).",
            default => "PERINGATAN KHUSUS: Jenis soal WAJIB 100% 'multiple_choice' (Pilihan Ganda 4 Opsi: A, B, C, D) sebanyak {$questionCount} nomor. DILARANG KERAS menghasilkan soal esai!",
        };

        $levelGuideline = match ($levelInfo['pedagogical_tone'] ?? 'smp') {
            'smp' => "TINGKAT PENDIDIKAN SASARAN: {$levelInfo['grade_label']} ({$levelInfo['full_level']}, {$levelInfo['phase']}, Usia Siswa ~{$levelInfo['age_range']}).\n"
                . "- WAJIB menggunakan bahasa Indonesia yang ramah, komunikatif, lugas, dan sesuai tingkat pemikiran siswa SMP.\n"
                . "- DILARANG KERAS menggunakan istilah atau narasi yang terlalu rumit/berat seperti tingkat SMA atau Perguruan Tinggi (HINDARI frasa berat seperti: 'kendala sistemik', 'dinamika sistem', 'asumsi dasar filosofis', 'ketidakselarasan mekanisme pelaksanaan').\n"
                . "- Sajikan stimulus persoalan yang dekat dan konkret dengan kehidupan siswa SMP (kegiatan belajar di sekolah, praktik di lab komputer, memakai smartphone/komputer, tugas kelompok, dll).",
            'sd' => "TINGKAT PENDIDIKAN SASARAN: {$levelInfo['grade_label']} ({$levelInfo['full_level']}, {$levelInfo['phase']}, Usia Siswa ~{$levelInfo['age_range']}).\n"
                . "- WAJIB menggunakan kalimat pendek, kosakata sederhana, konkret, dan mudah dipahami anak usia SD.",
            default => "TINGKAT PENDIDIKAN SASARAN: {$levelInfo['grade_label']} ({$levelInfo['full_level']}, {$levelInfo['phase']}, Usia Siswa ~{$levelInfo['age_range']}).\n"
                . "- Gunakan analisis konseptual komprehensif, penalaran logis formal, dan pemecahan kasus yang sesuai untuk tingkat SMA/SMK.",
        };

        $cognitiveInstruction = match ($cognitiveLevel) {
            'lots' => "TINGKAT KOGNITIF: WAJIB Level 1 - LOTS (C1-C2 / Mengingat & Memahami). Gunakan bahasa yang sederhana, mudah dipahami siswa, pertanyaan langsung/lugas, kenalkan istilah & definisi dasar, dan HINDARI kalimat yang berbelit-belit atau terlalu rumit.",
            'mots' => "TINGKAT KOGNITIF: WAJIB Level 2 - MOTS (C3 / Menerapkan & Aplikasi). Fokus pada prosedur langkah kerja, contoh konkret harian, dan penerapan aturan materi pada situasi nyata sekolah/rumah.",
            'hots' => "TINGKAT KOGNITIF: WAJIB Level 3 - HOTS (C4-C6 / Menganalisis, Mengevaluasi, Pemecahan Masalah). Sajikan stimulus kasus konkret yang menuntut penalaran siswa sesuai jenjangnya.",
            default => "TINGKAT KOGNITIF: Campuran Proporsional Kurikulum Merdeka (sekitar 30% LOTS C1-C2 pada nomor-nomor awal, 50% MOTS C3 pada nomor tengah, dan 20% HOTS C4-C5 pada nomor akhir).",
        };

        $tpAllocationsText = "";
        foreach ($tpAllocations as $alloc) {
            $tpAllocationsText .= "- [{$alloc['tp_code']}] {$alloc['description']} -> Dialokasikan {$alloc['count']} Butir Soal (Nomor {$alloc['start_number']} s/d {$alloc['end_number']})\n";
        }

        $prompt = <<<PROMPT
Anda adalah ahli penyusun instrumen asesmen dan kurikulum Kurikulum Merdeka untuk jenjang sekolah di Indonesia.
Tolong buatkan perangkat soal asesmen pembelajaran offline cetak lengkap berdasarkan Tujuan Pembelajaran (TP) yang telah dibagi rata:

INFORMASI UJIAN:
- Mata Pelajaran: {$subjectName}
- Sasaran Siswa: {$className} ({$levelInfo['grade_label']} / {$levelInfo['phase']})
- Jenjang Pendidikan: {$levelInfo['full_level']}
- Bentuk Soal: {$questionType} ({$typeInstruction})
- Tingkat Kognitif / Kesulitan: {$cognitiveInstruction}
- Total Butir Soal: {$questionCount} Nomor

BATASAN BAHASA & TINGKAT KESULITAN SISWA (MUTLAK):
{$levelGuideline}

DAFTAR TUJUAN PEMBELAJARAN (TP) DAN PEMBAGIAN RATA BUTIR SOAL:
{$tpAllocationsText}

ATURAN WAJIB & SANGAT KETAT:
1. Pastikan total soal di array 'questions' tepat {$questionCount} butir.
2. Butir soal WAJIB dibagi rata sesuai rentang nomor alokasi masing-masing TP di atas.
3. Cantumkan kode TP ('tp_code') pada setiap butir soal di 'questions' dan 'blueprint'.
4. PEDOMAN REDAKSI BUTIR PERTANYAAN (MUTLAK):
   a. SOAL DITUJUKAN LANGSUNG KEPADA SISWA: Gunakan bahasa yang komunikatif, ramah, dan mudah dipahami siswa (gunakan kata sapaan "kamu" untuk tingkat SMP / "Anda" untuk tingkat SMA).
   b. FOKUS TUNGGAL & DILARANG MEMBUAT PERTANYAAN GANDA/BERCABANG:
      - Setiap butir soal HANYA boleh menanyakan 1 (satu) pertanyaan atau 1 (satu) instruksi pokok saja.
      - DILARANG KERAS membuat pertanyaan ganda dalam satu butir soal (misalnya DILARANG: "Jelaskan... serta sebutkan...", "Apa... lalu bagaimana...", atau memiliki 2 tanda tanya dalam satu nomor).
      - Fokus pada SATU hal saja: minta penjelasan SAJA, atau sebutkan contoh SAJA, atau sebutkan bagian/tahapan SAJA!
   c. PENYEDERHANAAN TOPIK DAN BAHASA ALAMI (JANGAN SEPERTI ROBOT):
      - DILARANG KERAS mengulang-ulang seluruh teks deskripsi TP yang panjang secara kaku pada setiap butir soal!
      - Sederhanakan topik materi sesuai konteks pertanyaan. Contoh:
        * Jika TP adalah "menjelaskan cara kerja dan interaksi antar komponen sistem komputer dalam memproses data melalui siklus input-proses-output", sederhanakan menjadi topik intinya: "cara kerja dan interaksi antar komponen sistem komputer" (contoh: "Jelaskan bagaimana cara kerja dan interaksi antar komponen sistem komputer dengan bahasamu sendiri!").
        * Jika TP adalah "mendiseminasikan konten digital hasil buatannya di platform publik virtual dengan menerapkan prinsip keamanan data dan etika kewargaan digital", sederhanakan menjadi topik intinya: "publikasi konten digital" atau "konten digital" (contoh: "Tujuan utama kita mempelajari materi publikasi konten digital di sekolah adalah agar kita bisa...").
      - Potong anak kalimat kualifikasi kurikulum yang terlalu panjang ("dalam memproses...", "untuk memecahkan masalah...", "dalam konteks...", "secara tepat...", "hasil buatannya...", "di platform publik virtual dengan menerapkan...", dll.) agar redaksi soal terdengar alami seperti naskah ujian resmi buatan guru.
   d. JANGAN PERNAH menyalin mentah-mentah frasa kurikulum seperti "Peserta didik mampu..." atau "Peserta didik dapat..." ke dalam kalimat soal.
   e. DILARANG KERAS menyisipkan teks artifisial seperti "(soal nomor X)!" pada kalimat soal.
   f. Jika sebuah TP dialokasikan lebih dari 1 butir soal, setiap butir soal pada TP tersebut WAJIB menguji aspek materi yang BERBEDA (contoh: butir 1 fokus alur/konsep, butir 2 fokus manfaat, butir 3 fokus komponen/bagian, butir 4 fokus contoh penerapan sehari-hari, butir 5 fokus langkah kerja). DILARANG KERAS membuat soal kembar atau berulang dengan redaksi yang sama!
   g. KHUSUS SOAL PILIHAN GANDA (PG):
      - Pilihan jawaban (opsi A, B, C, D) WAJIB DISESUAIKAN DENGAN TINGKAT KOGNITIF YANG DIPILIH GURU:
        * Jika Level LOTS (C1/C2): Opsi jawaban menguji pemahaman definisi, karakteristik, atau fungsi pokok materi secara langsung.
        * Jika Level MOTS (C3): Opsi jawaban berupa tindakan operasional / langkah kerja nyata siswa saat mempraktikkan konsep materi.
        * Jika Level HOTS (C4/C5/C6): Opsi jawaban berupa analisis pemecahan masalah (troubleshooting), identifikasi akar penyebab kendala, atau evaluasi kritis terhadap solusi/karya.
      - DILARANG KERAS mengulang-ulang teks materi atau deskripsi TP yang panjang pada setiap opsi jawaban A, B, C, D! Sekali topik sudah disebutkan pada kalimat stem pertanyaan, pilihan A, B, C, D langsung menyatakan substansi jawaban secara lugas, ringkas, dan jelas.
      - Kalimat stem pertanyaan maupun pilihan jawaban (opsi A, B, C, D) WAJIB sederhana, ramah, dan mudah dipahami siswa seperti halnya soal esai.
      - DILARANG KERAS menggunakan frasa abstrak atau kaku bergaya buku panduan teknis pada opsi jawaban (seperti: "bentuk penerapan dasar...", "pengenalan konsep secara utuh dan sistematis", "pedoman normatif", dll.).
      - Pilihan jawaban harus singkat, konkret, jelas, dan menyajikan tindakan/pemahaman riil yang biasa didengar dan dialami siswa di kelas.
   h. SOAL WAJIB LUGAS TERKAIT INTI MATERI PEMBELAJARAN (BUKAN DAMPAK/SIKAP BELAJAR):
      - Soal dan pilihan jawaban WAJIB menanyakan langsung substansi ilmu, fakta, konsep teknis, alur kerja, fungsi komponen, istilah kunci, keamanan, atau pemecahan masalah materi tersebut.
      - DILARANG KERAS membuat soal tentang motivasi belajar atau sikap belajar umum di sekolah (contoh yang DILARANG: "Tujuan mempelajari materi ini di sekolah agar kita mandiri...", "Sikap saat bekerja sama di kelas...", "Mencari jalan pintas belajar...", dll.). Semua soal harus menguji penguasaan materi pelajaran secara lugas!
   i. DILARANG KERAS MEMBUAT SOAL KEMBAR / DUPLIKAT (MUTLAK):
      - Setiap butir soal dari nomor 1 sampai selesai WAJIB memiliki kalimat pertanyaan (stem) dan pilihan jawaban yang 100% unik dan berbeda satu sama lain.
      - DILARANG KERAS mengulang kalimat soal atau opsi jawaban yang sama persis di nomor lain!
5. RINCIAN KUNCI JAWABAN & RUBRIK (WAJIB SANGAT LENGKAP & JELAS):
   - Untuk Pilihan Ganda (PG):
     Field 'explanation' WAJIB memuat:
     a) Analisis Opsi Benar: Analisis/alasan mengapa opsi jawaban yang dipilih benar secara konsep.
     b) Analisis Opsi Pengecoh: Analisis pengecoh mengapa opsi jawaban lainnya salah/kurang tepat.
   - Untuk Esai / Uraian:
     a) Field 'answer' WAJIB diawali dengan 'Kriteria Model Jawaban Lengkap:' dan memuat poin-poin esensial jawaban.
     b) Field 'explanation' WAJIB diawali dengan 'Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):' memuat pedoman/rubrik penskoran analitik berjenjang (Skor 9 - 10 Sangat Baik, Skor 6 - 8 Baik, Skor 3 - 5 Cukup, Skor 1 - 2 Perlu Bimbingan, Skor 0 Tidak Menjawab).

Keluaran WAJIB berupa JSON murni (tanpa pembuka/penutup markdown seperti ```json atau ```) dengan format struktur berikut:
{
  "title": "LEMBAR SOAL ASESMEN SUMATIF OFFLINE",
  "instructions": [
    "Berdoalah sebelum mulai mengerjakan soal.",
    "Tuliskan identitas Anda secara lengkap pada lembar yang telah disediakan.",
    "Bacalah setiap butir soal dengan teliti dan cermat sebelum menjawab.",
    "Dahulukan menjawab soal-soal yang Anda anggap lebih mudah.",
    "Periksa dan teliti kembali pekerjaan Anda sebelum diserahkan kepada pengawas."
  ],
  "questions": [
    {
      "number": 1,
      "tp_code": "TP-1",
      "type": "multiple_choice",
      "question": "Kalimat butir pertanyaan...",
      "options": {
        "A": "Pilihan A",
        "B": "Pilihan B",
        "C": "Pilihan C",
        "D": "Pilihan D"
      },
      "answer": "B",
      "explanation": "Kunci: B.\\nPembahasan Rinci:\\n1. Analisis Opsi Benar (B): ...\\n2. Analisis Opsi Pengecoh: Opsi A, C, D salah karena ...",
      "indicator": "Disajikan konteks, peserta didik mampu...",
      "cognitive_level": "C3",
      "score": 2
    }
  ],
  "blueprint": [
    {
      "number": 1,
      "tp_code": "TP-1",
      "material": "Materi...",
      "indicator": "Disajikan konteks, peserta didik mampu...",
      "question_type": "Pilihan Ganda",
      "cognitive_level": "C3"
    }
  ],
  "answer_keys": [
    {
      "number": 1,
      "question_type": "Pilihan Ganda",
      "answer": "B",
      "explanation": "Pembahasan lengkap...",
      "max_score": 2
    }
  ]
}
PROMPT;

        try {
            $provider = $this->aiManager->getActiveProvider();
            if (!$provider->isConfigured()) {
                Log::info('AI Provider not configured, skipping AI generation for offline exam.');
                return null;
            }
            $rawResponse = $provider->generateContent($prompt);

            if (!$rawResponse) {
                return null;
            }

            // Clean code fences if present
            $cleaned = trim($rawResponse);
            if (str_starts_with($cleaned, '```json')) {
                $cleaned = substr($cleaned, 7);
            } elseif (str_starts_with($cleaned, '```')) {
                $cleaned = substr($cleaned, 3);
            }
            if (str_ends_with($cleaned, '```')) {
                $cleaned = substr($cleaned, 0, -3);
            }
            $cleaned = trim($cleaned);

            $decoded = json_decode($cleaned, true);
            if (is_array($decoded) && !empty($decoded['questions'])) {
                return $decoded;
            }
        } catch (\Throwable $e) {
            Log::warning('AI generate offline exam error: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Deterministic pedagogical question builder when AI is unavailable or offline.
     * Guarantees exact equal division of questions across the selected TPs and adheres to selected cognitive level.
     */
    protected function buildPedagogicalFallback(
        Collection|array $tps,
        string $subjectName,
        string $className,
        string $questionType,
        int $questionCount,
        array $tpAllocations,
        string $cognitiveLevel = 'all',
        ?array $levelInfo = null
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);
        $questions = [];
        $usedStems = [];

        foreach ($tpAllocations as $alloc) {
            $currentTp = $alloc['tp'];
            $countForThisTp = $alloc['count'];
            $startNum = $alloc['start_number'];

            if ($questionType === 'essay') {
                for ($n = 0; $n < $countForThisTp; $n++) {
                    $qNum = $startNum + $n;
                    $q = $this->buildSingleEssayQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
            } elseif ($questionType === 'multiple_choice') {
                for ($n = 0; $n < $countForThisTp; $n++) {
                    $qNum = $startNum + $n;
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo, $usedStems);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
            } else {
                // Mixed: proportion within this TP's allocation
                $essayForTp = max(1, (int) round($countForThisTp * 0.3));
                $mcForTp = $countForThisTp - $essayForTp;
                for ($n = 0; $n < $mcForTp; $n++) {
                    $qNum = $startNum + $n;
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo, $usedStems);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
                for ($n = 0; $n < $essayForTp; $n++) {
                    $qNum = $startNum + $mcForTp + $n;
                    $q = $this->buildSingleEssayQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
            }
        }

        // Renumber questions sequentially 1..N
        foreach ($questions as $idx => &$q) {
            $q['number'] = $idx + 1;
        }
        unset($q);

        // Build blueprint and answer keys from generated questions
        $blueprint = [];
        $answerKeys = [];

        foreach ($questions as $q) {
            $num = $q['number'];
            $isMc = ($q['type'] ?? '') === 'multiple_choice';
            $typeLabel = $isMc ? 'Pilihan Ganda' : 'Esai / Uraian';

            $blueprint[] = [
                'number' => $num,
                'tp_code' => $q['tp_code'] ?? 'TP',
                'material' => $q['material'] ?? $subjectName,
                'indicator' => $q['indicator'] ?? "Peserta didik mampu memahami dan menyelesaikan persoalan materi {$subjectName}.",
                'question_type' => $typeLabel,
                'cognitive_level' => $q['cognitive_level'] ?? ($isMc ? 'C3' : 'C4'),
            ];

            $answerKeys[] = [
                'number' => $num,
                'question_type' => $typeLabel,
                'answer' => $q['answer'] ?? ($isMc ? 'A' : 'Uraian terstruktur sesuai kriteria penilaian'),
                'explanation' => $q['explanation'] ?? 'Pembahasan materi konseptual.',
                'max_score' => $q['score'] ?? ($isMc ? 2 : 10),
            ];
        }

        return [
            'title' => 'LEMBAR SOAL ASESMEN SUMATIF OFFLINE',
            'instructions' => [
                'Berdoalah sebelum mulai mengerjakan soal.',
                'Tuliskan identitas Anda secara lengkap dan rapi pada kolom yang telah disediakan.',
                'Periksa dan bacalah setiap butir soal dengan saksama sebelum memberikan jawaban.',
                'Dahulukan menjawab butir soal yang Anda anggap lebih mudah.',
                'Periksa kembali kelengkapan seluruh jawaban Anda sebelum diserahkan kepada pengawas ujian.',
            ],
            'questions' => $questions,
            'blueprint' => $blueprint,
            'answer_keys' => $answerKeys,
        ];
    }

    /**
     * Parse and analyze a learning objective (TP), extracting:
     * - 'cleaned_description': without "Peserta didik mampu..."
     * - 'full_concept': full topic description without operational verb
     * - 'concept': natural simplified head topic (stripped of trailing prepositional qualification clauses)
     * - 'core_noun': concise core subject noun phrase (e.g. "sistem komputer", "berpikir komputasional")
     * - 'verb': operational verb (e.g. "menjelaskan")
     * - 'sub_topics': parenthetical or sub-clause details
     */
    protected function analyzeTp(LmsLearningObjective $tp, string $subjectName = ''): array
    {
        $rawDesc = trim($tp->description ?? '');
        $rawContent = trim($tp->content ?? '');

        // 1. Clean boilerplate curriculum prefixes (e.g. "Peserta didik mampu...", "Siswa diharapkan dapat...", dll)
        $cleanedDesc = preg_replace('/^(diharapkan\s+)?(peserta\s+didik|siswa|murid)\s+(mampu|dapat|diharapkan\s+mampu|diharapkan\s+dapat)\s+/iu', '', $rawDesc);
        $cleanedDesc = preg_replace('/^(mampu|dapat)\s+/iu', '', $cleanedDesc);
        $cleanedDesc = trim($cleanedDesc, " \t\n\r\0\x0B.,:;");

        // 2. Extract parenthetical details if present, e.g. "(dekomposisi, pengenalan pola, abstraksi, algoritma)"
        $subTopics = [];
        if (preg_match('/\(([^)]+)\)/u', $cleanedDesc, $matches)) {
            $rawSub = $matches[1];
            $parts = preg_split('/,|(\bdan\b)|;/iu', $rawSub);
            foreach ($parts as $p) {
                $p = trim($p);
                if (mb_strlen($p) >= 3) {
                    $subTopics[] = $p;
                }
            }
        }

        // 3. Operational verb
        $verb = 'memahami';
        $verbList = 'menjelaskan|mengidentifikasi|menganalisis|memahami|menerapkan|mengevaluasi|menguraikan|'
            . 'mempraktikkan|mendeskripsikan|merancang|menyusun|membedakan|memproduksi|membuat|'
            . 'mengembangkan|mengoperasikan|menggunakan|mengolah|menghasilkan|menampilkan|menyajikan|'
            . 'membangun|memilih|menentukan|mengkaji|menelaah|mendiseminasikan|mempublikasikan|'
            . 'menyebarkan|membagikan|mengunggah|mengunduh|menginstal|mengonfigurasi|mengamankan|'
            . 'mengakses|mengomunikasikan|mengeksplorasi|mengintegrasikan|mengaitkan|menghubungkan|'
            . 'berbagi|mempresentasikan|mengenal|mempelajari';
        $verbPattern = '/^(?:' . $verbList . '|me[a-z]{3,}(?:kan|i)?)\b/iu';
        if (preg_match($verbPattern, $cleanedDesc, $vMatch)) {
            $verb = mb_strtolower($vMatch[0]);
        }

        // 4. Determine pure topic concept (without operational verbs)
        if ($rawContent !== '') {
            $fullConcept = trim($rawContent, " \t\n\r\0\x0B.,:;");
        } else {
            // Strip leading operational verbs (including compound ones like "memahami dan menerapkan")
            $stripVerbsPattern = '/^(?:' . $verbList . '|me[a-z]{3,}(?:kan|i)?)(?:\s+(?:dan|serta|lalu)\s+(?:' . $verbList . '|me[a-z]{3,}(?:kan|i)?))?\s+/iu';
            $fullConcept = preg_replace($stripVerbsPattern, '', $cleanedDesc);
            $fullConcept = trim($fullConcept, " \t\n\r\0\x0B.,:;");
            if ($fullConcept === '') {
                $fullConcept = $cleanedDesc ?: ($subjectName ?: 'materi pembelajaran');
            }
        }

        // 5. Natural Simplification: Cut off overly long trailing prepositional qualification clauses
        // e.g. "dalam memproses data melalui siklus input-proses-output", "hasil buatannya di platform publik virtual...", "dengan menerapkan prinsip..."
        $qualifierPattern = '/\s*,?\s+(?:'
            . 'dengan\b.*|'
            . 'di\s+(?:platform|media|lingkungan|jejaring|internet|web|dunia\s+maya|komputer|laboratorium|sekolah|kelas|kehidupan|masyarakat)\b.*|'
            . 'pada\s+(?:platform|media|lingkungan|jejaring|internet|web|perangkat|sistem|kehidupan|masyarakat)\b.*|'
            . 'hasil\s+(?:buatannya|karya|cipta|proyek|tugas|kerja)\b.*|'
            . 'dalam\s+(?:memproses|menyelesaikan|menerapkan|melakukan|menganalisis|mengembangkan|memecahkan|pemecahan|kehidupan|konteks|kegiatan|praktik|lingkungan|berbagai|berkomunikasi)\b.*|'
            . 'untuk\s+(?:memecahkan|menyelesaikan|membantu|mencapai|menghasilkan|menjaga|meningkatkan|mendukung|memenuhi)\b.*|'
            . 'melalui\s+(?:siklus|proses|tahapan|kegiatan|pendekatan|media|jaringan)\b.*|'
            . 'secara\s+(?:tepat|kritis|mandiri|kreatif|bertanggung\s+jawab|efektif|lengkap|logis|sistematis|terstruktur|menarik|aman|berkala|runtut)\b.*|'
            . 'yang\s+(?:menggabungkan|memadukan|melibatkan|berkaitan|berhubungan|berbasis|memuat|berisi|menggunakan|memanfaatkan|terdiri|mengintegrasikan)\b.*|'
            . 'berdasarkan\s+.*|'
            . 'sesuai\s+(?:dengan\s+)?(?:kaidah|aturan|petunjuk|kriteria|standar|panduan)\b.*'
            . ')$/iu';
        $headConcept = preg_replace($qualifierPattern, '', $fullConcept);
        $headConcept = trim($headConcept, " \t\n\r\0\x0B.,:;");
        if ($headConcept === '' || mb_strlen($headConcept) < 4) {
            $headConcept = $fullConcept;
        }

        // 6. Extract concise core noun phrase (for natural sentences like "materi X", "manfaat X")
        $coreNoun = $headConcept;
        if (preg_match('/^(?:cara kerja dan interaksi antar komponen|cara kerja dan interaksi|interaksi antar komponen|komponen dan cara kerja|cara kerja|alur kerja|proses kerja|interaksi)\s+(.+)/iu', $headConcept, $m)) {
            $coreNoun = $m[1];
        } elseif (preg_match('/^(?:prinsip-prinsip|prinsip dasar|prinsip|konsep dasar|konsep|mekanisme|pengertian dasar|pengertian|karakteristik|penerapan|penggunaan|implementasi|pembuatan|produksi)\s+(.+)/iu', $headConcept, $m)) {
            $coreNoun = $m[1];
        }
        $coreNoun = preg_replace('/^(?:cara\s+(?:kerja|membuat|menggunakan|mengoperasikan|merancang)\s+|proses\s+(?:pembuatan|produksi|pengolahan)\s+|pembuatan\s+|produksi\s+)/iu', '', $coreNoun);
        $coreNoun = trim($coreNoun, " \t\n\r\0\x0B.,:;");

        // Convert dissemination / publication action verbs into friendly noun phrase
        if (preg_match('/^(?:mendiseminasikan|mempublikasikan|menyebarkan|membagikan|mengunggah)/i', $verb) && !preg_match('/^publikasi/i', $coreNoun)) {
            $coreNoun = 'publikasi ' . $coreNoun;
        }

        // If coreNoun still exceeds 4 words, extract first 3-4 words for student ergonomics
        $words = preg_split('/\s+/u', $coreNoun);
        if (count($words) > 4) {
            $coreNoun = implode(' ', array_slice($words, 0, 4));
        }

        if ($coreNoun === '') {
            $coreNoun = $headConcept;
        }

        return [
            'raw_description' => $rawDesc,
            'cleaned_description' => $cleanedDesc,
            'full_concept' => $fullConcept,
            'concept' => $headConcept,
            'head_concept' => $headConcept,
            'core_noun' => $coreNoun,
            'verb' => $verb,
            'sub_topics' => $subTopics,
        ];
    }

    protected function detectTpDomain(array $analysis, string $subjectName): string
    {
        $haystack = mb_strtolower(
            ($analysis['raw_description'] ?? '') . ' ' .
            ($analysis['cleaned_description'] ?? '') . ' ' .
            ($analysis['full_concept'] ?? '') . ' ' .
            ($analysis['concept'] ?? '') . ' ' .
            ($analysis['core_noun'] ?? '') . ' ' .
            $subjectName
        );

        // 1. Digital Security, Privacy & Ethics (check first so TP with security & ethics takes precedence)
        if (preg_match('/(?:keamanan|etika|kewargaan\s+digital|privasi|jejak\s+digital|cyber|siber|phishing|hoaks|hak\s+cipta|haki|lisensi|password|kata\s+sandi|perlindungan\s+data|data\s+pribadi)/iu', $haystack)) {
            return 'security_ethics';
        }

        // 2. Digital Content, Multimedia, Presentation & Graphic Design
        if (preg_match('/(?:konten\s+digital|konten|multimedia|desain\s+presentasi|presentasi|visual|infografis|video|audio|gambar|publikasi|diseminasi|poster|grafis|teks\s+dan\s+data)/iu', $haystack)) {
            return 'digital_content';
        }

        // 3. Computer Systems, Hardware, Architecture & Input-Process-Output
        if (preg_match('/(?:sistem\s+komputer|komponen\s+komputer|perangkat\s+keras|hardware|perangkat\s+lunak|software|input-proses-output|siklus\s+input|input|proses|output|cpu|processor|prosesor|ram|motherboard|storage|memori)/iu', $haystack)) {
            return 'computer_system';
        }

        // 4. Algorithm & Programming / Computational Thinking
        if (preg_match('/(?:algoritma|pemrograman|coding|koding|program|flowchart|bagan\s+alir|pseudocode|variabel|percabangan|perulangan|looping|struktur\s+kontrol|debugging|berpikir\s+komputasional)/iu', $haystack)) {
            return 'algorithm_coding';
        }

        // 5. Data Analysis, Spreadsheet & Visualization
        if (preg_match('/(?:analisis\s+data|pengolahan\s+data|spreadsheet|lembar\s+sebar|excel|tabel|grafik|chart|rumus|fungsi\s+sum|average|filter|sorting|basis\s+data|database)/iu', $haystack)) {
            return 'data_analysis';
        }

        // 6. Computer Network & Internet
        if (preg_match('/(?:jaringan|internet|intranet|wifi|wi-fi|lan|ip\s+address|protokol|browser|peramban|web|url|surel|email|modem|router)/iu', $haystack)) {
            return 'network_internet';
        }

        return 'generic';
    }

public function generateStemSignature(string $stem): string
    {
        $normalized = mb_strtolower(strip_tags($stem));
        $normalized = (string) preg_replace('/^\[[^\]]+\]\s*/u', '', $normalized);
        $normalized = (string) preg_replace('/^\d+[\.\)]\s*/u', '', $normalized);
        $normalized = (string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $normalized);
        return trim($normalized);
    }

    protected function interpolateAnglePlaceholders(array $angle, string $coreNoun, string $subLevel, string $subjectName): array
    {
        $search = ['{$coreNoun}', '{$subLevel}', '{$subjectName}'];
        $replace = [$coreNoun, $subLevel, $subjectName];
        foreach ($angle as $k => $v) {
            if (is_string($v)) {
                $angle[$k] = str_replace($search, $replace, $v);
            } elseif (is_array($v)) {
                $angle[$k] = array_map(fn($item) => is_string($item) ? str_replace($search, $replace, $item) : $item, $v);
            }
        }
        return $angle;
    }

    protected function getDomainMcAngles(
        string $domain,
        string $effectiveLevel,
        bool $isSmp,
        string $coreNoun,
        string $subjectName,
        string $subLevel = 'C1'
    ): array {
        return match ($domain) {
            'digital_content' => $this->getDigitalContentAngles($effectiveLevel),
            'security_ethics' => $this->getSecurityEthicsAngles($effectiveLevel),
            'computer_system' => $this->getComputerSystemAngles($effectiveLevel),
            'algorithm_coding' => $this->getAlgorithmCodingAngles($effectiveLevel),
            'data_analysis' => $this->getDataAnalysisAngles($effectiveLevel),
            'network_internet' => $this->getNetworkInternetAngles($effectiveLevel),
            default => $this->getGenericMcAngles($effectiveLevel),
        };
    }

    protected function getDigitalContentAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Format berkas di bawah ini yang paling tepat digunakan untuk menyimpan dokumen siap cetak agar tata letak (layout) teks dan gambar tidak berubah adalah...',
                        'correct' => 'PDF (.pdf)',
                        'distractors' => [
                            'TXT (.txt)',
                            'BMP (.bmp)',
                            'HTML (.html)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi format publikasi dokumen standar PDF.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Format PDF mengunci tata letak, tipografi, dan elemen visual secara konsisten di berbagai perangkat.',
                        'explanation_distractors' => 'Format TXT tidak memuat tata letak, sedangkan HTML dan BMP kurang tepat untuk dokumen siap cetak.',
                    ],
                    [
                        'stem' => 'Prinsip utama dalam pemilihan warna teks pada slide presentasi agar mudah dibaca oleh penonton dari kejauhan adalah...',
                        'correct' => 'Memiliki kontras warna yang tinggi antara warna teks dan warna latar belakang slide.',
                        'distractors' => [
                            'Menggunakan warna teks yang sama persis dengan warna latar belakang.',
                            'Memadukan minimal delapan warna cerah berbeda pada setiap baris kalimat.',
                            'Menggunakan teks berukuran sangat kecil dengan warna abu-abu redup.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi prinsip kontras warna teks dan latar.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Kontras yang tinggi (seperti teks gelap di latar terang atau sebaliknya) menjamin keterbacaan optimal.',
                        'explanation_distractors' => 'Pilihan lainnya membuat teks menyatu dengan latar atau melelahkan mata pembaca.',
                    ],
                    [
                        'stem' => 'Elemen konten digital visual yang paling tepat digunakan untuk menyajikan perbandingan data angka secara ringkas dan menarik adalah...',
                        'correct' => 'Grafik atau diagram visual.',
                        'distractors' => [
                            'Paragraf teks yang sangat panjang tanpa tanda titik.',
                            'Rekaman suara audio tanpa tampilan visual.',
                            'Kumpulan tabel angka mentah tanpa judul kolom.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih elemen visual grafik untuk data angka.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Grafik memvisualisasikan data kuantitatif menjadi pola visual yang mudah dan cepat dicerna oleh mata.',
                        'explanation_distractors' => 'Paragraf panjang atau tabel mentah membutuhkan waktu lama untuk dipahami pembaca.',
                    ],
                    [
                        'stem' => 'Tujuan utama penataan hierarki visual (judul utama besar, subjudul sedang, dan teks isi proporsional) dalam media presentasi adalah...',
                        'correct' => 'Membantu audiens mengenali urutan informasi penting dari poin utama hingga ke rincian pendukung.',
                        'distractors' => [
                            'Membuat ukuran tulisan di seluruh lembar slide menjadi seragam tanpa penekanan.',
                            'Memenuhi seluruh bidang slide agar tidak menyisakan ruang kosong.',
                            'Mengaburkan fokus perhatian pembaca agar membaca secara acak.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi urutan bobot visual pada presentasi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Hierarki visual memandu arah pandang audiens dalam menyerap informasi secara berjenjang dan logis.',
                        'explanation_distractors' => 'Ukuran seragam atau slide yang terlalu padat menyulitkan audiens menangkap poin utama.',
                    ],
                    [
                        'stem' => 'Format berkas gambar yang mendukung latar belakang transparan (transparent background) pada desain grafis adalah...',
                        'correct' => 'PNG (.png)',
                        'distractors' => [
                            'JPEG (.jpg)',
                            'MP3 (.mp3)',
                            'CSV (.csv)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi format gambar beralur transparansi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Format PNG memiliki kanal alfa (alpha channel) yang memungkinkan penyimpanan gambar berlatar transparan.',
                        'explanation_distractors' => 'JPEG selalu mengisi latar kosong dengan warna pekat, sedangkan MP3 dan CSV bukan berkas gambar.',
                    ],
                    [
                        'stem' => 'Ciri desain slide presentasi yang terstruktur dan nyaman dipandang adalah...',
                        'correct' => 'Memiliki tata letak elemen yang konsisten, jarak antarelemen yang rapi, dan informasi yang terfokus.',
                        'distractors' => [
                            'Memuat semua kalimat dari buku teks secara lengkap tanpa diringkas.',
                            'Menggunakan gambar latar belakang yang ramai sehingga teks sulit dibaca.',
                            'Menggunakan huruf hiasan yang berliku-liku untuk seluruh paragraf.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali ciri tata letak terstruktur pada slide presentasi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Konsistensi tata letak dan kebersihan ruang visual menciptakan fokus pemahaman bagi penonton.',
                        'explanation_distractors' => 'Pilihan lainnya menurunkan mutu estetika dan mempersulit pemahaman audiens.',
                    ],
                    [
                        'stem' => 'Format berkas grafis berbasis vektor yang tidak akan pecah atau buram saat diperbesar hingga ukuran raksasa adalah...',
                        'correct' => 'SVG (.svg)',
                        'distractors' => [
                            'BMP (.bmp)',
                            'GIF (.gif)',
                            'JPG (.jpg)',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali keunggulan format grafis vektor SVG.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Format vektor (SVG) disimpan sebagai persamaan matematis garis dan kurva sehingga skalabel tanpa kehilangan ketajaman.',
                        'explanation_distractors' => 'BMP, GIF, dan JPG adalah format raster (berbasis piksel) yang akan pecah bila diperbesar melebihi resolusi aslinya.',
                    ],
                    [
                        'stem' => 'Pengertian prinsip \'white space\' (ruang kosong) dalam tata letak desain visual adalah...',
                        'correct' => 'Area kosong di sekitar teks dan elemen gambar yang sengaja dibiarkan agar desain tidak terasa sesak.',
                        'distractors' => [
                            'Kertas putih polos yang belum pernah dimasukkan ke dalam mesin cetak.',
                            'Kesalahan teknis saat gambar gagal dimuat oleh aplikasi komputer.',
                            'Ruangan khusus yang digunakan guru untuk mencetak soal ulangan.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan prinsip white space dalam desain grafis.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'White space memberi ruang napas visual sehingga mata audiens dapat fokus mencerna informasi pokok dengan nyaman.',
                        'explanation_distractors' => 'Pilihan lainnya adalah pengertian fisik kertas atau kesalahan teknis yang keliru.',
                    ],
                    [
                        'stem' => 'Keluarga jenis huruf (font) yang tidak memiliki kait di ujung garis hurufnya sehingga sangat mudah dibaca pada layar monitor adalah...',
                        'correct' => 'Sans-serif.',
                        'distractors' => [
                            'Serif.',
                            'Script dekoratif.',
                            'Gothic kuno.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi karakteristik jenis huruf Sans-serif.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Font Sans-serif (seperti Arial, Calibri, Segoe UI) tidak berkait, menghasilkan garis bersih yang tajam pada resolusi layar digital.',
                        'explanation_distractors' => 'Serif memiliki kait kecil di ujung huruf, script meniru tulisan tangan sambung, dan gothic sulit dibaca cepat.',
                    ],
                    [
                        'stem' => 'Aturan \'Rule of Thirds\' dalam komposisi desain dan fotografi membagi bidang gambar menjadi sembilan bagian dengan tujuan...',
                        'correct' => 'Menempatkan titik fokus objek utama pada persimpangan garis agar komposisi terlihat lebih dinamis dan alami.',
                        'distractors' => [
                            'Memotong gambar menjadi tiga bagian untuk dibagikan kepada tiga orang berbeda.',
                            'Menghapus dua pertiga isi gambar agar ukuran file menjadi sepertiga.',
                            'Membuat gambar terlihat miring sebesar tiga puluh derajat.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan prinsip komposisi Rule of Thirds.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Titik potong pada kisi Rule of Thirds adalah area alami yang paling pertama menarik perhatian mata manusia.',
                        'explanation_distractors' => 'Pilihan lainnya mengartikan aturan sepertiga secara harfiah dan salah kaprah.',
                    ],
                    [
                        'stem' => 'Satuan yang umum digunakan untuk mengukur kerapatan titik atau resolusi pada gambar digital cetak adalah...',
                        'correct' => 'DPI (Dots Per Inch) atau PPI (Pixels Per Inch).',
                        'distractors' => [
                            'KHz (Kilohertz).',
                            'RPM (Rotations Per Minute).',
                            'Watt (Daya listrik).',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi satuan resolusi gambar digital DPI/PPI.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'DPI/PPI mengukur berapa banyak titik atau piksel yang termuat dalam satu inci bidang gambar.',
                        'explanation_distractors' => 'KHz mengukur frekuensi audio, RPM putaran mesin/kipas, dan Watt daya listrik.',
                    ],
                    [
                        'stem' => 'Model warna standar yang digunakan oleh layar monitor, televisi, dan ponsel pintar untuk menampilkan gambar berwarna adalah...',
                        'correct' => 'RGB (Red, Green, Blue).',
                        'distractors' => [
                            'CMYK (Cyan, Magenta, Yellow, Black).',
                            'Monokrom satu warna.',
                            'Grayscale abu-abu.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi model warna tampilan digital RGB.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Layar digital memancarkan cahaya melalui perpaduan tiga warna aditif dasar: Merah, Hijau, dan Biru (RGB).',
                        'explanation_distractors' => 'CMYK digunakan untuk tinta cetak fisik, sedangkan monokrom dan grayscale tidak menampilkan warna penuh.',
                    ],
                    [
                        'stem' => 'Model warna standar yang digunakan pada proses pencetakan tinta di percetakan fisik atau printer warna adalah...',
                        'correct' => 'CMYK (Cyan, Magenta, Yellow, Key/Black).',
                        'distractors' => [
                            'RGB (Red, Green, Blue).',
                            'HTML Hexadecimal.',
                            'HSV (Hue, Saturation, Value).',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi model warna cetak fisik CMYK.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Tinta fisik bersifat subtraktif, di mana perpaduan Cyan, Magenta, Yellow, dan Black menghasilkan seluruh spektrum cetak.',
                        'explanation_distractors' => 'RGB dan HSV adalah model warna layar digital, sedangkan kode Hexadecimal untuk bahasa web.',
                    ],
                    [
                        'stem' => 'Fungsi utama fitur \'Slide Master\' pada aplikasi presentasi seperti Microsoft PowerPoint atau Google Slides adalah...',
                        'correct' => 'Mengatur tema, logo, penomoran halaman, dan tata letak dasar agar seragam di seluruh slide secara otomatis.',
                        'distractors' => [
                            'Menghapus seluruh rekaman suara narasi dari dalam presentasi.',
                            'Mengunci komputer agar tidak bisa dimatikan oleh siswa.',
                            'Mempercepat waktu putar video presentasi menjadi dua kali lipat.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi template Slide Master.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Slide Master menjadi cetak biru tata letak; perubahan pada master otomatis diterapkan ke semua halaman slide.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang fungsi penghapusan atau penguncian yang keliru.',
                    ],
                    [
                        'stem' => 'Rasio aspek (aspect ratio) layar lebar standar yang paling banyak digunakan pada proyektor dan monitor modern saat ini adalah...',
                        'correct' => '16:9 (Widescreen).',
                        'distractors' => [
                            '1:1 (Persegi sama sisi).',
                            '4:3 (Layar tabung lama).',
                            '21:9 (Ultrawide bioskop).',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali rasio aspek standar 16:9 pada media presentasi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Rasio 16:9 adalah perbandingan lebar terhadap tinggi standar industri untuk perangkat layar digital modern.',
                        'explanation_distractors' => '1:1 untuk feed media sosial tertentu, 4:3 format layar tabung jadul, dan 21:9 untuk layar film ultra-lebar.',
                    ],
                    [
                        'stem' => 'Fungsi garis pandu (guides) atau kisi-kisi (gridlines) pada lembar kerja aplikasi desain presentasi adalah...',
                        'correct' => 'Membantu menyejajarkan posisi teks, gambar, dan bentuk agar posisinya lurus dan rapi.',
                        'distractors' => [
                            'Mencetak garis tebal di sekeliling batas kertas fisik.',
                            'Menghitung jumlah kata yang sudah diketik di dalam slide.',
                            'Memberi warna pelangi pada batas luar layar monitor.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan kegunaan garis pandu perataan guides/gridlines.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Garis pandu hanya terlihat saat mendesain untuk membantu akurasi penempatan objek dan tidak akan ikut tercetak.',
                        'explanation_distractors' => 'Gridlines tidak tercetak di kertas fisik dan tidak menghitung kata.',
                    ],
                    [
                        'stem' => 'Media yang memadukan elemen teks, suara, gambar diam, animasi bergerak, dan rekaman video secara terintegrasi disebut...',
                        'correct' => 'Multimedia.',
                        'distractors' => [
                            'Monogram.',
                            'Tipografi statis.',
                            'Audio monoaural.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep multimedia terintegrasi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Multimedia menggabungkan berbagai ragam media komunikasi untuk menyampaikan informasi secara komprehensif.',
                        'explanation_distractors' => 'Pilihan lainnya merujuk pada media tunggal atau aspek tipografi semata.',
                    ],
                    [
                        'stem' => 'Fungsi alat \'Crop\' (Pangkas) pada pengolahan gambar digital adalah...',
                        'correct' => 'Memotong dan membuang bagian luar gambar yang tidak diinginkan sehingga fokus pada objek utama.',
                        'distractors' => [
                            'Mengubah format warna gambar menjadi hitam putih otomatis.',
                            'Memperbesar ukuran byte file gambar menjadi berlipat ganda.',
                            'Menggandakan gambar menjadi dua salinan identik.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi alat Crop pada manipulasi gambar.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konten)',
                        'explanation_correct' => 'Fitur Crop memangkas tepian bidang gambar yang mengganggu agar komposisi visual terfokus pada objek esensial.',
                        'explanation_distractors' => 'Pilihan lainnya adalah fungsi filter warna, pembesaran file, atau copy-paste.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Saat kamu diminta menyajikan data kenaikan nilai rata-rata kelas dari semester satu ke semester dua, bentuk penyajian visual yang paling tepat adalah...',
                        'correct' => 'Grafik batang (bar chart) atau grafik garis (line chart).',
                        'distractors' => [
                            'Grafik sebaran acak tanpa sumbu keterangan data.',
                            'Diagram lingkaran dengan seratus potongan warna-warni.',
                            'Tabel teks mentah tanpa pengelompokan angka.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan jenis grafik perbandingan data yang tepat.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Grafik batang dan garis ideal untuk menunjukkan perbandingan kuantitatif dan tren perkembangan antartahap.',
                        'explanation_distractors' => 'Diagram lingkaran atau sebaran acak tidak tepat untuk memperlihatkan tren peningkatan nilai.',
                    ],
                    [
                        'stem' => 'Langkah terbaik saat menyisipkan gambar ilustrasi ke dalam slide presentasi agar desain tetap proporsional adalah...',
                        'correct' => 'Mengatur ukuran gambar dari sudut gambar secara proporsional dan tidak menutupi teks informasi penting.',
                        'distractors' => [
                            'Menarik gambar dari sisi samping secara paksa hingga bentuk objek menjadi gepeng dan terdistorsi.',
                            'Menumpuk gambar di atas paragraf penjelasan hingga menutupi kalimat utama.',
                            'Memperbesar gambar buram beresolusi rendah hingga menutupi seluruh halaman.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penskalaan proporsional gambar.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Penskalaan dari titik sudut (corner handles) menjaga rasio aspek (aspect ratio) gambar tetap utuh dan estetis.',
                        'explanation_distractors' => 'Menarik dari samping membuat gambar distorsi gepeng dan merusak keterbacaan materi.',
                    ],
                    [
                        'stem' => 'Jika materi presentasimu memuat beberapa poin penjelasan, teknik penyajian terbaik agar materi mudah ditangkap audiens adalah...',
                        'correct' => 'Mengemas materi dalam poin-poin ringkas (bullet points) disertai ikon atau gambar pendukung yang relevan.',
                        'distractors' => [
                            'Menyalin seluruh isi bab buku pelajaran ke dalam satu halaman slide.',
                            'Memasang animasi gerakan yang berputar terus-menerus tanpa henti di setiap kata.',
                            'Menghapus semua ilustrasi dan hanya menyisakan teks berwarna abu-abu.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan teknik peringkasan visual pada slide presentasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Poin ringkas dan ikon tematik mempercepat daya serap dan mencegah audiens terbebani membaca teks panjang.',
                        'explanation_distractors' => 'Teks dinding (wall of text) dan animasi berlebihan mengaburkan pesan utama materi.',
                    ],
                    [
                        'stem' => 'Cara paling efektif untuk memastikan materi presentasi multimedia dapat ditampilkan lancar di komputer sekolah tanpa kendala tautan terputus adalah...',
                        'correct' => 'Menyimpan file presentasi dan berkas media dalam satu folder terintegrasi serta menyiapkan salinan cadangan format PDF.',
                        'distractors' => [
                            'Hanya mengandalkan tautan online tanpa memeriksa ketersediaan jaringan internet di sekolah.',
                            'Menyimpan file di memori sementara tanpa pernah menyimpan ke media penyimpanan permanen.',
                            'Menghapus seluruh berkas gambar pendukung agar ukuran file presentasi sangat kecil.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pengemasan berkas presentasi terpadu.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Pengemasan berkas aset dalam satu folder dan cadangan PDF mengantisipasi masalah tautan hilang dan kompatibilitas sistem.',
                        'explanation_distractors' => 'Mengabaikan konektivitas atau menghapus aset visual menggagalkan presentasi.',
                    ],
                    [
                        'stem' => 'Kombinasi jenis huruf (font) yang paling rapi dan mudah dibaca untuk slide presentasi formal di depan kelas adalah...',
                        'correct' => 'Huruf Sans-serif yang bersih dan jelas untuk teks isi, seperti Calibri, Arial, atau Segoe UI.',
                        'distractors' => [
                            'Huruf sambung dekoratif berliku-liku untuk seluruh isi paragraf presentasi.',
                            'Menggunakan lima jenis huruf yang berbeda gaya dalam satu halaman slide.',
                            'Huruf berukuran sangat kecil di bawah 8pt agar memuat banyak kalimat.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih keluarga font yang ergonomis untuk presentasi kelas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Huruf sans-serif memiliki keterbacaan tinggi di layar proyeksi digital berkat garis hurufnya yang bersih dan tegas.',
                        'explanation_distractors' => 'Font dekoratif atau kombinasi acak menyebabkan kelelahan mata penonton.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin membuat infografis ringkas tentang siklus air, langkah penyusunan visual yang paling runtut adalah...',
                        'correct' => 'Menyusun alur tahapan secara berurutan dengan tanda panah pengarah dan teks penjelasan ringkas.',
                        'distractors' => [
                            'Menempatkan semua gambar tahapan secara acak tanpa tanda alur.',
                            'Menuliskan seluruh teks tanpa menyertakan gambar atau ikon pendukung.',
                            'Menumpuk semua gambar siklus dalam satu titik di sudut infografis.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan alur visual sekuensial pada infografis.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Alur dengan indikator penunjuk arah mempermudah audiens memahami hubungan sebab-akibat antartahapan proses.',
                        'explanation_distractors' => 'Penempatan acak atau ketiadaan visual merusak esensi infografis informatif.',
                    ],
                    [
                        'stem' => 'Teknik perataan teks (alignment) yang paling dianjurkan saat menyajikan paragraf penjelasan beberapa baris pada dokumen atau slide adalah...',
                        'correct' => 'Rata kiri (left align), karena batas awal mata membaca teks konsisten dari kiri ke kanan.',
                        'distractors' => [
                            'Rata kanan penuh sehingga sisi kiri bergerigi acak.',
                            'Rata tengah (center align) untuk teks narasi sepuluh baris rapat.',
                            'Membuat teks miring terbalik diagonal di tengah halaman.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan perataan teks ergonomis pada media baca.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Left align mempertahankan jangkar mata membaca (reading anchor) di sisi kiri sehingga mata tidak cepat lelah.',
                        'explanation_distractors' => 'Center align atau right align pada teks panjang menyulitkan mata menemukan awal baris berikutnya.',
                    ],
                    [
                        'stem' => 'Ketika mengatur efek transisi perpindahan antar-slide presentasi, durasi dan jenis efek yang paling bijak dipilih adalah...',
                        'correct' => 'Efek halus yang singkat (sekitar 0,5 hingga 1 detik) agar tidak mengalihkan perhatian audiens dari pesan materi.',
                        'distractors' => [
                            'Efek putaran dramatis selama 10 detik di setiap pergantian slide.',
                            'Menggunakan jenis efek transisi yang berbeda-beda secara acak di setiap halaman.',
                            'Memasang efek kilatan cahaya yang menyilaukan mata penonton.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan efek transisi slide yang fungsional dan terukur.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Transisi presentasi berfungsi memperlancar alur, bukan menjadi tontonan utama yang mengaburkan pesan guru.',
                        'explanation_distractors' => 'Transisi berdurasi panjang dan acak membuang waktu presentasi dan membingungkan pemirsa.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menyajikan data pembagian persentase jenis ekstrakurikuler yang diikuti 100 siswa, grafik yang paling tepat digunakan adalah...',
                        'correct' => 'Diagram lingkaran (pie chart) atau diagram donat (doughnut chart).',
                        'distractors' => [
                            'Grafik garis gelombang acak.',
                            'Peta geografis benua.',
                            'Bagan pohon silsilah keluarga.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan diagram proporsi bagian terhadap keseluruhan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Diagram lingkaran menunjukkan dengan jelas bagaimana bagian-bagian persentase menyusun total 100 persen.',
                        'explanation_distractors' => 'Peta geografis dan bagan silsilah tidak memuat skala persentase data kuantitatif.',
                    ],
                    [
                        'stem' => 'Langkah tepat yang dapat kamu lakukan jika teks judul slide sulit dibaca karena gambar latar belakang terlalu ramai adalah...',
                        'correct' => 'Memberikan lapisan kotak semi-transparan (overlay) di bawah teks atau menambahkan kontur bayangan tipis pada huruf.',
                        'distractors' => [
                            'Mengubah warna teks menjadi transparan agar menyatu dengan gambar latar.',
                            'Mengecilkan ukuran teks menjadi sangat kecil di sudut bawah.',
                            'Menghapus teks judul sama sekali dari slide presentasi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan teknik peningkatan keterbacaan teks di atas foto.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Lapisan semi-transparan (overlay) memisahkan bidang teks dari kontur foto yang ramai sehingga keterbacaan terjaga.',
                        'explanation_distractors' => 'Pilihan lainnya justru menghilangkan pesan judul atau merusak komunikasi visual.',
                    ],
                    [
                        'stem' => 'Saat mengekspor video hasil karya presentasi digital agar mudah diunggah ke internet namun tetap tajam dilihat, pilihan resolusi yang paling seimbang adalah...',
                        'correct' => 'Resolusi Full HD (1080p) atau HD (720p).',
                        'distractors' => [
                            'Resolusi sangat rendah 144p.',
                            'Format rekaman teks 8-bit tanpa gambar.',
                            'Resolusi raw tanpa kompresi berukuran ratusan gigabyte.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pengaturan resolusi video digital proporsional.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Resolusi 720p dan 1080p memberikan ketajaman gambar prima dengan ukuran berkas yang terkelola untuk jaringan internet.',
                        'explanation_distractors' => '144p buram dan tidak terbaca, sedangkan file mentah tanpa kompresi menyumbat lalu lintas data.',
                    ],
                    [
                        'stem' => 'Langkah tepat sebelum memasukkan sepuluh foto resolusi sangat tinggi (kamera 48MP) ke dalam slide presentasi tugas sekolah adalah...',
                        'correct' => 'Mengompresi atau mengubah resolusi foto sesuai ukuran tampilan slide agar ukuran file presentasi tidak menjadi lambat dibuka.',
                        'distractors' => [
                            'Membiarkan semua foto dalam ukuran asli agar file presentasi berukuran puluhan gigabyte.',
                            'Mengubah format foto menjadi teks dokumen .txt.',
                            'Menghapus metadata tanggal pada kartu memori kamera.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan kompresi aset gambar pada presentasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Optimasi aset gambar menjaga kinerja responsif aplikasi presentasi dan mencegah aplikasi mendadak hang.',
                        'explanation_distractors' => 'Menyematkan file mentah kamera raksasa membebani RAM laptop sekolah secara berlebihan.',
                    ],
                    [
                        'stem' => 'Jika teks penjelasan di lembar slide tertutup oleh kotak gambar ilustrasi yang baru saja ditempelkan, perintah susunan lapisan objek yang harus kamu gunakan adalah...',
                        'correct' => 'Send to Back pada kotak gambar atau Bring to Front pada kotak teks.',
                        'distractors' => [
                            'Delete All Objects.',
                            'Rotate 180 Degrees.',
                            'Zoom Out 10%.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penataan lapisan objek (layering) pada slide.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Perintah Bring to Front dan Send to Back mengatur urutan sumbu z (lapisan kedalaman) objek grafis pada bidang kerja.',
                        'explanation_distractors' => 'Delete akan menghapus objek, rotate memutar arah, dan zoom hanya mengubah tampilan jendela.',
                    ],
                    [
                        'stem' => 'Jika kamu membuat bagan alir yang terdiri dari sepuluh kotak bentuk dan panah, langkah terbaik agar seluruh elemen tersebut dapat dipindahkan bersamaan tanpa berantakan adalah...',
                        'correct' => 'Memilih seluruh objek tersebut lalu menggunakan perintah Group (Kelompokkan).',
                        'distractors' => [
                            'Mengunci keyboard komputer dengan password.',
                            'Memotong kertas monitor dengan gunting.',
                            'Menggeser objek satu per satu secara berulang-ulang.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pengelompokan objek grafis (grouping).',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Fitur Group menyatukan banyak objek terpisah menjadi satu kesatuan unit sehingga tata letak relatifnya terkunci rapi.',
                        'explanation_distractors' => 'Pilihan lainnya tidak efisien dan merupakan tindakan yang keliru.',
                    ],
                    [
                        'stem' => 'Saat guru meminta kamu mencetak lembar presentasi untuk dibagikan kepada teman sekelas sebagai bahan belajar ringkas, opsi cetak yang paling hemat kertas dan rapi adalah...',
                        'correct' => 'Mencetak dalam mode Handout (misalnya 3 atau 6 slide per lembar kertas).',
                        'distractors' => [
                            'Mencetak 1 slide berukuran poster raksasa per siswa.',
                            'Mencetak hanya halaman judulnya saja sebanyak 100 lembar.',
                            'Mencetak tanpa tinta di atas kertas transparan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan opsi cetak handout presentasi efisien.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Format Handout menghemat kertas sekaligus menyajikan ringkasan materi secara berurutan dan mudah dibaca siswa.',
                        'explanation_distractors' => 'Mencetak satu slide per halaman sangat boros kertas dan tidak praktis untuk bahan bacaan kelas.',
                    ],
                    [
                        'stem' => 'Pedoman pemilihan palet warna yang paling baik diterapkan pada presentasi tugas akademik di sekolah adalah...',
                        'correct' => 'Membatasi penggunaan warna hanya pada 2 hingga 3 warna dominan yang serasi dan harmonis.',
                        'distractors' => [
                            'Menggunakan warna pelangi yang berbeda pada setiap kata dalam kalimat.',
                            'Menggunakan warna neon menyala yang menyilaukan mata penonton.',
                            'Menghindari penggunaan warna sama sekali sehingga slide menjadi gelap gulita.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan palet warna harmonis pada media presentasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Aturan 60-30-10 atau batasan 2-3 warna utama menjaga presentasi terlihat rapi, matang, dan tidak membingungkan.',
                        'explanation_distractors' => 'Warna pelangi acak atau neon merusak fokus audiens dan terlihat tidak profesional.',
                    ],
                    [
                        'stem' => 'Langkah pencegahan terbaik agar jenis huruf (font) khusus yang kamu gunakan di laptop rumah tidak berubah menjadi font standar yang berantakan saat dibuka di laptop guru adalah...',
                        'correct' => 'Mengaktifkan opsi \'Embed fonts in the file\' pada menu penyimpanan aplikasi presentasi atau menyimpannya dalam format PDF.',
                        'distractors' => [
                            'Menghapus file presentasi tersebut dan mengetik ulang di papan tulis.',
                            'Mengganti nama laptop guru agar sama dengan nama laptop di rumah.',
                            'Mengirimkan file melalui bluetooth tanpa menekan tombol simpan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penyematan font (font embedding) untuk portabilitas berkas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Menyematkan font memastikan berkas presentasi membawa paket tipografi sendiri saat berpindah perangkat komputer.',
                        'explanation_distractors' => 'Pilihan lainnya tidak menyelesaikan akar masalah ketergantungan font sistem.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menyajikan tiga poin kelebihan produk teknologi, penyajian visual yang paling modern dan komunikatif adalah...',
                        'correct' => 'Menggunakan tiga kolom kartu (card layout) yang masing-masing memuat ikon representatif, judul tebal, dan satu kalimat penjelasan ringkas.',
                        'distractors' => [
                            'Menuliskan tiga paragraf panjang bertumpuk ke bawah tanpa spasi baris.',
                            'Membuat teks berputar-putar melingkar seperti roda gerobak.',
                            'Menyembunyikan teks di balik gambar gelap tanpa judul.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan tata letak kartu berbasis ikon (card layout).',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain)',
                        'explanation_correct' => 'Card layout dengan ikon tematik membantu audiens membedakan setiap poin keunggulan secara terstruktur dan cepat.',
                        'explanation_distractors' => 'Paragraf rapat atau teks melingkar menyulitkan keterbacaan informasi.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Sebuah slide presentasi dikritik audiens karena terlihat sangat padat, membingungkan, dan melelahkan mata. Langkah evaluasi dan perbaikan desain yang paling tepat adalah...',
                        'correct' => 'Menerapkan ruang kosong (white space), membagi materi ke dalam beberapa slide, dan meringkas teks menjadi kata kunci inti.',
                        'distractors' => [
                            'Mengecilkan ukuran huruf menjadi setengahnya agar semua teks muat dalam satu slide.',
                            'Menambahkan lebih banyak stiker animasi bergerak di setiap sudut slide.',
                            'Mengubah warna latar belakang menjadi hitam pekat dengan teks warna merah gelap.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi dan merumuskan perbaikan kepadatan visual slide.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Desain)',
                        'explanation_correct' => 'Pemanfaatan white space dan chunking materi menurunkan beban kognitif (cognitive load) audiens.',
                        'explanation_distractors' => 'Mengecilkan huruf atau menambah stiker animasi justru memperparah kekacauan visual.',
                    ],
                    [
                        'stem' => 'Mengapa infografis dinilai jauh lebih efektif dalam menyampaikan informasi data kompleks dibandingkan teks narasi panjang?',
                        'correct' => 'Karena infografis memadukan data visual, struktur hierarki, dan ringkasan teks yang diproses otak secara visual lebih cepat.',
                        'distractors' => [
                            'Karena infografis tidak memuat informasi fakta yang membutuhkan pemikiran serius.',
                            'Karena infografis hanya berfungsi sebagai hiasan dinding tanpa menyampaikan pesan penting.',
                            'Karena ukuran file infografis selalu lebih kecil dibandingkan dokumen teks.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis keunggulan kognitif media infografis.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Komunikasi)',
                        'explanation_correct' => 'Prinsip pemrosesan ganda (dual-coding theory) membuktikan visual dan teks ringkas meningkatkan retensi memori pemirsa.',
                        'explanation_distractors' => 'Pilihan lainnya meremehkan substansi ilmiah dan fakta dalam infografis.',
                    ],
                    [
                        'stem' => 'Kamu memiliki data persentase alokasi anggaran kas kelas untuk lima kegiatan yang berbeda. Bentuk penyajian visual yang paling tepat dan alasannya adalah...',
                        'correct' => 'Diagram lingkaran (pie chart), karena efektif memperlihatkan proporsi setiap bagian terhadap total keseluruhan seratus persen.',
                        'distractors' => [
                            'Grafik garis kontinyu, karena menunjukkan fluktuasi pergerakan data per detik.',
                            'Diagram alur bercabang, karena menunjukkan alur pengambilan keputusan kode program.',
                            'Tabel acak tanpa total persentase, karena tidak memerlukan ketepatan hitungan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi dan memilih jenis visualisasi data yang tepat.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Visualisasi)',
                        'explanation_correct' => 'Diagram lingkaran dirancang khusus untuk memvisualisasikan rasio bagian terhadap keseluruhan (part-to-whole comparison).',
                        'explanation_distractors' => 'Grafik garis untuk data waktu, sedangkan diagram alur untuk proses logika instruksi.',
                    ],
                    [
                        'stem' => 'Ketika merancang konten presentasi digital untuk audiens yang duduk di baris belakang ruang kelas, pertimbangan tipografi yang paling krusial adalah...',
                        'correct' => 'Ukuran font yang memadai (minimal 24–28 pt untuk teks isi) serta keterbacaan kontras yang tajam dari jarak jauh.',
                        'distractors' => [
                            'Warna tulisan yang menyatu dengan latar belakang agar tampak artistik dan samar.',
                            'Penambahan efek bayangan berlapis pada semua kata sehingga huruf terlihat tebal.',
                            'Penggunaan huruf dekoratif ukuran kecil agar slide terisi penuh teks.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi kelayakan tipografi jarak jauh.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Tipografi)',
                        'explanation_correct' => 'Skala keterbacaan ruang nyata menuntut ukuran font minimum dan kontras tinggi agar pesan sampai ke barisan terjauh.',
                        'explanation_distractors' => 'Teks samar atau huruf dekoratif kecil mustahil dibaca dari jarak jauh.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat poster digital tetapi penonton kesulitan membedakan mana pesan utama dan mana informasi tambahan. Analisis kelemahan desain poster tersebut terletak pada...',
                        'correct' => 'Kurangnya penegasan hierarki visual pada ukuran judul, tata letak, dan penekanan warna.',
                        'distractors' => [
                            'Penggunaan format penyimpanan file yang menggunakan kompresi standar.',
                            'Pemilihan kertas cetak yang memiliki ukuran standar A4.',
                            'Pencantuman nama pembuat karya di sudut bawah poster.',
                        ],
                        'indicator' => 'Peserta didik mampu mendeteksi ketiadaan hierarki visual pada poster.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Desain)',
                        'explanation_correct' => 'Ketiadaan kontras ukuran dan penataan fokal menyebabkan seluruh elemen tampak sama penting dan membingungkan pembaca.',
                        'explanation_distractors' => 'Pilihan lainnya adalah atribut teknis umum yang tidak menjadi akar masalah hierarki pesan.',
                    ],
                    [
                        'stem' => 'Dalam produksi konten digital terintegrasi, mengapa konsistensi palet warna dan gaya elemen visual di sepanjang slide presentasi sangat penting?',
                        'correct' => 'Menjaga kesatuan tema visual, memperkuat identitas pesan, dan mencegah kebingungan visual pada audiens.',
                        'distractors' => [
                            'Membuat ukuran file presentasi bertambah besar menjadi bergiga-gita byte.',
                            'Membatasi kreativitas pembuat konten sehingga hasilnya monoton.',
                            'Menjamin bahwa presentasi tidak bisa disunting oleh orang lain.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi nilai konsistensi tema visual pada presentasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Desain)',
                        'explanation_correct' => 'Prinsip unity (kesatuan) memastikan seluruh slide dirasakan sebagai satu paket karya yang profesional dan terpadu.',
                        'explanation_distractors' => 'Konsistensi bukan pembatas kreativitas, melainkan fondasi kejelasan komunikasi visual.',
                    ],
                    [
                        'stem' => 'Saat video hasil presentasi diputar di laptop sekolah gerakannya tampak patah-patah (stuttering). Analisis penyebab teknis dan solusi paling tepat adalah...',
                        'correct' => 'Bitrate atau resolusi video terlalu tinggi melebihi kemampuan decoding hardware laptop; solusinya lakukan re-encode video ke resolusi 720p dengan codec H.264 standar.',
                        'distractors' => [
                            'Layar laptop dipasang terbalik oleh teknisi laboratorium sekolah.',
                            'Siswa lupa menghapus teks judul pada slide pertama presentasi.',
                            'Kabel stopkontak laptop kekurangan suplai tegangan listrik 220V.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis troubleshooting performa pemutaran video multimedia.',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Multimedia)',
                        'explanation_correct' => 'Beban decoding video 4K atau bitrate ekstrem membuat CPU/GPU laptop kelas sekolah mengalami frame drops.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang alasan fisik yang tidak berhubungan dengan pemrosesan video.',
                    ],
                    [
                        'stem' => 'Seorang siswa memasang efek animasi masuk terbang (fly-in), putaran (spin), dan zoom di setiap kata pada slide. Evaluasi dampak pedagogis dari desain ini adalah...',
                        'correct' => 'Mengakibatkan cognitive overload (kelebihan beban berpikir visual) yang mengalihkan perhatian audiens dari pemahaman materi.',
                        'distractors' => [
                            'Membuat penonton otomatis memahami isi materi tanpa perlu mendengarkan suara pembicara.',
                            'Menyebabkan proyektor sekolah memancarkan sinar laser berwarna hijau.',
                            'Mempercepat durasi presentasi menjadi sepuluh detik saja.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi dampak negatif animasi visual berlebihan.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Pedagogis)',
                        'explanation_correct' => 'Animasi fungsional harus mendukung alur logika, bukan menjadi distraksi visual yang melelahkan persepsi pemirsa.',
                        'explanation_distractors' => 'Pilihan pengecoh mengasumsikan dampak ajaib atau kerusakan proyektor yang mustahil.',
                    ],
                    [
                        'stem' => 'Ketika memilih format berkas logo sekolah yang akan dipasang di berbagai ukuran media (dari favicon kecil hingga spanduk raksasa), analisis format terbaik adalah...',
                        'correct' => 'Format SVG (vektor), karena grafis vektor berbasis rumus matematis sehingga ketajaman tepi garis selalu sempurna di ukuran apa pun.',
                        'distractors' => [
                            'Format JPEG, karena JPEG selalu mempertahankan latar belakang transparan di semua media.',
                            'Format GIF, karena GIF memiliki kedalaman warna hingga 32-bit tanpa kompresi.',
                            'Format BMP, karena ukuran filenya yang sangat besar membuktikan kualitasnya paling hebat.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi trade-off format raster vs vektor untuk identitas grafis.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Format)',
                        'explanation_correct' => 'Kelebihan utama vektor adalah resolusi-independen (resolution independent) sehingga bebas dari efek buram atau pecah.',
                        'explanation_distractors' => 'JPEG tidak mendukung transparansi, GIF terbatas 256 warna, dan BMP tidak efisien untuk web.',
                    ],
                    [
                        'stem' => 'Dalam desain komunikasi visual untuk media pembelajaran inklusif, mengapa perancang dilarang hanya mengandalkan warna hijau dan merah sebagai satu-satunya penanda status?',
                        'correct' => 'Karena penonton dengan keterbatasan penglihatan warna (buta warna merah-hijau) tidak dapat membedakan penanda tersebut tanpa bantuan teks atau ikon pendukung.',
                        'distractors' => [
                            'Karena warna hijau dan merah dapat merusak lampu lensa proyektor secara permanen.',
                            'Karena warna merah dan hijau dilarang oleh aturan resmi kurikulum pendidikan nasional.',
                            'Karena kedua warna tersebut otomatis membuat ukuran file dokumen bertambah dua kali lipat.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis prinsip aksesibilitas visual universal.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Aksesibilitas)',
                        'explanation_correct' => 'Prinsip aksesibilitas menuntut \'don\'t rely on color alone\'; harus ada ikon (centang/silang) atau teks pendukung selain warna.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang kerusakan lampu proyektor atau larangan kurikulum fiktif.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat presentasi di MacOS dengan font Helvetica, namun saat dibuka di Windows tata letaknya bergeser dan teks terpotong. Analisis penyebabnya adalah...',
                        'correct' => 'Font Helvetica tidak terpasang secara bawaan di Windows sehingga sistem menggantinya dengan font cadangan yang memiliki metrik lebar huruf berbeda.',
                        'distractors' => [
                            'Kabel HDMI yang menghubungkan monitor ke laptop mengalami kebocoran sinyal data.',
                            'Aplikasi Windows sengaja merusak file presentasi buatan sistem operasi lain.',
                            'Monitor Windows memiliki piksel berbentuk segitiga sehingga teks tergeser.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis inkonsistensi tipografi lintas platform.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kompatibilitas)',
                        'explanation_correct' => 'Font substitution (penggantian font otomatis) mengubah dimensi baris dan kotak teks sehingga tata letak bergeser.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi keliru mengenai kabel dan bentuk fisik piksel monitor.',
                    ],
                    [
                        'stem' => 'Ketika sebuah gambar beresolusi 200x200 piksel ditarik paksa memenuhi layar proyeksi 1920x1080 piksel, dampak visual yang terjadi dan alasannya adalah...',
                        'correct' => 'Gambar terlihat buram dan berpiksel (pixelated), karena aplikasi harus menduplikasi piksel kecil untuk mengisi area yang jauh lebih besar.',
                        'distractors' => [
                            'Gambar otomatis menjadi video animasi tiga dimensi yang bergerak sendiri.',
                            'Gambar akan berubah menjadi teks puisi secara otomatis.',
                            'Layar proyeksi akan mematikan diri secara otomatis untuk mencegah kerusakan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis degradasi kualitas interpolasi gambar raster.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Grafis)',
                        'explanation_correct' => 'Interpolasi pembesaran bitmap resolusi rendah menghasilkan artefak kotak-kotak piksel yang kasar dan kabur.',
                        'explanation_distractors' => 'Pilihan lainnya mengasumsikan fenomena gaib yang tidak berhubungan dengan pemrosesan citra digital.',
                    ],
                    [
                        'stem' => 'Dalam laporan proyek, kamu memiliki data perbandingan efektivitas 4 metode penelitian. Evaluasi kritis pemilihan bentuk penyajian antara tabel angka dan grafik batang adalah...',
                        'correct' => 'Grafik batang lebih unggul untuk presentasi lisan karena audiens dapat menangkap pemenang metode dalam 2 detik, sedangkan tabel angka lebih cocok untuk lampiran dokumen cetak yang membutuhkan presisi desimal.',
                        'distractors' => [
                            'Tabel angka selalu lebih baik di semua situasi karena grafik dianggap tidak memiliki nilai ilmiah.',
                            'Grafik batang dilarang digunakan dalam laporan akademis resmi.',
                            'Keduanya memiliki fungsi yang sama persis sehingga tidak perlu dipertimbangkan penggunaannya.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi konteks penggunaan tabel versus grafik visual.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Penyajian Data)',
                        'explanation_correct' => 'Konteks media menentukan format: layar lisan menuntut visual cepat, sementara dokumen bacaan cetak menuntut verifikasi detail angka.',
                        'explanation_distractors' => 'Pilihan lainnya mengabaikan perbedaan ergonomi persepsi antara audiens lisan dan pembaca cetak.',
                    ],
                    [
                        'stem' => 'Saat merancang poster edukasi bahaya sampah plastik untuk mading sekolah, keputusan desain terbaik agar pesan langsung dipahami siswa yang sedang berjalan lewat adalah...',
                        'correct' => 'Menggunakan satu gambar fokal yang kuat, satu kalimat slogan yang berbobot besar, dan ringkasan fakta penting dengan kontras tajam.',
                        'distractors' => [
                            'Menuliskan seluruh undang-undang lingkungan hidup dalam sepuluh paragraf kecil tanpa gambar.',
                            'Memasang lima puluh foto ukuran mini yang ditata rapat menutupi seluruh poster.',
                            'Menggunakan warna teks putih di atas latar belakang abu-abu sangat muda.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang komposisi poster komunikatif berbasis kecepatan tangkap audiens.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Desain)',
                        'explanation_correct' => 'Aturan \'3-second rule\' media poster ruang publik menuntut fokus tunggal yang kuat agar pesan terserap dalam pandangan sekilas.',
                        'explanation_distractors' => 'Teks undang-undang panjang atau tumpukan foto mini gagal menyampaikan pesan kepada audiens yang bergerak.',
                    ],
                    [
                        'stem' => 'Mengapa membaca slide presentasi yang memuat paragraf narasi panjang kata demi kata dinilai sebagai praktik presentasi yang buruk?',
                        'correct' => 'Karena audiens akan membaca lebih cepat daripada pembicara berbicara, sehingga pembicara menjadi tidak relevan dan audiens cepat bosan.',
                        'distractors' => [
                            'Karena proyektor sekolah dilarang memproyeksikan kalimat yang memiliki lebih dari lima kata.',
                            'Karena huruf pada paragraf panjang akan otomatis luntur jika terkena cahaya lampu.',
                            'Karena pembicara dilarang bersuara saat presentasi multimedia sedang ditampilkan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis kelemahan metode \'Death by PowerPoint\'.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Komunikasi)',
                        'explanation_correct' => 'Fenomena split-attention effect membuktikan membaca slide membunuh interaksi pembicara dengan penonton.',
                        'explanation_distractors' => 'Pilihan lainnya adalah karangan yang tidak logis.',
                    ],
                    [
                        'stem' => 'Ketika memilih format file rekaman suara narasi untuk disematkan ke dalam presentasi agar ukuran file hemat tanpa merusak kejernihan vokal, evaluasi yang tepat adalah...',
                        'correct' => 'Memilih format MP3 atau AAC dengan bitrate 128 kbps yang terkompresi efisien namun vokal tetap jernih.',
                        'distractors' => [
                            'Memilih format WAV tanpa kompresi yang membuat ukuran file presentasi membengkak hingga gigabyte.',
                            'Menggunakan file teks .txt yang diberi nama suara.mp3.',
                            'Merekam suara menggunakan frekuensi ultrasonik yang tidak dapat didengar telinga manusia.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi trade-off kompresi audio pada presentasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Audio)',
                        'explanation_correct' => 'Kompresi lossy perseptual seperti MP3/AAC memangkas frekuensi tak terdengar sehingga menghemat 90% memori dengan kualitas suara prima.',
                        'explanation_distractors' => 'WAV mentah memboroskan ruang penyimpanan, dan pilihan lainnya tidak masuk akal.',
                    ],
                    [
                        'stem' => 'Pada sebuah tayangan video tugas kelompok, suara penjelasan siswa tidak terdengar jelas karena tertutup oleh suara musik latar yang terlalu keras. Langkah perbaikan audio yang paling profesional adalah...',
                        'correct' => 'Menerapkan teknik audio ducking (menurunkan volume musik latar secara otomatis sekitar 15-20 dB saat suara narasi berbicara).',
                        'distractors' => [
                            'Menghapus seluruh rekaman suara narasi dan hanya menyisakan musik latar saja.',
                            'Menaikkan volume musik latar ke level maksimum hingga suara speaker pecah.',
                            'Mempercepat tempo video menjadi dua kali lipat tanpa mengubah audio.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan solusi mixing audio multimedia (audio ducking).',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Audio)',
                        'explanation_correct' => 'Audio ducking menciptakan ruang frekuensi bagi vokal agar pesan informatif tetap menjadi fokus utama telinga pemirsa.',
                        'explanation_distractors' => 'Pilihan lainnya merusak tujuan komunikasi video pembelajaran.',
                    ],
                    [
                        'stem' => 'Evaluasi struktur alur materi presentasi yang paling efektif membimbing pemahaman audiens dari awal hingga akhir adalah...',
                        'correct' => 'Struktur Pembuka (Hook & Latar Masalah) -> Isi (Analisis Data & Bukti Solusi) -> Penutup (Simpulan & Call to Action yang konkret).',
                        'distractors' => [
                            'Struktur Acak: Penutup diletakkan di slide pertama, dilanjutkan daftar pustaka, lalu pembuka di akhir.',
                            'Struktur Monoton: Memuat daftar teori dari awal hingga akhir tanpa contoh masalah nyata atau simpulan.',
                            'Struktur Tanpa Judul: Langsung menampilkan grafik angka mentah tanpa pengantar tujuan presentasi.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi struktur dramaturgi narasi presentasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Struktur Presentasi)',
                        'explanation_correct' => 'Alur klasik Problem-Solution-Conclusion memandu nalar audiens secara runtut dari kesadaran urgensi hingga pemahaman tindakan.',
                        'explanation_distractors' => 'Struktur acak atau ketiadaan pengantar membingungkan alur logika audiens.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getSecurityEthicsAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Apa yang dimaksud dengan jejak digital (digital footprint) dalam dunia internet?',
                        'correct' => 'Rekam jejak seluruh aktivitas, pesan, dan unggahan yang kita tinggalkan saat beraktivitas di internet.',
                        'distractors' => [
                            'Kabel penghubung antara perangkat komputer dengan stopkontak listrik.',
                            'Waktu yang diperlukan laptop untuk menyala dari posisi mati.',
                            'Kapasitas penyimpanan yang tersisa pada kartu memori smartphone.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan pengertian rekam jejak digital.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Jejak digital adalah seluruh jejak riwayat aktivitas online yang tertinggal dan dapat dilacak di dunia maya.',
                        'explanation_distractors' => 'Pilihan lainnya merujuk pada perangkat keras atau indikator fisik komputer.',
                    ],
                    [
                        'stem' => 'Informasi pribadi di bawah ini yang termasuk kategori data sensitif dan tidak boleh disebarkan secara sembarangan di media sosial adalah...',
                        'correct' => 'Nomor Induk Kependudukan (NIK) dan kata sandi akun pribadi.',
                        'distractors' => [
                            'Hobi berolahraga di akhir pekan.',
                            'Judul buku pelajaran yang sedang dibaca.',
                            'Warna seragam sekolah yang digunakan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi data pribadi sensitif.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'NIK dan kata sandi merupakan data sensitif privat yang berisiko disalahgunakan jika disebar ke publik.',
                        'explanation_distractors' => 'Pilihan lainnya merupakan informasi umum yang tidak berisiko membahayakan identitas atau keamanan finansial.',
                    ],
                    [
                        'stem' => 'Tindakan mencantumkan sumber asli saat kita menggunakan karya tulisan atau foto orang lain bertujuan untuk...',
                        'correct' => 'Menghormati hak cipta pencipta karya dan menghindari perbuatan plagiarisme.',
                        'distractors' => [
                            'Mengurangi kecepatan pengiriman data pada koneksi jaringan internet.',
                            'Membuat berkas dokumen terkunci sehingga tidak bisa dibuka pengguna lain.',
                            'Menghilangkan teks penjelasan utama dari dokumen yang kita susun.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi tujuan pencantuman atribusi hak cipta.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Atribusi atau sitasi adalah bentuk penghargaan terhadap hak cipta pembuat karya dan mencegah plagiasi.',
                        'explanation_distractors' => 'Pilihan lainnya tidak memiliki kaitan dengan konsep hukum dan etika hak cipta.',
                    ],
                    [
                        'stem' => 'Salah satu ciri utama dari kata sandi (password) yang kuat dan aman dari ancaman peretasan adalah...',
                        'correct' => 'Mengombinasikan huruf besar, huruf kecil, angka, dan simbol khusus.',
                        'distractors' => [
                            'Hanya menggunakan tanggal lahir atau nomor telepon pribadi.',
                            'Menggunakan kata yang sama berulang kali seperti \'12345678\'.',
                            'Menuliskan kata sandi pada bio atau profil publik media sosial.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali karakteristik kata sandi yang aman.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Kombinasi ragam karakter membuat kata sandi memiliki entropi tinggi dan sulit ditebak oleh serangan brute force.',
                        'explanation_distractors' => 'Pilihan pengecoh sangat rentan ditebak oleh pelaku kejahatan siber.',
                    ],
                    [
                        'stem' => 'Modus kejahatan siber berupa pesan tipuan yang berpura-pura menjadi pihak resmi untuk mencuri data pribadi disebut...',
                        'correct' => 'Phishing.',
                        'distractors' => [
                            'Browsing.',
                            'Download.',
                            'Formatting.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi kejahatan phishing.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Phishing adalah penipuan rekayasa sosial untuk memancing korban memberikan kredensial rahasia.',
                        'explanation_distractors' => 'Pilihan lainnya adalah aktivitas normal dalam pengoperasian komputer.',
                    ],
                    [
                        'stem' => 'Prinsip etika kewargaan digital yang paling tepat saat kita ingin membagikan ulang kiriman informasi di media sosial adalah...',
                        'correct' => 'Memastikan kebenaran informasi tersebut terlebih dahulu dan mempertimbangkan manfaatnya sebelum disebarkan.',
                        'distractors' => [
                            'Langsung membagikan informasi yang memicu kemarahan publik agar mendapat banyak tanggapan.',
                            'Mengubah isi informasi tersebut agar terdengar lebih dramatis.',
                            'Menyebarkan informasi tanpa membaca isinya sama sekali.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan prinsip saring sebelum sharing.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Prinsip \'saring sebelum sharing\' menjamin informasi yang disebarkan valid, tidak menyesatkan, dan bernilai positif.',
                        'explanation_distractors' => 'Pilihan lainnya memicu penyebaran hoaks dan konflik digital.',
                    ],
                    [
                        'stem' => 'Perangkat lunak berbahaya yang dirancang untuk merusak sistem, mencuri data, atau mengganggu kinerja komputer disebut...',
                        'correct' => 'Malware (Malicious Software).',
                        'distractors' => [
                            'Hardware pendukung.',
                            'Freeware legal.',
                            'Shareware resmi.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep malware berbahaya.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Malware mencakup virus, trojan, spyware, dan ransomware yang menyusup untuk merusak sistem digital.',
                        'explanation_distractors' => 'Hardware adalah perangkat fisik, sedangkan freeware/shareware adalah model lisensi perangkat lunak sah.',
                    ],
                    [
                        'stem' => 'Jenis malware yang mengunci seluruh file dokumen di komputer korban dan meminta uang tebusan untuk membukanya disebut...',
                        'correct' => 'Ransomware.',
                        'distractors' => [
                            'Adware iklan.',
                            'Firmware BIOS.',
                            'Software driver.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi ancaman kejahatan ransomware.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Ransomware mengenkripsi file korban secara paksa dan memeras korban dengan tebusan uang kripto.',
                        'explanation_distractors' => 'Adware menampilkan iklan pop-up, sedangkan firmware dan driver adalah perangkat lunak pengendali perangkat keras.',
                    ],
                    [
                        'stem' => 'Jejak digital pasif yang tertinggal secara otomatis tanpa disadari pengguna saat berselancar di internet adalah...',
                        'correct' => 'Alamat IP perangkat, riwayat pencarian peramban, dan rekaman cookies lokasi.',
                        'distractors' => [
                            'Komentar yang sengaja kita ketik di postingan teman.',
                            'Foto profil yang kita unggah ke akun pribadi.',
                            'Video vlog yang kita publikasikan ke YouTube.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan jejak digital pasif dan aktif.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Jejak pasif dikumpulkan oleh server secara otomatis di latar belakang tanpa tindakan unggah sadar dari pengguna.',
                        'explanation_distractors' => 'Komentar, foto profil, dan video vlog adalah contoh jejak digital aktif yang diunggah secara sadar.',
                    ],
                    [
                        'stem' => 'Lisensi publik yang mengizinkan karya dibagikan secara gratis dengan syarat tetap mencantumkan nama penciptanya dikenal dengan lisensi...',
                        'correct' => 'Creative Commons (CC).',
                        'distractors' => [
                            'All Rights Reserved tertutup.',
                            'Paten militer rahasia.',
                            'Hak monopoli dagang.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali lisensi karya terbuka Creative Commons.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Creative Commons menyediakan kerangka hukum terbuka yang memudahkan pencipta membagikan karyanya dengan syarat atribusi.',
                        'explanation_distractors' => 'All rights reserved melarang penggunaan tanpa izin tertulis, dan paten dagang mengatur perlindungan komersial.',
                    ],
                    [
                        'stem' => 'Metode pengamanan akun yang mewajibkan dua bukti identitas berbeda sebelum pengguna dapat masuk ke dalam sistem disebut...',
                        'correct' => 'Two-Factor Authentication (2FA) / Autentikasi Dua Langkah.',
                        'distractors' => [
                            'Single Sign-On sederhana.',
                            'Auto-login otomatis.',
                            'Skip Password.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan mekanisme autentikasi dua faktor (2FA).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => '2FA menggabungkan sesuatu yang kamu tahu (password) dan sesuatu yang kamu miliki (kode OTP di ponsel pintar).',
                        'explanation_distractors' => 'Single Sign-On untuk sekali masuk, sedangkan auto-login dan skip password mengabaikan keamanan.',
                    ],
                    [
                        'stem' => 'Tindakan perundungan, pelecehan, atau penghinaan yang dilakukan seseorang kepada orang lain melalui media digital disebut...',
                        'correct' => 'Cyberbullying (Perundungan Siber).',
                        'distractors' => [
                            'Cyber Defense pertahanan.',
                            'Digital Marketing promosi.',
                            'E-Commerce perdagangan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi tindakan cyberbullying.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Cyberbullying adalah intimidasi verbal atau psikologis berulang yang memanfaatkan perangkat elektronik dan media online.',
                        'explanation_distractors' => 'Pilihan lainnya adalah kegiatan perlindungan siber, pemasaran produk, atau transaksi belanja online.',
                    ],
                    [
                        'stem' => 'Kode rahasia sekali pakai yang dikirimkan melalui SMS atau aplikasi autentikator dan hanya berlaku selama beberapa menit disebut...',
                        'correct' => 'OTP (One-Time Password).',
                        'distractors' => [
                            'PIN ATM tetap.',
                            'Nomor Induk Siswa Nasional.',
                            'Nomor seri laptop.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi kode OTP pada keamanan transaksi.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'OTP bersifat dinamis dan kedaluwarsa cepat untuk mencegah penyalahgunaan saat proses verifikasi identitas.',
                        'explanation_distractors' => 'PIN ATM dan NISN bersifat statis jangka panjang, sedangkan nomor seri adalah identitas fisik mesin.',
                    ],
                    [
                        'stem' => 'Tata krama kesopanan dan etika pergaulan yang disepakati bersama dalam berkomunikasi di dunia digital dikenal dengan istilah...',
                        'correct' => 'Netiket (Netiquette / Network Etiquette).',
                        'distractors' => [
                            'Firewall regulasi.',
                            'Bandwidth etika.',
                            'Hosting protokol.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep netiket dalam komunikasi digital.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Netiket mengatur norma kesantunan, penghargaan privasi, dan etika berbahasa antarpengguna di ruang siber.',
                        'explanation_distractors' => 'Firewall adalah dinding keamanan jaringan, bandwidth kapasitas transmisi data, dan hosting server penyimpanan web.',
                    ],
                    [
                        'stem' => 'Tindakan mengambil ide, tulisan, atau karya cipta orang lain lalu mengakuinya sebagai karya buatan sendiri disebut...',
                        'correct' => 'Plagiarisme.',
                        'distractors' => [
                            'Apresiasi seni.',
                            'Kolaborasi terbuka.',
                            'Inovasi mandiri.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi pelanggaran integritas akademik plagiarisme.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Plagiarisme melanggar kejujuran ilmiah karena mencuri hak moral pencipta karya tanpa izin atau atribusi yang sah.',
                        'explanation_distractors' => 'Apresiasi menghormati karya orang lain, kolaborasi bekerja bersama, dan inovasi menghasilkan gagasan orisinal.',
                    ],
                    [
                        'stem' => 'Kewajiban meminta persetujuan seseorang sebelum mempublikasikan rekaman video atau foto pribadinya ke internet didasarkan pada prinsip...',
                        'correct' => 'Hak privasi dan izin (consent).',
                        'distractors' => [
                            'Kewajiban promosi gratis.',
                            'Aturan jual beli barang.',
                            'Perjanjian sewa menyewa.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan prinsip izin privasi (consent).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Setiap individu memiliki hak otonomi atas penyebaran citra diri dan data pribadinya di ruang publik virtual.',
                        'explanation_distractors' => 'Pilihan lainnya mengatur transaksi komersial dan kebendaan fisik.',
                    ],
                    [
                        'stem' => 'Salah satu portal situs resmi yang disediakan oleh masyarakat dan pemeriksa fakta untuk memverifikasi kebenaran berita di Indonesia adalah...',
                        'correct' => 'Cekfakta.com atau TurnBackHoax.id.',
                        'distractors' => [
                            'Situs unduhan game bajakan.',
                            'Situs judi online luar negeri.',
                            'Blog pribadi anonim tanpa identitas penulis.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi kanal verifikasi berita resmi anti-hoaks.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Cekfakta dan TurnBackHoax dikelola oleh koalisi jurnalis dan komunitas pemeriksa fakta bersertifikat internasional (IFCN).',
                        'explanation_distractors' => 'Situs bajakan dan blog anonim sering kali menjadi sumber penyebaran malware dan hoaks.',
                    ],
                    [
                        'stem' => 'Menulis seluruh pesan obrolan atau email dengan menggunakan HURUF BESAR SEMUA (CAPITAL LOCK) dalam etika netiket diartikan sebagai...',
                        'correct' => 'Tindakan tidak sopan yang mencerminkan nada berteriak atau marah kepada penerima pesan.',
                        'distractors' => [
                            'Bentuk penghormatan tertinggi kepada guru dan teman.',
                            'Cara resmi agar file email terkirim sepuluh kali lebih cepat.',
                            'Syarat wajib agar pesan email tidak dianggap spam oleh server.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali makna tipografi netiket penggunaan huruf kapital penuh.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Dasar)',
                        'explanation_correct' => 'Dalam konvensi netiket global, all-caps melambangkan intonasi berteriak keras dan dinilai agresif.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami konvensi etika komunikasi teks digital.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Sebelum mengunggah foto kegiatan bersama teman-teman ke platform publik media sosial, etika digital yang wajib kamu lakukan adalah...',
                        'correct' => 'Meminta persetujuan atau izin dari teman-teman yang berada di dalam foto tersebut.',
                        'distractors' => [
                            'Menandai lokasi rumah tinggal setiap teman secara detail di peta publik.',
                            'Mengunggah foto tanpa izin disertai komentar yang merendahkan.',
                            'Menghapus nama akun pemilik foto yang asli sebelum diunggah.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan etika persetujuan privasi pada publikasi konten.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Meminta izin merupakan bentuk penghormatan mendasar terhadap hak privasi orang lain di ruang publik.',
                        'explanation_distractors' => 'Pilihan lainnya melanggar privasi dan tata krama komunikasi digital.',
                    ],
                    [
                        'stem' => 'Ketika kamu menerima tautan (link) mencurigakan dari nomor tidak dikenal yang meminta kamu memasukkan kata sandi akun, tindakan paling aman adalah...',
                        'correct' => 'Mengabaikan tautan tersebut dan tidak memasukkan data pribadi apa pun.',
                        'distractors' => [
                            'Segera mengeklik tautan tersebut dan mengisi seluruh data pribadi.',
                            'Meneruskan tautan mencurigakan tersebut ke seluruh grup pertemanan.',
                            'Menonaktifkan pelindung antivirus pada perangkat komputer atau ponsel.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan respons keamanan pada tautan mencurigakan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Mengabaikan dan tidak merespons tautan mencurigakan mencegah kebocoran data pada skenario phishing.',
                        'explanation_distractors' => 'Pilihan pengecoh membahayakan keamanan data pribadi dan memperluas penyebaran ancaman.',
                    ],
                    [
                        'stem' => 'Langkah terbaik untuk mengamankan akun digital pribadi dari upaya pengambilalihan akun secara ilegal adalah...',
                        'correct' => 'Mengaktifkan fitur verifikasi dua langkah (two-factor authentication / 2FA).',
                        'distractors' => [
                            'Membagikan kata sandi kepada teman sebangku agar bisa saling menjaga akun.',
                            'Menggunakan komputer umum warnet tanpa pernah melakukan logout akun.',
                            'Menonaktifkan seluruh notifikasi keamanan pada pengaturan akun.',
                        ],
                        'indicator' => 'Peserta didik mampu mengaplikasikan perlindungan autentikasi ganda 2FA.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Autentikasi dua langkah memberikan lapisan pertahanan ekstra meskipun kata sandi utama diketahui peretas.',
                        'explanation_distractors' => 'Pilihan lainnya memperbesar risiko pengambilalihan akun.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menambahkan lagu atau musik latar pada konten video yang akan dipublikasikan ke internet, tindakan yang benar adalah...',
                        'correct' => 'Memilih lagu bebas royalti (royalty-free) atau yang berlisensi Creative Commons dengan mencantumkan atribusi.',
                        'distractors' => [
                            'Mengunduh musik berbayar tanpa izin lalu mengklaimnya sebagai karya ciptaan sendiri.',
                            'Menghapus judul lagu asli agar tidak terdeteksi oleh sistem hak cipta.',
                            'Mengabaikan izin hak cipta karena menganggap video dibuat untuk tugas sekolah.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan lisensi hak cipta musik pada konten digital.',
                        'sub_level' => 'C3 - MOTS (Penerapan Lisensi)',
                        'explanation_correct' => 'Karya berlisensi Creative Commons atau royalty-free sah digunakan secara legal dengan mengikuti ketentuan lisensinya.',
                        'explanation_distractors' => 'Penggunaan tanpa lisensi melanggar hak kekayaan intelektual pencipta.',
                    ],
                    [
                        'stem' => 'Setelah selesai menggunakan komputer di laboratorium sekolah atau fasilitas umum, tindakan perlindungan privasi yang wajib dilakukan adalah...',
                        'correct' => 'Keluar (log out) dari seluruh akun pribadi dan menghapus riwayat peramban (browser history).',
                        'distractors' => [
                            'Menyimpan kata sandi secara otomatis pada browser komputer umum.',
                            'Membiarkan akun media sosial tetap terbuka di layar monitor laboratorium.',
                            'Mematikan monitor tanpa menutup sesi login akun pada peramban.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur penutupan sesi aman di fasilitas umum.',
                        'sub_level' => 'C3 - MOTS (Penerapan Privasi)',
                        'explanation_correct' => 'Melakukan logout dan membersihkan cache riwayat peramban mencegah pengguna berikutnya mengakses akun kita.',
                        'explanation_distractors' => 'Membiarkan sesi terbuka membuka celah penyalahgunaan akun secara langsung.',
                    ],
                    [
                        'stem' => 'Jika seorang teman mengirimkan pesan pribadi yang bersifat rahasia, etika kewargaan digital yang wajib kamu jaga adalah...',
                        'correct' => 'Menjaga kerahasiaan pesan tersebut dan tidak menyebarkannya ke ruang publik tanpa izin.',
                        'distractors' => [
                            'Menyebarkan tangkapan layar (screenshot) pesan tersebut ke media sosial untuk konsumsi umum.',
                            'Menjual informasi rahasia tersebut kepada pihak ketiga.',
                            'Mengubah isi pesan rahasia tersebut dan meneruskannya ke grup kelas.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan kerahasiaan informasi personal dalam komunikasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Menjaga kerahasiaan komunikasi privat adalah kewajiban etis mendasar warga digital yang bertanggung jawab.',
                        'explanation_distractors' => 'Membagikan pesan privat tanpa izin merupakan pelanggaran etika serius.',
                    ],
                    [
                        'stem' => 'Jika kamu menemukan sebuah berita di grup media sosial yang menyebutkan besok sekolah libur nasional tetapi tidak ada cap resmi, tindakan yang benar adalah...',
                        'correct' => 'Melakukan konfirmasi langsung kepada wali kelas atau mengecek surat edaran resmi di situs web sekolah.',
                        'distractors' => [
                            'Langsung membagikan berita tersebut ke semua grup keluarga dengan tanda seru.',
                            'Memutuskan untuk tidak masuk sekolah tanpa konfirmasi ke guru.',
                            'Membuat poster pengumuman palsu dan menempelkannya di gerbang sekolah.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan verifikasi informasi terhadap kabar desas-desus.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Mengonfirmasi kepada pihak otoritatif mencegah kepanikan dan penyebaran disinformasi.',
                        'explanation_distractors' => 'Menyebarkan kabar tanpa verifikasi merugikan proses belajar mengajar.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk membuat kata sandi yang mudah kamu ingat namun tetap sulit ditebak oleh orang lain atau robot peretas adalah...',
                        'correct' => 'Menggunakan metode passphrase (menggabungkan empat kata acak unik disertai variasi angka dan simbol khusus).',
                        'distractors' => [
                            'Menuliskan kata \'katasandi\' dengan huruf kecil semua.',
                            'Menggunakan nama hewan peliharaan tanpa variasi karakter apa pun.',
                            'Menuliskan kata sandi pada selembar kertas dan menempelkannya di layar monitor.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan teknik pembuatan passphrase yang aman.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Passphrase panjang (contoh: Kopi!Hijau#2026) memiliki panjang karakter tinggi dan sangat tahan terhadap serangan kamus (dictionary attack).',
                        'explanation_distractors' => 'Kata sandi pendek atau menempelkan catatan di monitor sangat mudah dibobol.',
                    ],
                    [
                        'stem' => 'Ketika melihat teman sekelasmu menjadi korban ejekan dan perundungan siber (cyberbullying) di kolom komentar media sosial, tindakan terbaikmu adalah...',
                        'correct' => 'Mendukung temanmu secara moral, menyimpan bukti tangkapan layar, dan melaporkan kejadian kepada guru bimbingan konseling atau orang tua.',
                        'distractors' => [
                            'Ikut membagikan komentar ejekan agar tidak dijauhi oleh kelompok perundung.',
                            'Menertawakan temanmu di depan kelas saat jam istirahat.',
                            'Membalas perundung dengan kata-kata makian kasar yang memicu pertengkaran.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan tindakan respons konstruktif terhadap insiden cyberbullying.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Menjadi upstander (pembela korban) dengan mendokumentasikan bukti dan melapor ke otoritas sekolah menghentikan siklus kekerasan.',
                        'explanation_distractors' => 'Ikut merundung atau membalas makian memperburuk situasi kekerasan siber.',
                    ],
                    [
                        'stem' => 'Tindakan pencegahan paling efektif agar smartphone tidak terinfeksi virus atau spyware berbahaya saat berselancar di internet adalah...',
                        'correct' => 'Hanya mengunduh aplikasi dari toko resmi (seperti Google Play Store atau App Store) dan selalu memperbarui sistem keamanan.',
                        'distractors' => [
                            'Mengunduh file berekstensi .apk bajakan dari tautan grup obrolan gelap.',
                            'Mematikan semua fitur pemindaian keamanan bawaan pada perangkat.',
                            'Mengeklik semua iklan pop-up yang menjanjikan hadiah uang gratis.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan kebiasaan unduh aplikasi yang aman.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Toko aplikasi resmi memindai kode aplikasi secara berkala untuk memitigasi penyusupan malware.',
                        'explanation_distractors' => 'File APK bajakan dan iklan pop-up merupakan sarang utama penyebaran trojan dan spyware.',
                    ],
                    [
                        'stem' => 'Jika kamu menemukan sebuah artikel blog yang sangat bagus dan ingin kamu kutip ke dalam makalah tugas sekolah, cara penulisan yang benar adalah...',
                        'correct' => 'Menuliskan kutipan tersebut dalam tanda petik serta mencantumkan nama penulis, judul artikel, dan tautan sumber aslinya di daftar pustaka.',
                        'distractors' => [
                            'Menyalin seluruh artikel tanpa mengubah apa pun dan menuliskan nama sendiri sebagai penulisnya.',
                            'Mengubah beberapa kata saja menggunakan kamus sinonim tanpa mencantumkan sumber.',
                            'Menyalin artikel tersebut lalu mengklaimnya sebagai ilham mimpi pribadi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan teknik sitasi dan atribusi karya tulis ilmiah.',
                        'sub_level' => 'C3 - MOTS (Penerapan Lisensi)',
                        'explanation_correct' => 'Sitasi ilmiah yang jujur memperkaya karya tugas sekaligus menghormati hak cipta intelektual penulis asli.',
                        'explanation_distractors' => 'Menyalin tanpa sumber adalah tindakan plagiarisme yang melanggar integritas akademik.',
                    ],
                    [
                        'stem' => 'Saat menyambungkan laptop ke jaringan Wi-Fi publik di kedai kopi untuk mengerjakan tugas, tindakan pengamanan privasi yang paling tepat adalah...',
                        'correct' => 'Menghindari melakukan transaksi keuangan sensitif dan memastikan browsing menggunakan protokol aman HTTPS atau VPN terpercaya.',
                        'distractors' => [
                            'Membuka pengaturan sharing folder komputer ke mode publik terbuka tanpa proteksi.',
                            'Mematikan aplikasi firewall pada laptop agar koneksi terasa lebih kencang.',
                            'Membagikan seluruh dokumen pribadi kepada perangkat lain di jaringan tersebut.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan protokol kehati-hatian pada Wi-Fi publik.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Jaringan Wi-Fi publik rentan penyadapan data unencrypted, sehingga transaksi sensitif wajib dihindari atau dilindungi VPN.',
                        'explanation_distractors' => 'Membuka folder sharing dan mematikan firewall membuka pintu komputer bagi penyusup di jaringan yang sama.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menjual ponsel pintar lamamu kepada orang lain, langkah perlindungan privasi yang wajib kamu lakukan sebelumnya adalah...',
                        'correct' => 'Mencadangkan data penting, melakukan keluar akun (sign out), dan melakukan Reset ke Pengaturan Pabrik (Factory Reset).',
                        'distractors' => [
                            'Cukup menghapus satu folder foto lalu langsung menyerahkan ponsel tersebut.',
                            'Mengganti casing luar ponsel agar terlihat seperti baru tanpa menyentuh isi memori.',
                            'Membiarkan akun surel dan media sosial tetap aktif agar pembeli baru senang.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pembersihan data menyeluruh sebelum pelepasan perangkat.',
                        'sub_level' => 'C3 - MOTS (Penerapan Privasi)',
                        'explanation_correct' => 'Factory reset membersihkan kunci enkripsi dan data akun personal secara menyeluruh dari chip penyimpanan internal.',
                        'explanation_distractors' => 'Menghapus foto saja menyisakan data akun, pesan, dan jejak privat yang mudah dipulihkan pembeli baru.',
                    ],
                    [
                        'stem' => 'Ketika bergabung dalam grup obrolan daring kelas bersama bapak/ibu guru dan teman-teman, etika netiket yang wajib kamu terapkan adalah...',
                        'correct' => 'Menggunakan bahasa yang sopan, menghargai waktu istirahat malam, dan hanya membagikan informasi yang relevan dengan pembelajaran.',
                        'distractors' => [
                            'Mengirimkan stiker lucu terus-menerus tanpa henti di tengah penjelasan materi oleh guru.',
                            'Mengunggah tautan iklan produk komersial yang tidak berhubungan dengan sekolah.',
                            'Membahas rahasia pribadi teman lain untuk dijadikan lelucon di dalam grup.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan netiket komunikasi formal di grup sekolah.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Grup belajar sekolah adalah ruang akademik resmi yang menuntut ketertiban, kesantunan, dan relevansi informasi.',
                        'explanation_distractors' => 'Spamming stiker dan membahas privasi teman merusak iklim komunikasi belajar.',
                    ],
                    [
                        'stem' => 'Jika kamu menemukan celah keamanan pada situs web sekolah yang membuat nilai ulangan siswa bisa diubah, tindakan beretika yang harus kamu ambil adalah...',
                        'correct' => 'Melaporkan temuan celah keamanan tersebut secara rahasia dan santun kepada guru TIK atau administrator sekolah agar diperbaiki.',
                        'distractors' => [
                            'Mengubah nilai diri sendiri dan teman-teman menjadi nilai sempurna 100.',
                            'Menyebarkan cara membobol situs web tersebut ke media sosial secara terbuka.',
                            'Menghapus seluruh database sekolah agar ujian dibatalkan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan etika pelaporan kerentanan (responsible disclosure).',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Prinsip responsible disclosure membantu pengelola menutup celah keamanan demi kebaikan bersama tanpa merugikan sistem.',
                        'explanation_distractors' => 'Memanfaatkan celah untuk memanipulasi data adalah kejahatan siber yang melanggar hukum.',
                    ],
                    [
                        'stem' => 'Cara aman yang paling tepat dilakukan saat kamu menerima email dari bank yang meminta pembaruan nomor rekening melalui formulir lampiran adalah...',
                        'correct' => 'Menghubungi layanan pelanggan resmi bank atau mengunjungi kantor cabang terdekat untuk memastikan keaslian informasi.',
                        'distractors' => [
                            'Segera mengisi formulir lampiran tersebut dengan nomor PIN kartu debit.',
                            'Mengirimkan foto buku tabungan dan foto KTP ke alamat email pengirim.',
                            'Menghapus akun tabungan bank tersebut.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan mitigasi penipuan email phishing perbankan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Bank resmi tidak pernah meminta informasi sensitif PIN/CVV melalui email; verifikasi saluran mandiri adalah langkah paling aman.',
                        'explanation_distractors' => 'Mengisi formulir email palsu berakibat langsung pada pembobolan dana nasabah.',
                    ],
                    [
                        'stem' => 'Tindakan yang harus kamu lakukan jika akun media sosialmu mendadak memposting iklan barang terlarang tanpa kamu lakukan adalah...',
                        'correct' => 'Segera mengganti kata sandi akun melalui perangkat aman, mencabut izin aplikasi pihak ketiga yang mencurigakan, dan mengaktifkan 2FA.',
                        'distractors' => [
                            'Membiarkan postingan tersebut karena merasa bukan diri sendiri yang mengunggahnya.',
                            'Mematikan layar smartphone dan tidak menyalakannya selama seminggu.',
                            'Membeli produk barang terlarang yang diposting di akun tersebut.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pemulihan akun yang diretas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Mencabut token akses pihak ketiga dan mengubah kata sandi memutus kendali penyerang atas akun korban.',
                        'explanation_distractors' => 'Membiarkan akun diretas mencemari reputasi dan berpotensi memakan korban penipuan baru.',
                    ],
                    [
                        'stem' => 'Saat membuat video dokumentasi kegiatan ekstrakurikuler sekolah untuk diunggah ke kanal YouTube sekolah, etika pencantuman nama yang benar adalah...',
                        'correct' => 'Mencantumkan daftar nama anggota tim produksi, nama pembina, dan sumber aset musik/gambar di bagian kredit penutup (credits).',
                        'distractors' => [
                            'Hanya menuliskan nama ketua tim dengan huruf besar dan mengabaikan seluruh anggota lain.',
                            'Menghapus semua kredit agar video terlihat seperti produksi studio film Hollywood.',
                            'Menyembunyikan informasi pembuat karya.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan etika pencantuman kredit karya multimedia kolaboratif.',
                        'sub_level' => 'C3 - MOTS (Penerapan Etika)',
                        'explanation_correct' => 'Kredit penutup mengakui kontribusi setiap individu secara adil dan menunjukkan akuntabilitas karya.',
                        'explanation_distractors' => 'Menghapus kontribusi rekan tim mencerminkan sikap egois yang melanggar etika kerja sama.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Seorang siswa menemukan bahwa akun emailnya mengirimkan pesan spam mencurigakan tanpa sepengetahuannya. Langkah analisis dan penanganan terbaik yang harus dilakukan adalah...',
                        'correct' => 'Segera mengganti kata sandi akun, memeriksa daftar sesi perangkat yang aktif, dan mengaktifkan verifikasi dua langkah (2FA).',
                        'distractors' => [
                            'Menghapus semua kontak di buku telepon dan tidak lagi menggunakan internet.',
                            'Mengirimkan balasan permohonan maaf ke setiap alamat spam tersebut.',
                            'Memformat ulang harddisk laptop tanpa pernah memperbarui kata sandi akun.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis titik kerentanan dan merumuskan mitigasi pada insiden kompromi akun.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Keamanan)',
                        'explanation_correct' => 'Penggantian kredensial, terminasi sesi liar, dan pengaktifan 2FA merupakan penanganan tuntas pada insiden pembajakan akun.',
                        'explanation_distractors' => 'Tindakan pengecoh tidak menyelesaikan akar masalah pembajakan kredensial.',
                    ],
                    [
                        'stem' => 'Mengapa mengunggah foto boarding pass pesawat atau tiket konser ke media sosial publik dinilai berbahaya bagi keselamatan data pribadi?',
                        'correct' => 'Karena barcode atau QR code pada tiket memuat kode reservasi dan data identitas pribadi yang dapat diekstrak oleh pelaku kejahatan.',
                        'distractors' => [
                            'Karena dapat menyebabkan baterai perangkat ponsel pintar langsung rusak permanen.',
                            'Karena tiket tersebut otomatis menjadi tidak berlaku untuk digunakan bepergian.',
                            'Karena warna foto tiket akan merusak tampilan estetika profil media sosial.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis potensi kebocoran data tersembunyi pada kode batang tiket.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Privasi)',
                        'explanation_correct' => 'Barcode/QR code memuat data PII (Personally Identifiable Information) yang rentan dieksploitasi untuk pengambilalihan akun atau penipuan.',
                        'explanation_distractors' => 'Pilihan pengecoh mengasumsikan dampak fisik mustahil yang tidak berhubungan dengan data.',
                    ],
                    [
                        'stem' => 'Sebuah aplikasi permainan sederhana meminta izin akses ke daftar kontak telepon, kamera, mikrofon, dan lokasi GPS secara penuh. Evaluasi keamanan yang paling tepat adalah...',
                        'correct' => 'Permintaan izin tersebut tidak relevan dengan fungsi permainan sehingga berpotensi menyalahgunakan data pribadi dan sebaiknya ditolak.',
                        'distractors' => [
                            'Semua aplikasi permainan memang wajib meminta akses penuh ke kontak dan kamera pengguna.',
                            'Izin harus segera diberikan agar permainan berjalan lebih cepat dan mendapat skor tinggi.',
                            'Aplikasi tersebut pasti aman karena sudah terpasang di perangkat ponsel.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi proporsionalitas hak akses data aplikasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Risiko)',
                        'explanation_correct' => 'Prinsip \'least privilege\' menuntut aplikasi hanya meminta izin yang mutlak diperlukan untuk fungsionalitas intinya.',
                        'explanation_distractors' => 'Pilihan pengecoh menormalisasi izin berlebih yang membahayakan privasi pengguna.',
                    ],
                    [
                        'stem' => 'Jika kamu menerima pesan informasi mengejutkan yang disertai ajakan \'Sebarkan segera ke seluruh grup\', langkah berpikir kritis yang harus kamu ambil adalah...',
                        'correct' => 'Memeriksa keaslian sumber berita, tanggal publikasi, serta memverifikasi informasinya melalui situs cek fakta resmi.',
                        'distractors' => [
                            'Langsung membagikan pesan tersebut ke semua grup pertemanan agar menjadi yang pertama memberi kabar.',
                            'Mengubah judul pesan menjadi lebih heboh sebelum meneruskannya ke orang lain.',
                            'Mempercayai pesan tersebut sepenuhnya karena dikirim oleh teman dekat.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi validitas informasi digital dan memitigasi hoaks.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Informasi)',
                        'explanation_correct' => 'Klarifikasi melalui sumber otoritatif dan uji silang fakta mencegah penyebaran disinformasi dan hoaks.',
                        'explanation_distractors' => 'Tindakan pengecoh merupakan pemicu utama penyebaran kabar bohong di masyarakat.',
                    ],
                    [
                        'stem' => 'Apa dampak jangka panjang dari rekam jejak digital (digital footprint) negatif yang ditinggalkan seseorang di media sosial?',
                        'correct' => 'Unggahan atau komentar negatif dapat tersimpan permanen dan berpotensi merugikan reputasi serta seleksi pendidikan atau karier di masa depan.',
                        'distractors' => [
                            'Resolusi layar komputer pengguna akan otomatis menurun kualitasnya secara drastis.',
                            'Semua file dokumen di dalam laptop akan berubah format menjadi teks acak.',
                            'Sinyal jaringan internet rumah akan terputus secara otomatis oleh penyedia layanan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis dampak reputasi masa depan dari jejak digital negatif.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Dampak)',
                        'explanation_correct' => 'Data di internet mudah diarsipkan pihak ketiga dan sering ditinjau dalam proses rekrutmen profesional maupun akademis.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang kerusakan perangkat fisik yang tidak masuk akal.',
                    ],
                    [
                        'stem' => 'Analisis risiko dari penggunaan kata sandi yang sama persis untuk semua akun media sosial, surel, dan perbankan digital adalah...',
                        'correct' => 'Jika salah satu layanan mengalami kebocoran data, pelaku peretasan dapat dengan mudah membobol seluruh akun lainnya secara bersamaan (credential stuffing).',
                        'distractors' => [
                            'Koneksi internet akan menjadi dua kali lebih lambat saat membuka browser.',
                            'Setiap akun akan saling menggabungkan pesan obrolan secara otomatis.',
                            'Akun-akun tersebut otomatis terhapus dalam waktu dua puluh empat jam.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis kerentanan daur ulang kata sandi (credential stuffing).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kerentanan)',
                        'explanation_correct' => 'Daur ulang kata sandi (password reuse) memperluas dampak kebocoran satu situs ke seluruh aset digital pengguna.',
                        'explanation_distractors' => 'Pilihan pengecoh tidak sesuai dengan cara kerja sistem keamanan digital.',
                    ],
                    [
                        'stem' => 'Seorang pengguna menerima email dari alamat \'admin@seko1ah-negeri.xyz\' yang meminta login untuk melihat hasil ujian. Analisis kejanggalan dari email tersebut adalah...',
                        'correct' => 'Domain pengirim menggunakan nama tiruan (typosquatting) dengan angka \'1\' menggantikan huruf \'l\' dan domain tidak resmi (.xyz bukan .sch.id).',
                        'distractors' => [
                            'Email tersebut diketik pada hari Senin yang merupakan hari masuk sekolah.',
                            'Isi pesan email menggunakan huruf berwarna hitam standar.',
                            'Pesan email dapat dibuka tanpa memasukkan kode OTP.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis indikator alamat email phishing typosquatting.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Forensik)',
                        'explanation_correct' => 'Teknik typosquatting memanipulasi kemiripan visual huruf untuk mengelabui mata korban agar mengira alamat tersebut resmi.',
                        'explanation_distractors' => 'Hari pengiriman dan warna teks hitam adalah karakteristik email normal, bukan tanda kejanggalan domain.',
                    ],
                    [
                        'stem' => 'Mengapa fitur \'Remember Password\' (Ingat Kata Sandi) pada peramban web komputer laboratorium sekolah sangat berbahaya jika diaktifkan?',
                        'correct' => 'Karena siswa berikutnya yang menggunakan komputer tersebut dapat langsung mengakses akun tanpa perlu memasukkan kata sandi.',
                        'distractors' => [
                            'Karena akan membuat keyboard komputer laboratorium mengalami kerusakan fisik pada tombol spasi.',
                            'Karena memori browser akan meledak jika menyimpan lebih dari sepuluh kata sandi.',
                            'Karena layar monitor laboratorium akan terkunci selamanya.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi risiko penyimpanan kredensial pada komputer publik.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Risiko)',
                        'explanation_correct' => 'Fitur Remember Password menyimpan kredensial pada profil peramban lokal yang dapat diakses siapa pun di terminal fisik tersebut.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi kerusakan fisik yang mustahil.',
                    ],
                    [
                        'stem' => 'Analisis perbedaan konsekuensi hukum antara penggunaan konten berlisensi Creative Commons (CC-BY) dengan pembajakan konten berhak cipta penuh (Copyright All Rights Reserved) adalah...',
                        'correct' => 'Konten CC-BY secara sah mengizinkan pemakaian dan modifikasi selama nama pencipta dicantumkan, sedangkan pembajakan melanggar hukum hak cipta dan dapat dikenai sanksi pidana/denda.',
                        'distractors' => [
                            'Kedua jenis konten tersebut sama-sama melarang penggunaan oleh siswa sekolah.',
                            'Konten berhak cipta penuh selalu boleh digunakan gratis tanpa perlu meminta izin penciptanya.',
                            'Lisensi CC-BY hanya berlaku untuk organisasi militer internasional.',
                        ],
                        'indicator' => 'Peserta didik mampu membandingkan status legal lisensi Creative Commons vs All Rights Reserved.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Hukum Digital)',
                        'explanation_correct' => 'Creative Commons memberikan izin di muka (prior permission) dengan syarat tertentu, berbeda dari doktrin hak cipta eksklusif.',
                        'explanation_distractors' => 'Pilihan lainnya memutarbalikkan asas hukum kekayaan intelektual.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat situs tiruan yang persis dengan laman login portal nilai sekolah untuk mengumpulkan kata sandi teman-temannya. Evaluasi terhadap perbuatan ini berdasarkan UU ITE adalah...',
                        'correct' => 'Perbuatan tersebut merupakan tindak pidana kejahatan siber (ilegal akses dan rekayasa manipulasi data) yang diancam hukuman penjara dan denda.',
                        'distractors' => [
                            'Perbuatan tersebut hanyalah candaan biasa antarteman yang tidak memiliki konsekuensi hukum apa pun.',
                            'Perbuatan tersebut dinilai sebagai inovasi teknologi yang patut mendapatkan penghargaan dari sekolah.',
                            'Siswa tersebut berhak memiliki semua kata sandi temannya karena membuat situs sendiri.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi konsekuensi hukum peretasan berdasarkan regulasi ITE.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Hukum)',
                        'explanation_correct' => 'Pembuatan portal pancingan phishing melanggar pasal akses ilegal dan manipulasi dokumen elektronik dalam UU ITE.',
                        'explanation_distractors' => 'Kejahatan siber tidak dapat dibenarkan sebagai lelucon atau inovasi legal.',
                    ],
                    [
                        'stem' => 'Mengapa deepfake (video manipulasi wajah berbasis kecerdasan buatan) dipandang sebagai ancaman serius bagi keselamatan privasi dan kebenaran informasi?',
                        'correct' => 'Karena deepfake dapat memalsukan ucapan dan tindakan seseorang secara sangat meyakinkan untuk memfitnah atau merusak reputasi korban.',
                        'distractors' => [
                            'Karena deepfake menyebabkan resolusi kamera ponsel korban otomatis menurun.',
                            'Karena video deepfake tidak bisa diputar menggunakan pemutar video standar.',
                            'Karena deepfake hanya dapat dibuat menggunakan komputer berdaya nuklir.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis ancaman disinformasi manipulasi sintetis deepfake.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Ancaman Digital)',
                        'explanation_correct' => 'Sintesis citra hiper-realistis tanpa izin korban mengancam pembuktian fakta dan privasi citra personal di era digital.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang kendala pemutaran atau tenaga nuklir yang keliru.',
                    ],
                    [
                        'stem' => 'Dalam sebuah proyek kelompok pembuatan poster, salah satu anggota mengunduh foto komersial bertanda air (watermark) lalu menghapus tanda air tersebut menggunakan kuas editor. Evaluasi etika terhadap tindakan ini adalah...',
                        'correct' => 'Tindakan tersebut tidak etis dan melanggar hukum hak cipta karena sengaja menghilangkan informasi manajemen hak cipta pembuat foto.',
                        'distractors' => [
                            'Tindakan tersebut sangat terpuji karena menghemat anggaran pembelian lisensi resmi.',
                            'Menghapus tanda air diperbolehkan asalkan foto tersebut tidak dijual ke luar negeri.',
                            'Tindakan tersebut otomatis menjadikan siswa tersebut pemilik hak cipta yang baru.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi pelanggaran penghapusan watermark hak cipta.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Etika)',
                        'explanation_correct' => 'Watermark adalah penanda identitas kepemilikan; menghapusnya secara sepihak merupakan pelanggaran hak moral pencipta karya.',
                        'explanation_distractors' => 'Pilihan lainnya melegalkan pencurian kekayaan intelektual.',
                    ],
                    [
                        'stem' => 'Seorang siswa tanpa sengaja menemukan dokumen daftar riwayat kesehatan temannya di folder komputer laboratorium. Tindakan etis berlandaskan perlindungan data pribadi (UU PDP) adalah...',
                        'correct' => 'Segera menutup dokumen tersebut, menjaga kerahasiaannya, dan melaporkan adanya kebocoran berkas ke guru tanpa menyebarkannya.',
                        'distractors' => [
                            'Mengunduh dokumen tersebut ke flashdisk dan menjadikannya bahan obrolan di kelas.',
                            'Mencetak dokumen tersebut dan menempelkannya di papan pengumuman sekolah.',
                            'Mengirimkan dokumen tersebut ke nomor orang tua teman-teman yang lain.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan tindakan penanganan data pribadi sensitif tidak sengaja terbuka.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Etis)',
                        'explanation_correct' => 'Data kesehatan masuk kategori data pribadi spesifik yang wajib dilindungi kerahasiaannya dari akses publik.',
                        'explanation_distractors' => 'Menyebarkan data medis pribadi adalah pelanggaran berat terhadap privasi dan hukum perlindungan data.',
                    ],
                    [
                        'stem' => 'Analisis penyebab mengapa verifikasi dua langkah (2FA) menggunakan aplikasi Authenticator (seperti Google Authenticator) dinilai jauh lebih aman dibandingkan 2FA melalui SMS adalah...',
                        'correct' => 'SMS rentan terhadap kejahatan SIM Swap (penggandaan kartu SIM oleh peretas) dan penyadapan jaringan seluler, sedangkan Authenticator menghasilkan kode lokal di perangkat.',
                        'distractors' => [
                            'Aplikasi Authenticator tidak membutuhkan baterai ponsel sama sekali untuk bekerja.',
                            'Kode SMS otomatis dihapus oleh penyedia layanan telepon setelah 1 detik.',
                            'Aplikasi Authenticator hanya boleh digunakan oleh pejabat pemerintah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi komparasi keamanan 2FA berbasis TOTP aplikasi vs SMS.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Arsitektur Keamanan)',
                        'explanation_correct' => 'Protokol TOTP (Time-based One-Time Password) pada aplikasi bekerja secara offline di chip ponsel sehingga kebal serangan SIM swap seluler.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami mekanisme daya baterai dan regulasi akses pengguna.',
                    ],
                    [
                        'stem' => 'Ketika sebuah organisasi sekolah mengumpulkan formulir pendaftaran anggota baru, evaluasi penerapan prinsip \'Data Minimization\' (Minimisasi Data) yang paling benar adalah...',
                        'correct' => 'Hanya meminta data yang benar-benar relevan dengan kegiatan organisasi (seperti nama dan nomor kontak), serta tidak meminta data PIN bank atau riwayat medis orang tua.',
                        'distractors' => [
                            'Meminta semua data pribadi siswa selengkap mungkin hingga nomor sertifikat tanah keluarga.',
                            'Mengosongkan formulir pendaftaran tanpa meminta nama siswa.',
                            'Menjual data formulir kepada biro iklan komersial.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi prinsip minimisasi data pada pengumpulan informasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Tata Kelola Data)',
                        'explanation_correct' => 'Prinsip minimisasi data mewajibkan pengumpul data membatasi lingkup data hanya pada apa yang mutlak relevan dengan tujuan pemrosesan.',
                        'explanation_distractors' => 'Meminta data berlebihan atau menjual data melanggar prinsip kepatuhan privasi global.',
                    ],
                    [
                        'stem' => 'Analisis dampak psikologis dan sosial yang ditimbulkan dari fenomena \'Doxing\' (menyebarkan identitas dan alamat rumah seseorang secara publik tanpa izin untuk memicu perundungan) adalah...',
                        'correct' => 'Korban mengalami teror psikologis, ancaman keselamatan fisik di dunia nyata, dan kerusakan reputasi secara tidak adil.',
                        'distractors' => [
                            'Korban akan mendapatkan banyak hadiah gratis dari toko daring di kotanya.',
                            'Koneksi internet di rumah korban akan otomatis mengalami peningkatan bandwidth.',
                            'Ponsel pintar korban akan kebal terhadap serangan virus selamanya.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis bahaya kejahatan siber doxing.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Dampak Sosial)',
                        'explanation_correct' => 'Doxing mengubah konflik virtual menjadi bahaya fisik riil karena membuka data privat korban ke pihak yang berniat jahat.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang dampak positif fiktif yang tidak berdasar.',
                    ],
                    [
                        'stem' => 'Jika seseorang menemukan laptop yang tertinggal di laboratorium sekolah dalam keadaan layar tidak terkunci, evaluasi tindakan yang paling bermoral dan bertanggung jawab adalah...',
                        'correct' => 'Menutup layar laptop tanpa menyentuh file pribadi di dalamnya dan segera menyerahkannya ke ruang guru piket atau satpam sekolah.',
                        'distractors' => [
                            'Membuka galeri foto dan membaca seluruh pesan obrolan pribadi pemilik laptop.',
                            'Memasang aplikasi mata-mata untuk merekam aktivitas pemilik laptop di kemudian hari.',
                            'Menjual laptop tersebut ke pasar barang bekas.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan integritas moral saat menghadapi perangkat tak terkunci.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Moral Digital)',
                        'explanation_correct' => 'Menghormati batas privasi orang lain dan mengembalikan aset kepada pihak berwenang adalah wujud integritas karakter digital.',
                        'explanation_distractors' => 'Mengintip pesan atau memasang spyware adalah pelanggaran etika dan tindak pidana akses ilegal.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa kebiasaan membagikan lokasi secara waktu nyata (real-time location sharing) di media sosial publik sangat berisiko bagi keselamatan fisik remaja adalah...',
                        'correct' => 'Pelaku kejahatan di dunia nyata dapat memetakan pola rutinitas harian korban, mengetahui kapan rumah korban kosong, dan mengintai keberadaan korban.',
                        'distractors' => [
                            'Karena satelit GPS akan mengalami kelebihan beban data dan jatuh ke bumi.',
                            'Karena baterai ponsel pintar akan otomatis terkuras hingga minus sepuluh persen.',
                            'Karena sinyal ponsel akan memicu gempa bumi lokal di sekitar lokasi.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi risiko keselamatan fisik dari penyiaran lokasi real-time.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Risiko Privasi)',
                        'explanation_correct' => 'Data lokasi real-time menjembatani bahaya digital ke dunia nyata (stalking, perampokan, dan penculikan).',
                        'explanation_distractors' => 'Pilihan lainnya mengarang teori konspirasi mustahil tentang satelit dan gempa bumi.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getComputerSystemAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Urutan siklus pemrosesan data yang benar pada sistem komputer adalah...',
                        'correct' => 'Masukan (Input) -> Pemrosesan (Process) -> Keluaran (Output) -> Penyimpanan (Storage).',
                        'distractors' => [
                            'Keluaran (Output) -> Masukan (Input) -> Pemrosesan (Process) -> Pembersihan.',
                            'Penyimpanan -> Masukan -> Keluaran -> Penghapusan.',
                            'Pemrosesan -> Masukan -> Penyimpanan -> Keluaran.',
                        ],
                        'indicator' => 'Peserta didik mampu mengurutkan tahapan siklus input-proses-output.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Siklus I-P-O-S merupakan siklus fundamental komputer dalam mengolah data mentah menjadi informasi bermanfaat.',
                        'explanation_distractors' => 'Pilihan lainnya membalik alur logis pengolahan data.',
                    ],
                    [
                        'stem' => 'Perangkat keras komputer di bawah ini yang berfungsi sebagai perangkat masukan (input device) adalah...',
                        'correct' => 'Keyboard, mouse, dan scanner.',
                        'distractors' => [
                            'Monitor, printer, dan speaker.',
                            'Processor, RAM, dan Motherboard.',
                            'Harddisk, Flashdisk, dan SSD.',
                        ],
                        'indicator' => 'Peserta didik mampu mengelompokkan perangkat masukan (input).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Keyboard, mouse, dan scanner bertugas memasukkan data atau instruksi dari pengguna ke sistem komputer.',
                        'explanation_distractors' => 'Monitor/printer adalah output, processor/RAM adalah pemroses/memori, dan SSD adalah media penyimpanan.',
                    ],
                    [
                        'stem' => 'Komponen utama komputer yang bertindak sebagai otak untuk mengendalikan instruksi dan memproses perhitungan matematika/logika adalah...',
                        'correct' => 'Central Processing Unit (CPU / Processor).',
                        'distractors' => [
                            'Power Supply Unit (PSU).',
                            'Monitor LED.',
                            'Casing Komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi peran CPU.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'CPU adalah unit pemroses pusat yang mengeksekusi instruksi aritmatika dan logika program.',
                        'explanation_distractors' => 'PSU menyalurkan daya listrik, monitor menampilkan gambar, dan casing melindungi fisik komponen.',
                    ],
                    [
                        'stem' => 'Memori utama komputer yang berfungsi menyimpan data dan instruksi sementara saat komputer sedang beroperasi adalah...',
                        'correct' => 'Random Access Memory (RAM).',
                        'distractors' => [
                            'Read Only Memory (ROM).',
                            'Compact Disc (CD).',
                            'Flashdisk USB.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi karakteristik memori kerja RAM.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'RAM menyimpan data sementara (volatile) yang sedang diproses langsung oleh processor.',
                        'explanation_distractors' => 'ROM berisi instruksi booting permanen, sedangkan CD dan Flashdisk adalah penyimpanan eksternal.',
                    ],
                    [
                        'stem' => 'Perangkat keras yang bertugas menampilkan informasi visual hasil pengolahan data komputer kepada pengguna adalah...',
                        'correct' => 'Monitor.',
                        'distractors' => [
                            'Mikrofon.',
                            'Motherboard.',
                            'Harddisk internal.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi monitor.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Monitor adalah perangkat output visual utama untuk menampilkan antarmuka grafis kepada pengguna.',
                        'explanation_distractors' => 'Mikrofon adalah input audio, motherboard papan sirkuit, dan harddisk media penyimpanan.',
                    ],
                    [
                        'stem' => 'Papan sirkuit utama yang menjadi tempat terhubungnya seluruh komponen komputer seperti CPU, RAM, dan kartu grafis disebut...',
                        'correct' => 'Motherboard (Mainboard).',
                        'distractors' => [
                            'Sound Card.',
                            'Heatsink Fan.',
                            'Optical Drive.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali motherboard sebagai papan induk.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Motherboard menjadi tulang punggung penghubung jalur komunikasi data antarkomponen perangkat keras.',
                        'explanation_distractors' => 'Sound card mengolah suara, heatsink mendinginkan suhu, dan optical drive membaca piringan cakram.',
                    ],
                    [
                        'stem' => 'Komponen perangkat keras yang berfungsi mengubah arus listrik bolak-balik (AC) dari stopkontak menjadi arus searah (DC) untuk seluruh komponen komputer adalah...',
                        'correct' => 'Power Supply Unit (PSU).',
                        'distractors' => [
                            'VGA Card grafis.',
                            'Kabel HDMI.',
                            'Flashdisk OTG.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi Power Supply Unit.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'PSU mendistribusikan tegangan daya yang stabil ke motherboard, CPU, drive penyimpanan, dan kipas pendingin.',
                        'explanation_distractors' => 'VGA mengolah grafis, kabel HDMI mentransmisi video/audio, dan flashdisk menyimpan data berkas.',
                    ],
                    [
                        'stem' => 'Chip memori khusus yang berisi program instruksi dasar booting awal komputer (BIOS/UEFI) dan datanya tidak hilang saat listrik mati adalah...',
                        'correct' => 'ROM (Read Only Memory).',
                        'distractors' => [
                            'RAM (Random Access Memory).',
                            'Cache L1.',
                            'Register CPU.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi memori permanen ROM.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'ROM bersifat non-volatile dan memuat firmware dasar yang dijalankan saat pertama kali komputer dinyalakan.',
                        'explanation_distractors' => 'RAM, Cache, dan Register bersifat volatile dan akan terhapus saat catu daya dipadamkan.',
                    ],
                    [
                        'stem' => 'Komponen di dalam CPU yang bertugas melakukan perhitungan aritmatika (seperti penjumlahan) dan operasi logika (seperti perbandingan) adalah...',
                        'correct' => 'ALU (Arithmetic Logic Unit).',
                        'distractors' => [
                            'CU (Control Unit).',
                            'GPU (Graphics Processing Unit).',
                            'Port USB.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi peran unit ALU pada CPU.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'ALU adalah sirkuit digital kalkulator inti di dalam processor yang mengeksekusi operasi matematika biner.',
                        'explanation_distractors' => 'Control Unit mengatur lalu lintas instruksi, GPU mengolah piksel visual, dan USB adalah antarmuka periferal.',
                    ],
                    [
                        'stem' => 'Bagian dari CPU yang bertindak sebagai mandor pengatur lalu lintas data dan pengendali jalannya instruksi adalah...',
                        'correct' => 'Control Unit (CU).',
                        'distractors' => [
                            'Alu pendingin.',
                            'Kabel SATA.',
                            'Heatsink tembaga.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi Control Unit pada CPU.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Control Unit mengambil instruksi dari memori, menerjemahkannya, dan menginstruksikan komponen lain untuk menjalankannya.',
                        'explanation_distractors' => 'Pilihan lainnya adalah komponen pasif penghubung atau pendingin.',
                    ],
                    [
                        'stem' => 'Perangkat keras keluaran (output device) yang berfungsi menghasilkan suara audio dari komputer adalah...',
                        'correct' => 'Speaker atau Headphone.',
                        'distractors' => [
                            'Mikrofon.',
                            'Webcam.',
                            'Stylus pen.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi perangkat output suara audio.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Speaker dan headphone mengubah sinyal gelombang digital audio menjadi gelombang suara yang terdengar telinga.',
                        'explanation_distractors' => 'Mikrofon, webcam, dan stylus pen adalah perangkat masukan (input).',
                    ],
                    [
                        'stem' => 'Perangkat masukan yang biasa digunakan oleh desainer grafis untuk menggambar langsung di layar komputer menggunakan pena digital adalah...',
                        'correct' => 'Pen Tablet (Digitizer / Stylus).',
                        'distractors' => [
                            'Joystick permainan.',
                            'Barcode scanner.',
                            'Printer Laserjet.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi digitizer pen tablet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Digitizer mendeteksi posisi ujung stylus dan tingkat tekanan sentuhan untuk menggambar goresan kuas digital.',
                        'explanation_distractors' => 'Joystick untuk kemudi game, barcode scanner membaca garis produk, dan printer adalah output cetak.',
                    ],
                    [
                        'stem' => 'Satuan frekuensi kecepatan detak komputasi (clock speed) pada prosesor komputer modern dinyatakan dalam satuan...',
                        'correct' => 'GHz (Gigahertz).',
                        'distractors' => [
                            'Kilogram (Kg).',
                            'Meter per detik (m/s).',
                            'Voltase (Volt).',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi satuan clock speed prosesor GHz.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Gigahertz menunjukkan berapa miliar siklus instruksi yang dapat dieksekusi prosesor dalam satu detik.',
                        'explanation_distractors' => 'Kilogram untuk massa berat, m/s untuk kecepatan gerak, dan Volt untuk tegangan listrik.',
                    ],
                    [
                        'stem' => 'Perangkat keras penyimpanan sekunder yang menggunakan piringan logam bermagnet yang berputar untuk menyimpan berkas data adalah...',
                        'correct' => 'HDD (Hard Disk Drive).',
                        'distractors' => [
                            'SSD (Solid State Drive).',
                            'Flashdisk USB.',
                            'MicroSD Card.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali karakteristik mekanik Hard Disk Drive (HDD).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'HDD menyimpan data pada piringan magnetik (platter) yang dibaca oleh jarum mekanis (read/write head).',
                        'explanation_distractors' => 'SSD, Flashdisk, dan MicroSD menggunakan chip memori semikonduktor tanpa piringan berputar.',
                    ],
                    [
                        'stem' => 'Perangkat keras penyimpanan yang menggunakan chip memori flash tanpa komponen bergerak sama sekali sehingga lebih tahan benturan dan cepat adalah...',
                        'correct' => 'SSD (Solid State Drive).',
                        'distractors' => [
                            'Disket floppy disk.',
                            'Piringan CD-ROM.',
                            'Pita kaset magnetik.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi keunggulan teknologi penyimpanan SSD.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'SSD membaca data secara elektrik langsung dari sel chip silikon NAND flash tanpa jeda rotasi mekanis.',
                        'explanation_distractors' => 'Disket, CD-ROM, dan pita kaset adalah media penyimpanan lama berbasis mekanik lambat.',
                    ],
                    [
                        'stem' => 'Port antarmuka standar yang paling banyak digunakan saat ini untuk menghubungkan mouse, keyboard, dan flashdisk ke komputer adalah...',
                        'correct' => 'Port USB (Universal Serial Bus).',
                        'distractors' => [
                            'Port VGA.',
                            'Port Audio Jack.',
                            'Soket listrik AC.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali antarmuka periferal universal USB.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Port USB menjadi standar global plug-and-play untuk berbagai macam perangkat periferal komputer.',
                        'explanation_distractors' => 'VGA untuk tampilan monitor, Audio Jack untuk headphone, dan soket listrik menyuplai daya PLN.',
                    ],
                    [
                        'stem' => 'Port keluaran video resolusi tinggi yang dapat mentransmisikan sinyal gambar sekaligus sinyal suara dalam satu kabel adalah...',
                        'correct' => 'Port HDMI (High-Definition Multimedia Interface).',
                        'distractors' => [
                            'Port VGA kabel biru.',
                            'Port PS/2 bulat.',
                            'Port Serial DB-9.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi port multimedia HDMI.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'HDMI mentransmisikan audio dan video digital definisi tinggi secara terpadu tanpa memerlukan kabel audio terpisah.',
                        'explanation_distractors' => 'VGA analog hanya mentransmisikan video tanpa suara, PS/2 untuk mouse kuno, dan serial DB-9 antarmuka lawas.',
                    ],
                    [
                        'stem' => 'Perangkat lunak khusus yang bertindak sebagai penerjemah agar sistem operasi dapat mengenali dan mengendalikan perangkat keras tertentu (seperti printer baru) disebut...',
                        'correct' => 'Device Driver.',
                        'distractors' => [
                            'Antivirus.',
                            'Web Browser.',
                            'Game Simulator.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan peran device driver perangkat keras.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Sistem)',
                        'explanation_correct' => 'Driver menyediakan antarmuka instruksi standar agar sistem operasi memahami perintah teknis perangkat keras tertentu.',
                        'explanation_distractors' => 'Antivirus menangkal malware, browser menampilkan web, dan game adalah aplikasi hiburan.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Saat kamu mengetik huruf pada keyboard dan huruf tersebut langsung tampil di layar monitor, alur interaksi antarkomponen yang terjadi adalah...',
                        'correct' => 'Keyboard mengirim sinyal input -> CPU memproses kode karakter -> GPU/Monitor menampilkan output visual.',
                        'distractors' => [
                            'Monitor mengirim instruksi langsung ke keyboard tanpa melalui CPU.',
                            'RAM langsung mencetak huruf ke printer tanpa melewati proses CPU.',
                            'Power supply mengubah huruf menjadi gambar tanpa bantuan processor.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan alur interaksi komponen I-P-O pada pengetikan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Interaksi komputer selalu mengalir dari perangkat input menuju CPU/pengolah sebelum dikirim ke penampil output.',
                        'explanation_distractors' => 'Pilihan pengecoh mengabaikan peran sentral pemrosesan CPU.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menyimpan dokumen tugas agar tetap ada dan tidak hilang saat komputer dimatikan, tindakan yang tepat adalah...',
                        'correct' => 'Menyimpan file ke dalam media penyimpanan sekunder (storage) seperti SSD atau Harddisk.',
                        'distractors' => [
                            'Membiarkan dokumen hanya berada di dalam memori sementara RAM.',
                            'Mencabut kabel power komputer secara langsung dari stopkontak.',
                            'Menutup aplikasi lembar kerja tanpa menekan tombol Simpan (Save).',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penyimpanan non-volatile untuk keamanan berkas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Penyimpanan sekunder (SSD/HDD) bersifat non-volatile sehingga data tetap tersimpan saat aliran daya mati.',
                        'explanation_distractors' => 'Membiarkan di RAM atau mencabut daya menyebabkan kehilangan data secara permanen.',
                    ],
                    [
                        'stem' => 'Perangkat keras yang tepat dihubungkan ke komputer jika seorang guru ingin memproyeksikan tampilan layar laptop ke dinding kelas agar terlihat oleh seluruh siswa adalah...',
                        'correct' => 'Proyektor LCD (LCD Projector).',
                        'distractors' => [
                            'Scanner gambar.',
                            'Webcam.',
                            'Barcode reader.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih perangkat keluaran proyektor untuk presentasi kelas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Proyektor LCD memproyeksikan sinyal video keluaran ke bidang layar lebar yang dapat dilihat massal.',
                        'explanation_distractors' => 'Scanner, webcam, dan barcode reader adalah perangkat masukan (input).',
                    ],
                    [
                        'stem' => 'Fungsi utama dari sistem operasi (seperti Windows, Linux, atau macOS) dalam sistem komputer adalah...',
                        'correct' => 'Mengelola sumber daya perangkat keras dan menjembatani komunikasi dengan perangkat lunak aplikasi pengguna.',
                        'distractors' => [
                            'Menyuplai aliran listrik tegangan tinggi ke komponen motherboard.',
                            'Mendinginkan processor saat suhu perangkat naik drastis.',
                            'Membersihkan debu fisik dari dalam komponen laptop.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan fungsi manajemen sistem operasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Sistem operasi bertindak sebagai jembatan pengendali perangkat keras agar aplikasi dapat berjalan teratur.',
                        'explanation_distractors' => 'Pilihan lainnya merupakan fungsi fisik kelistrikan atau perawatan perangkat keras.',
                    ],
                    [
                        'stem' => 'Ketika komputer mulai terasa melambat saat membuka banyak aplikasi secara bersamaan (multitasking), komponen yang paling berpengaruh terhadap kapasitas tampung aplikasi aktif tersebut adalah...',
                        'correct' => 'Kapasitas Random Access Memory (RAM).',
                        'distractors' => [
                            'Resolusi lensa kamera webcam.',
                            'Panjang kabel mouse yang digunakan.',
                            'Daya output speaker audio.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi peran kapasitas RAM pada aktivitas multitasking.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'RAM menampung proses seluruh aplikasi aktif; kapasitas yang mencukupi mencegah komputer mengalami paging lambat.',
                        'explanation_distractors' => 'Webcam, mouse, dan speaker tidak memengaruhi performa penampungan memori komputasi.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin mencetak hasil ketikan tugas dokumen komputer ke atas lembar kertas fisik, perangkat keluaran yang kamu gunakan adalah...',
                        'correct' => 'Printer.',
                        'distractors' => [
                            'Plotter digital.',
                            'Scanner.',
                            'Microphone.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih perangkat keluaran printer fisik untuk cetak tugas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Printer adalah perangkat keluaran keras (hard copy) standar untuk mencetak teks dan gambar pada kertas.',
                        'explanation_distractors' => 'Scanner dan mikrofon adalah perangkat input, sedangkan plotter untuk cetak cetak biru berukuran raksasa.',
                    ],
                    [
                        'stem' => 'Langkah yang benar saat mencabut flashdisk dari port USB komputer agar data di dalamnya tidak korup atau rusak adalah...',
                        'correct' => 'Mengklik ikon \'Safely Remove Hardware and Eject Media\' pada taskbar lalu menunggu notifikasi aman sebelum mencabutnya.',
                        'distractors' => [
                            'Menarik flashdisk secepat mungkin saat lampu indikatornya masih berkedip kencang.',
                            'Mematikan sekring listrik rumah sebelum mencabut flashdisk.',
                            'Menutup layar monitor lalu menarik paksa flashdisk.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur safely remove pada media penyimpanan eksternal.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Perintah Eject memastikan seluruh penulisan data di cache memori telah tuntas disalin ke chip sebelum arus diputus.',
                        'explanation_distractors' => 'Mencabut saat proses baca/tulis berlangsung berisiko merusak struktur file system (corrupted data).',
                    ],
                    [
                        'stem' => 'Ketika printer baru yang kamu beli tidak merespons perintah cetak dari laptop meskipun kabel sudah terpasang, langkah operasional pertama yang harus dilakukan adalah...',
                        'correct' => 'Menginstal driver resmi printer tersebut sesuai sistem operasi laptop yang digunakan.',
                        'distractors' => [
                            'Membongkar tabung tinta printer dengan obeng.',
                            'Mengganti kertas cetak dengan kertas karton tebal.',
                            'Menghapus seluruh file foto di dalam memori laptop.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan instalasi driver perangkat keras periferal.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Sistem operasi membutuhkan driver spesifik untuk menerjemahkan dokumen cetak menjadi perintah mekanik printer.',
                        'explanation_distractors' => 'Membongkar printer atau menghapus foto tidak ada kaitannya dengan protokol komunikasi software.',
                    ],
                    [
                        'stem' => 'Jika kursor mouse optik di komputermu bergerak tersendat-sendat atau melompat-lompat di layar, tindakan perbaikan sederhana yang paling tepat adalah...',
                        'correct' => 'Membersihkan sensor optik di bagian bawah mouse dan menggunakan alas mouse (mousepad) yang rata dan tidak memantulkan cahaya.',
                        'distractors' => [
                            'Mengganti monitor komputer dengan monitor layar sentuh baru.',
                            'Menghapus aplikasi browser dari dalam sistem operasi.',
                            'Mencabut kabel power supply saat komputer masih menyala.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan perawatan dasar perangkat input mouse optik.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Sensor optik membaca pantulan cahaya dari permukaan meja; debu atau meja kaca licin mengganggu pelacakan sensor.',
                        'explanation_distractors' => 'Mengganti monitor atau menghapus browser tidak menyelesaikan kotornya sensor fisik mouse.',
                    ],
                    [
                        'stem' => 'Untuk mengatur tingkat kecerahan layar, resolusi display, dan volume audio pada sistem operasi Windows, menu pengaturan yang harus dibuka adalah...',
                        'correct' => 'Settings (Pengaturan) atau Control Panel.',
                        'distractors' => [
                            'Aplikasi Notepad.',
                            'Aplikasi Calculator.',
                            'Command Prompt diskpart.',
                        ],
                        'indicator' => 'Peserta didik mampu mengoperasikan menu kontrol pengaturan sistem operasi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Sistem)',
                        'explanation_correct' => 'Menu Settings dan Control Panel memusatkan seluruh konfigurasi perangkat keras dan preferensi pengguna.',
                        'explanation_distractors' => 'Notepad untuk mengetik teks, Calculator untuk hitung angka, dan diskpart untuk partisi disk.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk mematikan komputer desktop laboratorium secara benar dan aman sesuai prosedur standar adalah...',
                        'correct' => 'Mengklik menu Start -> Power -> Shut Down, lalu menunggu mesin mati sempurna sebelum mematikan saklar stopkontak.',
                        'distractors' => [
                            'Langsung mencabut kabel listrik komputer dari colokan dinding saat aplikasi sedang terbuka.',
                            'Menekan tombol power pada casing secara paksa selama 10 detik setiap hari.',
                            'Menutup monitor lalu membiarkan CPU menyala semalaman.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur shutdown komputer yang aman.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Proses Shut Down menutup seluruh program secara tertib, menyimpan status sistem, dan memarkir head harddisk pada posisi aman.',
                        'explanation_distractors' => 'Mencabut paksa daya merusak sistem file dan memperpendek usia komponen elektronik.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin merekam suara narasi tugas langsung ke komputer menggunakan headset, jack kabel audio mikrofon berwarna merah muda (pink) harus ditancapkan ke...',
                        'correct' => 'Port audio masukan (Mic-in) yang berlambang mikrofon pada komputer.',
                        'distractors' => [
                            'Port Line-out keluaran speaker berwarna hijau.',
                            'Port USB berbentuk persegi panjang.',
                            'Port kabel jaringan internet RJ-45.',
                        ],
                        'indicator' => 'Peserta didik mampu menghubungkan kabel jack audio mikrofon pada port yang benar.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Warna standar port audio 3.5mm: merah muda untuk Mic-in (masukan) dan hijau muda untuk Line-out (keluaran suara).',
                        'explanation_distractors' => 'Menancapkan ke port keluaran hijau tidak akan menangkap sinyal masukan suara dari mikrofon.',
                    ],
                    [
                        'stem' => 'Ketika layar monitor laptop mendadak mati tetapi lampu indikator daya tetap menyala setelah dibiarkan 10 menit tanpa disentuh, tindakan untuk membangunkannya adalah...',
                        'correct' => 'Menekan tombol spasi pada keyboard atau menggerakkan kursor mouse untuk keluar dari mode Sleep/Screen Saver.',
                        'distractors' => [
                            'Membongkar baterai laptop secara paksa menggunakan pisau.',
                            'Menyiram keyboard laptop dengan air dingin.',
                            'Menginstall ulang seluruh sistem operasi dari awal.',
                        ],
                        'indicator' => 'Peserta didik mampu mengoperasikan komputer keluar dari mode hemat daya Sleep.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Mode Sleep mematikan layar dan meminimalkan daya untuk efisiensi; input keyboard/mouse otomatis membangunkannya.',
                        'explanation_distractors' => 'Pilihan lainnya berbahaya dan dapat merusak laptop secara permanen.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin memindai lembaran gambar karya seni fisik di buku gambar agar menjadi file digital di komputer, perangkat keras yang kamu gunakan adalah...',
                        'correct' => 'Scanner (Pemindai).',
                        'distractors' => [
                            'Plotter cetak.',
                            'Sound Card.',
                            'Harddisk eksternal.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih perangkat scanner untuk digitalisasi dokumen fisik.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Scanner menggunakan sensor optik CCD/CIS untuk mengubah pantulan cahaya dokumen fisik menjadi gambar digital.',
                        'explanation_distractors' => 'Plotter mencetak gambar, sound card mengolah suara, dan harddisk menyimpan file.',
                    ],
                    [
                        'stem' => 'Langkah yang paling tepat saat membersihkan debu yang menempel pada sela-sela tombol keyboard komputer adalah...',
                        'correct' => 'Menggunakan kuas berbulu halus atau kaleng semprotan udara bertekanan (compressed air) saat komputer dalam kondisi mati.',
                        'distractors' => [
                            'Merendam seluruh papan keyboard ke dalam ember air sabun.',
                            'Mengorek sela tombol menggunakan paku besi tajam saat komputer menyala.',
                            'Menggunakan cairan pemutih pakaian konsentrasi tinggi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur pembersihan fisik keyboard yang aman.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Pembersihan kering menggunakan kuas lembut atau udara bertekanan mengangkat kotoran tanpa memicu korsleting sirkuit.',
                        'explanation_distractors' => 'Cairan basah memicu hubungan arus pendek (korsleting) fatal pada lapisan membran keyboard.',
                    ],
                    [
                        'stem' => 'Ketika ingin menyalin berkas tugas sebesar 4 GB dari laptop ke komputer teman tanpa koneksi internet, perangkat media penyimpanan portabel yang paling praktis digunakan adalah...',
                        'correct' => 'Flashdisk USB berkapasitas 8 GB atau lebih.',
                        'distractors' => [
                            'Disket liat berkapasitas 1,44 MB.',
                            'Keping CD-R berkapasitas 700 MB.',
                            'Kabel LAN yang dipotong.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih kapasitas media penyimpanan portabel sesuai volume berkas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Berkas 4 GB membutuhkan media dengan kapasitas lebih besar dari 4 GB, seperti flashdisk modern 8 GB ke atas.',
                        'explanation_distractors' => 'Kapasitas disket (1,44 MB) dan CD (700 MB) jauh terlalu kecil untuk menampung berkas 4 GB.',
                    ],
                    [
                        'stem' => 'Jika komputer laboratorium sekolah mati mendadak setiap kali tombol stopkontak AC dinyalakan, tindakan keselamatan pertama yang harus kamu lakukan adalah...',
                        'correct' => 'Menjauh dari sumber listrik, tidak menyentuh kabel yang terkelupas, dan segera memberitahukan kepada guru pembina laboratorium.',
                        'distractors' => [
                            'Mencoba memegang kabel listrik yang bertegangan dengan tangan telanjang.',
                            'Menyiram stopkontak dengan air.',
                            'Mencoba membongkar kotak sekring sekolah secara mandiri.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur keselamatan kerja listrik di lab komputer.',
                        'sub_level' => 'C3 - MOTS (Penerapan K3)',
                        'explanation_correct' => 'Keselamatan kerja (K3) mewajibkan penghindaran kontak fisik dengan arus listrik berlebih dan pelaporan ke otoritas teknis.',
                        'explanation_distractors' => 'Menyentuh kabel beraliran listrik atau air dapat menyebabkan sengatan listrik fatal.',
                    ],
                    [
                        'stem' => 'Untuk mengetahui informasi spesifikasi perangkat keras komputer (seperti tipe processor, kapasitas RAM, dan edisi sistem operasi) di Windows, langkah pintas termudah adalah...',
                        'correct' => 'Membuka jendela \'About your PC\' pada menu Settings atau menekan tombol Windows + Pause/Break.',
                        'distractors' => [
                            'Membuka keranjang sampah (Recycle Bin).',
                            'Mengetik nama processor di program Paint.',
                            'Membongkar casing laptop untuk membaca tulisan di chip.',
                        ],
                        'indicator' => 'Peserta didik mampu memeriksa spesifikasi sistem perangkat keras secara digital.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Menu informasi sistem menampilkan audit perangkat keras resmi tanpa memerlukan pembongkaran casing fisik.',
                        'explanation_distractors' => 'Recycle Bin dan Paint tidak menyediakan informasi audit perangkat keras.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Komputer seorang siswa menyala normal tetapi monitor tidak menampilkan gambar apa pun (layar hitam kosong), padahal lampu daya CPU aktif. Langkah analisis pertama yang paling tepat adalah...',
                        'correct' => 'Memeriksa kabel koneksi video (HDMI/VGA) antara monitor dan CPU serta memastikan monitor terhubung ke sumber daya.',
                        'distractors' => [
                            'Segera membeli processor baru dan membongkar motherboard.',
                            'Menghapus sistem operasi dari dalam media penyimpanan.',
                            'Mengganti keyboard dan mouse dengan tipe yang baru.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis troubleshooting koneksi display output.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Masalah)',
                        'explanation_correct' => 'Troubleshooting logis dimulai dari verifikasi kabel sinyal tampilan dan pasokan daya monitor sebelum menduga kerusakan komponen internal.',
                        'explanation_distractors' => 'Membeli processor baru atau menghapus sistem operasi adalah tindakan prematur tanpa dasar analisis.',
                    ],
                    [
                        'stem' => 'Mengapa sistem komputer tetap memerlukan media penyimpanan sekunder (seperti SSD/HDD) meskipun kecepatan baca RAM jauh lebih cepat?',
                        'correct' => 'Karena RAM bersifat volatile (data hilang saat aliran listrik mati), sedangkan SSD bersifat non-volatile (data tersimpan permanen).',
                        'distractors' => [
                            'Karena SSD bertugas mengeksekusi instruksi logika aritmatika menggantikan CPU.',
                            'Karena RAM hanya bisa menyimpan berkas suara dan tidak bisa menyimpan teks.',
                            'Karena SSD tidak memerlukan aliran listrik sama sekali untuk bekerja di komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi perbedaan sifat retensi data memori primer dan sekunder.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Arsitektur)',
                        'explanation_correct' => 'Sifat volatile RAM mengharuskan adanya media penyimpanan permanen (non-volatile) untuk menjaga integritas data jangka panjang.',
                        'explanation_distractors' => 'SSD tidak mengeksekusi instruksi aritmatika CPU dan RAM dapat menyimpan segala tipe data digital.',
                    ],
                    [
                        'stem' => 'Jika kipas pendingin (heatsink fan) pada processor berhenti berputar atau tersumbat debu tebal, akibat yang akan dialami sistem komputer adalah...',
                        'correct' => 'Suhu processor melonjak tinggi (overheating) sehingga performa melambat drastis atau komputer mati mendadak untuk melindungi sirkuit.',
                        'distractors' => [
                            'Kapasitas RAM akan bertambah dua kali lipat secara otomatis.',
                            'Resolusi tampilan layar monitor akan berubah menjadi format hitam putih permanen.',
                            'Kecepatan jaringan internet pada komputer akan meningkat drastis.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis fenomena thermal throttling dan shutdown protektif.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kausalitas)',
                        'explanation_correct' => 'Panas berlebih memicu thermal throttling (penurunan clockspeed otomatis) dan thermal shutdown guna mencegah kerusakan fisik silikon CPU.',
                        'explanation_distractors' => 'Pilihan pengecoh mengasumsikan fenomena aneh yang mustahil secara teknis.',
                    ],
                    [
                        'stem' => 'Seorang siswa memasukkan data angka pada aplikasi lembar kerja, namun hasil penjumlahan salah karena rumusnya keliru. Analisis komponen yang mengalami kesalahan adalah...',
                        'correct' => 'Logika instruksi pengguna atau perangkat lunak (software/brainware), karena perangkat keras (hardware) hanya memproses instruksi yang diberikan.',
                        'distractors' => [
                            'Kabel daya listrik komputer karena memberikan tegangan listrik yang kurang.',
                            'Layar monitor karena sengaja mengubah angka yang ditampilkan.',
                            'Motherboard karena menolak membaca angka desimal.',
                        ],
                        'indicator' => 'Peserta didik mampu memisahkan peran logika software/brainware dan eksekusi hardware.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Masalah)',
                        'explanation_correct' => 'Prinsip GIGO (Garbage In, Garbage Out) menegaskan perangkat keras memproses data secara patuh sesuai rumus instruksi yang dimasukkan.',
                        'explanation_distractors' => 'Hardware fisik tidak bertanggung jawab atas kesalahan sintaksis atau logika rumus yang diketik manusia.',
                    ],
                    [
                        'stem' => 'Perbedaan mendasar antara Solid State Drive (SSD) dan Hard Disk Drive (HDD) dalam kinerja pemrosesan data komputer adalah...',
                        'correct' => 'SSD menggunakan chip memori flash tanpa komponen bergerak sehingga kecepatan akses datanya jauh lebih tinggi dibandingkan HDD bermagnetik piringan.',
                        'distractors' => [
                            'HDD lebih cepat karena piringan logamnya berputar dengan kecepatan tinggi tanpa henti.',
                            'SSD hanya dapat digunakan untuk menyimpan file gambar dan bukan sistem operasi.',
                            'HDD tidak memerlukan ruang pemasangan pada casing komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi keunggulan performa teknologi SSD.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Teknologi)',
                        'explanation_correct' => 'Ketiadaan latensi mekanis pada chip semikonduktor flash membuat kecepatan baca/tulis acak SSD melampaui piringan putar HDD.',
                        'explanation_distractors' => 'Pilihan lainnya salah mengidentifikasi mekanisme mekanis dan batas fungsional storage.',
                    ],
                    [
                        'stem' => 'Jika kapasitas RAM sebuah komputer hampir penuh saat menjalankan program grafis berat, solusi optimal tanpa harus mengganti komputer adalah...',
                        'correct' => 'Menutup aplikasi latar belakang yang tidak digunakan atau meningkatkan kapasitas keping memori RAM.',
                        'distractors' => [
                            'Menurunkan kecerahan layar monitor hingga batas paling redup.',
                            'Memformat ulang keyboard dan mouse melalui pengaturan kontrol panel.',
                            'Mencabut kabel jaringan internet selama menjalankan aplikasi grafis.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan solusi optimal peningkatan kinerja RAM.',
                        'sub_level' => '{$subLevel} - HOTS (Pemecahan Masalah)',
                        'explanation_correct' => 'Mengosongkan alokasi memori kerja dari proses latar atau menambah RAM fisik secara langsung menyelesaikan bottleneck memori.',
                        'explanation_distractors' => 'Pilihan lainnya tidak membebaskan ruang memori utama komputer sama sekali.',
                    ],
                    [
                        'stem' => 'Saat komputer dinyalakan terdengar bunyi bip panjang berulang-ulang dari CPU dan layar tetap gelap. Analisis kemungkinan terbesar letak permasalahannya adalah...',
                        'correct' => 'Keping memori RAM tidak terpasang dengan benar di slot motherboard atau kuningan pin RAM kotor terkena debu.',
                        'distractors' => [
                            'Kabel mouse USB terputus di dalam meja komputer.',
                            'Kertas di dalam printer habis.',
                            'Siswa lupa memberi nama file tugas di flashdisk.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis kode POST beep code motherboard.',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Perangkat Keras)',
                        'explanation_correct' => 'Kode bip BIOS (POST Beep Codes) mengindikasikan kegagalan inisialisasi perangkat keras vital; bip berulang umumnya adalah galat RAM.',
                        'explanation_distractors' => 'Mouse, printer, dan file flashdisk tidak memicu sinyal beep code darurat pada BIOS motherboard.',
                    ],
                    [
                        'stem' => 'Mengapa komputer modern dengan SSD mampu melakukan proses booting (menyalakan sistem hingga siap pakai) dalam waktu kurang dari 10 detik, sedangkan HDD membutuhkan waktu 1-2 menit?',
                        'correct' => 'Karena SSD tidak memiliki waktu pencarian fisik (seek time); mikrokontroler membaca ribuan blok file sistem operasi secara instan dan paralel.',
                        'distractors' => [
                            'Karena SSD menyerap aliran daya listrik seratus kali lebih besar dari stopkontak.',
                            'Karena sistem operasi pada SSD sengaja menghilangkan tahapan keamanan booting.',
                            'Karena piringan magnetik pada HDD sengaja diperlambat oleh pabrik pembuatnya.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis perbedaan arsitektur latensi acak SSD vs seek time HDD.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Arsitektur)',
                        'explanation_correct' => 'HDD dibatasi oleh kecepatan mekanik putaran piringan dan pergerakan jarum, sedangkan SSD mengakses gerbang silikon secara elektrik langsung.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang konsumsi listrik raksasa atau pengurangan fitur keamanan.',
                    ],
                    [
                        'stem' => 'Analisis dampak jika sebuah komputer menggunakan catu daya (Power Supply Unit / PSU) berkualitas rendah yang tegangannya sering naik-turun adalah...',
                        'correct' => 'Komponen sensitif seperti motherboard, SSD, dan chip prosesor rentan mengalami kerusakan fisik permanen dan sistem sering restart mendadak.',
                        'distractors' => [
                            'Resolusi huruf pada keyboard komputer akan berubah menjadi huruf miring.',
                            'Kapasitas penyimpanan harddisk akan bertambah secara otomatis.',
                            'Warna casing luar komputer akan memudar menjadi abu-abu dalam semalam.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi dampak lonjakan tegangan kelistrikan PSU.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Keandalan Sistem)',
                        'explanation_correct' => 'Ripple voltage dan lonjakan daya tak teratur pada PSU abal-abal merusak kapasitor motherboard dan kontroler penyimpanan.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang dampak visual dan fisik yang tidak berhubungan dengan kelistrikan.',
                    ],
                    [
                        'stem' => 'Seorang siswa memasang kartu grafis (GPU) tambahan di komputernya. Evaluasi peran GPU dalam meringankan beban CPU saat mengolah video presentasi atau game adalah...',
                        'correct' => 'GPU memiliki ribuan inti pemroses kecil yang bekerja secara paralel khusus untuk menghitung jutaan piksel dan poligon grafis, sehingga CPU dapat fokus pada logika sistem.',
                        'distractors' => [
                            'GPU bertugas menggantikan fungsi kabel listrik yang mengalirkan daya ke monitor.',
                            'GPU menghapus seluruh kode instruksi logika program agar komputer lebih ringan.',
                            'GPU berfungsi menyaring debu yang masuk ke dalam casing komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi komputasi paralel GPU vs komputasi serial CPU.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Arsitektur)',
                        'explanation_correct' => 'Arsitektur paralel GPU sangat efisien untuk operasi matriks matematis floating-point pada render grafis visual.',
                        'explanation_distractors' => 'Pilihan lainnya mengaburkan peran komputasi GPU dengan fungsi fisik kelistrikan dan filter debu.',
                    ],
                    [
                        'stem' => 'Ketika sebuah komputer mengalami gejala \'blue screen\' (BSOD / Blue Screen of Death) di Windows secara berulang, langkah analisis penelusuran akar masalah terbaik adalah...',
                        'correct' => 'Mencatat kode galat (stop code) yang muncul di layar, memeriksa apakah ada driver perangkat keras yang baru dipasang atau keping RAM yang rusak.',
                        'distractors' => [
                            'Membuang monitor komputer ke tempat sampah dan membeli monitor baru.',
                            'Mengganti meja komputer dengan meja kayu yang lebih tebal.',
                            'Menghapus seluruh file musik dari dalam flashdisk.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan langkah investigasi galat kritis sistem (BSOD).',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Sistem)',
                        'explanation_correct' => 'Stop Code BSOD memberikan petunjuk spesifik apakah crash dipicu oleh kernel exception, driver rusak, atau memori gagal baca.',
                        'explanation_distractors' => 'Mengganti meja atau membuang monitor tidak menyelesaikan kegagalan kernel software/hardware di dalam CPU.',
                    ],
                    [
                        'stem' => 'Analisis mengapa prosesor multi-core (misalnya octa-core 8 inti) mampu menjalankan banyak aplikasi bersamaan secara lebih mulus dibandingkan prosesor single-core dengan kecepatan clock yang sama adalah...',
                        'correct' => 'Tiap inti pemroses fisik dapat mengeksekusi utas tugas (threads) yang berbeda secara mandiri dan simultan tanpa harus mengantre di satu inti saja.',
                        'distractors' => [
                            'Karena prosesor 8-core memiliki delapan kabel stopkontak listrik terpisah.',
                            'Karena prosesor multi-core tidak membutuhkan memori RAM sama sekali untuk bekerja.',
                            'Karena prosesor multi-core otomatis menggandakan kuota internet pengguna.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis keunggulan arsitektur prosesor paralel multi-core.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kinerja)',
                        'explanation_correct' => 'Multiprocessing sejati membagi proses sistem operasi ke beberapa inti fisik sehingga tidak terjadi kemacetan antrean instruksi.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang delapan kabel colokan atau pengganda kuota internet.',
                    ],
                    [
                        'stem' => 'Evaluasi perbedaan mendasar antara memori Cache L1/L2/L3 yang berada di dalam prosesor dengan memori RAM yang berada di papan motherboard adalah...',
                        'correct' => 'Cache prosesor berkecepatan paling tinggi dan berada tepat di samping inti CPU untuk menyimpan data instruksi terdekat, namun kapasitasnya sangat kecil (beberapa megabyte) karena biaya fabrikasinya sangat mahal.',
                        'distractors' => [
                            'RAM berada di dalam prosesor dan Cache berada di luar komputer.',
                            'Cache hanya bisa menyimpan berkas video dan tidak bisa menyimpan instruksi program.',
                            'RAM tidak memerlukan daya listrik sedangkan Cache memerlukan baterai terpisah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi hierarki piramida memori komputer (Cache vs RAM).',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Arsitektur Memori)',
                        'explanation_correct' => 'Hierarki memori menempatkan SRAM (Cache) tercepat di puncak piramida dekat register CPU guna meminimalkan latency siklus instruksi.',
                        'explanation_distractors' => 'Pilihan lainnya salah memetakan lokasi fisik dan karakteristik operasional memori.',
                    ],
                    [
                        'stem' => 'Ketika ruang penyimpanan SSD sebuah laptop hampir 99% penuh, dampak performa yang dialami sistem secara keseluruhan dan alasannya adalah...',
                        'correct' => 'Kinerja laptop melambat drastis karena sistem operasi tidak memiliki ruang kosong untuk virtual memory (swap/pagefile) dan mekanisme pemeliharaan sel SSD (TRIM/wear leveling) terhambat.',
                        'distractors' => [
                            'Laptop akan otomatis terbang melayang karena bobot filenya terlalu padat.',
                            'Semua file teks di laptop otomatis berubah menjadi rekaman lagu pop.',
                            'Warna lampu indikator daya akan meledak seketika.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis dampak saturasi kapasitas penyimpanan terhadap performa sistem.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Sistem Operasi)',
                        'explanation_correct' => 'Ketiadaan free space melumpuhkan write-amplification control SSD dan meniadakan ruang alokasi memori virtual sementara.',
                        'explanation_distractors' => 'Pilihan lainnya adalah lelucon fiktif yang mustahil secara fisika.',
                    ],
                    [
                        'stem' => 'Mengapa pasta termal (thermal paste) wajib dioleskan di antara permukaan prosesor dan dasar heatsink pendingin?',
                        'correct' => 'Untuk mengisi celah udara mikroskopis di antara permukaan logam prosesor dan heatsink agar penghantaran panas berlangsung maksimal.',
                        'distractors' => [
                            'Untuk merekatkan prosesor secara permanen agar tidak bisa dicuri orang.',
                            'Untuk menyalurkan aliran listrik tegangan tinggi dari heatsink ke prosesor.',
                            'Untuk memberi aroma wangi pada udara di dalam casing komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi fungsi konduktivitas termal thermal paste.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Rekayasa Perangkat Keras)',
                        'explanation_correct' => 'Udara adalah isolator panas yang buruk; pasta termal berbasis oksida seng/perak menyingkirkan kantong udara dan mentransfer kalor efisien.',
                        'explanation_distractors' => 'Pasta termal bukan lem permanen, bukan konduktor listrik, dan tidak berfungsi sebagai wewangian.',
                    ],
                    [
                        'stem' => 'Jika sebuah flashdisk dipasang di komputer dan muncul pesan peringatan \'You need to format the disk in drive before you can use it\', tindakan paling bijak sebelum memutuskan memformat adalah...',
                        'correct' => 'Mencoba menancapkan flashdisk di komputer lain terlebih dahulu atau menggunakan perangkat lunak recovery data jika di dalamnya ada file penting yang belum dicadangkan.',
                        'distractors' => [
                            'Langsung menyetujui format cepat meskipun semua file skripsi dan tugas sekolah belum dicadangkan.',
                            'Memukul flashdisk dengan palu besi agar komponen di dalamnya tersambung kembali.',
                            'Merendam flashdisk ke dalam air panas selama satu jam.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan strategi penanganan anomali partisi penyimpanan tanpa kehilangan data.',
                        'sub_level' => '{$subLevel} - HOTS (Pemulihan Data)',
                        'explanation_correct' => 'Memformat langsung menghapus tabel partisi; pengujian di port/komputer lain mengisolasi apakah masalah ada pada port host atau partisi RAW flashdisk.',
                        'explanation_distractors' => 'Memformat langsung melenyapkan data tugas berharga, dan tindakan fisik destruktif menghancurkan chip memori.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa pembaruan sistem operasi (Windows Update / OS Update) secara berkala sangat krusial bagi kelangsungan sistem komputer adalah...',
                        'correct' => 'Menutup celah keamanan (security patches) yang baru ditemukan dari serangan peretas serta meningkatkan kompatibilitas dan stabilitas driver.',
                        'distractors' => [
                            'Sengaja menghabiskan ruang kuota internet pengguna tanpa memberikan manfaat apa pun.',
                            'Membuat komputer menjadi lambat agar pengguna terpaksa membeli laptop baru setiap tahun.',
                            'Mengubah keyboard komputer menjadi tidak bisa mengetik angka.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi urgensi pembaruan berkala sistem operasi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Pemeliharaan Sistem)',
                        'explanation_correct' => 'Pembaruan rutin menambal kerentanan zero-day yang sering dieksploitasi malware dan ransomware untuk membobol sistem.',
                        'explanation_distractors' => 'Pilihan lainnya berakar dari prasangka keliru yang mengabaikan aspek perlindungan siber.',
                    ],
                    [
                        'stem' => 'Analisis mengapa arsitektur komputer 64-bit jauh lebih unggul dibandingkan arsitektur 32-bit dalam komputasi modern adalah...',
                        'correct' => 'Sistem 64-bit mampu mengalamatkan memori RAM lebih dari 4 GB (hingga exabyte) serta memproses data angka yang jauh lebih besar dalam satu siklus clock.',
                        'distractors' => [
                            'Sistem 64-bit hanya membutuhkan setengah kabel dibandingkan komputer 32-bit.',
                            'Sistem 64-bit tidak membutuhkan daya listrik dari stopkontak.',
                            'Sistem 32-bit dilarang oleh pemerintah untuk memutar video berwarna.',
                        ],
                        'indicator' => 'Peserta didik mampu membandingkan batas pengalamatan memori arsitektur 32-bit vs 64-bit.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Arsitektur)',
                        'explanation_correct' => 'Limitasi 2^32 membatasi sistem 32-bit hanya dapat membaca maksimal 4 GB RAM, sedangkan aplikasi modern menuntut kapasitas memori kerja lebih besar.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang alasan yang tidak ada kaitannya dengan lebar register pengalamatan data.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getAlgorithmCodingAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Pengertian algoritma yang paling tepat dalam ilmu komputer adalah...',
                        'correct' => 'Urutan langkah-langkah logis dan sistematis untuk memecahkan suatu masalah atau mencapai tujuan tertentu.',
                        'distractors' => [
                            'Kumpulan kabel jaringan yang menghubungkan komputer ke internet.',
                            'Daftar harga suku cadang perangkat keras di toko komputer.',
                            'Tampilan latar belakang layar desktop komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan pengertian algoritma.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Algoritma adalah serangkaian instruksi terdefinisi dengan jelas yang diproses secara bertahap untuk menghasilkan luaran tertentu.',
                        'explanation_distractors' => 'Pilihan lainnya merujuk pada perangkat keras atau antarmuka visual biasa.',
                    ],
                    [
                        'stem' => 'Simbol bangun belah ketupat (diamond) pada bagan alir (flowchart) berfungsi untuk melambangkan...',
                        'correct' => 'Pengambilan keputusan atau kondisi percabangan (decision).',
                        'distractors' => [
                            'Titik awal atau akhir program (terminator).',
                            'Proses perhitungan matematika biasa (process).',
                            'Aliran data masukan dari keyboard (input).',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi simbol percabangan keputusan pada flowchart.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Simbol belah ketupat mengevaluasi kondisi logis (Ya/Tidak) yang menentukan percabangan alur program.',
                        'explanation_distractors' => 'Terminator berbentuk elips/kapsul, proses berbentuk persegi panjang, dan input berbentuk jajar genjang.',
                    ],
                    [
                        'stem' => 'Struktur kontrol dalam pemrograman yang berfungsi untuk menjalankan instruksi yang sama secara berulang-ulang selama kondisi terpenuhi disebut...',
                        'correct' => 'Perulangan (Looping).',
                        'distractors' => [
                            'Percabangan (Branching).',
                            'Variabel (Variable).',
                            'Komentar (Comment).',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali konsep perulangan (loop).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Perulangan mengulang blok kode otomatis hingga syarat terminasi tercapai.',
                        'explanation_distractors' => 'Percabangan memilih alur alternatif, variabel menyimpan data, dan komentar adalah catatan kode.',
                    ],
                    [
                        'stem' => 'Tempat dalam memori program komputer yang digunakan untuk menampung nilai data yang dapat berubah selama program berjalan disebut...',
                        'correct' => 'Variabel (Variable).',
                        'distractors' => [
                            'Konstanta statis.',
                            'Kabel data.',
                            'Tipe monitor.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi pengertian variabel.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Variabel adalah pengenal bernama yang menyimpan nilai dinamis dalam memori aplikasi.',
                        'explanation_distractors' => 'Konstanta bernilai tetap yang tidak dapat diubah, sedangkan kabel data dan monitor adalah fisik.',
                    ],
                    [
                        'stem' => 'Tipe data yang hanya dapat bernilai Benar (True) atau Salah (False) dalam logika pemrograman adalah...',
                        'correct' => 'Boolean.',
                        'distractors' => [
                            'Integer.',
                            'String.',
                            'Float.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi tipe data Boolean.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Boolean hanya merepresentasikan nilai kebenaran biner: True (1) atau False (0).',
                        'explanation_distractors' => 'Integer untuk bilangan bulat, String untuk teks, dan Float untuk bilangan desimal.',
                    ],
                    [
                        'stem' => 'Simbol persegi panjang pada diagram alir (flowchart) melambangkan...',
                        'correct' => 'Proses pemrosesan atau perhitungan data (process).',
                        'distractors' => [
                            'Titik mulai atau selesai program.',
                            'Kondisi percabangan ya atau tidak.',
                            'Masukan data manual dari keyboard.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi simbol proses pada bagan alir.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Persegi panjang digunakan untuk operasi penugasan nilai, manipulasi data, atau operasi aritmatika.',
                        'explanation_distractors' => 'Pilihan lainnya diwakili oleh kapsul terminator, belah ketupat, dan jajar genjang.',
                    ],
                    [
                        'stem' => 'Tipe data yang digunakan untuk menyimpan kumpulan karakter huruf atau kalimat teks adalah...',
                        'correct' => 'String.',
                        'distractors' => [
                            'Integer.',
                            'Boolean.',
                            'Byte.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi tipe data teks String.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'String menyimpan barisan karakter teks yang biasanya diapit tanda petik ganda atau tunggal.',
                        'explanation_distractors' => 'Integer untuk angka bulat dan Boolean untuk nilai kebenaran logika.',
                    ],
                    [
                        'stem' => 'Simbol bangun jajar genjang pada bagan alir (flowchart) berfungsi untuk melambangkan kegiatan...',
                        'correct' => 'Masukan (Input) atau Keluaran (Output) data.',
                        'distractors' => [
                            'Perhitungan perkalian otomatis.',
                            'Titik akhir berhentinya program.',
                            'Koneksi ke jaringan internet.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi simbol I/O jajar genjang pada flowchart.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Jajar genjang digunakan saat program menerima masukan dari pengguna atau mencetak luaran ke layar/kertas.',
                        'explanation_distractors' => 'Perhitungan menggunakan persegi panjang, titik henti menggunakan kapsul elips.',
                    ],
                    [
                        'stem' => 'Penulisan algoritma yang menggunakan teks menyerupai bahasa pemrograman asli tetapi mudah dibaca oleh manusia disebut...',
                        'correct' => 'Pseudocode.',
                        'distractors' => [
                            'Bahasa Mesin biner.',
                            'Diagram UML.',
                            'Kompilator.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan representasi pseudocode.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Pseudocode (kode semu) menjembatani bahasa manusia alami dengan struktur sintaks kode formal.',
                        'explanation_distractors' => 'Bahasa mesin berisi deretan biner 0 dan 1, diagram UML berbentuk visual, dan kompilator perangkat lunak penerjemah.',
                    ],
                    [
                        'stem' => 'Tipe data numerik yang digunakan khusus untuk menampung bilangan bulat tanpa koma desimal adalah...',
                        'correct' => 'Integer.',
                        'distractors' => [
                            'Float / Double.',
                            'Char.',
                            'Boolean.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali tipe data bilangan bulat Integer.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Integer merepresentasikan himpunan bilangan bulat seperti -5, 0, 10, 100 tanpa nilai pecahan.',
                        'explanation_distractors' => 'Float memuat bilangan berkoma, Char memuat satu karakter huruf tunggal.',
                    ],
                    [
                        'stem' => 'Operator aritmatika yang digunakan untuk mencari nilai sisa pembagian (modulus) dalam bahasa pemrograman adalah simbol...',
                        'correct' => 'Simbol persen ( % ).',
                        'distractors' => [
                            'Simbol tambah ( + ).',
                            'Simbol bintang ( * ).',
                            'Simbol garis miring ( / ).',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi operator aritmatika modulus (%).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Operator modulo (%) mengembalikan sisa hasil bagi bulat (contoh: 7 % 3 bernilai 1).',
                        'explanation_distractors' => 'Simbol + untuk penambahan, * untuk perkalian, dan / untuk pembagian riil.',
                    ],
                    [
                        'stem' => 'Operator logika yang menghasilkan nilai Benar (True) HANYA jika KEDUA kondisi yang diuji bernilai Benar adalah...',
                        'correct' => 'Operator AND ( && ).',
                        'distractors' => [
                            'Operator OR ( || ).',
                            'Operator NOT ( ! ).',
                            'Operator XOR.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi tabel kebenaran operator logika AND.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Logika AND mensyaratkan kedua operand bernilai True agar evaluasi keseluruhan bernilai True.',
                        'explanation_distractors' => 'Logika OR menghasilkan True jika salah satu bernilai True, sedangkan NOT membalik nilai logika.',
                    ],
                    [
                        'stem' => 'Simbol elips atau persegi panjang berujung membulat (kapsul) pada bagan alir flowchart berfungsi sebagai...',
                        'correct' => 'Terminator (titik awal mulai atau titik akhir selesainya alur program).',
                        'distractors' => [
                            'Penghubung halaman kertas yang berbeda.',
                            'Proses perhitungan aritmatika.',
                            'Percabangan kondisi bersarang.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi simbol terminator pada flowchart.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Terminator memuat kata \'Mulai\' / \'Start\' di awal dan \'Selesai\' / \'End\' di akhir diagram alir.',
                        'explanation_distractors' => 'Penghubung menggunakan lingkaran kecil (connector), dan perhitungan menggunakan persegi panjang.',
                    ],
                    [
                        'stem' => 'Dalam konsep pemrograman, baris catatan yang sengaja ditulis oleh pemrogram sebagai penjelas dan diabaikan oleh komputer saat dijalankan disebut...',
                        'correct' => 'Komentar (Comment).',
                        'distractors' => [
                            'Variabel rahasia.',
                            'Sintaks galat.',
                            'Eksekusi utama.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan fungsi komentar pada kode program.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Komentar (seperti // atau /* */) berfungsi mendokumentasikan alur logika bagi pemrogram manusia dan tidak dieksekusi mesin.',
                        'explanation_distractors' => 'Komentar bukan variabel dan bukan kesalahan sintaks.',
                    ],
                    [
                        'stem' => 'Struktur data yang mampu menampung sekumpulan nilai dengan tipe data yang sama dalam satu nama variabel berindeks nomor disebut...',
                        'correct' => 'Array (Larik / List).',
                        'distractors' => [
                            'Konstanta tunggal.',
                            'Operator logika.',
                            'Terminator.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep larik (Array).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Array menyimpan elemen data berurutan yang dapat diakses melalui nomor indeksnya (misal: nilai[0], nilai[1]).',
                        'explanation_distractors' => 'Konstanta hanya menyimpan satu nilai tetap, operator mengeksekusi operasi matematika/logika.',
                    ],
                    [
                        'stem' => 'Perangkat lunak yang bertugas menerjemahkan seluruh baris kode program dari bahasa tingkat tinggi menjadi bahasa mesin sekaligus sebelum dijalankan disebut...',
                        'correct' => 'Kompilator (Compiler).',
                        'distractors' => [
                            'Interpreter penerjemah baris demi baris.',
                            'Text Editor pengetik.',
                            'Operating System.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan kompilator dan interpreter.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Kompilator (seperti gcc pada C++) mengompilasi seluruh kode sumber menjadi file biner bereksekusi (.exe) terlebih dahulu.',
                        'explanation_distractors' => 'Interpreter menerjemahkan baris demi baris saat dijalankan (seperti Python), text editor hanya untuk mengetik kode.',
                    ],
                    [
                        'stem' => 'Salah satu pilar berpikir komputasional berupa kemampuan menyaring hal-hal penting dan mengabaikan detail yang tidak relevan disebut...',
                        'correct' => 'Abstraksi (Abstraction).',
                        'distractors' => [
                            'Dekomposisi.',
                            'Pengenalan Pola (Pattern Recognition).',
                            'Perancangan Algoritma.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi pilar abstraksi pada berpikir komputasional.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Abstraksi memfokuskan nalar pada karakteristik esensial dari masalah untuk menyederhanakan pemodelan.',
                        'explanation_distractors' => 'Dekomposisi memecah masalah, pengenalan pola mencari kesamaan, dan algoritma menyusun langkah solusi.',
                    ],
                    [
                        'stem' => 'Tanda panah (flowline) pada diagram alir (flowchart) berfungsi untuk...',
                        'correct' => 'Menunjukkan arah aliran jalannya eksekusi proses dari satu tahapan ke tahapan berikutnya.',
                        'distractors' => [
                            'Menghapus simbol yang salah secara otomatis.',
                            'Menghitung luas bidang bangun datar.',
                            'Menyimpan file bagan alir ke flashdisk.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan fungsi garis alir (flowline).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Algoritma)',
                        'explanation_correct' => 'Garis alir menghubungkan setiap blok instruksi dan memandu urutan eksekusi algoritma secara berurutan.',
                        'explanation_distractors' => 'Garis alir tidak berfungsi menghapus atau menghitung rumus geometri.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Jika lampu lalu lintas menyala merah maka kendaraan berhenti, jika menyala hijau maka jalan. Struktur logika algoritma yang tepat untuk kasus ini adalah...',
                        'correct' => 'Percabangan kondisi (IF - ELSE).',
                        'distractors' => [
                            'Perulangan tanpa henti (Infinite Loop).',
                            'Pengurutan gelembung (Bubble Sort).',
                            'Deklarasi fungsi rekursif.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan struktur percabangan IF-ELSE pada skenario nyata.',
                        'sub_level' => 'C3 - MOTS (Penerapan Algoritma)',
                        'explanation_correct' => 'Kondisi pengambilan keputusan berbasis aturan syarat logis membutuhkan percabangan IF-ELSE.',
                        'explanation_distractors' => 'Perulangan atau algoritma pengurutan tidak cocok untuk pemilihan keputusan alternatif.',
                    ],
                    [
                        'stem' => 'Langkah pertama yang paling tepat dilakukan seorang programmer sebelum mulai mengetik baris kode program di komputer adalah...',
                        'correct' => 'Menganalisis permasalahan dan merancang alur logika algoritma penyelesaiannya.',
                        'distractors' => [
                            'Langsung mengompilasi lembar kode yang masih kosong.',
                            'Mematikan sambungan daya komputer dan menutup buku panduan.',
                            'Mengunggah program yang belum selesai dibuat ke toko aplikasi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fase perancangan algoritma sebelum penulisan kode.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Perancangan logika yang matang mencegah kesalahan arsitektural saat tahap implementasi koding berlangsung.',
                        'explanation_distractors' => 'Mengompilasi lembar kosong atau langsung menerbitkan aplikasi merupakan langkah tidak masuk akal.',
                    ],
                    [
                        'stem' => 'Diberikan algoritma: Nilai A = 5, Nilai B = 3. Kemudian dieksekusi perintah: A = A + B. Berapakah nilai akhir dari variabel A?',
                        'correct' => '8',
                        'distractors' => [
                            '5',
                            '3',
                            '15',
                        ],
                        'indicator' => 'Peserta didik mampu menghitung nilai luaran operasi penugasan variabel.',
                        'sub_level' => 'C3 - MOTS (Penerapan Perhitungan)',
                        'explanation_correct' => 'Variabel A menampung hasil 5 + 3, sehingga nilai variabel A kini diperbarui menjadi 8.',
                        'explanation_distractors' => 'Pilihan 5 dan 3 adalah nilai sebelum penambahan, sedangkan 15 hasil perkalian.',
                    ],
                    [
                        'stem' => 'Proses melacak dan memperbaiki kesalahan atau galat (bug) di dalam kode program disebut...',
                        'correct' => 'Debugging.',
                        'distractors' => [
                            'Rendering.',
                            'Booting.',
                            'Formatting.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi aktivitas penelusuran galat debugging.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Debugging melibatkan investigasi alur kode, identifikasi penyebab bug, dan penyuntingan kode solusi.',
                        'explanation_distractors' => 'Rendering untuk pemrosesan grafis, booting menyalakan komputer, dan formatting membersihkan drive.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin mencetak teks kalimat \'Tetap Semangat!\' sebanyak 50 kali secara otomatis, struktur logika terbaik yang digunakan adalah...',
                        'correct' => 'Menggunakan struktur perulangan (For / While loop) dengan pencacah angka hingga 50.',
                        'distractors' => [
                            'Mengetik perintah cetak secara manual satu per satu sebanyak 50 baris kalimat.',
                            'Menggunakan struktur percabangan IF bersarang 50 tingkatan.',
                            'Menghapus deklarasi variabel teks dari dalam kode program.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan struktur perulangan teratur untuk otomasi cetak.',
                        'sub_level' => 'C3 - MOTS (Penerapan Algoritma)',
                        'explanation_correct' => 'Looping mengotomatiskan eksekusi perintah berulang dengan ringkas dan hemat baris kode.',
                        'explanation_distractors' => 'Mengetik manual 50 baris atau menyusun IF bersarang sangat tidak efisien dan rentan galat.',
                    ],
                    [
                        'stem' => 'Urutan tahapan pembuatan program komputer yang sistematis dan benar adalah...',
                        'correct' => 'Analisis Masalah -> Perancangan Algoritma -> Penulisan Kode (Coding) -> Pengujian (Testing).',
                        'distractors' => [
                            'Pengujian -> Analisis Masalah -> Penulisan Kode -> Perancangan Algoritma.',
                            'Penulisan Kode -> Publikasi -> Analisis Masalah -> Perancangan Algoritma.',
                            'Perancangan Algoritma -> Publikasi -> Pengujian -> Analisis Masalah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengurutkan alur pengembangan software siklus baku.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Siklus baku rekayasa perangkat lunak dimulai dari analisis kebutuhan hingga pengujian mutu hasil karya.',
                        'explanation_distractors' => 'Pilihan lainnya memutarbalikkan logika proses rekayasa sistem.',
                    ],
                    [
                        'stem' => 'Diberikan pseudocode: x = 10; y = 4; z = x % y. Berapakah nilai akhir dari variabel z yang dihasilkan?',
                        'correct' => '2',
                        'distractors' => [
                            '0',
                            '2.5',
                            '14',
                        ],
                        'indicator' => 'Peserta didik mampu menghitung hasil operasi modulo matematis.',
                        'sub_level' => 'C3 - MOTS (Penerapan Perhitungan)',
                        'explanation_correct' => 'Operasi 10 dibagi 4 menghasilkan 2 dengan sisa pembagian 2 (10 = 4*2 + 2), sehingga nilai z adalah 2.',
                        'explanation_distractors' => 'Nilai 0 jika habis dibagi, 2.5 jika pembagian desimal riil, dan 14 hasil penjumlahan.',
                    ],
                    [
                        'stem' => 'Jika kamu diminta menulis algoritma untuk menentukan apakah sebuah bilangan bulat X bernilai ganjil atau genap, kondisi logika yang tepat adalah...',
                        'correct' => 'JIKA X % 2 == 0 MAKA Genap, SELAIN ITU Ganjil.',
                        'distractors' => [
                            'JIKA X + 2 == 0 MAKA Genap, SELAIN ITU Ganjil.',
                            'JIKA X * 2 == 0 MAKA Ganjil, SELAIN ITU Genap.',
                            'JIKA X / 2 == 1 MAKA Genap, SELAIN ITU Ganjil.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan kondisi percabangan pengecekan paritas ganjil-genap.',
                        'sub_level' => 'C3 - MOTS (Penerapan Logika)',
                        'explanation_correct' => 'Bilangan genap adalah bilangan yang habis dibagi 2 tanpa sisa (sisa bagi modulo 2 sama dengan nol).',
                        'explanation_distractors' => 'Pilihan lainnya menggunakan rumus aritmatika yang keliru untuk pengujian bilangan genap.',
                    ],
                    [
                        'stem' => 'Perhatikan potongan algoritma perulangan: counter = 1; WHILE (counter <= 3) DO { print(counter); counter = counter + 1; }. Apa luaran yang dicetak di layar?',
                        'correct' => '1 2 3',
                        'distractors' => [
                            '1 2',
                            '0 1 2 3',
                            '3 2 1',
                        ],
                        'indicator' => 'Peserta didik mampu melacak eksekusi variabel perulangan While berpenghitung.',
                        'sub_level' => 'C3 - MOTS (Penelusuran Algoritma)',
                        'explanation_correct' => 'Loop berjalan saat counter bernilai 1, 2, dan 3. Saat counter bertambah menjadi 4, loop berhenti karena 4 > 3.',
                        'explanation_distractors' => 'Pilihan lainnya mengabaikan iterasi nilai 3 atau salah menetapkan nilai awal counter.',
                    ],
                    [
                        'stem' => 'Diberikan algoritma pertukaran dua gelas: Gelas A berisi sirup, Gelas B berisi susu. Langkah yang benar untuk menukar isi kedua gelas menggunakan gelas kosong C adalah...',
                        'correct' => 'Tuang isi Gelas A ke Gelas C -> Tuang isi Gelas B ke Gelas A -> Tuang isi Gelas C ke Gelas B.',
                        'distractors' => [
                            'Tuang isi Gelas A langsung ke Gelas B hingga bercampur -> Tuang ke C.',
                            'Tuang isi Gelas B ke C -> Tuang isi Gelas B ke A -> Buang isi Gelas C.',
                            'Tutup kedua gelas rapat-rapat.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan algoritma swap pertukaran dua variabel dengan variabel bantu.',
                        'sub_level' => 'C3 - MOTS (Penerapan Algoritma)',
                        'explanation_correct' => 'Variabel bantu C menyimpan nilai A sementara agar nilai A dapat ditimpa nilai B tanpa menghilangkan data awal.',
                        'explanation_distractors' => 'Menuang langsung tanpa wadah cadangan mencampuradukkan data dan merusak nilai variabel.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menyimpan daftar nama dari 35 siswa di dalam satu variabel tunggal, tipe struktur data yang paling tepat dideklarasikan adalah...',
                        'correct' => 'Array of String (Larik Teks) berukuran 35 elemen.',
                        'distractors' => [
                            'Satu variabel Boolean tunggal.',
                            'Variabel Integer bernilai 35.',
                            'Konstanta karakter tunggal.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan struktur data array untuk koleksi entitas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Struktur Data)',
                        'explanation_correct' => 'Array of String memungkinkan penyimpanan daftar nama siswa dengan akses indeks nama[0] s/d nama[34].',
                        'explanation_distractors' => 'Boolean hanya menyimpan True/False, dan satu variabel integer hanya menyimpan satu angka tunggal.',
                    ],
                    [
                        'stem' => 'Ketika membuat alur flowchart untuk pendaftaran akun: Setelah memasukkan password, sistem harus memvalidasi \'Apakah panjang password minimal 8 karakter?\'. Simbol flowchart yang digunakan adalah...',
                        'correct' => 'Simbol belah ketupat (Decision) dengan dua cabang keluar bertanda \'Ya\' dan \'Tidak\'.',
                        'distractors' => [
                            'Simbol persegi panjang tanpa cabang keluar.',
                            'Simbol lingkaran konektor kabel.',
                            'Simbol elips terminator bertuliskan selesai.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih simbol flowchart decision untuk validasi input.',
                        'sub_level' => 'C3 - MOTS (Penerapan Desain Alur)',
                        'explanation_correct' => 'Validasi panjang karakter adalah percabangan logika bercabang dua (lolos verifikasi atau kembali ke isian).',
                        'explanation_distractors' => 'Persegi panjang untuk eksekusi proses statis tanpa evaluasi kondisi.',
                    ],
                    [
                        'stem' => 'Diberikan operasi logika ekspresi: (5 > 2) AND (3 == 4). Bagaimanakah hasil evaluasi nilai kebenaran akhir ekspresi tersebut?',
                        'correct' => 'False (Salah), karena kondisi kedua (3 == 4) bernilai False sehingga operator AND menghasilkan False.',
                        'distractors' => [
                            'True (Benar), karena kondisi pertama (5 > 2) sudah bernilai Benar.',
                            'Galat (Error), karena angka tidak dapat dievaluasi dengan AND.',
                            'Bernilai 0.5.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi ekspresi logika kombinasi operator perbandingan dan boolean.',
                        'sub_level' => 'C3 - MOTS (Evaluasi Logika)',
                        'explanation_correct' => 'Operator AND membutuhkan True di kedua sisinya: True AND False menghasilkan nilai akhir False.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami hukum tabel kebenaran gerbang logika AND.',
                    ],
                    [
                        'stem' => 'Jika sebuah program membutuhkan fungsi matematika untuk menghitung keliling lingkaran, rumus algoritma yang tepat dituliskan adalah...',
                        'correct' => 'keliling = 2 * 3.14 * jari_jari',
                        'distractors' => [
                            'keliling = 3.14 * jari_jari * jari_jari',
                            'keliling = 2 + 3.14 + jari_jari',
                            'keliling = jari_jari / 3.14',
                        ],
                        'indicator' => 'Peserta didik mampu mengimplementasikan formula rumus geometri ke dalam baris algoritma.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Formula baku keliling lingkaran adalah 2 * pi * r, sedangkan pi * r^2 adalah formula luas lingkaran.',
                        'explanation_distractors' => 'Pilihan lainnya adalah rumus luas lingkaran atau operasi matematika yang keliru.',
                    ],
                    [
                        'stem' => 'Dalam penulisan kode program, mengapa nama variabel sebaiknya menggunakan kata yang deskriptif (contoh: \'total_nilai\' bukan hanya \'x\')?',
                        'correct' => 'Membuat kode program lebih mudah dipahami alurnya oleh pemrogram lain saat membaca dan memelihara kode.',
                        'distractors' => [
                            'Agar program otomatis berjalan sepuluh kali lebih cepat di komputer.',
                            'Karena komputer menolak variabel yang hanya memiliki satu huruf.',
                            'Supaya ukuran file program menjadi lebih kecil.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan konvensi penamaan variabel yang bersih (clean code).',
                        'sub_level' => 'C3 - MOTS (Penerapan Standar Koding)',
                        'explanation_correct' => 'Penamaan deskriptif meningkatkan keterbacaan kode (code readability) dan mempermudah kolaborasi pengembangan software.',
                        'explanation_distractors' => 'Nama variabel tidak memengaruhi kecepatan clock prosesor atau ukuran kompilasi biner.',
                    ],
                    [
                        'stem' => 'Perhatikan algoritma: nilai = 60; IF (nilai >= 70) THEN status = \'Tuntas\' ELSE status = \'Remedial\'; Apa isi variabel status setelah dieksekusi?',
                        'correct' => '\'Remedial\', karena nilai 60 lebih kecil dari 70 sehingga mengeksekusi blok ELSE.',
                        'distractors' => [
                            '\'Tuntas\', karena nilai 60 mendekati 70.',
                            '\'Kosong\', karena tidak ada yang cocok.',
                            '\'Galat\', karena angka dan teks dicampur.',
                        ],
                        'indicator' => 'Peserta didik mampu menelusuri hasil evaluasi percabangan IF-ELSE sederhana.',
                        'sub_level' => 'C3 - MOTS (Penelusuran Logika)',
                        'explanation_correct' => 'Evaluasi (60 >= 70) menghasilkan nilai False, sehingga program langsung melompat ke cabang ELSE.',
                        'explanation_distractors' => 'Logika perbandingan komputer bersifat biner pasti, bukan perkiraan subjektif mendekati.',
                    ],
                    [
                        'stem' => 'Ketika menyusun algoritma untuk mengurutkan daftar nama siswa sesuai abjad A ke Z, jenis masalah komputasional yang sedang kamu selesaikan adalah...',
                        'correct' => 'Sorting (Pengurutan Data).',
                        'distractors' => [
                            'Searching (Pencarian Data).',
                            'Filtering (Penyaringan).',
                            'Deleting (Penghapusan).',
                        ],
                        'indicator' => 'Peserta didik mampu mengklasifikasikan persoalan algoritma pengurutan (Sorting).',
                        'sub_level' => 'C3 - MOTS (Penerapan Algoritma)',
                        'explanation_correct' => 'Pengurutan leksikografis abjad data teks adalah domain klasik masalah algoritma sorting.',
                        'explanation_distractors' => 'Searching mencari letak data, filtering menyaring kriteria, dan deleting membuang rekaman data.',
                    ],
                    [
                        'stem' => 'Langkah tepat yang dilakukan pemrogram saat program yang dibuatnya berhasil dikompilasi tanpa error tetapi hasilnya tidak sesuai dengan perhitungan manual adalah...',
                        'correct' => 'Memeriksa kembali urutan logika rumus aritmatika dan kondisi percabangan di dalam kode sumber.',
                        'distractors' => [
                            'Membeli monitor komputer yang baru.',
                            'Menghapus seluruh baris program dan tidak mau membuat program lagi.',
                            'Menyalahkan keyboard komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan investigasi galat logika (logic error).',
                        'sub_level' => 'C3 - MOTS (Penerapan Debugging)',
                        'explanation_correct' => 'Hasil hitungan salah padahal kompilasi sukses menandakan adanya kesalahan logika (logic error) pada rumus.',
                        'explanation_distractors' => 'Mengganti hardware tidak akan memperbaiki kesalahan rumus matematika di dalam program.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Sebuah program mengalami kondisi perulangan tak terhingga (infinite loop) sehingga komputer membeku. Analisis penyebab utama dari masalah ini adalah...',
                        'correct' => 'Kondisi henti perulangan tidak pernah bernilai False karena nilai variabel pencacah tidak bertambah atau tidak diperbarui.',
                        'distractors' => [
                            'Kapasitas ruang penyimpanan harddisk sekunder komputer habis.',
                            'Pengguna menekan tombol spasi keyboard dengan terlalu cepat.',
                            'Warna antarmuka grafis program terlalu terang.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis kesalahan terminasi logika perulangan infinite loop.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Logika)',
                        'explanation_correct' => 'Ketiadaan pembaruan counter membuat kondisi syarat terus terpenuhi (True) sehingga loop tidak pernah berhenti.',
                        'explanation_distractors' => 'Pilihan pengecoh mengasumsikan faktor hardware dan grafis yang tidak memengaruhi logika loop.',
                    ],
                    [
                        'stem' => 'Diberikan aturan logika: \'JIKA nilai >= 75 MAKA Lulus, SELAIN ITU Remedial\'. Jika siswa bernama Budi memperoleh nilai 75, apa hasil luaran program dan alasannya?',
                        'correct' => 'Lulus, karena nilai 75 memenuhi syarat kondisi lebih besar atau sama dengan (>=) 75.',
                        'distractors' => [
                            'Remedial, karena nilai 75 belum melampaui angka 75.',
                            'Program galat, karena angka 75 tidak dapat dibandingkan oleh logika komputer.',
                            'Program berhenti, karena tidak ada penanganan untuk angka yang nilainya sama.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi nilai ambang batas logika percabangan operator inklusif.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Logika)',
                        'explanation_correct' => 'Operator relasional \'>=\' mencakup nilai batas pembanding sehingga angka 75 valid menghasilkan kondisi Lulus.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami arti inklusif dari operator \'>=\'.',
                    ],
                    [
                        'stem' => 'Dua algoritma menghasilkan luaran yang sama persis. Algoritma A membutuhkan 10 langkah operasi, sedangkan Algoritma B membutuhkan 1.000 langkah operasi. Evaluasi yang tepat adalah...',
                        'correct' => 'Algoritma A jauh lebih efisien karena membutuhkan waktu eksekusi dan pemakaian sumber daya komputasi yang lebih hemat.',
                        'distractors' => [
                            'Algoritma B lebih unggul karena memiliki lebih banyak baris kode sehingga terlihat lebih canggih.',
                            'Kedua algoritma sama efisiennya karena hasil akhir keduanya sama persis.',
                            'Algoritma A pasti memiliki galat karena jumlah langkahnya terlalu sedikit.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi kompleksitas efisiensi komputasi dua algoritma.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Kompleksitas)',
                        'explanation_correct' => 'Efisiensi algoritma diukur dari jumlah langkah eksekusi waktu (time complexity) dan memori yang dipakai.',
                        'explanation_distractors' => 'Banyaknya baris kode yang boros operasi justru menandakan algoritma yang tidak efisien.',
                    ],
                    [
                        'stem' => 'Mengapa dekomposisi (memecah masalah besar menjadi submasalah kecil) merupakan keterampilan krusial dalam berpikir komputasional?',
                        'correct' => 'Karena memecah masalah membuat setiap bagian lebih sederhana untuk dianalisis, dirancang logikanya, dan diuji secara terpisah.',
                        'distractors' => [
                            'Karena komputer menolak memproses permasalahan yang memiliki lebih dari satu baris instruksi.',
                            'Agar kita bisa menghindari kewajiban merancang kode program sama sekali.',
                            'Supaya ukuran kapasitas file kode program menjadi berlipat ganda lebih besar.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis peran teknik dekomposisi masalah pada berpikir komputasional.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Komputasional)',
                        'explanation_correct' => 'Dekomposisi mereduksi kompleksitas sistem sehingga penyelesaian per modul lebih terfokus dan mudah di-debug.',
                        'explanation_distractors' => 'Pilihan lainnya menyimpang dari esensi metodologi berpikir komputasional.',
                    ],
                    [
                        'stem' => 'Perbedaan mendasar antara kesalahan sintaksis (syntax error) dan kesalahan logika (logic error) dalam pemrograman adalah...',
                        'correct' => 'Syntax error melanggar aturan tata bahasa kode sehingga program gagal dijalankan, sedangkan logic error program tetap berjalan tetapi hasil akhirnya salah.',
                        'distractors' => [
                            'Syntax error membuat komputer mati mendadak, sedangkan logic error membuat layar monitor berkedip.',
                            'Syntax error hanya terjadi pada komputer lama, sedangkan logic error terjadi pada ponsel cerdas modern.',
                            'Syntax error dapat diperbaiki otomatis oleh browser tanpa campur tangan programmer.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan syntax error dan logic error.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Galat)',
                        'explanation_correct' => 'Syntax error ditolak parser compiler/interpreter, sedangkan logic error lolos kompilasi namun menghasilkan keluaran keliru.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang dampak fisik yang keliru.',
                    ],
                    [
                        'stem' => 'Jika seorang siswa membuat program kalkulator dan saat memasukkan pembagian dengan angka nol program langsung macet (crash), evaluasi penanganan yang perlu ditambahkan adalah...',
                        'correct' => 'Menambahkan validasi kondisi IF untuk mengecek jika angka pembagi sama dengan nol maka tampilkan peringatan \'Pembagi tidak boleh nol\'.',
                        'distractors' => [
                            'Mengganti jenis monitor komputer dengan monitor beresolusi lebih tinggi.',
                            'Menghapus seluruh tombol angka pada tampilan antarmuka kalkulator.',
                            'Mematikan fitur perhitungan perkalian dan pengurangan pada kalkulator.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang validasi error handling pencegahan division by zero.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Solusi)',
                        'explanation_correct' => 'Pencegahan division by zero memerlukan validasi input (defensive programming) sebelum operasi aritmatika dieksekusi.',
                        'explanation_distractors' => 'Pilihan lainnya tidak menyelesaikan akar penyebab crash perhitungan matematika.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat game tebak angka 1-100. Metode pencarian biner (Binary Search) selalu menebak angka di tengah rentang. Evaluasi keunggulan metode ini dibandingkan menebak urut dari angka 1 adalah...',
                        'correct' => 'Binary search memangkas separuh kemungkinan angka di setiap tebakan sehingga paling banyak hanya membutuhkan 7 kali tebakan untuk menemukan angka yang tepat.',
                        'distractors' => [
                            'Menebak dari angka 1 selalu lebih cepat jika angka rahasianya adalah 99.',
                            'Binary search membutuhkan seratus komputer yang bekerja bersamaan.',
                            'Kedua metode membutuhkan waktu dan jumlah tebakan yang sama persis.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis keunggulan algoritma pencarian biner O(log n).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kompleksitas)',
                        'explanation_correct' => 'Kompleksitas biner O(log2 N) mereduksi 100 kemungkinan menjadi maksimal 7 perbandingan (2^7 = 128 > 100).',
                        'explanation_distractors' => 'Pencarian sekuensial membutuhkan rata-rata 50 langkah dan hingga 100 langkah dalam kasus terburuk.',
                    ],
                    [
                        'stem' => 'Perhatikan potongan kode: for (i = 0; i < 5; i++) { for (j = 0; j < 3; j++) { print(\'*\'); } }. Berapa kali simbol bintang (*) akan dicetak di layar?',
                        'correct' => '15 kali, karena perulangan bersarang mengalikan 5 iterasi luar dengan 3 iterasi dalam.',
                        'distractors' => [
                            '8 kali, karena 5 ditambah 3.',
                            '5 kali saja.',
                            '3 kali saja.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis jumlah eksekusi perulangan bersarang (nested loops).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Algoritma)',
                        'explanation_correct' => 'Setiap 1 putaran loop luar mengeksekusi 3 putaran loop dalam; total eksekusi adalah 5 * 3 = 15 kali.',
                        'explanation_distractors' => 'Pilihan lainnya salah menjumlahkan atau hanya menghitung satu level loop.',
                    ],
                    [
                        'stem' => 'Ketika sebuah algoritma perbankan memproses transaksi penarikan uang tabungan, mengapa urutan langkah \'Cek saldo -> Kurangi saldo -> Keluarkan uang\' mutlak harus dijalankan secara atomik (berurutan tanpa jeda)?',
                        'correct' => 'Mencegah terjadinya race condition di mana nasabah dapat menarik uang melebihi saldo tabungan jika transaksi dilakukan serentak di dua tempat.',
                        'distractors' => [
                            'Agar uang kertas di mesin ATM tidak kusut saat keluar.',
                            'Supaya nomor rekening nasabah otomatis berganti menjadi nomor baru.',
                            'Karena komputer perbankan tidak bisa membaca angka bernilai ganjil.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis integritas transaksi dan mitigasi race condition.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Konkurensi)',
                        'explanation_correct' => 'Pengecekan dan pemotongan saldo harus terkunci (lock transaction) agar konsistensi neraca akun tetap terjaga.',
                        'explanation_distractors' => 'Pilihan lainnya adalah alasan fiktif yang tidak relevan dengan logika transaksi data.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat program yang membaca nilai array siswa: data = [80, 90, 75]. Ketika program mencoba mengakses data[3], program langsung berhenti dengan galat \'Index Out of Bounds\'. Analisis penyebabnya adalah...',
                        'correct' => 'Indeks array dimulai dari angka 0 sehingga elemen ketiga berada di indeks 2; indeks 3 merujuk ke elemen keempat yang tidak ada.',
                        'distractors' => [
                            'Angka 3 adalah bilangan prima yang dilarang oleh aturan pemrograman.',
                            'Variabel data telah dihapus oleh virus komputer.',
                            'Nilai 75 di dalam array tidak bisa dibagi dengan angka 3.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis galat indeks array out of bounds (zero-based indexing).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Struktur Data)',
                        'explanation_correct' => 'Zero-based indexing memetakan 3 elemen ke indeks 0, 1, dan 2; memanggil indeks 3 melanggar batas alokasi memori array.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami konsep pengindeksan array dan mengarang larangan bilangan prima.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa penulisan algoritma rekursif (fungsi yang memanggil dirinya sendiri) wajib memiliki \'Base Case\' (Kondisi Berhenti) adalah...',
                        'correct' => 'Mencegah terjadinya stack overflow (memori tumpukan habis) akibat pemanggilan fungsi tanpa batas yang membekukan sistem.',
                        'distractors' => [
                            'Agar fungsi rekursif dapat mengubah dirinya menjadi file gambar.',
                            'Supaya program dapat dijalankan tanpa membutuhkan layar monitor.',
                            'Karena bahasa pemrograman melarang fungsi yang memiliki nama huruf vokal.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis pentingnya base case pada fungsi rekursif.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Algoritma Rekursif)',
                        'explanation_correct' => 'Base case menghentikan rantai pemanggilan rekursi dan mengembalikan hasil ke tumpukan panggilan sebelumnya.',
                        'explanation_distractors' => 'Ketiadaan base case memicu stack overflow exception, bukan konversi gambar.',
                    ],
                    [
                        'stem' => 'Dalam pembuatan peta navigasi rute perjalanan terpendek (seperti Google Maps), pendekatan berpikir komputasional pengenalan pola (pattern recognition) diterapkan saat...',
                        'correct' => 'Menganalisis pola kemacetan lalu lintas pada jam-jam sibuk di hari-hari sebelumnya untuk memprediksi durasi tercepat.',
                        'distractors' => [
                            'Menghapus semua nama jalan dari peta.',
                            'Mematikan sinyal GPS di seluruh kota.',
                            'Mengecat jalan raya dengan warna pelangi.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis aplikasi pengenalan pola dalam navigasi rute terpendek.',
                        'sub_level' => '{$subLevel} - HOTS (Penerapan Computational Thinking)',
                        'explanation_correct' => 'Pengenalan pola mengekstrak tren historis kecepatan rata-rata jalan untuk mengoptimalkan bobot graf rute tercepat.',
                        'explanation_distractors' => 'Pilihan lainnya adalah tindakan destruktif yang tidak bernalar komputasi.',
                    ],
                    [
                        'stem' => 'Perhatikan algoritma penentuan diskon: IF (total_belanja > 100000) THEN diskon = 10%; ELSE IF (total_belanja > 50000) THEN diskon = 5%; ELSE diskon = 0%. Jika total_belanja = 100000, berapakah diskon yang diterima pembeli?',
                        'correct' => '5%, karena 100000 tidak memenuhi syarat \'> 100000\' (harus lebih dari), namun memenuhi syarat kedua \'> 50000\'.',
                        'distractors' => [
                            '10%, karena 100000 mencapai angka seratus ribu.',
                            '0%, karena tidak ada kondisi yang sama persis seratus ribu.',
                            '15%, karena kedua diskon digabungkan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis batas ketat operator relasional \'>\' versus \'>=\'.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kondisi Bersyarat)',
                        'explanation_correct' => 'Operator \'>\' bersifat strictly greater than; nilai 100.000 gagal di kondisi pertama dan lolos di kondisi kedua.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami perbedaan antara operator strictly greater than dan greater than or equal.',
                    ],
                    [
                        'stem' => 'Analisis mengapa pengujian perangkat lunak (testing) harus mencakup \'Boundary Values\' (Nilai-nilai Batas Ekstrem, seperti 0, batas minimum, dan batas maksimum) adalah...',
                        'correct' => 'Karena sebagian besar galat logika pemrograman (off-by-one errors) terjadi tepat di sekitar titik ambang batas perubahan kondisi.',
                        'distractors' => [
                            'Karena nilai batas adalah angka keberuntungan dalam matematika.',
                            'Agar program dapat berjalan tanpa menggunakan prosesor komputer.',
                            'Supaya penguji tidak perlu membaca baris kode program.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi metodologi pengujian nilai batas (Boundary Value Analysis).',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Pengujian Software)',
                        'explanation_correct' => 'Boundary Value Analysis membuktikan ketepatan operator relasional (< vs <=) yang paling sering menjadi sarang bug.',
                        'explanation_distractors' => 'Pilihan lainnya tidak memiliki dasar ilmiah dalam metodologi penjaminan mutu software.',
                    ],
                    [
                        'stem' => 'Seorang siswa merancang algoritma sistem parkir: \'Saat kendaraan masuk, catat plat nomor. Saat keluar, hitung durasi dan cetak struk\'. Langkah validasi yang wajib ditambahkan jika pengendara kehilangan karcis parkir adalah...',
                        'correct' => 'Menambahkan modul penanganan pengecualian (exception handling) untuk memverifikasi nomor plat dan mencocokkan rekaman kamera masuk.',
                        'distractors' => [
                            'Menutup pintu gerbang parkir selamanya dan tidak mengizinkan kendaraan keluar.',
                            'Menghapus seluruh database parkir kendaraan.',
                            'Menggratiskan biaya parkir tanpa pemeriksaan identitas apa pun.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang penanganan skenario anomali (edge case) pada algoritma sistem.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Sistem)',
                        'explanation_correct' => 'Sistem yang tangguh (robust system) wajib memiliki prosedur alternatif untuk menangani skenario di luar alur normal.',
                        'explanation_distractors' => 'Menutup gerbang selamanya atau menghapus database bukanlah solusi rekayasa sistem yang bertanggung jawab.',
                    ],
                    [
                        'stem' => 'Evaluasi perbedaan mendasar antara loop \'WHILE\' (kondisi di awal) dan loop \'DO-WHILE\' (kondisi di akhir) dalam algoritma adalah...',
                        'correct' => 'Loop DO-WHILE menjamin blok instruksi dieksekusi minimal satu kali meskipun kondisi awal bernilai False, sedangkan WHILE bisa tidak dieksekusi sama sekali jika kondisi awal False.',
                        'distractors' => [
                            'Loop WHILE hanya boleh digunakan untuk angka genap sedangkan DO-WHILE untuk angka ganjil.',
                            'Loop DO-WHILE berjalan seratus kali lebih cepat daripada loop WHILE.',
                            'Kedua jenis loop memiliki cara kerja dan jaminan eksekusi yang sama persis.',
                        ],
                        'indicator' => 'Peserta didik mampu membandingkan karakteristik pre-test loop vs post-test loop.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Struktur Kontrol)',
                        'explanation_correct' => 'Pemeriksaan kondisi di akhir blok pada do-while menjamin eksekusi pertama selalu lolos sebelum uji syarat.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang pengelompokan angka genap/ganjil atau kecepatan yang keliru.',
                    ],
                    [
                        'stem' => 'Ketika dua orang siswa menulis algoritma untuk mencari nilai rata-rata kelas, Siswa A menghitung jumlah total saat data dimasukkan, sedangkan Siswa B menyimpan semua data lalu menjumlahkannya di akhir. Evaluasi efisiensi memori kedua algoritma adalah...',
                        'correct' => 'Algoritma Siswa A jauh lebih hemat memori karena hanya membutuhkan dua variabel akumulator, sedangkan Siswa B membutuhkan ruang array sebesar jumlah seluruh siswa.',
                        'distractors' => [
                            'Algoritma Siswa B lebih hemat karena array tidak membutuhkan ruang memori sama sekali.',
                            'Kedua algoritma memakai kapasitas memori yang sama persis.',
                            'Algoritma Siswa A salah karena tidak boleh menjumlahkan data secara langsung.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi efisiensi ruang memori (Space Complexity) dua pendekatan algoritma.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Kompleksitas Ruang)',
                        'explanation_correct' => 'Streaming accumulation (Siswa A) memiliki kompleksitas ruang O(1), sedangkan buffering array (Siswa B) O(N).',
                        'explanation_distractors' => 'Menyimpan seluruh data ke memori array membutuhkan alokasi memori proporsional terhadap banyaknya siswa.',
                    ],
                    [
                        'stem' => 'Analisis mengapa modularisasi program (memecah kode menjadi beberapa fungsi/sub-prosedur kecil) sangat menguntungkan saat terjadi kesalahan (bug) pada aplikasi besar adalah...',
                        'correct' => 'Proses pelacakan dan perbaikan kesalahan dapat diisolasi pada fungsi yang bermasalah saja tanpa merusak fungsi-fungsi lainnya.',
                        'distractors' => [
                            'Karena fungsi kecil membuat program otomatis kebal terhadap segala bentuk virus komputer.',
                            'Karena komputer menolak menjalankan program yang tidak memiliki seratus fungsi.',
                            'Agar ukuran file kode program menjadi berlipat ganda.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis keunggulan arsitektur modular pada pemeliharaan software.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Arsitektur Software)',
                        'explanation_correct' => 'Prinsip modularitas menghasilkan decoupling: perbaikan pada satu modul tidak menimbulkan efek samping (side effects) pada modul lain.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang kekebalan virus atau kewajiban jumlah fungsi fiktif.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getDataAnalysisAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Fungsi rumus pada aplikasi lembar sebar (spreadsheet) yang digunakan untuk menjumlahkan sekumpulan data angka adalah...',
                        'correct' => '=SUM(...)',
                        'distractors' => [
                            '=AVERAGE(...)',
                            '=MAX(...)',
                            '=COUNT(...)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi rumus SUM pada spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fungsi =SUM digunakan untuk menjumlahkan total seluruh nilai numerik dalam rentang sel yang ditentukan.',
                        'explanation_distractors' => 'AVERAGE untuk rata-rata, MAX untuk nilai terbesar, dan COUNT untuk menghitung frekuensi sel angka.',
                    ],
                    [
                        'stem' => 'Fungsi rumus lembar sebar yang digunakan untuk menghitung nilai rata-rata dari sekumpulan data angka adalah...',
                        'correct' => '=AVERAGE(...)',
                        'distractors' => [
                            '=SUM(...)',
                            '=MIN(...)',
                            '=IF(...)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi rumus AVERAGE pada spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fungsi =AVERAGE membagi jumlah total nilai dengan banyaknya data secara otomatis.',
                        'explanation_distractors' => 'SUM untuk penjumlahan total, MIN untuk nilai terkecil, dan IF untuk logika syarat.',
                    ],
                    [
                        'stem' => 'Kotak pertemuan antara kolom huruf vertikal dan baris angka horizontal pada lembar kerja spreadsheet disebut...',
                        'correct' => 'Sel (Cell).',
                        'distractors' => [
                            'Range.',
                            'Toolbar.',
                            'Ribbon.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali pengertian sel (cell) spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Sel adalah unit terkecil tempat memasukkan data yang diidentifikasi oleh koordinat kolom dan baris (contoh: B4).',
                        'explanation_distractors' => 'Range adalah kumpulan beberapa sel, sedangkan toolbar/ribbon adalah deretan menu perintah.',
                    ],
                    [
                        'stem' => 'Fitur yang digunakan untuk mengurutkan data dari nilai terkecil ke terbesar (A ke Z) pada tabel spreadsheet adalah...',
                        'correct' => 'Sort Ascending.',
                        'distractors' => [
                            'Filter.',
                            'Merge Cells.',
                            'Wrap Text.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fitur Sort Ascending pada tabel data.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Sort Ascending menyusun data dari urutan terendah ke tertinggi atau abjad A menuju Z.',
                        'explanation_distractors' => 'Filter menyaring baris data, Merge Cells menggabungkan sel, dan Wrap Text melipat teks panjang.',
                    ],
                    [
                        'stem' => 'Fitur pada lembar sebar yang berfungsi menyaring dan menampilkan baris data tertentu saja yang memenuhi kriteria adalah...',
                        'correct' => 'Filter.',
                        'distractors' => [
                            'Delete.',
                            'Underline.',
                            'Zoom.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi Filter pada spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fitur Filter membatasi tampilan baris lembar kerja hanya pada baris yang sesuai dengan parameter syarat yang dipilih.',
                        'explanation_distractors' => 'Delete menghapus data, Underline memberi garis bawah, dan Zoom mengubah skala pandang layar.',
                    ],
                    [
                        'stem' => 'Fungsi rumus spreadsheet yang digunakan untuk mencari nilai angka terkecil dari suatu rentang sel adalah...',
                        'correct' => '=MIN(...)',
                        'distractors' => [
                            '=MAX(...)',
                            '=SUM(...)',
                            '=COUNT(...)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi MIN pada spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fungsi =MIN mengevaluasi rentang sel dan mengembalikan nilai numerik paling rendah.',
                        'explanation_distractors' => 'MAX mencari nilai tertinggi, SUM mencari jumlah total, dan COUNT menghitung jumlah data.',
                    ],
                    [
                        'stem' => 'Fungsi rumus spreadsheet yang digunakan untuk mencari nilai angka terbesar dari suatu rentang sel data adalah...',
                        'correct' => '=MAX(...)',
                        'distractors' => [
                            '=MIN(...)',
                            '=SUM(...)',
                            '=AVERAGE(...)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi rumus MAX.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fungsi =MAX memindai rentang sel dan menampilkan angka numerik paling tinggi.',
                        'explanation_distractors' => 'MIN untuk nilai terendah, SUM untuk total jumlah, dan AVERAGE untuk rata-rata.',
                    ],
                    [
                        'stem' => 'Kumpulan dari beberapa sel yang dipilih secara bersamaan dalam lembar kerja spreadsheet disebut...',
                        'correct' => 'Range (Rentang Sel).',
                        'distractors' => [
                            'Single Cell.',
                            'Formula Bar.',
                            'Sheet Tab.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep range pada lembar kerja.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Range adalah blok sel berbentuk persegi panjang yang diidentifikasi oleh koordinat awal dan akhir (misal: A1:C10).',
                        'explanation_distractors' => 'Single cell hanya satu sel, formula bar bilah pengetik rumus, dan sheet tab penanda lembar kerja.',
                    ],
                    [
                        'stem' => 'Fungsi rumus yang digunakan untuk menghitung banyaknya sel yang memuat data angka dalam suatu rentang adalah...',
                        'correct' => '=COUNT(...)',
                        'distractors' => [
                            '=SUM(...)',
                            '=MAX(...)',
                            '=AVERAGE(...)',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi rumus COUNT.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Fungsi =COUNT menghitung frekuensi kemunculan sel numerik, bukan menjumlahkan nilai angkanya.',
                        'explanation_distractors' => 'SUM menjumlahkan nilai isi sel, AVERAGE menghitung nilai rerata.',
                    ],
                    [
                        'stem' => 'Karakter pemisah yang digunakan untuk menunjukkan rentang sel dari sel awal hingga sel akhir (contoh: A1 sampai B10) adalah...',
                        'correct' => 'Tanda titik dua ( : ).',
                        'distractors' => [
                            'Tanda tanya ( ? ).',
                            'Tanda seru ( ! ).',
                            'Tanda bintang ( * ).',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali operator rentang sel titik dua (:).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Notasi A1:B10 mendefinisikan rentang seluruh sel mulai dari sudut kiri atas A1 hingga sudut kanan bawah B10.',
                        'explanation_distractors' => 'Tanda tanya bukan operator range dan bintang adalah operator perkalian.',
                    ],
                    [
                        'stem' => 'Bilah panjang di bagian atas lembar sebar tempat kita dapat melihat dan menyunting rumus yang sedang aktif di sel disebut...',
                        'correct' => 'Formula Bar.',
                        'distractors' => [
                            'Status Bar.',
                            'Scroll Bar.',
                            'Title Bar.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi bagian Formula Bar spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Formula Bar menampilkan sintaks rumus asli di balik angka luaran yang tampak di dalam sel.',
                        'explanation_distractors' => 'Status bar menampilkan ringkasan di bawah jendela, scroll bar untuk menggeser, dan title bar judul file.',
                    ],
                    [
                        'stem' => 'Fitur spreadsheet yang melipat teks kalimat panjang agar tampil menjadi beberapa baris dalam satu sel tanpa melebar ke sel sebelahnya adalah...',
                        'correct' => 'Wrap Text.',
                        'distractors' => [
                            'Merge Cells.',
                            'Clear Contents.',
                            'Insert Column.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fitur penataan teks Wrap Text.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Wrap Text secara otomatis menambah tinggi baris sel agar seluruh kalimat terbaca vertikal rapi.',
                        'explanation_distractors' => 'Merge Cells menyatukan sel, Clear Contents menghapus isi, dan Insert Column menambah kolom.',
                    ],
                    [
                        'stem' => 'Perataan standar bawaan (default alignment) untuk data berupa ANGKA pada sel spreadsheet adalah...',
                        'correct' => 'Rata kanan (Right align).',
                        'distractors' => [
                            'Rata kiri (Left align).',
                            'Rata tengah (Center align).',
                            'Rata atas bawah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali konvensi perataan bawaan data numerik.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Data angka otomatis diratakan ke kanan agar nilai desimal dan satuan tersusun lurus sesuai nilai tempatnya.',
                        'explanation_distractors' => 'Data teks otomatis diratakan ke kiri, sedangkan rata tengah harus diatur manual.',
                    ],
                    [
                        'stem' => 'Perataan standar bawaan (default alignment) untuk data berupa TEKS huruf pada sel spreadsheet adalah...',
                        'correct' => 'Rata kiri (Left align).',
                        'distractors' => [
                            'Rata kanan (Right align).',
                            'Rata tengah (Center align).',
                            'Miring 45 derajat.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali konvensi perataan bawaan data teks.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Aplikasi spreadsheet otomatis menempatkan data tipe teks (string) rata ke sisi kiri sel.',
                        'explanation_distractors' => 'Rata kanan untuk angka dan tanggal, rata tengah pilihan format manual.',
                    ],
                    [
                        'stem' => 'Fitur pengurutan data dari abjad Z ke A atau dari angka terbesar ke terkecil disebut...',
                        'correct' => 'Sort Descending.',
                        'distractors' => [
                            'Sort Ascending.',
                            'Data Validation.',
                            'Conditional Formatting.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi pengurutan terbalik Sort Descending.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Sort Descending menyusun rekaman data menurun dari nilai puncak ke nilai terendah.',
                        'explanation_distractors' => 'Sort Ascending menyusun dari kecil ke besar (A ke Z).',
                    ],
                    [
                        'stem' => 'Tipe grafik pada spreadsheet yang paling tepat digunakan untuk memperlihatkan proporsi persentase dari total seratus persen adalah...',
                        'correct' => 'Pie Chart (Diagram Lingkaran).',
                        'distractors' => [
                            'Line Chart (Grafik Garis).',
                            'Scatter Plot.',
                            'Radar Chart.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih jenis grafik proporsi Pie Chart.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Diagram lingkaran membagi satu lingkaran utuh menjadi irisan persentase tiap kategori.',
                        'explanation_distractors' => 'Line chart untuk tren berkala, scatter plot untuk korelasi koordinat.',
                    ],
                    [
                        'stem' => 'Format data yang digunakan khusus untuk menampilkan nilai mata uang rupiah (seperti Rp 50.000) pada sel angka adalah...',
                        'correct' => 'Currency atau Accounting.',
                        'distractors' => [
                            'Scientific ilmiah.',
                            'Percentage persen.',
                            'Fraction pecahan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi format tampilan sel Currency/Accounting.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Format Currency/Accounting menyematkan simbol mata uang dan pemisah ribuan standar perbankan.',
                        'explanation_distractors' => 'Scientific untuk notasi eksponen ilmiah, percentage untuk persen (%), fraction untuk pecahan biasa.',
                    ],
                    [
                        'stem' => 'Garis kisi pemisah tipis berwarna abu-abu yang membentuk kotak-kotak tabel pada lembar kerja spreadsheet disebut...',
                        'correct' => 'Gridlines.',
                        'distractors' => [
                            'Headings.',
                            'Sheet tabs.',
                            'Splitters.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali istilah garis kisi Gridlines pada spreadsheet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Data)',
                        'explanation_correct' => 'Gridlines membantu pandangan mata membedakan batas antarbaris dan antarkolom saat bekerja.',
                        'explanation_distractors' => 'Headings adalah kepala kolom/baris, sheet tabs tab penunjuk lembar kerja.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Jika sel B2 bernilai 80 dan sel B3 bernilai 90, rumus yang tepat untuk menghitung nilai rata-rata kedua sel tersebut adalah...',
                        'correct' => '=AVERAGE(B2:B3)',
                        'distractors' => [
                            '=SUM(B2:B3)',
                            '=MAX(B2:B3)',
                            '=COUNT(B2:B3)',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan rumus fungsi AVERAGE pada alamat sel.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Sintaks =AVERAGE(B2:B3) menjumlahkan 80 + 90 lalu membaginya dengan 2 menghasilkan nilai rata-rata 85.',
                        'explanation_distractors' => 'Fungsi lainnya menghasilkan nilai jumlah (170), nilai maksimal (90), atau jumlah sel (2).',
                    ],
                    [
                        'stem' => 'Tanda baca yang wajib dituliskan di awal setiap penulisan rumus fungsi perhitungan pada spreadsheet adalah...',
                        'correct' => 'Tanda sama dengan ( = )',
                        'distractors' => [
                            'Tanda pagar ( # )',
                            'Tanda tanya ( ? )',
                            'Tanda petik dua ( " )',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan tanda awal penulisan formula spreadsheet.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Tanda sama dengan \'=\' memberi sinyal pada aplikasi bahwa teks yang diketik adalah rumus perhitungan yang harus dieksekusi.',
                        'explanation_distractors' => 'Tanpa tanda \'=\', aplikasi akan menganggap isian sel sebagai teks biasa.',
                    ],
                    [
                        'stem' => 'Langkah paling cepat untuk mencari nilai tertinggi dari daftar nilai ulangan siswa pada rentang sel C2 sampai C30 adalah menggunakan fungsi...',
                        'correct' => '=MAX(C2:C30)',
                        'distractors' => [
                            '=MIN(C2:C30)',
                            '=SUM(C2:C30)',
                            '=MEDIAN(C2:C30)',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fungsi MAX pada rentang data nilai siswa.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Fungsi =MAX memindai seluruh data pada rentang C2:C30 dan menampilkan angka nilai tertinggi.',
                        'explanation_distractors' => 'MIN mencari nilai terendah, SUM menjumlahkan, dan MEDIAN mencari nilai tengah.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menggabungkan beberapa sel yang bersebelahan menjadi satu sel besar untuk judul tabel, fitur yang digunakan adalah...',
                        'correct' => 'Merge & Center.',
                        'distractors' => [
                            'Conditional Formatting.',
                            'Text to Columns.',
                            'Data Validation.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fitur penggabungan sel Merge & Center.',
                        'sub_level' => 'C3 - MOTS (Penerapan Format)',
                        'explanation_correct' => 'Merge & Center menggabungkan area sel terpilih menjadi satu bidang sel dan memposisikan teks di tengah.',
                        'explanation_distractors' => 'Pilihan lainnya untuk format bersyarat, pemisahan kolom teks, dan pembatasan input.',
                    ],
                    [
                        'stem' => 'Saat menyalin rumus yang menggunakan alamat sel relatif (relative reference) dari baris 2 ke baris 3, perubahan yang terjadi adalah...',
                        'correct' => 'Nomor baris pada rumus akan otomatis menyesuaikan bertambah satu menjadi baris 3.',
                        'distractors' => [
                            'Rumus akan terkunci dan nilainya menjadi nol.',
                            'Seluruh isi data pada baris 2 akan terhapus otomatis.',
                            'Rumus berubah menjadi teks biasa tanpa hasil perhitungan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prinsip referensi sel relatif saat autofill.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Referensi relatif memperbarui indeks baris/kolom secara otomatis mengikuti posisi tujuan penyalinan.',
                        'explanation_distractors' => 'Referensi tidak terkunci menjadi nol dan data baris awal tidak terhapus.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menghitung berapa banyak siswa yang ada di daftar nilai berdasarkan rentang sel nama A2 sampai A40, fungsi yang tepat adalah...',
                        'correct' => '=COUNTA(A2:A40)',
                        'distractors' => [
                            '=SUM(A2:A40)',
                            '=AVERAGE(A2:A40)',
                            '=MAX(A2:A40)',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fungsi COUNTA untuk menghitung sel terisi teks.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Fungsi =COUNTA menghitung banyaknya sel yang tidak kosong (berisi teks maupun angka).',
                        'explanation_distractors' => 'SUM, AVERAGE, dan MAX hanya memproses data numerik dan mengabaikan teks nama siswa.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menghitung total biaya belanja di sel D2 dengan mengalikan jumlah barang di B2 dan harga satuan di C2, rumus yang diketik di sel D2 adalah...',
                        'correct' => '=B2*C2',
                        'distractors' => [
                            '=B2+C2',
                            '=B2/C2',
                            '=B2-C2',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan rumus perkalian aritmatika dasar pada tabel transaksi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Simbol asterisk (*) adalah operator perkalian komputer untuk mengalikan kuantitas barang dengan harga satuan.',
                        'explanation_distractors' => '+ untuk penjumlahan, / untuk pembagian, dan - untuk pengurangan.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk menarik rumus dari sel D2 ke bawah hingga sel D30 secara cepat tanpa mengetik ulang satu per satu adalah...',
                        'correct' => 'Mengarahkan kursor ke pojok kanan bawah sel D2 hingga muncul tanda plus hitam (+) lalu melakukan klik ganda atau menyeretnya ke bawah (AutoFill).',
                        'distractors' => [
                            'Menekan tombol Delete pada keyboard sebanyak 30 kali.',
                            'Menutup aplikasi spreadsheet lalu menyalakannya kembali.',
                            'Mengetik rumus yang sama secara manual di 30 baris.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fitur percepatan AutoFill handle.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Fill handle menyalin formula sekaligus menyesuaikan referensi baris sel secara otomatis dan instan.',
                        'explanation_distractors' => 'Pilihan lainnya tidak efisien atau justru menghapus data lembar kerja.',
                    ],
                    [
                        'stem' => 'Jika sel C2 berisi rumus: =IF(B2>=75, \'Tuntas\', \'Remedial\'), apa hasil luaran yang tampil di sel C2 jika di sel B2 kamu mengetikkan angka 85?',
                        'correct' => 'Tuntas',
                        'distractors' => [
                            'Remedial',
                            '75',
                            'Galat',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan logika fungsi IF evaluasi kelulusan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Angka 85 memenuhi syarat \'>= 75\' (True), sehingga rumus mengeksekusi parameter nilai benar yaitu \'Tuntas\'.',
                        'explanation_distractors' => '\'Remedial\' hanya keluar jika nilai kurang dari 75.',
                    ],
                    [
                        'stem' => 'Ketika mencetak tabel data spreadsheet ke atas kertas fisik dan garis-garis kotak tabel tidak ikut tercetak, pengaturan yang harus kamu terapkan adalah...',
                        'correct' => 'Memblok tabel data lalu memilih menu \'All Borders\' atau mencentang opsi \'Print Gridlines\' pada Page Setup.',
                        'distractors' => [
                            'Menggambar garis manual dengan spidol di atas layar monitor.',
                            'Mengganti jenis printer dengan printer kasir struk.',
                            'Menghapus semua angka di dalam tabel data.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan format border cetak pada lembar sebar.',
                        'sub_level' => 'C3 - MOTS (Penerapan Format)',
                        'explanation_correct' => 'Gridlines bawaan hanya pemandu layar; All Borders menerapkan garis tepi cetak nyata pada dokumen.',
                        'explanation_distractors' => 'Pilihan lainnya merusak perangkat fisik atau menghapus data tugas.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menyaring data tabel siswa sehingga hanya menampilkan siswa yang berasal dari \'Kelas 8A\' saja, langkah yang kamu lakukan adalah...',
                        'correct' => 'Mengaktifkan fitur Filter pada judul kolom Kelas, mengklik tanda panah filter, lalu mencentang hanya opsi \'8A\'.',
                        'distractors' => [
                            'Menghapus secara manual seluruh baris data siswa kelas 8B dan 8C dari lembar kerja.',
                            'Mengubah semua nama siswa menjadi 8A.',
                            'Membuat file baru dan mengetik ulang dari awal.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penyaringan data spesifik menggunakan fitur Filter.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Filter menyembunyikan sementara baris yang tidak cocok tanpa menghapus data mentah dari database tabel.',
                        'explanation_distractors' => 'Menghapus manual baris siswa lain melenyapkan rekaman data secara permanen.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk menghitung jumlah seluruh siswa laki-laki saja pada kolom jenis kelamin (rentang C2 sampai C40) yang berkode \'L\' adalah menggunakan rumus...',
                        'correct' => '=COUNTIF(C2:C40, \'L\')',
                        'distractors' => [
                            '=SUM(C2:C40, \'L\')',
                            '=AVERAGE(C2:C40, \'L\')',
                            '=MAX(C2:C40, \'L\')',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fungsi perhitungan bersyarat COUNTIF.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Fungsi =COUNTIF menghitung frekuensi sel dalam rentang yang memenuhi kriteria tertentu (string \'L\').',
                        'explanation_distractors' => 'SUM dan AVERAGE tidak dapat menjumlahkan data tipe teks karakter.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin membuat grafik batang dari data tabel penjualan kantin, langkah prosedural awal yang benar adalah...',
                        'correct' => 'Memblok rentang data nama barang dan angka penjualannya -> Klik menu Insert -> Pilih jenis grafik Bar/Column Chart.',
                        'distractors' => [
                            'Langsung mengklik tombol cetak tanpa memilih tabel data terlebih dahulu.',
                            'Menghapus kolom nama barang agar grafik menjadi lebih cepat dibuat.',
                            'Mematikan koneksi internet laptop.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan langkah pembuatan visualisasi grafik dari tabel.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Pemilihan rentang data (data selection) memberi tahu mesin pembuat grafik sumbu mana yang menjadi label dan nilai data.',
                        'explanation_distractors' => 'Tanpa memilih rentang data, aplikasi akan menghasilkan grafik kosong tanpa nilai.',
                    ],
                    [
                        'stem' => 'Saat kamu ingin memformat angka nilai desimal (contoh: 85.66667) agar hanya menampilkan dua angka di belakang koma (85.67), fitur yang digunakan adalah...',
                        'correct' => 'Fitur \'Decrease Decimal\' pada kelompok menu Number.',
                        'distractors' => [
                            'Fitur \'Increase Font Size\'.',
                            'Fitur \'Bold\' huruf tebal.',
                            'Fitur \'Strikethrough\' garis coret.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pembulatan tampilan presisi desimal.',
                        'sub_level' => 'C3 - MOTS (Penerapan Format)',
                        'explanation_correct' => 'Decrease Decimal membulatkan tampilan desimal secara visual tanpa mengubah nilai presisi asli di memori rumus.',
                        'explanation_distractors' => 'Increase Font Size memperbesar ukuran huruf, Bold menebalkan, Strikethrough mencoret teks.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin mengubah orientasi lembar kerja tabel yang memiliki 15 kolom melebar agar muat saat dicetak di kertas A4, pengaturan yang tepat adalah...',
                        'correct' => 'Mengubah orientasi halaman menjadi Landscape (Mendatar) pada menu Page Setup.',
                        'distractors' => [
                            'Mengubah orientasi menjadi Portrait (Tegak).',
                            'Memotong 10 kolom data yang ada.',
                            'Mengecilkan ukuran kertas menjadi amplop surat kecil.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pengaturan tata letak halaman Landscape untuk tabel lebar.',
                        'sub_level' => 'C3 - MOTS (Penerapan Cetak)',
                        'explanation_correct' => 'Orientasi Landscape memanfaatkan lebar kertas horizontal sehingga tabel banyak kolom tertampung rapi.',
                        'explanation_distractors' => 'Portrait vertikal memicu terpotongnya kolom tabel ke halaman berikutnya.',
                    ],
                    [
                        'stem' => 'Untuk mencari nilai tengah (median) dari sekumpulan data nilai ujian matematika di rentang sel B2 sampai B50, fungsi yang tepat adalah...',
                        'correct' => '=MEDIAN(B2:B50)',
                        'distractors' => [
                            '=AVERAGE(B2:B50)',
                            '=MODE(B2:B50)',
                            '=SUM(B2:B50)',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fungsi statistik nilai tengah MEDIAN.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Fungsi =MEDIAN mengembalikan nilai pemisah tengah dari data yang telah terurut.',
                        'explanation_distractors' => 'AVERAGE menghitung rerata aritmatika, MODE mencari modus nilai yang paling sering muncul.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk membekukan baris judul tabel paling atas agar tetap terlihat saat lembar sebar digulir (scroll) ke bawah ratusan baris adalah...',
                        'correct' => 'Mengaktifkan fitur \'Freeze Panes\' -> \'Freeze Top Row\' pada menu View.',
                        'distractors' => [
                            'Menghapus baris judul tabel agar tidak mengganggu pandangan.',
                            'Mengunci seluruh file dengan password enkripsi.',
                            'Menempelkan lakban fisik pada layar monitor.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fitur navigasi Freeze Panes.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Freeze Top Row mengunci baris kepala tabel tetap mengambang di puncak jendela saat pengguna meninjau baris data bawah.',
                        'explanation_distractors' => 'Pilihan lainnya merusak tabel atau merusak perangkat fisik.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menghitung sisa anggaran kas kelas dengan mengurangkan total pemasukan di sel B20 dengan total pengeluaran di sel C20, rumus yang benar adalah...',
                        'correct' => '=B20-C20',
                        'distractors' => [
                            '=B20+C20',
                            '=B20*C20',
                            '=B20/C20',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan rumus pengurangan aritmatika pada neraca anggaran.',
                        'sub_level' => 'C3 - MOTS (Penerapan Formula)',
                        'explanation_correct' => 'Operator minus (-) menghitung selisih neto antara total debit pemasukan dan kredit pengeluaran.',
                        'explanation_distractors' => '+ untuk penjumlahan total, * perkalian, / pembagian.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Pada sel hasil rumus spreadsheet muncul pesan galat \'#DIV/0!\'. Analisis penyebab galat tersebut yang paling tepat adalah...',
                        'correct' => 'Rumus mencoba membagi suatu bilangan dengan angka nol atau sel yang kosong.',
                        'distractors' => [
                            'Teks di dalam sel terlalu panjang untuk lebar kolom yang tersedia.',
                            'Komputer tidak terhubung ke jaringan internet lokal.',
                            'Nama fungsi rumus salah ketik (misalnya mengetik =SUMM).',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis penyebab galat matematis #DIV/0!.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Galat)',
                        'explanation_correct' => 'Galat #DIV/0! (Division by Zero) terjadi saat operasi matematika melakukan pembagian dengan penyebut bernilai nol atau kosong.',
                        'explanation_distractors' => 'Kolom sempit memunculkan \'###\', sedangkan salah ketik fungsi memunculkan \'#NAME?\'.',
                    ],
                    [
                        'stem' => 'Mengapa penggunaan tanda dolar ($) pada rumus sel absolut (misal $A$1) sangat penting saat menyalin rumus ke banyak baris lain?',
                        'correct' => 'Agar referensi sel yang dikunci tetap merujuk ke sel A1 dan tidak bergeser saat rumus disalin ke baris atau kolom lain.',
                        'distractors' => [
                            'Agar hasil perhitungan otomatis dikonversi ke dalam mata uang dolar Amerika.',
                            'Agar sel tersebut tidak bisa dibaca oleh pengguna lain di lembar kerja.',
                            'Untuk mempercepat perhitungan matematika pada prosesor komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi fungsi penguncian referensi sel absolut ($).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Formula)',
                        'explanation_correct' => 'Karakter \'$\' mengunci koordinat absolut baris dan kolom agar tidak mengalami pergeseran relatif saat autofill diseret.',
                        'explanation_distractors' => 'Tanda \'$\' bukan simbol konversi mata uang dan tidak memengaruhi kecepatan clock prosesor.',
                    ],
                    [
                        'stem' => 'Diberikan tabel data penjualan kantin selama 1 tahun. Jika kepala sekolah ingin melihat tren kenaikan dan penurunan penjualan per bulan, representasi visual terbaik adalah...',
                        'correct' => 'Grafik garis (line chart) dengan sumbu X nama bulan dan sumbu Y total penjualan.',
                        'distractors' => [
                            'Diagram lingkaran (pie chart) dengan 365 irisan per hari.',
                            'Tabel angka mentah tanpa pengurutan dan tanpa grafik.',
                            'Diagram batang horizontal acak tanpa label waktu.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi dan memilih visualisasi tren garis yang optimal.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Visualisasi Data)',
                        'explanation_correct' => 'Grafik garis secara visual menghubungkan titik data berurutan waktu sehingga pola kenaikan dan penurunan tren langsung terlihat jelas.',
                        'explanation_distractors' => 'Diagram lingkaran dengan ratusan irisan tidak terbaca, dan tabel mentah tidak menonjolkan tren visual.',
                    ],
                    [
                        'stem' => 'Jika sel C2 berisi rumus: =IF(B2>=75, \'Tuntas\', \'Remedial\'), apa yang terjadi jika isi sel B2 diubah dari 80 menjadi 70?',
                        'correct' => 'Nilai di sel C2 otomatis berubah dari \'Tuntas\' menjadi \'Remedial\' secara dinamis.',
                        'distractors' => [
                            'Muncul pesan error karena rumus tidak bisa menghitung ulang data yang diganti.',
                            'Isi sel C2 tetap \'Tuntas\' sampai komputer dimatikan dan dinyalakan ulang.',
                            'Sel C2 terhapus permanen dari lembar sebar.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis perubahan status kalkulasi otomatis formula reaktif.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Formula)',
                        'explanation_correct' => 'Spreadsheet menghitung ulang formula secara reaktif; nilai 70 tidak memenuhi syarat \'>=75\' sehingga mengevaluasi kondisi alternatif.',
                        'explanation_distractors' => 'Pilihan lainnya bertentangan dengan sifat kalkulasi reaktif otomatis pada software lembar sebar.',
                    ],
                    [
                        'stem' => 'Evaluasi manfaat penggunaan fitur Conditional Formatting pada tabel data nilai siswa adalah...',
                        'correct' => 'Mempermudah identifikasi visual (misalnya warna merah otomatis untuk nilai di bawah KKM) sehingga analisis data lebih cepat.',
                        'distractors' => [
                            'Mengubah angka nilai siswa secara otomatis menjadi nilai sempurna 100.',
                            'Menghapus data siswa yang tidak lulus secara permanen tanpa konfirmasi.',
                            'Mengunci file spreadsheet agar tidak bisa dicetak menggunakan printer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi nilai efisiensi Conditional Formatting pada analisis data.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Analisis Data)',
                        'explanation_correct' => 'Pewarnaan otomatis berbasis aturan mempercepat deteksi pencilan (outliers) dan siswa yang membutuhkan remedial.',
                        'explanation_distractors' => 'Fitur format tampilan tidak mengubah isi data mentah dan tidak menghapus rekaman data.',
                    ],
                    [
                        'stem' => 'Pada kolom tanggal muncul tanda \'######\' di seluruh sel. Evaluasi penyebab dan cara mengatasi tampilan tersebut adalah...',
                        'correct' => 'Lebar kolom terlalu sempit untuk menampilkan angka tanggal, solusinya perlebar ukuran kolom tersebut.',
                        'distractors' => [
                            'Data di dalam sel telah rusak dan harus diketik ulang dari awal.',
                            'Format sel harus diubah menjadi rumus matematika.',
                            'Komputer terkena virus dan harus dimatikan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis penyebab string \'######\' dan solusinya.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Tampilan)',
                        'explanation_correct' => 'Tanda \'###\' adalah sinyal bahwa representasi format angka/tanggal melebihi batas lebar fisik kolom sel.',
                        'explanation_distractors' => 'Data tidak rusak dan tidak berkaitan dengan serangan virus.',
                    ],
                    [
                        'stem' => 'Pada sel muncul pesan galat \'#NAME?\'. Analisis akar masalah teknis dari galat tersebut adalah...',
                        'correct' => 'Terjadi salah ketik pada penulisan nama fungsi rumus (misalnya mengetik =SUMM atau =AVERGE) atau tanda petik teks terlewat.',
                        'distractors' => [
                            'Komputer kehabisan memori RAM.',
                            'Printer tidak terhubung ke listrik.',
                            'Siswa lupa menuliskan nama lengkapnya di sel A1.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis akar masalah galat sintaks rumus #NAME?.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Galat)',
                        'explanation_correct' => 'Galat #NAME? terjadi karena parser spreadsheet tidak mengenali pengenal nama fungsi yang diketikkan pengguna.',
                        'explanation_distractors' => 'Galat ini murni kesalahan penulisan fungsi software, bukan kegagalan memori RAM atau perangkat printer.',
                    ],
                    [
                        'stem' => 'Pada sel muncul pesan galat \'#VALUE!\'. Analisis penyebab paling umum dari kemunculan pesan tersebut adalah...',
                        'correct' => 'Rumus matematika mencoba melakukan operasi perhitungan pada sel yang bertipe data teks huruf (misalnya angka 10 ditambah kata \'Apel\').',
                        'distractors' => [
                            'Komputer dipasang di ruangan yang terlalu dingin.',
                            'Kabel stopkontak monitor longgar.',
                            'Data angka di dalam sel terlalu bulat.',
                        ],
                        'indicator' => 'Peserta didik mampu mendiagnosis ketidakcocokan tipe data pada galat #VALUE!.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Galat)',
                        'explanation_correct' => 'Operator aritmatika menuntut tipe data numerik; memaksakan operasi pada string teks memicu inkonsistensi tipe nilai (#VALUE!).',
                        'explanation_distractors' => 'Faktor suhu ruangan atau kabel monitor tidak memengaruhi evaluasi tipe data internal rumus.',
                    ],
                    [
                        'stem' => 'Seorang guru ingin mengetahui berapa persentase siswa yang nilainya melampaui rata-rata kelas. Desain alur pengolahan data yang paling sistematis di spreadsheet adalah...',
                        'correct' => 'Hitung nilai rata-rata kelas dengan =AVERAGE -> Hitung jumlah siswa di atas rata-rata dengan =COUNTIF -> Bagi dengan total siswa =COUNTA dan ubah format ke Persentase (%).',
                        'distractors' => [
                            'Menghitung manual satu per satu dengan jari tangan lalu mengetik angka tebakan.',
                            'Menghapus semua nilai siswa yang berada di bawah rata-rata.',
                            'Menjumlahkan seluruh nomor induk siswa lalu dibagi sepuluh.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang alur kalkulasi statistik bertahap di spreadsheet.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Alur Data)',
                        'explanation_correct' => 'Rangkaian fungsi AVERAGE -> COUNTIF -> rasio persentase menyajikan pengolahan statistik bertahap yang akurat dan otomatis.',
                        'explanation_distractors' => 'Pilihan lainnya adalah prosedur manual tidak terukur atau tindakan merusak integritas data.',
                    ],
                    [
                        'stem' => 'Evaluasi perbedaan mendasar antara fungsi VLOOKUP dan fungsi HLOOKUP dalam pencarian referensi data tabel adalah...',
                        'correct' => 'VLOOKUP mencari nilai acuan secara vertikal di kolom paling kiri, sedangkan HLOOKUP mencari nilai acuan secara horizontal di baris paling atas.',
                        'distractors' => [
                            'VLOOKUP hanya boleh digunakan untuk data angka sedangkan HLOOKUP hanya untuk teks.',
                            'VLOOKUP berjalan tanpa daya listrik sedangkan HLOOKUP membutuhkan internet.',
                            'Kedua fungsi memiliki arah pencarian yang sama persis tanpa perbedaan.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan arah orientasi pencarian tabel VLOOKUP vs HLOOKUP.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Fungsi Referensi)',
                        'explanation_correct' => 'Huruf \'V\' berarti Vertical (berdasarkan kolom) dan \'H\' berarti Horizontal (berdasarkan baris tabel acuan).',
                        'explanation_distractors' => 'Kedua fungsi dapat mencari baik data angka maupun teks, perbedaannya murni pada dimensi sumbu pencarian.',
                    ],
                    [
                        'stem' => 'Dalam tabel data besar dengan 1.000 baris, ditemukan banyak data ganda (duplikat siswa yang tercatat dua kali). Fitur otomatis yang paling efisien untuk membersihkan data tersebut adalah...',
                        'correct' => 'Fitur \'Remove Duplicates\' pada tab menu Data.',
                        'distractors' => [
                            'Membaca baris demi baris dari atas sampai bawah secara manual selama tiga hari.',
                            'Memformat ulang harddisk laptop.',
                            'Mengganti nama sekolah di lembar kerja.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi efisiensi fitur pembersihan data Remove Duplicates.',
                        'sub_level' => '{$subLevel} - HOTS (Pembersihan Data)',
                        'explanation_correct' => 'Tool Remove Duplicates membandingkan baris data berbasis kunci kolom unik dan membuang redundansi data dalam hitungan detik.',
                        'explanation_distractors' => 'Pemeriksaan manual ribuan baris sangat rentan kesalahan manusia (human error) dan membuang waktu.',
                    ],
                    [
                        'stem' => 'Mengapa fitur Data Validation (Validasi Data) sangat krusial dipasang pada kolom pengisian nilai ulangan siswa (misalnya dibatasi hanya angka 0 sampai 100)?',
                        'correct' => 'Mencegah kesalahan input manusia (typo), seperti memasukkan angka negatif (-10) atau angka salah ketik (1000) yang dapat merusak akurasi rata-rata.',
                        'distractors' => [
                            'Agar sel nilai otomatis berubah warna menjadi emas.',
                            'Supaya siswa tidak bisa melihat nilai ulangannya sendiri.',
                            'Untuk mempercepat waktu koneksi internet di ruang guru.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis peran data validation pada penjaminan integritas data.',
                        'sub_level' => '{$subLevel} - HOTS (Integritas Data)',
                        'explanation_correct' => 'Validasi input di gerbang pemasukan data menegakkan prinsip kualitas data agar luaran analisis selalu valid.',
                        'explanation_distractors' => 'Data validation bukan fitur kosmetik atau pembatas jaringan.',
                    ],
                    [
                        'stem' => 'Seorang siswa menyajikan grafik perbandingan penjualan kantin, namun skala sumbu Y dimulai dari angka 90 bukan dari 0, sehingga perbedaan penjualan 91 dan 95 terlihat sangat dramatis dan timpang. Evaluasi etika penyajian data terhadap grafik ini adalah...',
                        'correct' => 'Grafik tersebut menyesatkan (misleading chart) karena memotong sumbu dasar sehingga memanipulasi persepsi visual audiens seolah-olah terjadi perbedaan raksasa.',
                        'distractors' => [
                            'Grafik tersebut sangat sempurna dan harus dicontoh oleh semua peneliti.',
                            'Grafik tersebut otomatis meningkatkan laba kantin secara nyata.',
                            'Tidak ada masalah etika karena angka desimalnya tetap benar.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi etika penyajian visual data (misleading chart truncating).',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Etika Visualisasi)',
                        'explanation_correct' => 'Truncated graph memanipulasi rasio proporsi batang visual dan melanggar integritas penyajian data objektif.',
                        'explanation_distractors' => 'Pilihan lainnya menormalisasi pembelokan persepsi visual yang tidak etis.',
                    ],
                    [
                        'stem' => 'Ketika sebuah rumus spreadsheet menghasilkan galat \'#REF!\', analisis kemungkinan penyebab paling tepat adalah...',
                        'correct' => 'Rumus merujuk ke alamat sel atau lembar kerja yang sebelumnya telah dihapus secara fisik (deleted cell reference).',
                        'distractors' => [
                            'Pengguna mengetik rumus saat komputer tidak tersambung ke printer.',
                            'Nama siswa di dalam sel memiliki arti referensi ilmiah.',
                            'Kabel daya monitor komputer mengalami gangguan sinyal.',
                        ],
                        'indicator' => 'Peserta didik mampu mendeteksi penyebab galat referensi sel terhapus #REF!.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Galat)',
                        'explanation_correct' => 'Pesan #REF! (Invalid Cell Reference) muncul saat jangkar koordinat sel yang dirujuk formula lenyap akibat baris/kolomnya terhapus.',
                        'explanation_distractors' => 'Galat referensi tidak berkaitan dengan kabel monitor atau status printer.',
                    ],
                    [
                        'stem' => 'Dalam analisis data nilai ujian, rata-rata kelas adalah 80, namun ada 1 orang siswa yang memperoleh nilai 10 karena sakit saat ujian. Parameter statistik yang paling tahan terhadap nilai pencilan (outlier) ekstrem tersebut untuk melihat performa tengah kelas adalah...',
                        'correct' => 'Median (Nilai Tengah), karena median tidak terpengaruh oleh satu nilai ekstrem yang anjlok di ujung bawah.',
                        'distractors' => [
                            'Mean (Rata-rata hitung), karena mean selalu paling sempurna di semua situasi.',
                            'Range (Selisih maksimum dan minimum).',
                            'Total jumlah penjumlahan nilai.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi ketahanan parameter Median vs Mean terhadap pencilan (outliers).',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Statistik)',
                        'explanation_correct' => 'Nilai ekstrem menarik rerata aritmatika secara bias, sedangkan posisi median tetap stabil mewakili titik tengah populasi.',
                        'explanation_distractors' => 'Mean sangat sensitif terhadap pencilan (skewed distribution), range justru membesar ekstrem.',
                    ],
                    [
                        'stem' => 'Analisis mengapa penggabungan rumus =IFERROR(rumus_utama, 0) sangat dianjurkan saat membuat tabel laporan keuangan otomatis adalah...',
                        'correct' => 'Menangkap potensi galat (seperti pembagian nol) dan menggantinya dengan angka 0 yang rapi sehingga tidak merusak rumus penjumlahan total di bawahnya.',
                        'distractors' => [
                            'Menghapus seluruh file laporan keuangan jika ditemukan kesalahan hitung.',
                            'Membuat laporan keuangan otomatis disetujui oleh bank.',
                            'Menyembunyikan kerugian kas kelas dari pemeriksaan guru.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi penggunaan defensive formula IFERROR.',
                        'sub_level' => '{$subLevel} - HOTS (Desain Formula Lanjut)',
                        'explanation_correct' => 'Fungsi IFERROR mencegah perambatan galat (error propagation) ke sel hilir sehingga laporan tetap terstruktur.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang fungsi manipulatif atau penipuan perbankan.',
                    ],
                    [
                        'stem' => 'Seorang siswa membuat grafik garis untuk melihat hubungan antara durasi belajar harian dan nilai ulangan 50 siswa. Bentuk visualisasi grafik yang jauh lebih tepat untuk melihat korelasi sebaran titik-titik data tersebut adalah...',
                        'correct' => 'Scatter Plot (Diagram Sebar Koordinat XY).',
                        'distractors' => [
                            'Pie Chart (Diagram Lingkaran).',
                            'Grafik Donat.',
                            'Tabel Teks Tanpa Angka.',
                        ],
                        'indicator' => 'Peserta didik mampu memilih visualisasi analisis korelasi bivariat Scatter Plot.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Visualisasi Data)',
                        'explanation_correct' => 'Scatter plot memetakan dua variabel numerik independen dan dependen sebagai titik koordinat untuk membaca pola tren korelasi.',
                        'explanation_distractors' => 'Pie chart tidak dirancang untuk memetakan pasangan koordinat dua variabel kontinu.',
                    ],
                    [
                        'stem' => 'Evaluasi manfaat penggunaan fitur Pivot Table (Tabel Pivot) saat menganalisis ribuan data transaksi penjualan kantin sekolah adalah...',
                        'correct' => 'Mampu meringkas, mengelompokkan, dan menganalisis data besar secara dinamis tanpa perlu menulis puluhan rumus manual yang rumit.',
                        'distractors' => [
                            'Membuat komputer kantin kebal terhadap pemadaman aliran listrik.',
                            'Menggantikan peran kasir manusia dengan robot penjual fisik.',
                            'Mengunci data transaksi agar tidak bisa diperiksa oleh kepala sekolah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi kekuatan analitis agregasi data Pivot Table.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Analisis Lanjut)',
                        'explanation_correct' => 'Pivot table memungkinkan eksplorasi multidimensi multidimensi (cross-tabulation) dan agregasi instan data transaksi masif.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi robotik dan listrik yang tidak berhubungan dengan software analisis data.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getNetworkInternetAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Jaringan komputer yang mencakup area lokal terbatas seperti laboratorium komputer sekolah, ruang kelas, atau gedung kantor disebut...',
                        'correct' => 'Local Area Network (LAN).',
                        'distractors' => [
                            'Wide Area Network (WAN).',
                            'Metropolitan Area Network (MAN).',
                            'Internet Global.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi karakteristik jaringan LAN.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'LAN mencakup wilayah geografis lokal terbatas dengan kecepatan transfer data tinggi antarperangkat setempat.',
                        'explanation_distractors' => 'MAN mencakup skala kota, WAN mencakup antarnegara, dan Internet mencakup seluruh dunia.',
                    ],
                    [
                        'stem' => 'Perangkat keras jaringan yang berfungsi membagi dan merutekan koneksi data internet ke beberapa perangkat klien adalah...',
                        'correct' => 'Router / Access Point.',
                        'distractors' => [
                            'Processor.',
                            'Monitor LED.',
                            'Flashdisk USB.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi router pada jaringan.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Router mengarahkan paket data antarjaringan dan mendistribusikan koneksi internet ke perangkat pengguna.',
                        'explanation_distractors' => 'Processor adalah pemroses CPU, monitor penampil visual, dan flashdisk media penyimpanan.',
                    ],
                    [
                        'stem' => 'Perangkat lunak (software) yang digunakan pengguna untuk membuka dan menjelajahi halaman situs web di internet adalah...',
                        'correct' => 'Web Browser (seperti Google Chrome, Microsoft Edge, atau Mozilla Firefox).',
                        'distractors' => [
                            'Search Engine (seperti Google Search atau Bing).',
                            'Operating System.',
                            'Spreadsheet.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi peramban web (browser).',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Web browser adalah aplikasi klien yang menerjemahkan kode HTML/CSS dari server web menjadi halaman visual.',
                        'explanation_distractors' => 'Search engine adalah situs mesin pencari di web, OS pengendali komputer, dan spreadsheet pengolah angka.',
                    ],
                    [
                        'stem' => 'Tanda ikon gembok terkunci pada bilah alamat situs web di peramban (browser) menandakan bahwa...',
                        'correct' => 'Koneksi ke situs web menggunakan protokol enkripsi yang aman (HTTPS).',
                        'distractors' => [
                            'Situs web tersebut sedang mengalami kerusakan server.',
                            'Komputer dilarang mengakses informasi pada situs tersebut.',
                            'Pengguna harus membayar biaya langganan untuk membaca artikel.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi makna simbol gembok HTTPS.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Ikon gembok menunjukkan sertifikat SSL/TLS aktif yang mengenkripsi jalur transmisi data antara klien dan server.',
                        'explanation_distractors' => 'Pilihan lainnya tidak memiliki kaitan dengan sertifikasi enkripsi web.',
                    ],
                    [
                        'stem' => 'Alamat unik berupa kombinasi angka atau nama domain yang digunakan untuk mengidentifikasi komputer atau server di internet disebut...',
                        'correct' => 'IP Address (atau URL/Domain).',
                        'distractors' => [
                            'MAC Processor.',
                            'RAM Register.',
                            'Serial Key Office.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fungsi IP Address dan Domain.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'IP Address dan nama domain menjadi alamat unik tujuan pengiriman paket data di jaringan komputer global.',
                        'explanation_distractors' => 'Pilihan lainnya adalah register internal perangkat atau lisensi software.',
                    ],
                    [
                        'stem' => 'Jaringan komunikasi global tanpa kabel yang menghubungkan jutaan komputer di seluruh dunia menggunakan protokol TCP/IP disebut...',
                        'correct' => 'Internet.',
                        'distractors' => [
                            'Intranet.',
                            'LAN kabel.',
                            'Bluetooth.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan jaringan internet global.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Internet (Interconnected Network) adalah jaringan interkoneksi raksasa berskala global berbasis protokol TCP/IP.',
                        'explanation_distractors' => 'Intranet bersifat internal privat, LAN berskala lokal gedung, dan Bluetooth berjarak sangat dekat.',
                    ],
                    [
                        'stem' => 'Kabel transmisi data yang menggunakan serat kaca atau plastik sangat halus untuk menyalurkan sinyal cahaya berkecepatan tinggi adalah...',
                        'correct' => 'Kabel Fiber Optik (Optical Fiber).',
                        'distractors' => [
                            'Kabel UTP tembaga.',
                            'Kabel coaxial antena.',
                            'Kabel listrik PLN.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi karakteristik kabel Fiber Optik.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Fiber optik mentransmisikan data dalam bentuk pulsa cahaya sehingga memiliki bandwidth gigabit dan kebal gangguan elektromagnetik.',
                        'explanation_distractors' => 'Kabel UTP dan coaxial menggunakan kawat tembaga konduktor listrik yang rentan interferensi frekuensi.',
                    ],
                    [
                        'stem' => 'Layanan internet yang berfungsi menerjemahkan nama domain situs web (seperti www.kemdikbud.go.id) menjadi alamat angka IP Address adalah...',
                        'correct' => 'DNS (Domain Name System).',
                        'distractors' => [
                            'FTP (File Transfer Protocol).',
                            'SMTP (Simple Mail Transfer).',
                            'DHCP Server.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan peran layanan DNS.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'DNS berfungsi seperti buku telepon internet yang memetakan nama domain ramah manusia ke alamat IP mesin server.',
                        'explanation_distractors' => 'FTP untuk unduh/unggah file, SMTP pengiriman email, dan DHCP pembagian IP otomatis.',
                    ],
                    [
                        'stem' => 'Teknologi komunikasi nirkabel jarak sangat pendek (kurang dari 10 meter) yang biasa digunakan menghubungkan mouse atau headset ke laptop adalah...',
                        'correct' => 'Bluetooth.',
                        'distractors' => [
                            'Satelit geostasioner.',
                            'Jaringan 5G seluler.',
                            'Kabel transmisi bawah laut.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali teknologi nirkabel jarak pendek Bluetooth.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Bluetooth menggunakan gelombang radio UHF 2.4 GHz berdaya rendah khusus untuk jaringan personal (PAN).',
                        'explanation_distractors' => 'Satelit dan kabel bawah laut berjarak ribuan kilometer, sedangkan 5G untuk seluler perkotaan.',
                    ],
                    [
                        'stem' => 'Perangkat keras jaringan yang berfungsi mengubah sinyal analog dari penyedia layanan kabel/telepon menjadi sinyal digital komputer adalah...',
                        'correct' => 'Modem (Modulator Demodulator).',
                        'distractors' => [
                            'Speaker.',
                            'Microphone.',
                            'Webcam.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan fungsi perangkat modem.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Modem memodulasi dan mendemodulasi sinyal pembawa data agar dapat diproses oleh perangkat digital komputer.',
                        'explanation_distractors' => 'Speaker, mikrofon, dan webcam adalah periferal multimedia, bukan perangkat konversi transmisi jaringan.',
                    ],
                    [
                        'stem' => 'Aturan atau standar baku yang disepakati bersama untuk mengatur tata cara komunikasi dan pengiriman data antar-komputer disebut...',
                        'correct' => 'Protokol Komunikasi (Protocol).',
                        'distractors' => [
                            'Algoritma sandi.',
                            'Sertifikat digital.',
                            'Lisensi software.',
                        ],
                        'indicator' => 'Peserta didik mampu mendefinisikan konsep protokol jaringan.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Protokol (seperti TCP/IP, HTTP) menentukan format paket, metode verifikasi galat, dan urutan handshake jaringan.',
                        'explanation_distractors' => 'Pilihan lainnya adalah atribut keamanan kriptografi atau hak cipta software.',
                    ],
                    [
                        'stem' => 'Singkatan dari URL yang merupakan alamat lengkap penunjuk lokasi berkas atau halaman web di internet adalah...',
                        'correct' => 'Uniform Resource Locator.',
                        'distractors' => [
                            'Universal Radio Link.',
                            'United Router Line.',
                            'Unique Remote Login.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi kepanjangan URL.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'URL (Uniform Resource Locator) secara spesifik memuat protokol (https://), domain nama, dan path berkas web.',
                        'explanation_distractors' => 'Pilihan lainnya adalah kepanjangan fiktif yang salah.',
                    ],
                    [
                        'stem' => 'Tipe konektor kabel jaringan yang umum dipasang pada ujung kabel UTP untuk ditancapkan ke port LAN komputer adalah...',
                        'correct' => 'Konektor RJ-45.',
                        'distractors' => [
                            'Konektor USB Type-C.',
                            'Jack Audio 3.5mm.',
                            'Soket VGA 15-pin.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi konektor kabel LAN RJ-45.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Konektor RJ-45 (Registered Jack 45) memiliki 8 pin tembaga standar untuk sambungan kabel twisted pair LAN.',
                        'explanation_distractors' => 'USB Type-C untuk periferal/daya, Jack Audio untuk suara, dan VGA untuk layar monitor.',
                    ],
                    [
                        'stem' => 'Kecepatan transfer data dalam jaringan internet umumnya diukur dalam satuan...',
                        'correct' => 'Mbps (Megabits per second) atau Gbps (Gigabits per second).',
                        'distractors' => [
                            'Km/jam (Kilometer per jam).',
                            'Liter per detik.',
                            'Celsius derajat.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi satuan laju transfer data bandwidth jaringan.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Bandwidth jaringan mengukur berapa juta bit (Mbps) data biner yang dapat dihantarkan dalam satu detik.',
                        'explanation_distractors' => 'Km/jam untuk kecepatan gerak fisik, liter untuk volume zat cair, dan Celsius untuk suhu.',
                    ],
                    [
                        'stem' => 'Halaman utama atau halaman pembuka dari sebuah situs web yang pertama kali muncul saat domain dibuka disebut...',
                        'correct' => 'Homepage (Beranda).',
                        'distractors' => [
                            'Error Page.',
                            'Footer.',
                            'Bookmark.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali istilah Homepage pada situs web.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Homepage adalah laman awal (biasanya berkas index.html) yang menyajikan navigasi utama ke seluruh konten situs.',
                        'explanation_distractors' => 'Error page halaman galat, footer bagian bawah halaman, bookmark penanda tautan favorit.',
                    ],
                    [
                        'stem' => 'Fitur pada peramban web yang digunakan untuk menyimpan alamat situs web penting agar mudah dibuka kembali di lain waktu adalah...',
                        'correct' => 'Bookmark (Markah Buku) atau Favorites.',
                        'distractors' => [
                            'History (Riwayat).',
                            'Downloads.',
                            'Clear Cache.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi fungsi fitur Bookmark pada peramban web.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Bookmark menyematkan pintasan URL situs web ke bilah peramban untuk akses cepat satu klik.',
                        'explanation_distractors' => 'History mencatat riwayat halaman yang pernah dibuka, Clear Cache membersihkan penyimpanan sementara.',
                    ],
                    [
                        'stem' => 'Topologi jaringan di mana semua komputer terhubung ke satu titik pusat (seperti Switch atau Hub) menyerupai bentuk bintang disebut...',
                        'correct' => 'Topologi Star (Bintang).',
                        'distractors' => [
                            'Topologi Bus.',
                            'Topologi Ring (Cincin).',
                            'Topologi Mesh.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi topologi jaringan Star.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Topologi Star adalah topologi paling umum di laboratorium sekolah karena mudah dikelola dan jika 1 kabel putus tidak merusak komputer lain.',
                        'explanation_distractors' => 'Topologi Bus memakai satu kabel lurus, Ring melingkar tertutup, dan Mesh saling terhubung penuh.',
                    ],
                    [
                        'stem' => 'Jaringan komputer internal privat yang hanya dapat diakses oleh staf atau siswa di dalam lingkungan sekolah tertentu saja disebut...',
                        'correct' => 'Intranet.',
                        'distractors' => [
                            'Internet publik.',
                            'Extranet global.',
                            'World Wide Web.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali konsep jaringan tertutup Intranet.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Jaringan)',
                        'explanation_correct' => 'Intranet menggunakan protokol internet tetapi aksesnya dibatasi secara ketat hanya dalam perimeter lokal organisasi.',
                        'explanation_distractors' => 'Internet dan WWW terbuka untuk seluruh masyarakat dunia tanpa batasan organisasi.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Ketika laptopmu terhubung ke sinyal Wi-Fi sekolah namun muncul keterangan \'No Internet Access\', langkah verifikasi awal yang tepat adalah...',
                        'correct' => 'Memeriksa apakah router sekolah terhubung ke sumber internet penyedia jasa (ISP) atau mencoba menyambungkan ulang Wi-Fi.',
                        'distractors' => [
                            'Langsung membongkar casing laptop untuk mengganti kartu memori.',
                            'Menghapus semua file tugas di dalam harddisk laptop.',
                            'Mematikan layar laptop dan menyalakannya berulang-ulang.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan langkah verifikasi konektivitas jaringan Wi-Fi.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Keterangan tersebut menunjukkan laptop terhubung ke LAN router namun router belum menerima suplai internet dari ISP.',
                        'explanation_distractors' => 'Membongkar hardware atau menghapus tugas tidak ada hubungannya dengan status link internet.',
                    ],
                    [
                        'stem' => 'Tindakan yang paling tepat jika kamu ingin mengunduh bahan materi pelajaran dari internet secara aman adalah...',
                        'correct' => 'Mengunduh dari portal resmi sekolah atau situs sumber tepercaya dan memindainya dengan antivirus.',
                        'distractors' => [
                            'Mengeklik banner iklan unduhan yang berkedip-kedip di situs mencurigakan.',
                            'Mengunduh file berekstensi .exe dari pengirim yang tidak dikenal di media sosial.',
                            'Mematikan sistem keamanan antivirus sebelum mengunduh.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan praktik pengunduhan dokumen yang aman.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Memverifikasi reputasi domain penyedia berkas dan memindai malware menjamin keaslian dan keamanan berkas.',
                        'explanation_distractors' => 'Mengeklik banner iklan atau berkas .exe misterius berisiko tinggi menginfeksi malware.',
                    ],
                    [
                        'stem' => 'Perbedaan fungsi mendasar antara Web Browser dan Search Engine saat kita mencari materi di internet adalah...',
                        'correct' => 'Web browser adalah aplikasi untuk menampilkan situs web, sedangkan search engine adalah layanan di web untuk mencari informasi kata kunci.',
                        'distractors' => [
                            'Web browser hanya bekerja tanpa koneksi internet, sedangkan search engine membutuhkan kabel LAN.',
                            'Web browser adalah perangkat keras monitor, sedangkan search engine adalah perangkat lunak printer.',
                            'Keduanya memiliki arti dan fungsi yang sama persis tanpa perbedaan.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan peran browser dan mesin pencari.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Browser merupakan pintu pembuka (perangkat lunak klien), sementara search engine adalah situs web direktori indeks informasi.',
                        'explanation_distractors' => 'Pilihan lainnya keliru mendeskripsikan jenis perangkat dan ketergantungan koneksi.',
                    ],
                    [
                        'stem' => 'Saat mengirim email tugas kepada guru dengan menyertakan berkas dokumen tugas, fitur yang harus kamu klik adalah...',
                        'correct' => 'Lampiran (Attachment) dengan ikon klip kertas.',
                        'distractors' => [
                            'Kotak Sampah (Spam/Trash).',
                            'Tombol Bintang (Favorite).',
                            'Tanda Blokir Akun (Block Sender).',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fitur lampiran (attachment) saat mengirim tugas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Fitur attachment menyematkan berkas digital ke dalam pesan email agar dapat diunduh oleh guru penerima.',
                        'explanation_distractors' => 'Pilihan lainnya untuk menghapus email, menandai favorit, atau memblokir pengirim.',
                    ],
                    [
                        'stem' => 'Keuntungan utama menggunakan penyimpanan berbasis awan (cloud storage seperti Google Drive) untuk menyimpan tugas sekolah adalah...',
                        'correct' => 'Berkas tugas dapat diakses dan disunting dari mana saja melalui internet tanpa takut hilang jika perangkat fisik rusak.',
                        'distractors' => [
                            'Kapasitas penyimpanan awan membuat baterai laptop tidak pernah berkurang.',
                            'Tugas akan otomatis dikerjakan oleh server awan tanpa campur tangan siswa.',
                            'Awan penyimpanan hanya bisa dibuka saat cuaca mendung.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penyimpanan berkas awan untuk portabilitas tugas.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktis)',
                        'explanation_correct' => 'Cloud storage menyinkronkan data ke server terdistribusi sehingga portabel dan tahan terhadap kerusakan flashdisk lokal.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi fiktif yang tidak berdasar sains teknologi.',
                    ],
                    [
                        'stem' => 'Jika seorang siswa ingin menghubungkan komputernya ke printer nirkabel tanpa menggunakan kabel panjang di ruangan lab, teknologi koneksi yang digunakan adalah...',
                        'correct' => 'Wi-Fi atau Bluetooth.',
                        'distractors' => [
                            'Kabel VGA.',
                            'Kabel HDMI.',
                            'Flashdisk.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan konektivitas Wi-Fi atau Bluetooth pada periferal printer.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Teknologi transmisi radio nirkabel seperti Wi-Fi dan Bluetooth menghubungkan perangkat periferal tanpa bentangan kabel fisik.',
                        'explanation_distractors' => 'VGA dan HDMI adalah kabel display monitor berkawat tembaga.',
                    ],
                    [
                        'stem' => 'Langkah tepat yang dapat kamu lakukan jika peramban (browser) komputermu lambat dan sering memuat halaman situs versi lama yang belum diperbarui adalah...',
                        'correct' => 'Membersihkan berkas tembolok (Clear Cache) dan riwayat cookies pada menu pengaturan peramban.',
                        'distractors' => [
                            'Menghancurkan modem internet dengan obeng.',
                            'Membeli monitor komputer baru.',
                            'Menghapus akun email sekolah secara permanen.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pembersihan cache peramban web.',
                        'sub_level' => 'C3 - MOTS (Penerapan Pemeliharaan)',
                        'explanation_correct' => 'Cache menyimpan salinan aset web sementara; membersihkannya memaksa browser mengunduh aset halaman paling mutakhir.',
                        'explanation_distractors' => 'Tindakan merusak modem atau menghapus email tidak menyelesaikan penumpukan file cache lokal.',
                    ],
                    [
                        'stem' => 'Ketika mengirim email tugas kelompok kepada guru dan ingin mengirimkan salinan rahasia ke alamat email anggota tim tanpa terlihat oleh penerima utama, kolom yang digunakan adalah...',
                        'correct' => 'Kolom BCC (Blind Carbon Copy).',
                        'distractors' => [
                            'Kolom To (Kepada).',
                            'Kolom CC (Carbon Copy).',
                            'Kolom Subject (Judul Pesan).',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan dan menerapkan fitur alamat email BCC.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Alamat email di kolom BCC disembunyikan dari daftar penerima lain demi melindungi privasi alamat email bersangkutan.',
                        'explanation_distractors' => 'Alamat di kolom To dan CC terlihat secara transparan oleh semua penerima email.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin menguji apakah komputer laboratorium dapat terhubung dan menerima respon dari komputer server sekolah, perintah terminal CLI yang paling tepat dijalankan adalah...',
                        'correct' => 'ping [alamat_ip_server]',
                        'distractors' => [
                            'format C:',
                            'shutdown /s',
                            'del *.*',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan utilitas uji konektivitas ICMP ping.',
                        'sub_level' => 'C3 - MOTS (Penerapan Diagnostik)',
                        'explanation_correct' => 'Perintah ping mengirimkan paket echo request ICMP untuk memverifikasi keterjangkauan host dan mengukur waktu latensi.',
                        'explanation_distractors' => 'Format dan del adalah perintah penghapusan data, shutdown untuk mematikan komputer.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk mencari file presentasi tugas informatika dengan format .pptx di Google Search secara spesifik adalah menggunakan kata kunci...',
                        'correct' => 'materi informatika filetype:pptx',
                        'distractors' => [
                            'materi informatika tolong cari pptx',
                            'materi informatika jangan tampilkan file lain',
                            'cari materi informatika sekarang juga',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan operator pencarian lanjutan filetype: pada search engine.',
                        'sub_level' => 'C3 - MOTS (Penerapan Pencarian)',
                        'explanation_correct' => 'Operator filetype: menyaring hasil pencarian hanya pada berkas dokumen dengan ekstensi yang diminta.',
                        'explanation_distractors' => 'Kalimat percakapan alami kurang efektif diproses oleh bot perayap mesin pencari.',
                    ],
                    [
                        'stem' => 'Ketika kamu berada di sekolah dan ingin berbagi koneksi internet dari ponsel pintarmu ke laptop teman untuk mengerjakan tugas kelompok, fitur yang kamu aktifkan adalah...',
                        'correct' => 'Personal Hotspot (Tethering Wi-Fi).',
                        'distractors' => [
                            'Mode Pesawat (Airplane Mode).',
                            'NFC (Near Field Communication).',
                            'Do Not Disturb (Jangan Ganggu).',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan fungsi mobile tethering/hotspot seluler.',
                        'sub_level' => 'C3 - MOTS (Penerapan Jaringan)',
                        'explanation_correct' => 'Fitur Hotspot mengubah modem seluler ponsel menjadi access point nirkabel sementara bagi perangkat laptop sekitarnya.',
                        'explanation_distractors' => 'Airplane mode mematikan semua radio, NFC untuk tap uang elektronik, Do Not Disturb membisukan notifikasi.',
                    ],
                    [
                        'stem' => 'Langkah tepat saat menghubungkan kabel jaringan UTP ke switch di laboratorium komputer sekolah adalah...',
                        'correct' => 'Menancapkan konektor RJ-45 ke salah satu port switch yang kosong hingga terdengar bunyi klik pengunci dan lampu indikator port menyala hijau/berkedip.',
                        'distractors' => [
                            'Mengikatkan tembaga kabel ke pegangan pintu lab.',
                            'Memasukkan konektor ke lubang ventilasi casing CPU.',
                            'Memotong ujung kabel menjadi dua bagian.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pemasangan fisik kabel jaringan RJ-45.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Bunyi klik menandakan kait pengunci RJ-45 terpasang pas dan lampu LED indikator link menunjukkan negosiasi sinyal fisik berhasil.',
                        'explanation_distractors' => 'Pilihan lainnya merusak infrastruktur lab dan tidak menghubungkan sirkuit data.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin mengunduh tugas dari Google Classroom tetapi peramban web memblokir berkas dengan peringatan \'Pop-up blocked\', tindakan yang benar adalah...',
                        'correct' => 'Mengklik ikon peringatan di ujung bilah alamat peramban dan memilih opsi \'Always allow pop-ups and redirects from classroom.google.com\'.',
                        'distractors' => [
                            'Menutup peramban dan mematikan laptop selama satu hari.',
                            'Menghapus akun Google Classroom secara permanen.',
                            'Mengganti kartu memori ponsel.',
                        ],
                        'indicator' => 'Peserta didik mampu mengatasi pemblokiran pop-up jendela unduh pada peramban.',
                        'sub_level' => 'C3 - MOTS (Penerapan Navigasi Web)',
                        'explanation_correct' => 'Memberikan izin pop-up khusus domain terpercaya mengizinkan jendela unduh atau login pihak ketiga terbuka secara sah.',
                        'explanation_distractors' => 'Menghapus akun atau mematikan laptop tidak menyelesaikan preferensi izin peramban.',
                    ],
                    [
                        'stem' => 'Saat kamu mencari kata kunci artikel ilmiah yang persis sama urutan katanya di Google Search, tanda baca yang wajib kamu gunakan adalah...',
                        'correct' => 'Tanda petik dua ( "..." ).',
                        'distractors' => [
                            'Tanda tanya ( ?... ).',
                            'Tanda pagar ( #... ).',
                            'Tanda dolar ( $... ).',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan operator frasa eksak tanda petik dua pada mesin pencari.',
                        'sub_level' => 'C3 - MOTS (Penerapan Pencarian)',
                        'explanation_correct' => 'Tanda petik ganda memaksa mesin pencari mencocokkan frasa kata demi kata secara eksak tanpa memisahkan katanya.',
                        'explanation_distractors' => 'Tanda pagar untuk tagar medsos, tanda tanya untuk query URL, tanda dolar untuk harga.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk melihat alamat IP yang sedang digunakan oleh komputer kita di sistem operasi Windows melalui Command Prompt adalah mengetikkan perintah...',
                        'correct' => 'ipconfig',
                        'distractors' => [
                            'getip',
                            'myinternet',
                            'shownetwork',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan utilitas CLI ipconfig untuk audit pengalamatan jaringan.',
                        'sub_level' => 'C3 - MOTS (Penerapan Diagnostik)',
                        'explanation_correct' => 'Perintah ipconfig menampilkan seluruh konfigurasi adapter antarmuka jaringan aktif beserta IP Address, Subnet Mask, dan Default Gateway.',
                        'explanation_distractors' => 'Pilihan lainnya adalah perintah fiktif yang tidak dikenali oleh shell Windows.',
                    ],
                    [
                        'stem' => 'Ketika kamu ingin mengunggah file video dokumentasi berukuran 500 MB ke Google Drive, langkah yang paling benar adalah...',
                        'correct' => 'Mengklik tombol \'+ Baru\' (New) -> \'Upload File\' -> Memilih file video dari komputer -> Menunggu proses unggah tuntas.',
                        'distractors' => [
                            'Menyeret file video ke keranjang sampah (Trash).',
                            'Mematikan sambungan modem saat progress baru 5%.',
                            'Mengubah nama file video menjadi foto.jpg secara paksa.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan prosedur pengunggahan berkas ke cloud storage.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Prosedur New -> File Upload membaca berkas lokal dan mengirimkan blok data terenkripsi ke server penyimpanan awan.',
                        'explanation_distractors' => 'Membuang ke sampah menghapus berkas dan mematikan modem membatalkan proses unggah.',
                    ],
                    [
                        'stem' => 'Jika kamu ingin berbagi link dokumen Google Docs tugas kelompok agar teman-teman sekelompokmu bisa ikut mengetik dan menyunting isi dokumen, pengaturan izin berbagi yang kamu pilih adalah...',
                        'correct' => 'Mengatur peran tautan menjadi \'Editor\' (Editor).',
                        'distractors' => [
                            'Mengatur peran tautan menjadi \'Viewer\' (Pelihat saja).',
                            'Mengatur peran menjadi \'Restricted\' (Dibatasi tanpa izin).',
                            'Menghapus link dokumen.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan hak akses kolaboratif (Editor) pada dokumen cloud.',
                        'sub_level' => 'C3 - MOTS (Penerapan Kolaborasi)',
                        'explanation_correct' => 'Hak akses Editor memberikan izin menulis dan menyunting dokumen secara kolaboratif waktu nyata.',
                        'explanation_distractors' => 'Viewer hanya mengizinkan membaca tanpa bisa mengetik, Restricted memblokir akses pengguna luar.',
                    ],
                    [
                        'stem' => 'Langkah pencegahan agar riwayat pencarian pribadi dan cookies tidak tersimpan di komputer perpustakaan sekolah setelah kamu selesai menggunakannya adalah...',
                        'correct' => 'Membuka peramban web menggunakan mode penjelajahan privat (Incognito Window / Private Browsing).',
                        'distractors' => [
                            'Mencabut mouse dari port USB.',
                            'Menutup peramban tanpa pernah keluar akun.',
                            'Mengurangi volume speaker komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan mode penjelajahan privat Incognito di fasilitas umum.',
                        'sub_level' => 'C3 - MOTS (Penerapan Keamanan)',
                        'explanation_correct' => 'Mode Incognito secara otomatis menghapus seluruh riwayat pencarian, cookies, dan data formulir seketika jendela peramban ditutup.',
                        'explanation_distractors' => 'Mencabut mouse atau mengatur volume tidak ada hubungannya dengan pembersihan jejak peramban web.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Mengapa menggunakan jaringan Wi-Fi publik gratis tanpa kata sandi di tempat umum rentan terhadap ancaman keamanan data?',
                        'correct' => 'Karena lalu lintas data yang tidak terenkripsi pada jaringan publik dapat disadap oleh penyerang siber dalam jaringan yang sama (sniffing).',
                        'distractors' => [
                            'Karena sinyal Wi-Fi gratis otomatis merusak baterai ponsel secara fisik.',
                            'Karena penyedia Wi-Fi akan menghapus semua file foto di galeri ponsel.',
                            'Karena ponsel akan otomatis mengirimkan pesan SMS berbayar ke luar negeri.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis ancaman penyadapan paket data jaringan Wi-Fi publik.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Keamanan Jaringan)',
                        'explanation_correct' => 'Ketiadaan enkripsi level jaringan memungkinkan teknik packet sniffing dan Man-in-the-Middle (MITM) menyadap data kredensial.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang kerusakan baterai atau manipulasi SMS yang mustahil.',
                    ],
                    [
                        'stem' => 'Analisis keunggulan koneksi internet menggunakan kabel LAN (UTP) dibandingkan koneksi nirkabel (Wi-Fi) dalam ruang lab komputer adalah...',
                        'correct' => 'Koneksi kabel LAN memiliki kecepatan transmisi data yang lebih stabil dan minim gangguan interferensi sinyal dibandingkan Wi-Fi.',
                        'distractors' => [
                            'Koneksi Wi-Fi selalu lebih stabil saat terhalang dinding beton tebal dibandingkan kabel LAN.',
                            'Kabel LAN tidak memerlukan aliran sinyal data sama sekali untuk menghubungkan komputer.',
                            'Koneksi Wi-Fi memerlukan pemasangan soket tembaga di setiap meja siswa.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi keandalan kabel tembaga terhadap gelombang radio Wi-Fi.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Transmisi)',
                        'explanation_correct' => 'Media terpandu (guided media) seperti kabel tembaga bebas dari pelemahan gelombang radio akibat rintangan fisik dan frekuensi bentrok.',
                        'explanation_distractors' => 'Gelombang Wi-Fi justru terdegradasi parah saat menembus dinding beton.',
                    ],
                    [
                        'stem' => 'Seorang siswa mencoba mengakses situs web sekolah tetapi muncul pesan \'404 Not Found\'. Evaluasi yang paling tepat mengenai pesan galat tersebut adalah...',
                        'correct' => 'Server web aktif merespons, namun halaman atau alamat URL spesifik yang diminta tidak ditemukan atau telah dipindahkan.',
                        'distractors' => [
                            'Kabel listrik monitor komputer siswa terputus.',
                            'Sistem operasi komputer siswa telah kedaluwarsa dan harus diganti.',
                            'Seluruh jaringan internet global di dunia sedang dimatikan sementara.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi arti kode status HTTP 404 Not Found.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Protokol)',
                        'explanation_correct' => 'Kode status HTTP 404 menandakan server berhasil dihubungi (handshake sukses), tetapi endpoint URL yang diminta tidak eksis.',
                        'explanation_distractors' => 'Pilihan lainnya mencampuradukkan galat listrik atau mematikan internet global.',
                    ],
                    [
                        'stem' => 'Mengapa protokol HTTPS jauh lebih disarankan dibandingkan HTTP biasa saat melakukan transaksi atau pengisian formulir di internet?',
                        'correct' => 'Karena HTTPS mengenkripsi data yang dikirim antara browser dan server sehingga tidak bisa dibaca oleh pihak ketiga di tengah jalan.',
                        'distractors' => [
                            'Karena HTTPS membuat ukuran halaman web menjadi dua kali lebih besar dan lambat.',
                            'Karena HTTP biasa hanya boleh digunakan oleh instansi militer dan pemerintah.',
                            'Karena HTTPS tidak membutuhkan koneksi jaringan internet untuk membuka halaman.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis pentingnya saluran terenkripsi HTTPS.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Protokol)',
                        'explanation_correct' => 'Kriptografi SSL/TLS pada HTTPS mengamankan kerahasiaan dan integritas data dari aksi penyadapan (eavesdropping).',
                        'explanation_distractors' => 'HTTPS tidak melipatgandakan bobot halaman dan tetap memerlukan koneksi jaringan.',
                    ],
                    [
                        'stem' => 'Jika kecepatan unduh (download speed) cepat tetapi latensi (ping) sangat tinggi saat melakukan pembelajaran tatap muka daring, dampak yang dirasakan adalah...',
                        'correct' => 'Terjadi keterlambatan suara dan video (lag/delay) saat berkomunikasi interaktif dua arah.',
                        'distractors' => [
                            'Video akan otomatis terputar dengan kecepatan dua kali lebih cepat tanpa jeda.',
                            'Tampilan warna video di layar akan berubah menjadi format hitam putih.',
                            'Laptop akan menolak memutar suara dari pembicara.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis dampak latensi tinggi pada komunikasi video real-time.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Kinerja Jaringan)',
                        'explanation_correct' => 'Aplikasi real-time interaktif sangat sensitif terhadap round-trip time (ping); latensi tinggi menyebabkan delay percakapan.',
                        'explanation_distractors' => 'Latensi tinggi tidak mengubah format warna video atau mempercepat pemutaran suara.',
                    ],
                    [
                        'stem' => 'Analisis risiko dari mengeklik tautan URL yang dipendekkan (short link) dari sumber yang tidak jelas adalah...',
                        'correct' => 'Tautan tersebut dapat mengarahkan pengguna ke situs web tiruan (phishing) atau memicu pengunduhan malware berbahaya.',
                        'distractors' => [
                            'Kapasitas RAM komputer akan berkurang separuh.',
                            'Suhu ruangan lab komputer akan meningkat drastis.',
                            'Speaker komputer akan otomatis memutar musik keras.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis risiko pengelabuan alamat tujuan URL short link.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Keamanan)',
                        'explanation_correct' => 'Short link menyembunyikan domain tujuan asli sehingga sering dimanfaatkan penyerang untuk mengelabui korban.',
                        'explanation_distractors' => 'Short link tidak memotong kapasitas RAM atau menaikkan suhu ruangan secara fisik.',
                    ],
                    [
                        'stem' => 'Ketika sebuah komputer di laboratorium memiliki IP Address 192.168.1.10 dan komputer server memiliki IP 192.168.1.1 dengan subnet mask 255.255.255.0, analisis konektivitas keduanya adalah...',
                        'correct' => 'Kedua komputer berada dalam satu segmen jaringan lokal (subnet) yang sama sehingga dapat berkomunikasi langsung tanpa memerlukan router.',
                        'distractors' => [
                            'Kedua komputer tidak bisa tersambung karena memiliki angka terakhir yang berbeda.',
                            'Kedua komputer harus dihubungkan menggunakan kabel listrik tegangan tinggi.',
                            'Komputer klien akan otomatis menghapus file di komputer server.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis segmentasi subnet pengalamatan IPv4 lokal.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Subnetting)',
                        'explanation_correct' => 'Subnet mask /24 mematok 3 oktet pertama (192.168.1.x) sebagai network ID yang sama, memungkinkan komunikasi layer-2 langsung.',
                        'explanation_distractors' => 'Host ID yang berbeda pada subnet yang sama justru merupakan syarat mutlak agar tidak terjadi tabrakan IP (IP conflict).',
                    ],
                    [
                        'stem' => 'Dua komputer dihubungkan ke jaringan dan keduanya mendadak tidak bisa mengakses internet dengan peringatan \'IP Address Conflict\'. Analisis penyebab dan solusinya adalah...',
                        'correct' => 'Kedua komputer diberikan alamat IP yang sama persis; solusinya ubah salah satu alamat IP secara manual atau aktifkan DHCP agar pembagian IP otomatis.',
                        'distractors' => [
                            'Kedua komputer dinyalakan pada jam yang sama sehingga sistem cemburu.',
                            'Kabel monitor kedua komputer saling bersilangan di bawah meja.',
                            'Salah satu komputer harus dibuang ke tempat sampah.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis penyebab dan mitigasi tabrakan alamat IP Address Conflict.',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Jaringan)',
                        'explanation_correct' => 'Di jaringan berbasis IP, setiap antarmuka wajib memiliki pengenal alamat unik; duplikasi IP melumpuhkan rute tabel ARP.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi tidak masuk akal yang tidak berhubungan dengan protokol jaringan.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa protokol IPv6 diciptakan untuk menggantikan protokol IPv4 dalam perkembangan internet global adalah...',
                        'correct' => 'Kapasitas alamat IPv4 (32-bit atau sekitar 4,3 miliar alamat) telah habis terpakai di seluruh dunia, sedangkan IPv6 (128-bit) menyediakan kuadriliun alamat baru untuk seluruh perangkat cerdas.',
                        'distractors' => [
                            'Karena IPv4 dilarang oleh organisasi PBB karena menggunakan kabel tembaga.',
                            'Karena IPv6 otomatis membuat semua komputer tidak memerlukan listrik.',
                            'Karena IPv4 hanya bisa menampilkan gambar hitam putih.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi urgensi transisi pengalamatan IPv4 menuju IPv6.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Arsitektur Jaringan)',
                        'explanation_correct' => 'Ledakan perangkat IoT dan smartphone menuntut ruang pengalamatan astronomis yang hanya dapat dipenuhi oleh 128-bit IPv6.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang larangan PBB atau teknologi tanpa listrik yang mustahil.',
                    ],
                    [
                        'stem' => 'Analisis fungsi perangkat Firewall dalam sistem jaringan komputer sekolah adalah...',
                        'correct' => 'Memeriksa dan menyaring paket data yang masuk dan keluar berdasarkan aturan keamanan untuk memblokir akses mencurigakan atau virus.',
                        'distractors' => [
                            'Mencegah ruangan laboratorium komputer dari kebakaran api fisik.',
                            'Memadamkan lampu monitor komputer saat jam pelajaran berakhir.',
                            'Mempercepat putaran kipas pendingin laptop.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis peran penyaringan paket data perangkat Firewall.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Keamanan Jaringan)',
                        'explanation_correct' => 'Firewall adalah pembatas digital (inspeksi paket stateful) yang memblokir port dan lalu lintas berbahaya dari jaringan luar.',
                        'explanation_distractors' => 'Firewall jaringan tidak berkaitan dengan perlindungan api fisik bangunan sekolah.',
                    ],
                    [
                        'stem' => 'Seorang pengguna membuka situs \'http://bank-palsu.com\' yang tampilannya mirip persis dengan situs bank asli. Evaluasi keamanan protokol yang paling mencurigakan adalah...',
                        'correct' => 'Situs tersebut hanya menggunakan protokol HTTP biasa tanpa enkripsi (tidak ada ikon gembok HTTPS) dan nama domain tidak berlisensi resmi.',
                        'distractors' => [
                            'Situs tersebut dibuka pada hari libur nasional.',
                            'Warna tombol di situs tersebut menggunakan warna biru.',
                            'Halaman web tersebut dapat digulir ke bawah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi ketiadaan sertifikat SSL/TLS pada situs phishing.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Keamanan Web)',
                        'explanation_correct' => 'Situs finansial dan perbankan resmi mutlak menggunakan sertifikat SSL/TLS (HTTPS) terverifikasi untuk menjamin kerahasiaan formulir.',
                        'explanation_distractors' => 'Warna tombol dan hari pembukaan adalah karakteristik web biasa yang tidak menentukan status keamanan protokol.',
                    ],
                    [
                        'stem' => 'Ketika melakukan pencarian di Google menggunakan kata kunci: \'sistem komputer -game\', evaluasi fungsi tanda minus (-) pada query tersebut adalah...',
                        'correct' => 'Mengecualikan hasil pencarian yang memuat kata \'game\' sehingga hasil yang muncul murni artikel sistem komputer pendidikan.',
                        'distractors' => [
                            'Mengurangi kecepatan pencarian Google menjadi setengahnya.',
                            'Menghapus semua file sistem komputer di laptop pengguna.',
                            'Mencari game tentang sistem komputer.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi operator eksklusi minus (-) pada mesin pencari.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Mesin Pencari)',
                        'explanation_correct' => 'Operator negasi (-) menyaring hasil perayapan dengan membuang halaman yang memuat istilah yang tidak dikehendaki.',
                        'explanation_distractors' => 'Pilihan lainnya salah memahami fungsi filter logika pencarian boolean.',
                    ],
                    [
                        'stem' => 'Mengapa kecepatan unduh (download) pada koneksi internet rumah tangga umumnya jauh lebih besar dibandingkan kecepatan unggah (upload) / Asymmetric?',
                        'correct' => 'Karena pola perilaku sebagian besar pengguna internet jauh lebih banyak mengonsumsi konten (streaming, browsing) daripada mempublikasikan data besar ke server.',
                        'distractors' => [
                            'Karena kabel tembaga internet hanya bisa mengalirkan data ke satu arah saja.',
                            'Karena pemerintah melarang pengguna rumahan mengunggah file apa pun.',
                            'Karena kecepatan unggah membutuhkan energi baterai nuklir.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis rasio bandwidth asimetris (ADSL/Broadband consumer).',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Bandwidth)',
                        'explanation_correct' => 'Arsitektur broadband asimetris (ADSL/DOCSIS) mengalokasikan spektrum frekuensi hilir (downstream) lebih besar menyesuaikan pola konsumsi umum.',
                        'explanation_distractors' => 'Pilihan pengecoh mengarang kabel satu arah atau larangan fiktif.',
                    ],
                    [
                        'stem' => 'Seorang siswa di laboratorium sekolah dapat membuka situs web menggunakan alamat IP server (misal: 192.168.1.5), tetapi gagal saat mengetikkan nama domain situs tersebut. Analisis kerusakan yang paling tepat adalah...',
                        'correct' => 'Terjadi kegagalan konfigurasi atau layanan Server DNS (Domain Name Server) pada pengaturan jaringan komputer.',
                        'distractors' => [
                            'Kabel listrik monitor terputus di dalam dinding.',
                            'Semua file di dalam komputer siswa telah terhapus oleh virus.',
                            'Koneksi internet seluruh dunia sedang dimatikan.',
                        ],
                        'indicator' => 'Peserta didik mampu mendiagnosis kegagalan resolusi nama Domain Name Server (DNS).',
                        'sub_level' => '{$subLevel} - HOTS (Troubleshooting Jaringan)',
                        'explanation_correct' => 'Koneksi IP sukses membuktikan jalur routing jaringan layer-3 sehat, namun nama domain gagal berarti translasi DNS mengalami gangguan.',
                        'explanation_distractors' => 'Kabel listrik monitor atau pemadaman internet global tidak cocok dengan fakta bahwa akses via IP berhasil.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa penggunaan teknologi VPN (Virtual Private Network) saat terhubung ke Wi-Fi publik di bandara mampu melindungi transaksi siswa dari serangan penyadapan adalah...',
                        'correct' => 'VPN membuat terowongan terenkripsi (encrypted tunnel) dari perangkat menuju server VPN sehingga paket data yang disadap penyerang hanya berupa kode acak tak terbaca.',
                        'distractors' => [
                            'VPN membuat laptop siswa otomatis menghilang secara fisik dari pandangan orang lain.',
                            'VPN meningkatkan kapasitas baterai laptop menjadi tahan seminggu.',
                            'VPN mematikan semua router Wi-Fi milik orang lain di bandara.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis mekanisme enkripsi terowongan tunneling VPN.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Keamanan Jaringan)',
                        'explanation_correct' => 'Enkripsi end-to-end VPN mengenkripsi payload jaringan sehingga penyerang pada segmen Wi-Fi lokal tidak dapat merekonstruksi isi pesan.',
                        'explanation_distractors' => 'Pilihan lainnya adalah klaim magis fisik yang mustahil.',
                    ],
                    [
                        'stem' => 'Analisis dampak jika sebuah kabel jaringan UTP dipasang melebihi batas panjang maksimum standar teknisnya (100 meter) tanpa perangkat penguat (repeater/switch) adalah...',
                        'correct' => 'Terjadi pelemahan sinyal data (attenuation) yang parah sehingga laju transmisi anjlok drastis atau koneksi putus-nyambung.',
                        'distractors' => [
                            'Kabel jaringan tersebut akan terbakar api secara otomatis.',
                            'Data di dalam komputer pengirim akan berubah menjadi file suara.',
                            'Monitor komputer penerima akan menampilkan tulisan terbalik.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis fenomena degradasi sinyal (attenuation) pada kabel tembaga.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Media Transmisi)',
                        'explanation_correct' => 'Hambatan resistansi kabel tembaga mendegradasi amplitudo sinyal digital di atas 100 meter (standar IEEE 802.3).',
                        'explanation_distractors' => 'Pilihan lainnya mengarang kebakaran otomatis atau perubahan file suara yang tidak ilmiah.',
                    ],
                    [
                        'stem' => 'Ketika sebuah komputer menggunakan mode DHCP (Dynamic Host Configuration Protocol), evaluasi keuntungan utamanya bagi teknisi laboratorium sekolah dengan 40 komputer adalah...',
                        'correct' => 'Teknisi tidak perlu mengatur alamat IP, subnet mask, dan DNS secara manual satu per satu di 40 komputer karena server membagikannya otomatis dan mencegah IP conflict.',
                        'distractors' => [
                            'DHCP membuat komputer dapat menyala tanpa membutuhkan aliran daya listrik PLN.',
                            'DHCP menghapus seluruh tugas siswa yang nilainya di bawah KKM.',
                            'DHCP melipatgandakan ukuran fisik layar monitor laboratorium.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi efisiensi administrasi jaringan protokol DHCP.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Administrasi Jaringan)',
                        'explanation_correct' => 'Otomasi alokasi pool IP oleh server DHCP memangkas beban manajemen jaringan dan mengeliminasi kesalahan pengetikan manusia.',
                        'explanation_distractors' => 'DHCP adalah protokol konfigurasi jaringan logis, bukan penyuplai daya atau pengubah ukuran monitor.',
                    ],
                    [
                        'stem' => 'Seorang siswa mengunduh file tugas dari internet dengan kecepatan 10 Mbps (Megabits per detik). Berapa lama waktu teoritis tercepat yang dibutuhkan untuk mengunduh berkas sebesar 50 MB (Megabytes)? (Petunjuk: 1 Byte = 8 bits)',
                        'correct' => '40 detik, karena 50 MB setara dengan 400 Megabits, dibagi kecepatan 10 Mbps.',
                        'distractors' => [
                            '5 detik, karena 50 dibagi 10.',
                            '500 detik, karena 50 dikali 10.',
                            '1 detik saja.',
                        ],
                        'indicator' => 'Peserta didik mampu menghitung kalkulasi matematis durasi transfer data berbasis konversi Byte ke bit.',
                        'sub_level' => '{$subLevel} - HOTS (Kalkulasi Kinerja Jaringan)',
                        'explanation_correct' => 'Ukuran file 50 MegaBytes * 8 = 400 Megabits. Waktu = 400 Mb / 10 Mbps = 40 detik.',
                        'explanation_distractors' => 'Pilihan 5 detik salah karena mengabaikan konversi antara Byte (B) berhuruf besar dan bit (b) berhuruf kecil.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function getGenericMcAngles(string $level): array
    {
        $levels = [
            'lots' => [
                    [
                        'stem' => 'Konsep dasar yang menjadi inti pembahasan materi {$coreNoun} adalah...',
                        'correct' => 'Keterpaduan hubungan fungsional antarelemen materi yang tersusun sistematis untuk mencapai sasaran terukur.',
                        'distractors' => [
                            'Kumpulan data acak yang tidak memiliki keterkaitan operasional satu sama lain.',
                            'Asumsi subjektif tanpa bukti empiris atau fakta pendukung yang terverifikasi.',
                            'Prosedur historis yang sudah ditinggalkan dan tidak lagi relevan dengan topik ini.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi substansi keilmuan materi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Pilihan ini mendefinisikan esensi materi {$coreNoun} secara tepat berdasarkan keterpaduan antarelemen penyusunnya.',
                        'explanation_distractors' => 'Pilihan pengecoh mengasumsikan data acak, ketiadaan bukti empiris, atau prosedur usang.',
                    ],
                    [
                        'stem' => 'Karakteristik utama yang membedakan materi {$coreNoun} dari bahasan lainnya ditunjukkan oleh...',
                        'correct' => 'Memiliki aturan baku, komponen terstruktur, serta alur kerja yang terstandarisasi.',
                        'distractors' => [
                            'Bekerja secara spontan tanpa memerlukan parameter atau kriteria mutu tertentu.',
                            'Hanya berlaku dalam kondisi khusus tanpa memiliki dasar prinsip yang jelas.',
                            'Mengabaikan hubungan sebab-akibat antarunsur pembentuknya.',
                        ],
                        'indicator' => 'Peserta didik mampu membedakan ciri pokok {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Karakteristik fundamental materi keilmuan terletak pada keteraturan kaidah dan standarisasi prosesnya.',
                        'explanation_distractors' => 'Pilihan lainnya mencerminkan ketiadaan aturan baku atau pengabaian prinsip kausalitas.',
                    ],
                    [
                        'stem' => 'Elemen mendasar yang paling menentukan ketepatan pelaksanaan materi {$coreNoun} adalah...',
                        'correct' => 'Ketepatan identifikasi variabel awal dan kepatuhan terhadap kaidah keilmuan yang berlaku.',
                        'distractors' => [
                            'Kecepatan menyelesaikan langkah kerja dengan mengabaikan pemeriksaan kualitas.',
                            'Penggunaan praduga pribadi tanpa mencocokkan dengan parameter materi.',
                            'Pengurangan tahapan penting dengan tujuan mempercepat hasil.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi faktor ketepatan pelaksanaan {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Ketepatan variabel awal dan kepatuhan kaidah ilmiah adalah fondasi mutu setiap penerapan materi.',
                        'explanation_distractors' => 'Mengejar kecepatan tanpa kontrol kualitas mengorbankan keabsahan luaran.',
                    ],
                    [
                        'stem' => 'Dalam konteks {$subjectName}, fungsi mendasar dari materi {$coreNoun} adalah...',
                        'correct' => 'Menyediakan landasan analitis guna memahami dan menguraikan permasalahan secara logis.',
                        'distractors' => [
                            'Membatasi eksplorasi ide baru yang relevan dengan perkembangan keilmuan.',
                            'Menciptakan kerumitan proses tanpa memberikan nilai tambah keilmuan.',
                            'Menggantikan peran pengamatan empiris dengan spekulasi tanpa bukti.',
                        ],
                        'indicator' => 'Peserta didik mampu menguraikan peran analitis {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Materi ini berperan strategis sebagai kerangka logis dalam membedah dan menyelesaikan permasalahan.',
                        'explanation_distractors' => 'Pilihan lainnya mengklaim pembatasan inovasi atau kerumitan tanpa faedah.',
                    ],
                    [
                        'stem' => 'Prinsip keilmuan yang mendasari keabsahan materi {$coreNoun} adalah...',
                        'correct' => 'Setiap luaran atau hasil akhir sangat ditentukan oleh keabsahan proses dan kualitas data awal.',
                        'distractors' => [
                            'Kualitas hasil akhir tidak dipengaruhi oleh ketelitian proses yang ditempuh.',
                            'Prosedur kerja dapat diubah sewaktu-waktu tanpa perhitungan dampak teknis.',
                            'Penyederhanaan proses dilakukan dengan menghapus tahapan verifikasi utama.',
                        ],
                        'indicator' => 'Peserta didik mampu memvalidasi kaidah dasar {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Kaidah ilmiah universal menegaskan bahwa integritas proses dan masukan menentukan keandalan produk akhir.',
                        'explanation_distractors' => 'Pilihan pengecoh mengabaikan hubungan kausalitas antara proses dan kualitas luaran.',
                    ],
                    [
                        'stem' => 'Kaidah penting yang harus diperhatikan dalam menelaah materi {$coreNoun} adalah...',
                        'correct' => 'Memperhatikan keterkaitan sebab-akibat yang mendasari setiap perubahan atau fenomena.',
                        'distractors' => [
                            'Mengabaikan fakta empiris dan hanya berpegang pada opini pribadi.',
                            'Menganggap semua bagian berdiri sendiri tanpa hubungan sistemik.',
                            'Menghilangkan parameter pengukuran agar analisis lebih mudah.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan hubungan kausalitas pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Analisis ilmiah menuntut pengamatan relasi sebab-akibat yang terstruktur dan berbasis fakta objektif.',
                        'explanation_distractors' => 'Pilihan lainnya bertentangan dengan metodologi keilmuan.',
                    ],
                    [
                        'stem' => 'Definisi operasional dari konsep utama {$coreNoun} merujuk pada...',
                        'correct' => 'Deskripsi prosedur terukur yang dapat diuji dan diamati secara konsisten dalam kondisi standar.',
                        'distractors' => [
                            'Pernyataan umum yang tidak dapat diuji kebenarannya.',
                            'Kumpulan istilah asing tanpa makna praktis di lapangan.',
                            'Pendapat pribadi tanpa rujukan ilmiah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi definisi operasional {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Definisi operasional memberikan parameter konkret yang memungkinkan pengulangan hasil uji coba.',
                        'explanation_distractors' => 'Pilihan lainnya adalah pernyataan non-ilmiah yang tidak terukur.',
                    ],
                    [
                        'stem' => 'Kategori klasifikasi yang tepat untuk membedakan ragam komponen dalam {$coreNoun} didasarkan pada...',
                        'correct' => 'Fungsi operasional, peran sistemik, dan karakteristik luaran yang dihasilkan masing-masing komponen.',
                        'distractors' => [
                            'Warna tampilan luar yang bersifat dekoratif semata.',
                            'Urutan abjad nama pembuat komponen tersebut.',
                            'Ukuran fisik tempat penyimpanan berkas.',
                        ],
                        'indicator' => 'Peserta didik mampu mengelompokkan komponen materi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Klasifikasi keilmuan berpijak pada peran fungsional dan relasi sistemik antarbagian.',
                        'explanation_distractors' => 'Warna atau abjad nama adalah atribut periferal yang tidak menentukan fungsi sistemik.',
                    ],
                    [
                        'stem' => 'Tujuan utama standarisasi aturan pada materi {$coreNoun} adalah...',
                        'correct' => 'Menjamin keseragaman mutu, keteraturan prosedur, dan akurasi luaran saat diterapkan di berbagai tempat.',
                        'distractors' => [
                            'Mencegah siapapun melakukan perbaikan kualitas di masa depan.',
                            'Mengharuskan semua orang membeli alat dari satu produsen saja.',
                            'Menghilangkan kebutuhan akan dokumentasi ilmiah.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan tujuan standarisasi materi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Standarisasi menciptakan tolok ukur reliabilitas universal yang dapat diandalkan secara konsisten.',
                        'explanation_distractors' => 'Standarisasi bukan alat monopoli atau pembatas inovasi keilmuan.',
                    ],
                    [
                        'stem' => 'Peran data fakta empiris dalam mendukung kebenaran materi {$coreNoun} adalah...',
                        'correct' => 'Sebagai bukti objektif yang memvalidasi hipotesis dan mencegah kesimpulan keliru.',
                        'distractors' => [
                            'Sebagai pelengkap formalitas tanpa pengaruh terhadap kesimpulan.',
                            'Untuk mempertebal lembaran laporan tugas semata.',
                            'Menggantikan seluruh proses analisis berpikir kritis.',
                        ],
                        'indicator' => 'Peserta didik mampu menguraikan peran data empiris pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Fakta empiris adalah fondasi metode ilmiah yang menopang validitas kesimpulan.',
                        'explanation_distractors' => 'Data empiris bukan sekadar formalitas melainkan pilar pembuktian utama.',
                    ],
                    [
                        'stem' => 'Istilah terminologi pokok yang paling sering digunakan untuk menggambarkan keterkaitan antarunsur pada {$coreNoun} adalah...',
                        'correct' => 'Interdependensi fungsional (saling ketergantungan yang teratur).',
                        'distractors' => [
                            'Pemisahan mutlak tanpa hubungan.',
                            'Ketiadaan struktur sistemik.',
                            'Dominasi sepihak tanpa keseimbangan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali terminologi hubungan sistemik {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Interdependensi fungsional menandai sistem terpadu di mana tiap bagian berkontribusi pada kinerja utuh.',
                        'explanation_distractors' => 'Pilihan lainnya mencerminkan sistem terfragmentasi yang terpecah.',
                    ],
                    [
                        'stem' => 'Satuan atau parameter acuan yang digunakan untuk mengukur kinerja pada konsep {$coreNoun} harus memenuhi syarat...',
                        'correct' => 'Objektif, terstandar, dapat diulang pengukurannya, dan diakui secara luas.',
                        'distractors' => [
                            'Berubah-ubah setiap hari sesuai perasaan peneliti.',
                            'Hanya diketahui oleh satu orang dan dirahasiakan.',
                            'Tidak memiliki batasan angka ukur yang jelas.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi kriteria parameter pengukuran baku {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Parameter terstandar dan reprodusibel adalah kaidah utama pengukuran ilmiah.',
                        'explanation_distractors' => 'Pengukuran subjektif yang berubah-ubah melanggar kaidah keilmuan.',
                    ],
                    [
                        'stem' => 'Hubungan antara variabel masukan dan variabel luaran pada sistem materi {$coreNoun} bersifat...',
                        'correct' => 'Korelatif dan kausal (perubahan pada masukan berdampak langsung pada karakteristik luaran).',
                        'distractors' => [
                            'Acak tanpa pola hubungan sebab akibat.',
                            'Statik di mana masukan tidak pernah memengaruhi luaran.',
                            'Tergantung keberuntungan.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan relasi input-output pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Hukum kausalitas menegaskan relasi teratur antara variabel bebas masukan dan luaran terikat.',
                        'explanation_distractors' => 'Asumsi acak atau statis bertentangan dengan sains sistematis.',
                    ],
                    [
                        'stem' => 'Fase awal yang wajib dilalui sebelum menarik generalisasi luas mengenai materi {$coreNoun} adalah...',
                        'correct' => 'Pengujian terhadap sampel data yang representatif dengan metode pengumpulan yang valid.',
                        'distractors' => [
                            'Menyimpulkan langsung dari satu kejadian kebetulan.',
                            'Menyalin opini orang lain tanpa verifikasi lapangan.',
                            'Menolak memeriksa data pendukung.',
                        ],
                        'indicator' => 'Peserta didik mampu mengenali fase pengujian sampel sebelum generalisasi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Generalisasi ilmiah menuntut kecukupan sampel representatif agar bebas dari bias penarikan simpulan.',
                        'explanation_distractors' => 'Generalisasi tergesa-gesa dari satu insiden adalah cacat nalar logika.',
                    ],
                    [
                        'stem' => 'Aspek dokumentasi proses kerja pada materi {$coreNoun} memiliki fungsi vital yaitu...',
                        'correct' => 'Menyediakan rekaman jejak audit yang memungkinkan penelusuran ulang dan perbaikan kualitas berkelanjutan.',
                        'distractors' => [
                            'Menghabiskan ruang lemari arsip secara sengaja.',
                            'Menyulitkan orang lain saat ingin mempelajari sistem.',
                            'Menghilangkan tanggung jawab pelaksana tugas.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan fungsi dokumentasi proses {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Audit trail dan dokumentasi menjamin akuntabilitas serta replikasi pengetahuan di masa depan.',
                        'explanation_distractors' => 'Pilihan pengecoh menganggap dokumentasi sebagai beban negatif.',
                    ],
                    [
                        'stem' => 'Ciri utama dari penerapan materi {$coreNoun} yang telah memenuhi standar etika keilmuan adalah...',
                        'correct' => 'Transparansi metodologi, kejujuran penyajian data, dan penghormatan terhadap hak pihak lain.',
                        'distractors' => [
                            'Penyembunyian data yang bertentangan dengan harapan pribadi.',
                            'Pengubahan angka hasil uji coba agar terlihat sempurna.',
                            'Klaim sepihak tanpa bukti penelitian.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi standar integritas etika keilmuan {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Integritas riset menuntut keterbukaan metode dan pelaporan fakta objektif apa adanya.',
                        'explanation_distractors' => 'Fabrikasi dan manipulasi data adalah pelanggaran etika berat.',
                    ],
                    [
                        'stem' => 'Keterbatasan alami yang harus disadari dalam mengkaji materi {$coreNoun} adalah...',
                        'correct' => 'Ruang lingkup asumsi dan batas toleransi pengukuran yang berlaku pada kondisi pengujian.',
                        'distractors' => [
                            'Ketiadaan aturan dasar yang berlaku umum.',
                            'Ketidakmampuan manusia mempelajari konsep dasar materi.',
                            'Semua hasil kajian selalu salah.',
                        ],
                        'indicator' => 'Peserta didik mampu mengidentifikasi batasan ruang lingkup materi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Sains mengakui batas asumsi (boundary conditions) di mana teori berlaku secara valid.',
                        'explanation_distractors' => 'Pilihan lainnya bersikap skeptis ekstrem yang menolak kapasitas pengetahuan ilmiah.',
                    ],
                    [
                        'stem' => 'Landasan teori yang kokoh pada materi {$coreNoun} berfungsi sebagai...',
                        'correct' => 'Pemandu konseptual dalam merumuskan hipotesis dan menafsirkan temuan data di lapangan.',
                        'distractors' => [
                            'Hiasan teks kutipan tanpa hubungan dengan fakta riil.',
                            'Pengganti mutlak dari observasi langsung.',
                            'Alat untuk menolak bukti baru yang terbukti benar.',
                        ],
                        'indicator' => 'Peserta didik mampu menjelaskan peran landasan teori pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - LOTS (Pemahaman Konseptual)',
                        'explanation_correct' => 'Teori menyediakan lensa analitis untuk membaca dan memahami fenomena secara terstruktur.',
                        'explanation_distractors' => 'Teori ilmiah terbuka terhadap bukti baru dan bukan dogma kaku.',
                    ],
            ],
            'mots' => [
                    [
                        'stem' => 'Langkah prosedural pertama yang paling tepat dilakukan saat mengimplementasikan materi {$coreNoun} adalah...',
                        'correct' => 'Mengidentifikasi parameter awal, merumuskan sasaran kerja, dan menyiapkan instrumen pendukung yang valid.',
                        'distractors' => [
                            'Langsung menarik kesimpulan akhir sebelum data terkumpul secara lengkap.',
                            'Mengabaikan petunjuk prosedur baku demi menghemat waktu pengerjaan.',
                            'Melakukan tahapan implementasi secara acak tanpa rencana kerja terarah.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan langkah persiapan prosedural {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Persiapan instrumen dan identifikasi parameter adalah prasyarat mutlak sebelum tindakan teknis dijalankan.',
                        'explanation_distractors' => 'Melompati persiapan atau menyimpulkan sebelum data ada menyebabkan kesalahan fatal.',
                    ],
                    [
                        'stem' => 'Alur kerja sistematis yang paling tepat untuk menyelesaikan persoalan pada materi {$coreNoun} adalah...',
                        'correct' => 'Pengumpulan dan verifikasi data awal -> Analisis proses sesuai kaidah -> Validasi hasil akhir.',
                        'distractors' => [
                            'Perumusan kesimpulan -> Pelaksanaan tahapan acak -> Pengabaian pemeriksaan ulang.',
                            'Eksekusi proses tanpa data -> Pengujian luaran -> Pengubahan hasil agar sesuai harapan.',
                            'Pengabaian kaidah materi -> Pengerjaan cepat -> Penyerahan tanpa verifikasi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan alur sistematis pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Alur persiapan-pemrosesan-validasi menjamin akurasi dan akuntabilitas hasil kerja.',
                        'explanation_distractors' => 'Pilihan pengecoh memutarbalikkan urutan logis dan meniadakan tahapan pembuktian.',
                    ],
                    [
                        'stem' => 'Tindakan yang harus diambil jika ditemukan ketidaksesuaian data pada saat menerapkan konsep {$coreNoun} adalah...',
                        'correct' => 'Menelusuri kembali sumber data awal, memverifikasi ulang instrumen, dan memperbaiki bagian yang keliru.',
                        'distractors' => [
                            'Mengubah angka data secara sepihak agar terlihat sesuai dengan target.',
                            'Mengabaikan ketidaksesuaian tersebut dan menganggap hasilnya tetap benar.',
                            'Menghapus seluruh rekaman data tanpa melakukan telaah penyebab kesalahan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan tindakan korektif terstandar pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Korektif)',
                        'explanation_correct' => 'Penelusuran sumber dan verifikasi instrumen adalah prosedur korektif baku dalam penjaminan mutu.',
                        'explanation_distractors' => 'Manipulasi data atau pengabaian anomali melanggar integritas keilmuan.',
                    ],
                    [
                        'stem' => 'Kriteria utama untuk memastikan bahwa penerapan materi {$coreNoun} telah memenuhi standar mutu adalah...',
                        'correct' => 'Hasil akhir sesuai dengan parameter yang ditetapkan dan dapat diverifikasi secara objektif.',
                        'distractors' => [
                            'Pengerjaan selesai dalam waktu yang sangat singkat meskipun menyimpang dari aturan.',
                            'Tampilan laporan terlihat tebal tanpa memperhatikan ketepatan isi data.',
                            'Hasil pekerjaan disetujui tanpa melalui proses pengujian atau pengecekan.',
                        ],
                        'indicator' => 'Peserta didik mampu memverifikasi standar ketercapaian mutu {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Verifikasi)',
                        'explanation_correct' => 'Standar mutu tercapai jika luaran dapat dibuktikan kesesuaiannya terhadap parameter terukur.',
                        'explanation_distractors' => 'Kecepatan semu atau ketebalan fisik laporan tidak mencerminkan kebenaran substansi.',
                    ],
                    [
                        'stem' => 'Pendekatan paling tepat saat menghubungkan konsep {$coreNoun} dengan kasus nyata di lapangan adalah...',
                        'correct' => 'Menganalisis karakteristik kasus, memilih kaidah yang relevan, lalu menerapkan solusi yang terukur.',
                        'distractors' => [
                            'Menyamaratakan semua kasus tanpa mempertimbangkan faktor-faktor spesifik di lapangan.',
                            'Memilih solusi yang paling mudah tanpa melihat kesesuaian dengan kaidah materi.',
                            'Mengabaikan data lapangan dan memaksakan asumsi yang belum teruji.',
                        ],
                        'indicator' => 'Peserta didik mampu mengaplikasikan pendekatan analitis kontekstual pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Kontekstual)',
                        'explanation_correct' => 'Aplikasi kontekstual menuntut penyesuaian solusi berdasarkan karakteristik empiris di lapangan.',
                        'explanation_distractors' => 'Generalisasi buta atau pemaksaan asumsi berisiko gagal memecahkan masalah.',
                    ],
                    [
                        'stem' => 'Tindakan verifikasi standar setelah menyelesaikan tahapan kerja pada materi {$coreNoun} adalah...',
                        'correct' => 'Melakukan audit kesesuaian antara hasil kerja dengan kriteria capaian yang telah ditetapkan.',
                        'distractors' => [
                            'Menutup seluruh dokumentasi proses tanpa melakukan pemeriksaan ulang.',
                            'Mengasumsikan hasil kerja sudah sempurna tanpa memerlukan pengujian empiris.',
                            'Menghapus data tahapan awal untuk menghemat ruang pencatatan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan audit kesesuaian pasca-implementasi {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Audit)',
                        'explanation_correct' => 'Audit kesesuaian kriteria memastikan tidak ada penyimpangan prosedur yang terlewatkan.',
                        'explanation_distractors' => 'Menutup tanpa cek ulang atau berasumsi tanpa bukti empiris berisiko meloloskan kesalahan.',
                    ],
                    [
                        'stem' => 'Cara paling aman dan terstandar dalam mengelola variabel uji pada penerapan {$coreNoun} adalah...',
                        'correct' => 'Menjaga variabel kontrol tetap konstan dan hanya mengubah satu variabel bebas secara sistematis.',
                        'distractors' => [
                            'Mengubah seluruh variabel secara bersamaan tanpa pencatatan.',
                            'Membiarkan variabel berubah acak mengikuti kondisi sekitar.',
                            'Menghilangkan variabel pembanding.',
                        ],
                        'indicator' => 'Peserta didik mampu mengontrol variabel eksperimental pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Isolasi variabel bebas membuktikan relasi kausalitas murni terhadap variabel terikat.',
                        'explanation_distractors' => 'Mengubah banyak variabel sekaligus mengacaukan kesimpulan pengujian.',
                    ],
                    [
                        'stem' => 'Jika kamu menemukan dua sumber rujukan yang memberikan data berbeda terkait {$coreNoun}, langkah tindakan yang benar adalah...',
                        'correct' => 'Melakukan uji silang metodologi kedua sumber, memeriksa reputasi ilmiahnya, dan mengacu pada standar resmi terakreditasi.',
                        'distractors' => [
                            'Memilih rujukan yang teksnya paling pendek.',
                            'Mengabaikan kedua rujukan dan mengarang angka sendiri.',
                            'Memilih rujukan yang paling pertama ditemukan di media sosial.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan triangulasi sumber rujukan pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Triangulasi)',
                        'explanation_correct' => 'Triangulasi data dan evaluasi kredibilitas metodologis menghasilkan simpulan yang valid.',
                        'explanation_distractors' => 'Pilihan lainnya mengorbankan kualitas demi kemudahan semu.',
                    ],
                    [
                        'stem' => 'Langkah tepat untuk mengomunikasikan hasil penerapan materi {$coreNoun} kepada audiens publik adalah...',
                        'correct' => 'Menyajikan data terstruktur, menggunakan bahasa lugas yang mudah dipahami, serta menyertakan bukti visual yang relevan.',
                        'distractors' => [
                            'Menggunakan istilah rumit tanpa penjelasan agar terlihat hebat.',
                            'Menyembunyikan metode kerja yang digunakan.',
                            'Hanya menampilkan kesimpulan tanpa data pembuktian.',
                        ],
                        'indicator' => 'Peserta didik mampu menyajikan hasil kerja secara komunikatif dan akuntabel.',
                        'sub_level' => 'C3 - MOTS (Penerapan Komunikasi)',
                        'explanation_correct' => 'Komunikasi ilmiah yang efektif menuntut kejelasan bahasa dan akuntabilitas bukti pendukung.',
                        'explanation_distractors' => 'Pilihan lainnya mengaburkan pemahaman audiens.',
                    ],
                    [
                        'stem' => 'Saat menghadapi kendala peralatan teknis yang belum lengkap dalam mempraktikkan {$coreNoun}, tindakan yang paling tepat adalah...',
                        'correct' => 'Mengkonsultasikan instrumen substitusi yang setara secara fungsi dan terkalibrasi kepada guru pembimbing.',
                        'distractors' => [
                            'Memakai alat rusak yang berbahaya demi memaksakan praktik.',
                            'Meninggalkan seluruh kegiatan praktik tanpa konfirmasi.',
                            'Mengubah target hasil kerja menjadi tidak terukur.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan substitusi instrumen terkalibrasi pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Praktik)',
                        'explanation_correct' => 'Substitusi terkalibrasi menjaga keselamatan kerja dan konsistensi hasil pengukuran.',
                        'explanation_distractors' => 'Menggunakan alat rusak membahayakan keselamatan, menyerah menghentikan belajar.',
                    ],
                    [
                        'stem' => 'Urutan penyimpanan rekaman data hasil pengamatan materi {$coreNoun} yang paling rapi adalah...',
                        'correct' => 'Memberi label tanggal, mencatat kondisi operasional, dan menyimpan pada direktori terorganisir.',
                        'distractors' => [
                            'Mencatat di sobekan kertas kecil tanpa tanggal.',
                            'Menyimpan seluruh berkas tanpa nama yang jelas.',
                            'Mengandalkan daya ingat pikiran tanpa catatan.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan manajemen data rekaman observasi {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Manajemen Data)',
                        'explanation_correct' => 'Pencatatan sistematis memudahkan verifikasi dan pelacakan historis.',
                        'explanation_distractors' => 'Pencatatan acak berisiko tinggi menghilangkan data penelitian.',
                    ],
                    [
                        'stem' => 'Tindakan yang harus kamu lakukan jika rekan kerjamu melakukan langkah yang menyimpang dari SOP pada materi {$coreNoun} adalah...',
                        'correct' => 'Mengingatkan secara santun, merujuk kembali pada buku panduan kerja, dan membantu meluruskan prosedurnya.',
                        'distractors' => [
                            'Membiarkan penyimpangan terjadi agar kelompok lain disalahkan.',
                            'Menyerang rekan kerja secara emosional di depan umum.',
                            'Ikut melakukan penyimpangan yang sama.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan kepatuhan SOP secara kolaboratif pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Prosedural)',
                        'explanation_correct' => 'Koreksi konstruktif berbasis panduan menjaga kepatuhan mutu dan keharmonisan tim.',
                        'explanation_distractors' => 'Pilihan lainnya merusak kinerja kelompok dan melanggar etika kerja.',
                    ],
                    [
                        'stem' => 'Langkah adaptasi yang tepat jika kondisi lingkungan pengujian materi {$coreNoun} mengalami perubahan suhu ekstrem adalah...',
                        'correct' => 'Mencatat perubahan suhu tersebut sebagai variabel lingkungan dan menyesuaikan faktor koreksi sesuai rumus standar.',
                        'distractors' => [
                            'Mengabaikan perubahan suhu dan menganggap kondisi tetap normal.',
                            'Memanipulasi data agar suhu terlihat tidak berubah.',
                            'Membatalkan seluruh materi pembelajaran selamanya.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan penyesuaian faktor koreksi lingkungan pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Kalibrasi)',
                        'explanation_correct' => 'Faktor koreksi lingkungan memperhitungkan ekspansi termal atau perubahan laju reaksi secara ilmiah.',
                        'explanation_distractors' => 'Mengabaikan suhu menghasilkan bias data yang tidak terkalibrasi.',
                    ],
                    [
                        'stem' => 'Bentuk penyajian laporan kemajuan tugas materi {$coreNoun} yang paling transparan kepada guru adalah...',
                        'correct' => 'Menampilkan persentase capaian per tahapan, melampirkan bukti kerja riil, dan menguraikan kendala yang dihadapi.',
                        'distractors' => [
                            'Hanya melaporkan bahwa semua sudah selesai padahal belum dimulai.',
                            'Menyembunyikan kendala teknis agar tidak mendapat teguran.',
                            'Mengumpulkan lembaran kosong.',
                        ],
                        'indicator' => 'Peserta didik mampu menyusun laporan progres berkala yang akuntabel.',
                        'sub_level' => 'C3 - MOTS (Penerapan Pelaporan)',
                        'explanation_correct' => 'Pelaporan jujur dengan bukti fisik memfasilitasi bimbingan formatif yang tepat sasaran.',
                        'explanation_distractors' => 'Laporan palsu melanggar integritas kejujuran akademik.',
                    ],
                    [
                        'stem' => 'Tindakan yang harus dilakukan saat menyelesaikan sesi praktik materi {$coreNoun} di laboratorium adalah...',
                        'correct' => 'Membersihkan area kerja, mematikan peralatan sesuai prosedur, dan mengembalikan instrumen ke tempat semula.',
                        'distractors' => [
                            'Langsung meninggalkan ruangan saat peralatan masih menyala.',
                            'Menumpuk sampah di meja kerja tanpa dirapikan.',
                            'Membawa pulang alat lab tanpa izin.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan tata tertib 5R/K3 pasca-praktik {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan K3)',
                        'explanation_correct' => 'Kerapian pasca-praktik menjamin keawetan alat dan keamanan laboratorium bagi pengguna berikutnya.',
                        'explanation_distractors' => 'Kelalaian meninggalkan alat menyala membahayakan keselamatan fasilitas sekolah.',
                    ],
                    [
                        'stem' => 'Cara mengukur efisiensi penggunaan sumber daya saat mempraktikkan materi {$coreNoun} adalah...',
                        'correct' => 'Membandingkan rasio antara jumlah bahan yang terpakai dengan jumlah luaran berkualitas yang berhasil dihasilkan.',
                        'distractors' => [
                            'Menganggap paling efisien jika menggunakan bahan paling sedikit meskipun hasilnya rusak.',
                            'Mengabaikan perhitungan bahan sama sekali.',
                            'Membuang bahan yang tersisa ke saluran air.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan pengukuran rasio efisiensi bahan pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Efisiensi)',
                        'explanation_correct' => 'Efisiensi sejati menyeimbangkan kehematan bahan dan pemenuhan standar mutu luaran.',
                        'explanation_distractors' => 'Menghemat dengan mengorbankan mutu produk menghasilkan kegagalan fungsi.',
                    ],
                    [
                        'stem' => 'Jika kamu diminta membuat ringkasan satu halaman mengenai alur kerja {$coreNoun}, komponen yang wajib dimuat adalah...',
                        'correct' => 'Bagan alir tahapan pokok, parameter masukan, mekanisme kerja, dan indikator keberhasilan luaran.',
                        'distractors' => [
                            'Hanya foto diri pembuat tugas tanpa teks penjelasan.',
                            'Puisi bebas yang tidak berhubungan dengan alur kerja.',
                            'Daftar belanja pribadi.',
                        ],
                        'indicator' => 'Peserta didik mampu merangkum alur operasional esensial pada {$coreNoun}.',
                        'sub_level' => 'C3 - MOTS (Penerapan Rangkuman)',
                        'explanation_correct' => 'Ringkasan operasional yang baik memuat siklus lengkap input-proses-output-indikator mutu.',
                        'explanation_distractors' => 'Pilihan lainnya tidak memuat informasi operasional materi.',
                    ],
                    [
                        'stem' => 'Langkah validasi akhir sebelum menyerahkan proyek akhir materi {$coreNoun} kepada tim penilai adalah...',
                        'correct' => 'Memeriksa lembar kerja berdasarkan rubrik kriteria penilaian resmi untuk memastikan seluruh poin telah terpenuhi.',
                        'distractors' => [
                            'Langsung menyerahkan tanpa membaca ulang naskah tugas.',
                            'Berharap penilai tidak teliti memeriksa hasil kerja.',
                            'Menyerahkan berkas setengah jadi.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan verifikasi mandiri berbasis rubrik penilaian.',
                        'sub_level' => 'C3 - MOTS (Penerapan Evaluasi Diri)',
                        'explanation_correct' => 'Self-assessment berbasis rubrik mengidentifikasi kekurangan sebelum penilaian akhir dilakukan guru.',
                        'explanation_distractors' => 'Menyerahkan tanpa periksa akhir sering menyisakan kekeliruan sepele yang merugikan nilai.',
                    ],
            ],
            'hots' => [
                    [
                        'stem' => 'Faktor utama yang paling berpotensi menyebabkan ketidaktercapaian sasaran pada implementasi {$coreNoun} adalah...',
                        'correct' => 'Kelemahan validasi data awal dan ketidakteraturan dalam mengeksekusi tahapan prosedur.',
                        'distractors' => [
                            'Penerapan standar operasional yang terlalu ketat dan terdokumentasi.',
                            'Penggunaan instrumen pengukuran yang telah terkalibrasi secara resmi.',
                            'Pelibatan proses pengujian berkala pada setiap tahapan kerja.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis akar penyebab anomali kegagalan pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Data yang tidak tervalidasi dan eksekusi non-prosedural adalah akar utama deviasi sistemik.',
                        'explanation_distractors' => 'Pilihan lainnya justru merupakan praktik rekayasa terbaik untuk mencegah kegagalan.',
                    ],
                    [
                        'stem' => 'Jika terjadi anomali atau penyimpangan luaran pada materi {$coreNoun}, langkah analisis kritis terbaik adalah...',
                        'correct' => 'Mengisolasi tahapan yang bermasalah, membandingkan parameter riil dengan standar acuan, lalu merumuskan solusi korektif.',
                        'distractors' => [
                            'Mengganti seluruh sistem tanpa mengetahui bagian mana yang mengalami kegagalan.',
                            'Menyembunyikan penyimpangan agar proses kerja dianggap berjalan lancar.',
                            'Menghentikan seluruh aktivitas secara permanen tanpa melakukan penyelidikan teknis.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis akar masalah dan merumuskan perbaikan pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Isolasi titik anomali dan perbandingan terhadap standar acuan menghasilkan solusi korektif terukur.',
                        'explanation_distractors' => 'Merombak buta tanpa analisis atau menyembunyikan galat memperparah kerusakan sistem.',
                    ],
                    [
                        'stem' => 'Di antara dua metode pemecahan masalah pada materi {$coreNoun}, kriteria evaluasi yang paling tepat untuk menentukan metode terbaik adalah...',
                        'correct' => 'Tingkat akurasi hasil, keandalan proses, efisiensi sumber daya, dan minimnya risiko kesalahan.',
                        'distractors' => [
                            'Metode yang paling banyak menggunakan istilah rumit meskipun sulit diterapkan.',
                            'Metode yang mengabaikan keselamatan kerja demi percepatan waktu.',
                            'Metode yang paling jarang diuji karena dianggap otomatis sempurna.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi metode optimal pemecahan masalah pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Evaluasi optimalitas menuntut keseimbangan antara presisi luaran, efisiensi, dan keandalan sistem.',
                        'explanation_distractors' => 'Kerumitan semu atau pengabaian keselamatan bukanlah kriteria rekayasa yang baik.',
                    ],
                    [
                        'stem' => 'Bagaimanakah cara membuktikan secara ilmiah bahwa inovasi perbaikan pada materi {$coreNoun} memberikan dampak positif?',
                        'correct' => 'Membandingkan data performa sebelum dan sesudah perbaikan menggunakan indikator terukur dan objektif.',
                        'distractors' => [
                            'Mendasarkan penilaian semata-mata pada perkiraan tanpa data perbandingan yang jelas.',
                            'Mengabaikan indikator performa dan langsung mengklaim keberhasilan secara sepihak.',
                            'Memilih hanya data yang mendukung keberhasilan dan membuang data yang menunjukkan kekurangan.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi data komparasi efektivitas inovasi {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Uji empiris sebelum-sesudah (pre-post evaluation) memberikan bukti kausalitas yang sahih secara ilmiah.',
                        'explanation_distractors' => 'Klaim subjektif atau pemilahan data sepihak (cherry-picking) melanggar kaidah keilmuan.',
                    ],
                    [
                        'stem' => 'Karakteristik pemikiran tingkat tinggi (HOTS) yang paling tercermin saat menyelesaikan masalah kompleks terkait {$coreNoun} adalah...',
                        'correct' => 'Mampu menghubungkan berbagai konsep terkait, menguji keabsahan argumen, dan menyusun solusi orisinal yang logis.',
                        'distractors' => [
                            'Menghafal rumus atau teks definisi secara persis kata demi kata tanpa memahami maknanya.',
                            'Menerima setiap informasi tanpa melakukan konfirmasi atau pengecekan silang.',
                            'Mengandalkan tebakan spekulatif dalam mengambil keputusan penting.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis sintesis konsep kompleks pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Sintesis konseptual dan evaluasi kritis adalah ciri pemikiran tingkat tinggi dalam memecahkan masalah baru.',
                        'explanation_distractors' => 'Hafalan mekanis dan tebakan spekulatif berada pada tingkat kognitif rendah.',
                    ],
                    [
                        'stem' => 'Strategi terbaik untuk memitigasi risiko kegagalan berulang pada implementasi {$coreNoun} di masa depan adalah...',
                        'correct' => 'Menyusun dokumentasi evaluasi kesalahan terdahulu dan menetapkan titik kontrol mutu pada setiap tahapan kritis.',
                        'distractors' => [
                            'Menghindari penerapan materi secara menyeluruh agar tidak menghadapi risiko.',
                            'Menyalahkan faktor lingkungan eksternal tanpa meninjau prosedur internal.',
                            'Melanjutkan prosedur lama tanpa melakukan revisi pada titik kelemahan.',
                        ],
                        'indicator' => 'Peserta didik mampu merumuskan strategi penjaminan mutu preventif pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Penalaran Kritis)',
                        'explanation_correct' => 'Dokumentasi retrospektif dan penempatan quality gates pada titik rawan mencegah terulangnya anomali.',
                        'explanation_distractors' => 'Menghindari implementasi atau melempar kesalahan tidak menghasilkan perbaikan berkelanjutan.',
                    ],
                    [
                        'stem' => 'Analisis mendalam mengenai hubungan timbal balik antarelemen pada materi {$coreNoun} menunjukkan bahwa...',
                        'correct' => 'Gangguan pada satu subsistem akan merambat memengaruhi kinerja subsistem lain secara proporsional.',
                        'distractors' => [
                            'Setiap bagian berdiri sendiri secara terisolasi tanpa interaksi.',
                            'Sistem dapat bekerja normal meskipun komponen utamanya dihilangkan.',
                            'Hubungan antarbagian selalu bersifat acak tanpa keteraturan.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis dinamika sistemik pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Sistemik)',
                        'explanation_correct' => 'Teori sistem menegaskan keterpaduan dinamis di mana kondisi satu simpul memengaruhi keseimbangan jaringan utuh.',
                        'explanation_distractors' => 'Pilihan lainnya mengabaikan sifat holistik dari keterpaduan sistem keilmuan.',
                    ],
                    [
                        'stem' => 'Ketika dua teori yang berbeda menjelaskan fenomena yang sama pada materi {$coreNoun}, pendekatan ilmiah yang paling bijak adalah...',
                        'correct' => 'Merancang eksperimen kritis terkontrol untuk menguji batas validitas masing-masing teori berdasarkan bukti empiris baru.',
                        'distractors' => [
                            'Memilih teori yang diusulkan oleh ilmuwan yang lebih terkenal tanpa pengujian.',
                            'Menolak kedua teori tersebut secara emosional.',
                            'Melarang pembahasan fenomena tersebut di ruang kelas.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang pengujian eksperimental kritis komparasi teori.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Teoretis)',
                        'explanation_correct' => 'Uji eksperimen kritis (crucial experiment) membedakan teori mana yang lebih akurat memprediksi realitas alam.',
                        'explanation_distractors' => 'Mengacu pada popularitas ilmuwan adalah bias otoritas yang bertentangan dengan sains.',
                    ],
                    [
                        'stem' => 'Evaluasi trade-off (tarik-ulur) antara kecepatan pelaksanaan dan tingkat presisi hasil pada konsep {$coreNoun} adalah...',
                        'correct' => 'Peningkatan kecepatan yang mengabaikan kalibrasi berisiko melipatgandakan margin of error melebihi batas toleransi aman.',
                        'distractors' => [
                            'Semakin cepat proses kerja selalu otomatis semakin presisi tanpa kompromi.',
                            'Presisi tidak memiliki nilai penting dalam penerapan praktis.',
                            'Kecepatan dan presisi tidak memiliki kaitan sistemik.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi trade-off kecepatan versus presisi pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Optimasi)',
                        'explanation_correct' => 'Optimasi rekayasa menuntut titik temu optimal (optimal operating point) yang memenuhi toleransi presisi minimal.',
                        'explanation_distractors' => 'Klaim kecepatan instan tanpa kehilangan presisi adalah ilusi teknis.',
                    ],
                    [
                        'stem' => 'Analisis akar masalah saat sebuah model prediksi materi {$coreNoun} berhasil sempurna di laboratorium namun gagal total di lapangan adalah...',
                        'correct' => 'Model laboratorium mengabaikan variabel pengganggu kompleks di dunia nyata yang tidak dimasukkan dalam simulasi awal.',
                        'distractors' => [
                            'Dunia nyata salah dan laboratorium selalu mutlak benar.',
                            'Hukum fisika berubah saat keluar dari pintu laboratorium.',
                            'Masyarakat sengaja menggagalkan model tersebut.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis disparitas kondisi laboratorium vs lapangan pada {$coreNoun}.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Validitas Eksternal)',
                        'explanation_correct' => 'Validitas eksternal model menuntut pengujian terhadap noise lingkungan dunia nyata yang heterogen.',
                        'explanation_distractors' => 'Pilihan lainnya mengabaikan kelemahan asumsi idealistis simulasi laboratorium.',
                    ],
                    [
                        'stem' => 'Langkah dekonstruksi kritis terhadap sebuah klaim sensasional yang mengaku menemukan hukum baru pada materi {$coreNoun} adalah...',
                        'correct' => 'Memeriksa replikasi independen oleh peneliti lain, kepatuhan metodologi peer-review, dan keterbukaan dataset primer.',
                        'distractors' => [
                            'Langsung mempercayai sepenuhnya jika video penjelasannya ditonton jutaan orang.',
                            'Menyebarkannya ke seluruh grup media sosial sebelum diverifikasi.',
                            'Membeli produk komersial yang dipromosikan klaim tersebut.',
                        ],
                        'indicator' => 'Peserta didik mampu menerapkan literasi skeptisisme ilmiah peer-review.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Kritis)',
                        'explanation_correct' => 'Prinsip \'extraordinary claims require extraordinary evidence\' mewajibkan replikasi independen dan peer-review ketat.',
                        'explanation_distractors' => 'Popularitas tayangan video bukanlah indikator validitas ilmiah.',
                    ],
                    [
                        'stem' => 'Ketika merancang protokol keselamatan kerja baru untuk praktik materi {$coreNoun}, prinsip \'Fail-Safe\' (Aman Saat Gagal) diwujudkan melalui...',
                        'correct' => 'Merancang mekanisme otomatis yang langsung mengunci sistem ke kondisi pasif aman seketika terjadi malfungsi teknis.',
                        'distractors' => [
                            'Membiarkan sistem terus berjalan cepat saat alarm peringatan berbunyi.',
                            'Mematikan sensor keselamatan agar pekerjaan tidak terganggu.',
                            'Menyembunyikan laporan insiden kegagalan dari tim pengawas.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang mekanisme pertahanan Fail-Safe pada sistem.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Sistem Aman)',
                        'explanation_correct' => 'Desain fail-safe memprioritaskan keselamatan jiwa dan perlindungan aset saat terjadi kegagalan komponen tak terduga.',
                        'explanation_distractors' => 'Mematikan sensor atau memaksa jalan saat malfungsi memicu bencana kegagalan katastropik.',
                    ],
                    [
                        'stem' => 'Evaluasi mengapa generalisasi kesimpulan yang ditarik dari data yang memiliki bias seleksi (selection bias) berakibat fatal adalah...',
                        'correct' => 'Karena sampel yang tidak representatif menghasilkan kesimpulan yang membelokkan realitas populasi sebenarnya.',
                        'distractors' => [
                            'Karena bias seleksi otomatis membuat komputer pengolah data terbakar.',
                            'Karena sampel data dilarang oleh aturan perundang-undangan.',
                            'Karena hasil penelitian menjadi terlalu akurat.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis dampak fatal bias seleksi pada riset.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Metodologi)',
                        'explanation_correct' => 'Bias seleksi merusak validitas inferensi statistik sehingga kebijakan yang diambil berpotensi merugikan publik.',
                        'explanation_distractors' => 'Pilihan lainnya mengarang kerusakan perangkat fisik atau akurasi berlebihan fiktif.',
                    ],
                    [
                        'stem' => 'Dalam perancangan solusi berkelanjutan (sustainable) untuk persoalan {$coreNoun}, pertimbangan siklus hidup (Life Cycle Assessment) menuntut...',
                        'correct' => 'Evaluasi dampak menyeluruh mulai dari ekstraksi bahan awal, proses operasional, hingga pengelolaan limbah pasca-pakai.',
                        'distractors' => [
                            'Hanya memikirkan keuntungan sesaat saat produk baru diluncurkan.',
                            'Membuang seluruh residu tanpa melalui proses pengolahan aman.',
                            'Menutup mata terhadap biaya pemeliharaan jangka panjang.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi keberlanjutan berbasis Life Cycle Assessment.',
                        'sub_level' => '{$subLevel} - HOTS (Evaluasi Keberlanjutan)',
                        'explanation_correct' => 'Prinsip cradle-to-grave memastikan rekayasa teknologi bertanggung jawab terhadap jejak lingkungan jangka panjang.',
                        'explanation_distractors' => 'Fokus sesaat mengorbankan kelestarian ekologis dan keberlanjutan ekonomi.',
                    ],
                    [
                        'stem' => 'Analisis mengapa hipotesis ilmiah yang baik pada materi {$coreNoun} harus memenuhi kriteria \'Falsifiable\' (Dapat Diuji untuk Dibuktikan Salah) adalah...',
                        'correct' => 'Jika sebuah pernyataan tidak dapat diuji atau dibuktikan salah melalui pengamatan empiris, maka pernyataan itu berada di luar ranah sains.',
                        'distractors' => [
                            'Agar peneliti dapat dengan mudah memanipulasi hasil penelitiannya.',
                            'Supaya teori tersebut tidak pernah diuji oleh ilmuwan lain.',
                            'Karena ilmu pengetahuan tidak menyukai kebenaran.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi prinsip falsifiabilitas Karl Popper pada sains.',
                        'sub_level' => '{$subLevel} - HOTS (Filsafat Sains)',
                        'explanation_correct' => 'Falsifiabilitas Popperian memisahkan sains empiris dari dogma spekulatif yang kebal pengujian.',
                        'explanation_distractors' => 'Pilihan lainnya bertentangan dengan esensi kemajuan metodologi ilmiah.',
                    ],
                    [
                        'stem' => 'Strategi adaptasi yang paling tangguh saat menghadapi ketidakpastian parameter lingkungan pada implementasi {$coreNoun} adalah...',
                        'correct' => 'Menerapkan pendekatan modular yang fleksibel dengan ambang toleransi dinamis dan sistem umpan balik cepat.',
                        'distractors' => [
                            'Menerapkan arsitektur monolitik kaku yang menolak segala bentuk perubahan.',
                            'Menyerah dan menghentikan seluruh operasional sistem.',
                            'Mengabaikan fluktuasi lingkungan dan berharap kondisi stabil sendiri.',
                        ],
                        'indicator' => 'Peserta didik mampu merancang strategi ketahanan adaptif (resilience) pada sistem kompleks.',
                        'sub_level' => '{$subLevel} - HOTS (Perancangan Ketahanan Sistem)',
                        'explanation_correct' => 'Resiliensi sistem dicapai melalui fleksibilitas modular dan loop umpan balik (feedback loop) koreksi dini.',
                        'explanation_distractors' => 'Struktur kaku rapuh terhadap guncangan eksternal dan berisiko runtuh mendadak.',
                    ],
                    [
                        'stem' => 'Evaluasi etika penerapan kecerdasan buatan dan automasi pada domain {$coreNoun} menuntut prinsip akuntabilitas berupa...',
                        'correct' => 'Harus selalu ada manusia penanggung jawab (human-in-the-loop) yang dapat menjelaskan alasan keputusan dan menanggung konsekuensi hukum.',
                        'distractors' => [
                            'Seluruh keputusan didelegasikan mutlak ke mesin tanpa pengawasan manusia sama sekali.',
                            'Menyembunyikan kode algoritma agar tidak ada yang bisa menuntut jika terjadi korban.',
                            'Melarang penggunaan teknologi canggih secara total.',
                        ],
                        'indicator' => 'Peserta didik mampu mengevaluasi etika AI governance dan human-in-the-loop.',
                        'sub_level' => '{$subLevel} - HOTS (Etika Teknologi Modern)',
                        'explanation_correct' => 'Tata kelola teknologi modern mewajibkan pengawasan manusia demi menjamin keadilan dan perlindungan hak asasi.',
                        'explanation_distractors' => 'Pelepasan tanggung jawab atau pengaburan algoritma melanggar etika kemanusiaan.',
                    ],
                    [
                        'stem' => 'Analisis dampak jangka panjang dari kegagalan merawat dokumentasi arsitektur sistem pada proyek materi {$coreNoun} adalah...',
                        'correct' => 'Terciptanya technical debt (utang teknis) yang membuat biaya perbaikan melonjak tinggi dan sistem rentan lumpuh saat tim berganti.',
                        'distractors' => [
                            'Komputer akan otomatis menghapus seluruh sistem operasi Windows.',
                            'Peralatan laboratorium akan otomatis bertambah banyak sendiri.',
                            'Proyek tersebut otomatis dianggap sebagai karya terbaik sepanjang masa.',
                        ],
                        'indicator' => 'Peserta didik mampu menganalisis risiko technical debt akibat ketiadaan dokumentasi.',
                        'sub_level' => '{$subLevel} - HOTS (Analisis Manajemen Sistem)',
                        'explanation_correct' => 'Technical debt yang menumpuk melumpuhkan evolusi sistem karena tidak ada insinyur yang memahami arsitektur internalnya.',
                        'explanation_distractors' => 'Pilihan lainnya adalah asumsi mustahil yang tidak berhubungan dengan rekayasa sistem.',
                    ],
            ],
        ];

        return $levels[$level] ?? $levels['lots'];
    }

    protected function buildProceduralUniqueMcAngle(array $analysis, string $effectiveLevel, int $number, array &$usedStems): array
    {
        $concept = $analysis['concept'] ?? 'materi pembelajaran';
        $coreNoun = $analysis['core_noun'] ?? $concept;

        $aspects = [
            "karakteristik dasar dan definisi penting dari {$coreNoun}",
            "fungsi utama komponen pendukung dalam {$coreNoun}",
            "tahapan kerja terstruktur saat pengolahan {$coreNoun}",
            "standar keselamatan dan etika penggunaan {$coreNoun}",
            "kelebihan dan keterbatasan teknis {$coreNoun}",
            "analisis kendala umum saat pengoperasian {$coreNoun}",
            "strategi pemecahan masalah (troubleshooting) pada {$coreNoun}",
            "evaluasi efisiensi dan perbandingan metode pada {$coreNoun}",
            "penerapan standar teknis terbaik dalam {$coreNoun}",
            "prosedur verifikasi dan validasi hasil pengolahan {$coreNoun}",
        ];

        foreach ($aspects as $i => $aspect) {
            $stem = "Aspek teknis penting yang berkaitan langsung dengan {$aspect} adalah...";
            $sig = $this->generateStemSignature($stem);
            if (!isset($usedStems[$sig])) {
                $usedStems[$sig] = true;
                return [
                    'stem' => $stem,
                    'correct' => "Menerapkan prinsip kerja dan spesifikasi teknis {$coreNoun} sesuai prosedur standar",
                    'distractors' => [
                        "Mengabaikan pedoman teknis dan keselamatan kerja",
                        "Menghindari penggunaan komponen standar yang telah ditentukan",
                        "Memilih metode acak tanpa memperhatikan alur pemrosesan data",
                    ],
                    'indicator' => "Siswa dapat menganalisis {$aspect}",
                    'sub_level' => ($effectiveLevel === 'hots') ? 'C4' : (($effectiveLevel === 'mots') ? 'C3' : 'C2'),
                    'explanation_correct' => "Penerapan prinsip kerja dan spesifikasi teknis menjamin keandalan {$coreNoun}.",
                    'explanation_distractors' => "Opsi pengecoh bertentangan dengan prosedur teknis dan standar mutu operasional.",
                ];
            }
        }

        $stem = "Prinsip utama ke-{$number} dalam penguasaan teknis materi {$coreNoun} adalah...";
        $sig = $this->generateStemSignature($stem);
        $usedStems[$sig] = true;
        return [
            'stem' => $stem,
            'correct' => "Menjalankan tahapan operasional {$coreNoun} secara terstruktur dan tepat sasaran",
            'distractors' => [
                "Melakukan tahapan secara acak tanpa rencana kerja",
                "Mengabaikan standar mutu hasil keluaran proses",
                "Menonaktifkan pengawasan sistem saat pengoperasian",
            ],
            'indicator' => "Siswa memahami prinsip kerja materi {$coreNoun}",
            'sub_level' => 'C2',
            'explanation_correct' => "Tahapan terstruktur adalah fondasi operasional yang handal.",
            'explanation_distractors' => "Opsi pengecoh mengabaikan disiplin kerja dan standar teknis.",
        ];
    }

    protected function buildSingleMcQuestion(
        LmsLearningObjective $tp,
        string $subjectName,
        string $className,
        int $number,
        string $cognitiveLevel = 'all',
        int $totalQuestions = 10,
        int $variant = 0,
        ?array $levelInfo = null,
        array &$usedStems = []
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);
        $analysis = $this->analyzeTp($tp, $subjectName);
        $concept = $analysis['concept'];
        $coreNoun = $analysis['core_noun'] ?? $concept;
        $isSmp = ($levelInfo['pedagogical_tone'] ?? 'smp') === 'smp';

        // Determine effective cognitive level for this question based on teacher selection
        $effectiveLevel = $cognitiveLevel;
        if ($effectiveLevel === 'all') {
            $ratio = $number / max(1, $totalQuestions);
            if ($ratio <= 0.35) {
                $effectiveLevel = 'lots';
            } elseif ($ratio <= 0.75) {
                $effectiveLevel = 'mots';
            } else {
                $effectiveLevel = 'hots';
            }
        }

        if ($effectiveLevel === 'lots') {
            $subLevel = (($number + $variant) % 2 === 1) ? 'C1' : 'C2';
            $levelCode = $subLevel;
        } elseif ($effectiveLevel === 'mots') {
            $subLevel = 'C3';
            $levelCode = 'C3';
        } else {
            $subLevel = (($number + $variant) % 2 === 1) ? 'C4' : 'C5';
            $levelCode = $subLevel;
        }

        $domain = $this->detectTpDomain($analysis, $subjectName);

        // Tier 1: Domain-specific questions at the target cognitive level (18 items)
        $primaryPool = $this->getDomainMcAngles($domain, $effectiveLevel, $isSmp, $coreNoun, $subjectName, $subLevel);

        // Tier 2: Domain-specific questions at other cognitive levels (36 items)
        $secondaryPool = [];
        foreach (['lots', 'mots', 'hots'] as $otherLvl) {
            if ($otherLvl !== $effectiveLevel) {
                $secondaryPool = array_merge($secondaryPool, $this->getDomainMcAngles($domain, $otherLvl, $isSmp, $coreNoun, $subjectName, $subLevel));
            }
        }

        // Tier 3: Generic domain angles (54 items)
        $tertiaryPool = [];
        foreach (['lots', 'mots', 'hots'] as $genLvl) {
            $tertiaryPool = array_merge($tertiaryPool, $this->getGenericMcAngles($genLvl));
        }

        $selectedAngle = null;

        // Try Tier 1:
        $count1 = count($primaryPool);
        for ($i = 0; $i < $count1; $i++) {
            $idx = ($variant + $i) % $count1;
            $candidate = $primaryPool[$idx];
            $candidate = $this->interpolateAnglePlaceholders($candidate, $coreNoun, $subLevel, $subjectName);
            $sig = $this->generateStemSignature($candidate['stem']);
            if ($sig !== '' && !isset($usedStems[$sig])) {
                $selectedAngle = $candidate;
                $usedStems[$sig] = true;
                break;
            }
        }

        // Try Tier 2 if Tier 1 exhausted:
        if ($selectedAngle === null && !empty($secondaryPool)) {
            $count2 = count($secondaryPool);
            for ($i = 0; $i < $count2; $i++) {
                $idx = ($variant + $i) % $count2;
                $candidate = $secondaryPool[$idx];
                $candidate = $this->interpolateAnglePlaceholders($candidate, $coreNoun, $subLevel, $subjectName);
                $sig = $this->generateStemSignature($candidate['stem']);
                if ($sig !== '' && !isset($usedStems[$sig])) {
                    $selectedAngle = $candidate;
                    $usedStems[$sig] = true;
                    break;
                }
            }
        }

        // Try Tier 3 if Tier 2 exhausted:
        if ($selectedAngle === null && !empty($tertiaryPool)) {
            $count3 = count($tertiaryPool);
            for ($i = 0; $i < $count3; $i++) {
                $idx = ($variant + $i) % $count3;
                $candidate = $tertiaryPool[$idx];
                $candidate = $this->interpolateAnglePlaceholders($candidate, $coreNoun, $subLevel, $subjectName);
                $sig = $this->generateStemSignature($candidate['stem']);
                if ($sig !== '' && !isset($usedStems[$sig])) {
                    $selectedAngle = $candidate;
                    $usedStems[$sig] = true;
                    break;
                }
            }
        }

        // Tier 4: Procedural generation as ultimate guarantee (never duplicate)
        if ($selectedAngle === null) {
            $selectedAngle = $this->buildProceduralUniqueMcAngle($analysis, $effectiveLevel, $number, $usedStems);
        }

        $angle = $selectedAngle;

        $correctLetter = ['A', 'B', 'C', 'D'][($number + $variant + 1) % 4];
        $distractorIdx = 0;
        $options = [];
        foreach (['A', 'B', 'C', 'D'] as $letter) {
            if ($letter === $correctLetter) {
                $options[$letter] = $angle['correct'];
            } else {
                $options[$letter] = $angle['distractors'][$distractorIdx++];
            }
        }

        $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: {$angle['sub_level']})\n\n"
            . "Pembahasan Rinci:\n"
            . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
            . "   {$angle['explanation_correct']}\n\n"
            . "2. Analisis Opsi Pengecoh:\n"
            . "   {$angle['explanation_distractors']}";

        return [
            'number' => $number,
            'type' => 'multiple_choice',
            'question' => $angle['stem'],
            'options' => $options,
            'answer' => $correctLetter,
            'explanation' => $explanation,
            'indicator' => $angle['indicator'],
            'cognitive_level' => $levelCode,
            'score' => 2,
        ];
    }

    protected function buildSingleEssayQuestion(
        LmsLearningObjective $tp,
        string $subjectName,
        string $className,
        int $number,
        string $cognitiveLevel = 'all',
        int $totalQuestions = 10,
        int $variant = 0,
        ?array $levelInfo = null
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);
        $analysis = $this->analyzeTp($tp, $subjectName);
        $concept = $analysis['concept'];
        $coreNoun = $analysis['core_noun'] ?? $concept;
        $gradeLabel = $levelInfo['grade_label'] ?? 'Kelas 8 SMP';
        $isSmp = ($levelInfo['pedagogical_tone'] ?? 'smp') === 'smp';

        // Determine effective cognitive level
        $effectiveLevel = $cognitiveLevel;
        if ($effectiveLevel === 'all') {
            $ratio = $number / max(1, $totalQuestions);
            if ($ratio <= 0.4) {
                $effectiveLevel = 'lots';
            } elseif ($ratio <= 0.75) {
                $effectiveLevel = 'mots';
            } else {
                $effectiveLevel = 'hots';
            }
        }

        $angleIndex = $variant % 5;

        if ($effectiveLevel === 'lots') {
            // LOTS (C1/C2 - Pemahaman Konseptual Dasar)
            $levelCode = 'C2';
            $isProcess = (bool) preg_match('/^(cara kerja|interaksi|proses|siklus|tahapan|alur|langkah)/iu', $concept);

            if ($isSmp) {
                $stemAngle0Smp = $isProcess
                    ? (preg_match('/^(?:cara kerja|alur kerja|proses|interaksi)/iu', $concept)
                        ? "Jelaskan bagaimana {$concept} dengan bahasamu sendiri!"
                        : "Jelaskan bagaimana alur kerja {$concept} dengan bahasamu sendiri!")
                    : "Jelaskan pengertian {$concept} dengan bahasamu sendiri!";

                $angles = [
                    // Angle 0: Definisi Konsep / Alur Dasar SMP
                    [
                        'stem' => $stemAngle0Smp,
                        'indicator' => "Peserta didik mampu menjelaskan pengertian atau alur dasar materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menjelaskan definisi atau alur kerja materi {$concept} secara jelas menggunakan bahasa sendiri yang mudah dipahami.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Penjelasan konsep sangat tepat, runtut, dan menggunakan bahasa sendiri yang komunikatif.\n"
                            . "• Skor 6 - 8 (Baik): Penjelasan cukup tepat namun masih ada bagian yang kurang lengkap.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan masih sangat singkat atau belum terstruktur.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Hanya menuliskan kata kunci yang kurang sesuai.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Manfaat Pembelajaran SMP
                    [
                        'stem' => "Apa manfaat yang kamu peroleh setelah mempelajari materi {$coreNoun} dalam kehidupan sehari-hari?",
                        'indicator' => "Peserta didik mampu menyebutkan manfaat materi {$coreNoun} dalam kehidupan sehari-hari.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menuliskan manfaat konkret materi {$coreNoun} dalam mempermudah kegiatan belajar atau aktivitas harian siswa.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Manfaat dijelaskan secara jelas, relevan, dan kontekstual dengan kehidupan siswa.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menyebutkan manfaat namun penjelasannya masih bersifat umum.\n"
                            . "• Skor 3 - 5 (Cukup): Manfaat yang dituliskan kurang relevan dengan materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian jawaban tidak menunjukkan pemahaman manfaat materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Bagian / Komponen Pokok SMP
                    [
                        'stem' => "Sebutkan 3 (tiga) bagian atau tahapan penting yang ada pada {$coreNoun}!",
                        'indicator' => "Peserta didik mampu menyebutkan bagian atau tahapan penting materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyebutkan minimal 3 bagian, komponen, atau tahapan utama dari {$coreNoun} secara tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menyebutkan 3 bagian/tahapan penting dengan sangat tepat dan lengkap.\n"
                            . "• Skor 6 - 8 (Baik): Menyebutkan 2 bagian penting dengan tepat.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan 1 bagian penting dengan tepat.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Bagian yang disebutkan tidak tepat atau keliru.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Contoh Nyata Sehari-hari SMP
                    [
                        'stem' => "Tuliskan 2 (dua) contoh penerapan {$coreNoun} yang pernah kamu temui di sekolah atau di rumah!",
                        'indicator' => "Peserta didik mampu memberikan contoh konkret materi {$coreNoun} dalam konteks harian.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menuliskan 2 contoh penerapan nyata materi {$coreNoun} yang dekat dengan keseharian siswa.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Memberikan 2 contoh konkret yang sangat tepat dan relevan.\n"
                            . "• Skor 6 - 8 (Baik): Memberikan 1 contoh yang tepat atau 2 contoh yang masih bersifat umum.\n"
                            . "• Skor 3 - 5 (Cukup): Contoh yang diberikan kurang sesuai dengan konteks materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Contoh yang dituliskan keliru atau tidak relevan.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Ciri Utama Pembeda SMP
                    [
                        'stem' => "Sebutkan ciri-ciri utama yang membedakan {$coreNoun} dengan materi lainnya!",
                        'indicator' => "Peserta didik mampu menyebutkan ciri pembeda utama materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan ciri khas pembeda utama materi {$coreNoun} secara tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Ciri pembeda dijelaskan dengan tepat, jelas, dan akurat.\n"
                            . "• Skor 6 - 8 (Baik): Ciri pembeda dijelaskan dengan cukup baik namun masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan ciri pembeda kurang tepat.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian jawaban keliru dan tidak mencerminkan konsep.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            } else {
                $stemAngle0Sma = $isProcess
                    ? (preg_match('/^(?:cara kerja|alur kerja|proses|interaksi|mekanisme)/iu', $concept)
                        ? "Jelaskan bagaimana {$concept} menggunakan bahasa Anda sendiri!"
                        : "Jelaskan mekanisme alur kerja {$concept} menggunakan bahasa Anda sendiri!")
                    : "Jelaskan pengertian pokok {$concept} menggunakan bahasa Anda sendiri!";

                $angles = [
                    // Angle 0: Definisi Konsep / Alur Dasar Umum/SMA
                    [
                        'stem' => $stemAngle0Sma,
                        'indicator' => "Peserta didik mampu mendeskripsikan konsep dasar {$concept} secara komprehensif.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menuliskan definisi atau mekanisme pokok mengenai materi {$concept} secara runtut, tepat, dan jelas menggunakan bahasa sendiri.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Penjelasan konsep sangat mendalam, runtut, dan menggunakan bahasa sendiri yang terstruktur.\n"
                            . "• Skor 6 - 8 (Baik): Penjelasan konsep cukup tepat namun masih ada bagian yang kurang lengkap.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan masih terbatas atau belum terstruktur dengan baik.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian jawaban tidak mencerminkan konsep yang benar.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Fungsi & Peranan Pokok
                    [
                        'stem' => "Apa peranan dan fungsi pokok dari materi {$coreNoun} dalam pembelajaran {$subjectName}?",
                        'indicator' => "Peserta didik mampu menguraikan fungsi pokok materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan peranan dan fungsi utama materi {$coreNoun} dalam disiplin ilmu {$subjectName} secara tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Peranan dan fungsi materi dijelaskan secara tajam, runtut, dan tepat sasaran.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan fungsi materi secara tepat, tetapi penjelasan peranan masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan fungsi masih sangat terbatas.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menyentuh fungsi esensial materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Komponen Mendasar
                    [
                        'stem' => "Sebutkan komponen-komponen mendasar yang membangun sistem materi {$coreNoun}!",
                        'indicator' => "Peserta didik mampu menyebutkan komponen mendasar materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyebutkan komponen-komponen pokok dari materi {$coreNoun} secara lengkap dan tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Komponen mendasar disebutkan secara lengkap, tepat, dan sistematis.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menyebutkan sebagian besar komponen pokok dengan benar.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan sebagian kecil komponen yang relevan.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Komponen yang disebutkan keliru.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Contoh Konkret Implementasi
                    [
                        'stem' => "Tuliskan 2 (dua) contoh konkret implementasi prinsip {$coreNoun} dalam kehidupan nyata!",
                        'indicator' => "Peserta didik mampu memberikan contoh konkret terkait materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyajikan minimal 2 contoh implementasi nyata yang relevan dengan prinsip {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Memberikan 2 contoh implementasi yang sangat relevan dan kontekstual.\n"
                            . "• Skor 6 - 8 (Baik): Memberikan 2 contoh namun penjelasannya singkat, atau 1 contoh dengan penjelasan baik.\n"
                            . "• Skor 3 - 5 (Cukup): Contoh yang diberikan kurang kontekstual dengan materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Contoh tidak relevan dengan konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Karakteristik Pembeda
                    [
                        'stem' => "Uraikan karakteristik khusus yang membedakan materi {$coreNoun} dari konsep lainnya!",
                        'indicator' => "Peserta didik mampu mendeskripsikan karakteristik pembeda materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan karakteristik pembeda utama dari materi {$coreNoun} secara akurat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Karakteristik pembeda diuraikan secara akurat, tajam, dan mendalam.\n"
                            . "• Skor 6 - 8 (Baik): Karakteristik pembeda diuraikan dengan cukup baik namun masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan karakteristik pembeda masih terbatas.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menyentuh karakteristik konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            }
            $selected = $angles[$angleIndex];
        } elseif ($effectiveLevel === 'mots') {
            // MOTS (C3 - Menerapkan / Prosedur & Aplikasi)
            $levelCode = 'C3';

            if ($isSmp) {
                $angles = [
                    // Angle 0: Langkah Praktik Tugas Sekolah SMP
                    [
                        'stem' => "Bagaimanakah urutan langkah yang kamu lakukan saat mempraktikkan materi {$coreNoun} di kelas?",
                        'indicator' => "Peserta didik mampu menguraikan tahapan penerapan materi {$coreNoun} secara runtut.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan langkah-langkah kerja materi {$coreNoun} dari awal hingga selesai secara runtut.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menguraikan tahapan penerapan secara sistematis, jelas, dan berurutan.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan tahapan penerapan dengan cukup jelas, namun ada sebagian langkah yang terlewat.\n"
                            . "• Skor 3 - 5 (Cukup): Langkah-langkah yang diuraikan masih acak dan belum terstruktur.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian langkah tidak relevan dengan materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Alur Tugas / Proyek Sederhana SMP
                    [
                        'stem' => "Tuliskan susunan rencana pembagian tugas kelompokmu saat mengerjakan praktik materi {$coreNoun}!",
                        'indicator' => "Peserta didik mampu menyusun alur kerja kelompok berbasis materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menyusun alur kerja praktis atau rencana pembagian tugas kelompok secara sistematis.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Rencana pembagian kerja kelompok terstruktur lengkap dan terarah.\n"
                            . "• Skor 6 - 8 (Baik): Rencana kerja cukup baik namun tahapan pembagian tugas kurang mendetail.\n"
                            . "• Skor 3 - 5 (Cukup): Rencana kerja masih sederhana dan ada lompatan tahapan.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Rencana kerja tidak sistematis.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Pemeriksaan Masalah Belajar SMP
                    [
                        'stem' => "Langkah apa yang akan kamu lakukan jika hasil praktik materi {$coreNoun} milikmu belum sesuai petunjuk?",
                        'indicator' => "Peserta didik mampu merumuskan langkah pemeriksaan operasional pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan tindakan pemeriksaan untuk menemukan kendala dan memperbaikinya sesuai kaidah materi.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Tindakan pemeriksaan sistematis, logis, dan tepat sasaran.\n"
                            . "• Skor 6 - 8 (Baik): Tindakan pemeriksaan tepat namun langkah pengecekan masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Tindakan pemeriksaan belum spesifik pada kaidah materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Langkah tindakan tidak sesuai dengan konteks masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Dampak Pelanggaran Prosedur SMP
                    [
                        'stem' => "Apa akibatnya bagi hasil tugasmu jika kamu melewati salah satu tahapan penting dalam materi {$coreNoun}?",
                        'indicator' => "Peserta didik mampu menjelaskan dampak pengabaian prosedur materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menguraikan dampak langsung pada kegagalan atau ketidaktepatan hasil tugas jika tahapan materi dilewati.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Dampak diuraikan secara sangat logis dan akurat sesuai kaidah materi.\n"
                            . "• Skor 6 - 8 (Baik): Dampak diuraikan dengan benar, namun penjelasan akibat lanjutannya masih terbatas.\n"
                            . "• Skor 3 - 5 (Cukup): Uraian dampak kurang jelas atau masih normatif.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Jawaban tidak relevan dengan kaidah materi yang dimaksud.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Siklus dan Hasil Output SMP
                    [
                        'stem' => preg_match('/^(?:cara kerja|alur kerja|proses|siklus)/iu', $concept)
                            ? "Jelaskan tahapan proses {$concept} dari awal hingga menghasilkan luaran (output)!"
                            : "Jelaskan urutan alur kerja pada materi {$coreNoun} dari awal hingga menghasilkan luaran (output)!",
                        'indicator' => "Peserta didik mampu mendeskripsikan siklus proses dan luaran materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menguraikan alur proses kerja dari tahap awal hingga tahap menghasilkan luaran secara runtut.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Alur proses kerja dan hasilnya diuraikan secara runtut, benar, dan jelas.\n"
                            . "• Skor 6 - 8 (Baik): Alur proses diuraikan dengan baik namun penjelasan luaran belum lengkap.\n"
                            . "• Skor 3 - 5 (Cukup): Alur masih terpotong-potong.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian alur salah atau tidak sesuai konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            } else {
                $angles = [
                    // Angle 0: Langkah Prosedural Umum/SMA
                    [
                        'stem' => "Bagaimanakah langkah-langkah praktis dalam menerapkan materi {$coreNoun} saat menyelesaikan tugas {$subjectName}?",
                        'indicator' => "Peserta didik mampu menguraikan tahapan penerapan materi {$coreNoun} secara runtut.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan tahapan penerapan materi {$coreNoun} secara runtut dari awal hingga akhir.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menguraikan tahapan penerapan secara sistematis, terstruktur, dan jelas.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan tahapan penerapan dengan cukup jelas, namun ada sebagian langkah yang terlewat.\n"
                            . "• Skor 3 - 5 (Cukup): Langkah-langkah yang diuraikan masih acak dan belum menunjukkan alur kerja yang terstruktur.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian langkah tidak relevan.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Alur Kerja Terstruktur
                    [
                        'stem' => "Susunlah alur kerja terstruktur yang Anda lakukan saat mempraktikkan materi {$coreNoun}!",
                        'indicator' => "Peserta didik mampu menyusun alur kerja operasional berbasis materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menyusun alur kerja praktis mencakup tahap persiapan, pelaksanaan, hingga verifikasi hasil.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Alur kerja terstruktur lengkap (persiapan-pelaksanaan-verifikasi) dan sesuai kaidah operasional materi.\n"
                            . "• Skor 6 - 8 (Baik): Alur kerja terstruktur cukup baik namun tahapan verifikasi atau persiapan kurang detail.\n"
                            . "• Skor 3 - 5 (Cukup): Alur kerja masih sederhana dan ada lompatan tahapan yang krusial.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Rencana kerja tidak sistematis dan belum menerapkan konsep secara benar.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Pemeriksaan Kasus Operasional
                    [
                        'stem' => "Langkah pemeriksaan apa yang Anda ambil jika menemukan ketidaksesuaian hasil saat menerapkan kaidah {$coreNoun}?",
                        'indicator' => "Peserta didik mampu merumuskan langkah penyelesaian masalah operasional menggunakan kaidah {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menetapkan urutan tindakan pemeriksaan dan perbaikan yang tepat berbasis kaidah {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Tindakan pemeriksaan sistematis, realistis, dan dilengkapi verifikasi keakuratan.\n"
                            . "• Skor 6 - 8 (Baik): Tindakan pemeriksaan tepat tetapi langkah pengecekan hasil belum diuraikan.\n"
                            . "• Skor 3 - 5 (Cukup): Tindakan pemeriksaan masih umum dan belum spesifik pada kaidah materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Langkah tindakan tidak sesuai dengan konteks masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Kepatuhan Kaidah Prosedur
                    [
                        'stem' => "Mengapa kepatuhan terhadap kaidah {$coreNoun} sangat menentukan efisiensi kerja Anda?",
                        'indicator' => "Peserta didik mampu menjelaskan urgensi kaidah materi {$coreNoun} dalam efisiensi kerja.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan keterkaitan langsung antara kepatuhan pada kaidah materi dengan efisiensi waktu dan sumber daya.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Keterkaitan kaidah dan efisiensi diuraikan dengan sangat logis dan komprehensif.\n"
                            . "• Skor 6 - 8 (Baik): Keterkaitan dijelaskan dengan benar, namun pertimbangan efisiensi masih terbatas.\n"
                            . "• Skor 3 - 5 (Cukup): Uraian kurang mendalam.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Jawaban tidak relevan dengan konsep yang dimaksud.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Siklus dan Luaran Proses
                    [
                        'stem' => "Jelaskan siklus alur proses kerja yang berlangsung pada materi {$coreNoun} dari tahap awal hingga akhir!",
                        'indicator' => "Peserta didik mampu mendeskripsikan siklus proses luaran pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menguraikan siklus proses kerja materi {$coreNoun} dari input hingga hasil akhir secara terstruktur.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Siklus proses kerja diuraikan secara komprehensif, benar, dan runtut.\n"
                            . "• Skor 6 - 8 (Baik): Siklus proses diuraikan dengan baik namun masih ada tahapan yang kurang lengkap.\n"
                            . "• Skor 3 - 5 (Cukup): Alur siklus masih terpotong-potong.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian siklus salah atau tidak sesuai konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            }
            $selected = $angles[$angleIndex];
        } else {
            // HOTS (C4/C5 - Analisis Kasus, Evaluasi & Pemecahan Masalah Kritis)
            $levelCode = (($number + $variant) % 2 === 1) ? 'C4' : 'C5';

            if ($isSmp) {
                $angles = [
                    // Angle 0: Analisis Masalah & Solusi SMP
                    [
                        'stem' => "Jika saat mempraktikkan materi {$coreNoun} terjadi kendala pada hasil akhirnya, bagaimana cara terbaikmu untuk memperbaikinya?",
                        'indicator' => "Peserta didik mampu merumuskan solusi perbaikan logis pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menguraikan solusi perbaikan yang logis, kreatif, dan sesuai dengan prinsip materi {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Solusi perbaikan logis, realistis, dan tepat menyelesaikan kendala.\n"
                            . "• Skor 6 - 8 (Baik): Solusi perbaikan cukup baik, namun langkah tindakannya masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Solusi yang diajukan kurang realistis atau masih umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian belum menyentuh pemecahan masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Menentukan Pilihan Terbaik SMP
                    [
                        'stem' => "Di antara dua cara penyelesaian tugas pada materi {$coreNoun}, cara mana yang menurutmu paling mudah dan aman digunakan?",
                        'indicator' => "Peserta didik mampu menentukan pilihan pendekatan terbaik pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menentukan pilihan cara kerja terbaik dengan memberikan alasan logis berbasis kemudahan dan keamanan pelaksanaan.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Pilihan ditentukan dengan alasan logis, kritis, dan sangat meyakinkan.\n"
                            . "• Skor 6 - 8 (Baik): Pilihan tepat, namun alasan pendukungnya masih normatif.\n"
                            . "• Skor 3 - 5 (Cukup): Alasan pemilihan cara kerja kurang kuat.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian evaluasi sangat dangkal.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Hubungan Sebab-Akibat Komponen SMP
                    [
                        'stem' => "Apa akibat yang akan terjadi pada hasil kerja secara keseluruhan jika salah satu bagian penting dalam {$coreNoun} tidak berfungsi?",
                        'indicator' => "Peserta didik mampu menganalisis dampak gangguan komponen pada {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menganalisis akibat lanjutan terhadap komponen lain dan hasil kerja akhir jika ada bagian yang tidak berfungsi.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Analisis sebab-akibat sangat runtut, memetakan dampak secara jelas, dan kesimpulan valid.\n"
                            . "• Skor 6 - 8 (Baik): Mampu memetakan sebagian besar dampak, namun penjelasan keterkaitan antarkomponen kurang mendalam.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan akibat sekilas tanpa menguraikan dampaknya.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Analisis tidak tepat.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Memeriksa & Memberi Saran Perbaikan SMP
                    [
                        'stem' => "Saran perbaikan apa yang akan kamu berikan jika melihat tugas temanmu tentang materi {$coreNoun} masih belum rapi dan belum lengkap?",
                        'indicator' => "Peserta didik mampu memberikan evaluasi dan saran perbaikan konstruktif pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Memberikan saran konkret dan mudah diterapkan oleh teman untuk memperbaiki tugas materi {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Saran perbaikan sangat jelas, konstruktif, dan mudah diterapkan.\n"
                            . "• Skor 6 - 8 (Baik): Saran perbaikan tepat, tetapi penjelasan cara menerapkannya masih singkat.\n"
                            . "• Skor 3 - 5 (Cukup): Saran yang diberikan masih bersifat umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Saran tidak relevan dengan konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Gagasan Kreatif Siswa SMP
                    [
                        'stem' => "Ide kreatif apa yang bisa kamu buat dengan memanfaatkan materi {$coreNoun} untuk membantu kegiatan belajarmu di sekolah?",
                        'indicator' => "Peserta didik mampu merancang ide kreatif aplikatif berbasis materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Mengusulkan gagasan kreatif dan aplikatif berbasis materi {$coreNoun} yang bermanfaat bagi aktivitas belajar.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Gagasan kreatif sangat menarik, aplikatif, dan relevan dengan materi.\n"
                            . "• Skor 6 - 8 (Baik): Gagasan cukup baik dan terarah, namun penerapannya masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Gagasan yang diajukan masih umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Gagasan tidak realistis atau tidak sesuai konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            } else {
                $angles = [
                    // Angle 0: Analisis Solusi Kendala
                    [
                        'stem' => "Lakukan analisis kritis: Bagaimana langkah perbaikan terbaik yang Anda rumuskan jika terjadi kendala pada implementasi materi {$coreNoun}?",
                        'indicator' => "Peserta didik mampu merumuskan solusi alternatif logis pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Merumuskan solusi alternatif yang kreatif, logis, dan dapat diterapkan secara konkret pada materi {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Analisis kritis sangat mendalam dan solusi alternatif inovatif serta realistis.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menawarkan solusi, namun argumentasi penalaran masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan solusi tanpa analisis mendalam.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian belum menyentuh pemecahan masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Evaluasi Keunggulan Pendekatan
                    [
                        'stem' => "Evaluasilah keunggulan utama pendekatan materi {$coreNoun} dalam memecahkan persoalan pada bidang {$subjectName}!",
                        'indicator' => "Peserta didik mampu mengevaluasi keunggulan materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menyajikan telaah evaluatif mengenai keunggulan utama dari pendekatan {$coreNoun} secara objektif.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Evaluasi keunggulan diuraikan kritis, tajam, dan disertai justifikasi yang kuat.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menguraikan keunggulan, namun justifikasi masih normatif.\n"
                            . "• Skor 3 - 5 (Cukup): Uraian keunggulan masih dangkal.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menunjukkan daya kritis.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Analisis Dampak Sistemik
                    [
                        'stem' => "Analisislah dampak sistemik yang terjadi apabila salah satu elemen kunci pada materi {$coreNoun} tidak beroperasi semestinya!",
                        'indicator' => "Peserta didik mampu menganalisis hubungan sebab-akibat sistemik pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menganalisis rantai sebab-akibat dan dampak lanjutan terhadap sistem secara keseluruhan.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Analisis sebab-akibat sangat runtut dan memetakan dampak berantai secara komprehensif.\n"
                            . "• Skor 6 - 8 (Baik): Mampu memetakan sebagian besar dampak, namun analisis kurang mendalam.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan dampak langsung secara umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Analisis tidak tepat.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Perbandingan Kritis Dua Pendekatan
                    [
                        'stem' => "Di antara dua pendekatan dalam materi {$coreNoun}, pendekatan manakah yang paling optimal Anda gunakan beserta alasannya?",
                        'indicator' => "Peserta didik mampu membandingkan dan menentukan pilihan solusi optimal pada materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menentukan pendekatan yang paling optimal dengan landasan argumen logis dan berbasis pertimbangan efektivitas.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Penilaian solusi optimal sangat meyakinkan dan didukung argumentasi logis yang kuat.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menentukan pendekatan optimal, tetapi kriteria penilaian masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Penilaian masih bersifat deskriptif tanpa argumentasi yang memadai.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menunjukkan perbandingan yang jelas.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Perancangan Strategi Inovatif
                    [
                        'stem' => "Rancanglah suatu gagasan solutif berbasis materi {$coreNoun} untuk menjawab persoalan di lingkungan sekitar Anda!",
                        'indicator' => "Peserta didik mampu merancang strategi integratif dan solutif berbasis materi {$coreNoun}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Merumuskan gagasan atau rancangan solutif terstruktur dengan memanfaatkan prinsip utama materi {$coreNoun}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Rancangan gagasan sangat terstruktur, orisinal, aplikatif, dan relevan dengan persoalan.\n"
                            . "• Skor 6 - 8 (Baik): Rancangan gagasan cukup baik dan terarah, namun aspek kepraktisannya masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Gagasan yang diajukan masih sederhana.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Rancangan tidak relevan dengan konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                ];
            }
            $selected = $angles[$angleIndex];
        }

        return [
            'number' => $number,
            'type' => 'essay',
            'question' => $selected['stem'],
            'options' => null,
            'answer' => $selected['answer'],
            'explanation' => $selected['explanation'],
            'indicator' => $selected['indicator'],
            'cognitive_level' => $levelCode,
            'score' => 10,
        ];
    }

    /**
     * Assemble final complete payload with school Kop and Teacher information.
     */
    protected function formatExamPayload(
        array $rawExam,
        Teacher $teacher,
        array $classIds,
        string $classNames,
        string $subjectName,
        Collection|array $tps,
        array $tpAllocations,
        string $periodName,
        ?string $timeLimit,
        string $schoolName,
        string $schoolAddress,
        string $schoolPhone,
        string $schoolEmail,
        string $headmasterName,
        string $headmasterNip,
        string $cognitiveLevel = 'all',
        ?array $levelInfo = null
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $classNames);
        $tpList = $tps instanceof Collection ? $tps : collect($tps);
        $primaryTp = $tpList->first();

        $cognitiveLabel = match ($cognitiveLevel) {
            'lots' => 'Level 1 - LOTS (C1-C2 / Mengingat & Memahami)',
            'mots' => 'Level 2 - MOTS (C3 / Menerapkan)',
            'hots' => 'Level 3 - HOTS (C4-C6 / Menganalisis & Mengevaluasi)',
            default => 'Campuran Proporsional (LOTS, MOTS, HOTS)',
        };

        $questions = $rawExam['questions'] ?? [];
        $blueprint = $rawExam['blueprint'] ?? [];
        $answerKeys = $rawExam['answer_keys'] ?? [];

        $totalScore = 0;
        foreach ($questions as $q) {
            $totalScore += (int) ($q['score'] ?? ($q['type'] === 'essay' ? 10 : 2));
        }

        $mcQuestions = array_values(array_filter($questions, fn($q) => ($q['type'] ?? '') === 'multiple_choice'));
        $essayQuestions = array_values(array_filter($questions, fn($q) => ($q['type'] ?? '') === 'essay'));

        $tpCodes = $tpList->pluck('code')->filter()->implode(', ') ?: ('TP ' . ($primaryTp?->order ?? '1'));
        $tpDescriptions = $tpList->pluck('description')->implode(' | ');

        return [
            'school_name' => $schoolName,
            'school_address' => $schoolAddress,
            'school_phone' => $schoolPhone,
            'school_email' => $schoolEmail,
            'region_logo' => $this->getRegionLogoBase64(),
            'school_logo' => $this->getSchoolLogoBase64(),
            'region_logo_url' => '/images/logo-buol.png',
            'school_logo_url' => '/images/logo-spensa.png',
            'headmaster_name' => $headmasterName,
            'headmaster_nip' => $headmasterNip,
            'teacher_name' => $teacher->name,
            'teacher_nip' => $teacher->nip ?? '-',
            'class_ids' => $classIds,
            'class_name' => $classNames,
            'grade_level' => $levelInfo['grade_label'] ?? 'Kelas 8 SMP',
            'education_level' => $levelInfo['level_name'] ?? 'SMP',
            'full_education_level' => $levelInfo['full_level'] ?? 'Sekolah Menengah Pertama (SMP / MTs)',
            'curriculum_phase' => $levelInfo['phase'] ?? 'Fase D',
            'subject_name' => $subjectName,
            'tp_id' => $primaryTp?->id,
            'tp_ids' => $tpList->pluck('id')->all(),
            'tp_code' => $tpCodes,
            'tp_description' => $tpDescriptions,
            'tp_allocations' => $tpAllocations,
            'total_tps' => $tpList->count(),
            'period' => $periodName,
            'time_limit' => $timeLimit ?: '90 Menit',
            'cognitive_level' => $cognitiveLevel,
            'cognitive_level_label' => $cognitiveLabel,
            'title' => $rawExam['title'] ?? 'LEMBAR SOAL ASESMEN SUMATIF OFFLINE',
            'instructions' => $rawExam['instructions'] ?? [],
            'questions' => $questions,
            'mc_questions' => $mcQuestions,
            'essay_questions' => $essayQuestions,
            'blueprint' => $blueprint,
            'answer_keys' => $answerKeys,
            'total_score' => $totalScore ?: 100,
            'generated_at' => now()->translatedFormat('d F Y H:i'),
        ];
    }

    /**
     * Export exam data to PDF (with Kop, questions, and Lampiran page break).
     */
    public function exportPdf(array $examData): \Illuminate\Http\Response
    {
        $pdf = Pdf::loadView('pdf.offline_exam', $examData);
        $pdf->setPaper('A4', 'portrait');

        $safeClassName = str_replace([' ', '/', '\\', ','], '_', $examData['class_name']);
        $safeSubject = str_replace([' ', '/', '\\'], '_', $examData['subject_name']);
        $filename = "Soal_Offline_{$safeSubject}_{$safeClassName}_" . date('Ymd_His') . ".pdf";

        return $pdf->download($filename);
    }

    /**
     * Get local filesystem path to Pemda Buol region logo.
     */
    protected function getLocalRegionLogoPath(): ?string
    {
        $paths = [
            public_path('images/logo-buol.png'),
            storage_path('app/public/logos/logo-buol.png'),
        ];

        foreach ($paths as $path) {
            $path = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Get Base64 encoded string for Pemda Buol region logo (for DomPDF).
     */
    protected function getRegionLogoBase64(): ?string
    {
        $path = $this->getLocalRegionLogoPath();
        if ($path && file_exists($path)) {
            $type = pathinfo($path, PATHINFO_EXTENSION);
            $data = file_get_contents($path);
            return 'data:image/' . $type . ';base64,' . base64_encode($data);
        }

        return null;
    }

    /**
     * Get local filesystem path to school logo (Spensa) for PhpWord export if available.
     */
    protected function getLocalSchoolLogoPath(): ?string
    {
        // 1. Explicit Spensa logo uploaded
        $paths = [
            public_path('images/logo-spensa.png'),
            storage_path('app/public/logos/logo-spensa.png'),
        ];

        foreach ($paths as $p) {
            $p = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $p);
            if (file_exists($p)) {
                return $p;
            }
        }

        // 2. Fallback to dynamic school_setting('app_logo')
        $path = school_setting('app_logo');
        if ($path) {
            $fallbackPaths = [
                storage_path('app/public/' . $path),
                base_path('../aplikasi-absensi/storage/app/public/' . $path),
                public_path('storage/' . $path),
            ];

            foreach ($fallbackPaths as $fp) {
                $fp = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $fp);
                if (file_exists($fp)) {
                    return $fp;
                }
            }
        }

        return null;
    }

    /**
     * Get Base64 encoded string for school logo (Spensa) for DomPDF.
     */
    protected function getSchoolLogoBase64(): ?string
    {
        $path = $this->getLocalSchoolLogoPath();
        if ($path && file_exists($path)) {
            $type = pathinfo($path, PATHINFO_EXTENSION);
            $data = file_get_contents($path);
            return 'data:image/' . $type . ';base64,' . base64_encode($data);
        }

        return school_logo_url();
    }

    /**
     * Export exam data to native Microsoft Word (.docx) using PhpWord.
     * All text nodes are strictly XML-sanitized to guarantee valid OOXML document.xml.
     */
    public function exportDocx(array $examData): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        // Enforce strict XML output escaping and compatibility to guarantee 100% valid OOXML
        Settings::setOutputEscapingEnabled(true);
        Settings::setCompatibility(false);

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);

        $section = $phpWord->addSection([
            'marginTop' => 1134,    // 2 cm
            'marginBottom' => 1134, // 2 cm
            'marginLeft' => 1417,   // 2.5 cm
            'marginRight' => 1134,  // 2 cm
        ]);

        // Running Footer: Generated by LMS Mokopani (matching PDF footer)
        $footer = $section->addFooter();
        $footer->addText('Dokumen Asesmen Offline • Generated by LMS Mokopani', [
            'name' => 'Times New Roman',
            'size' => 8.5,
            'italic' => true,
            'color' => '64748B',
        ], ['alignment' => Jc::CENTER]);

        // 1. Kop Surat dengan 2 Logo: Pemda Buol di sebelah KIRI dan Logo Spensa di sebelah KANAN
        $kopTable = $section->addTable([
            'borderBottomSize' => 18,
            'borderBottomColor' => '000000',
            'alignment' => JcTable::CENTER,
            'unit' => TblWidth::PERCENT,
            'width' => 100 * 50,
        ]);
        $kopRow = $kopTable->addRow();

        $regionLogoPath = $this->getLocalRegionLogoPath();
        $schoolLogoPath = $this->getLocalSchoolLogoPath();

        // Logo Pemda Buol (Kiri, width 12%)
        $leftCell = $kopRow->addCell(1200, ['valign' => 'center']);
        if ($regionLogoPath) {
            $leftCell->addImage($regionLogoPath, [
                'width' => 55,
                'height' => 55,
                'alignment' => Jc::CENTER,
            ]);
        }

        // Teks Instansi Kop Surat (Tengah, width 76%)
        $kopCell = $kopRow->addCell(7600, ['valign' => 'center']);
        $kopCell->addText('PEMERINTAH KABUPATEN BUOL', ['bold' => true, 'size' => 11], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText('DINAS PENDIDIKAN DAN KEBUDAYAAN', ['bold' => true, 'size' => 11], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText($this->cleanWordText(strtoupper($examData['school_name'])), ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER, 'spaceAfter' => 30]);

        $metaSchoolText = $this->cleanWordText($examData['school_address'] . ' | Telp: ' . $examData['school_phone'] . ' | Email: ' . $examData['school_email']);
        $kopCell->addText($metaSchoolText, ['size' => 8.5, 'italic' => true], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);

        // Logo Spensa (Kanan, width 12%)
        $rightCell = $kopRow->addCell(1200, ['valign' => 'center']);
        if ($schoolLogoPath) {
            $rightCell->addImage($schoolLogoPath, [
                'width' => 55,
                'height' => 55,
                'alignment' => Jc::CENTER,
            ]);
        }

        $section->addTextBreak(1);

        // 2. Exam Title
        $section->addText($this->cleanWordText($examData['title']), ['bold' => true, 'size' => 12, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $section->addText('TAHUN AJARAN ' . $this->cleanWordText(strtoupper($examData['period'])), ['bold' => true, 'size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 100]);

        // 3. Metadata Table (2 Columns x 3 Rows, matching PDF layout)
        $metaTable = $section->addTable([
            'alignment' => JcTable::CENTER,
            'unit' => TblWidth::PERCENT,
            'width' => 100 * 50,
        ]);

        $metaRow1 = $metaTable->addRow();
        $cell11 = $metaRow1->addCell(5200);
        $cell11->addText("Mata Pelajaran : " . $this->cleanWordText($examData['subject_name']), ['bold' => true, 'size' => 10], ['spaceAfter' => 20]);
        $cell12 = $metaRow1->addCell(4800);
        $cell12->addText("Hari / Tanggal : .................................................", ['size' => 10], ['spaceAfter' => 20]);

        $metaRow2 = $metaTable->addRow();
        $cell21 = $metaRow2->addCell(5200);
        $gradeSuffix = !empty($examData['grade_level']) ? " ({$examData['grade_level']})" : '';
        $cell21->addText("Kelas / Rombel : " . $this->cleanWordText($examData['class_name'] . $gradeSuffix), ['size' => 10], ['spaceAfter' => 20]);
        $cell22 = $metaRow2->addCell(4800);
        $cell22->addText("Alokasi Waktu  : " . $this->cleanWordText($examData['time_limit']), ['bold' => true, 'size' => 10], ['spaceAfter' => 20]);

        $metaRow3 = $metaTable->addRow();
        $cell31 = $metaRow3->addCell(5200);
        $cell31->addText("Nama Peserta   : .................................................", ['size' => 10], ['spaceAfter' => 20]);
        $cell32 = $metaRow3->addCell(4800);
        $cell32->addText("Nomor Absen    : .................................................", ['size' => 10], ['spaceAfter' => 20]);

        $section->addTextBreak(1);

        // 4. Petunjuk Umum (Boxed, matching PDF)
        if (!empty($examData['instructions'])) {
            $instTable = $section->addTable([
                'borderSize' => 6,
                'borderColor' => 'CBD5E1',
                'alignment' => JcTable::CENTER,
                'unit' => TblWidth::PERCENT,
                'width' => 100 * 50,
            ]);
            $instRow = $instTable->addRow();
            $instCell = $instRow->addCell(10000, ['bgColor' => 'F8FAFC']);
            $instCell->addText("PETUNJUK UMUM:", ['bold' => true, 'size' => 9.5], ['spaceAfter' => 20]);
            foreach ($examData['instructions'] as $idx => $inst) {
                $instCell->addText(($idx + 1) . ". " . $this->cleanWordText($inst), ['size' => 9], ['spaceAfter' => 15]);
            }
            $section->addTextBreak(1);
        }

        // 5. Daftar Soal (HANYA tampilkan bagian yang memiliki soal!)
        if (!empty($examData['mc_questions'])) {
            $section->addText("BAGIAN I: PILIHAN GANDA", ['bold' => true, 'size' => 11, 'color' => '0F172A']);
            $section->addText("Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D!", ['italic' => true, 'size' => 9, 'color' => '64748B'], ['spaceAfter' => 60]);

            foreach ($examData['mc_questions'] as $q) {
                $section->addText("{$q['number']}. " . $this->cleanWordText($q['question']), ['bold' => false, 'size' => 10.5], ['spaceAfter' => 30]);
                if (!empty($q['options']) && is_array($q['options'])) {
                    $optTable = $section->addTable([
                        'alignment' => JcTable::CENTER,
                        'unit' => TblWidth::PERCENT,
                        'width' => 100 * 50,
                    ]);
                    $optRow1 = $optTable->addRow();
                    $optRow1->addCell(5000)->addText("A. " . $this->cleanWordText($q['options']['A'] ?? '-'), ['size' => 10]);
                    $optRow1->addCell(5000)->addText("B. " . $this->cleanWordText($q['options']['B'] ?? '-'), ['size' => 10]);

                    $optRow2 = $optTable->addRow();
                    $optRow2->addCell(5000)->addText("C. " . $this->cleanWordText($q['options']['C'] ?? '-'), ['size' => 10]);
                    $optRow2->addCell(5000)->addText("D. " . $this->cleanWordText($q['options']['D'] ?? '-'), ['size' => 10]);
                }
                $section->addTextBreak(1);
            }
        }

        if (!empty($examData['essay_questions'])) {
            $sectionTitle = empty($examData['mc_questions']) ? "DAFTAR SOAL ESAI / URAIAN" : "BAGIAN II: ESAI / URAIAN";
            $section->addText($sectionTitle, ['bold' => true, 'size' => 11, 'color' => '0F172A']);
            $section->addText("Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat!", ['italic' => true, 'size' => 9, 'color' => '64748B'], ['spaceAfter' => 60]);

            foreach ($examData['essay_questions'] as $q) {
                // Ensure NO '[Skor Maks: 10]' on student question sheet
                $section->addText("{$q['number']}. " . $this->cleanWordText($q['question']), ['bold' => false, 'size' => 10.5], ['spaceAfter' => 30]);
                $section->addText("      Jawaban: ...................................................................................................................................................", ['color' => '718096', 'size' => 9], ['spaceAfter' => 20]);
                $section->addText("      .......................................................................................................................................................................", ['color' => '718096', 'size' => 9], ['spaceAfter' => 20]);
                $section->addText("      .......................................................................................................................................................................", ['color' => '718096', 'size' => 9], ['spaceAfter' => 60]);
                $section->addTextBreak(1);
            }
        }

        // ==========================================
        // 6. LAMPIRAN PADA LEMBAR BERIKUTNYA
        // ==========================================
        $section->addPageBreak();

        $section->addText("LAMPIRAN DOKUMEN PENDIDIK (PEGANGAN GURU)", ['bold' => true, 'size' => 11], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        // Use 'DAN' instead of bare '&' to prevent XML entity reference failure
        $section->addText("KISI-KISI SOAL, KUNCI JAWABAN DAN RUBRIK PENILAIAN", ['bold' => true, 'size' => 12, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 80]);

        $section->addText("Mata Pelajaran : " . $this->cleanWordText($examData['subject_name']) . " | Kelas : " . $this->cleanWordText($examData['class_name']) . " | Tingkat Kognitif : " . $this->cleanWordText($examData['cognitive_level_label'] ?? 'Campuran Proporsional'), ['size' => 9.5, 'bold' => true]);
        $tpDisplayText = count($examData['tp_allocations'] ?? []) > 1
            ? "[" . $this->cleanWordText($examData['tp_code']) . "] (" . count($examData['tp_allocations']) . " TP Diujikan - Soal Dibagi Rata)"
            : "[" . $this->cleanWordText($examData['tp_code']) . "] " . $this->cleanWordText($examData['tp_description']);
        $section->addText("Tujuan Pembelajaran : " . $tpDisplayText, ['size' => 9.5, 'italic' => true], ['spaceAfter' => 80]);

        // Table 1: Kisi-kisi Soal (Blueprint)
        $section->addText("A. KISI-KISI PENYUSUNAN SOAL", ['bold' => true, 'size' => 10.5], ['spaceAfter' => 40]);
        $bpTable = $section->addTable([
            'borderSize' => 6,
            'borderColor' => 'CBD5E1',
            'alignment' => JcTable::CENTER,
            'cellMargin' => 80,
            'unit' => TblWidth::TWIP,
            'width' => 9000,
        ]);

        $bpHeader = $bpTable->addRow();
        $bpHeader->addCell(500, ['bgColor' => 'F1F5F9'])->addText('No', ['bold' => true, 'size' => 9], ['alignment' => Jc::CENTER]);
        $bpHeader->addCell(1600, ['bgColor' => 'F1F5F9'])->addText('Kode TP', ['bold' => true, 'size' => 9]);
        $bpHeader->addCell(2200, ['bgColor' => 'F1F5F9'])->addText('Materi Pokok', ['bold' => true, 'size' => 9]);
        $bpHeader->addCell(3000, ['bgColor' => 'F1F5F9'])->addText('Indikator Soal', ['bold' => true, 'size' => 9]);
        $bpHeader->addCell(1100, ['bgColor' => 'F1F5F9'])->addText('Bentuk', ['bold' => true, 'size' => 9], ['alignment' => Jc::CENTER]);
        $bpHeader->addCell(600, ['bgColor' => 'F1F5F9'])->addText('Level', ['bold' => true, 'size' => 9], ['alignment' => Jc::CENTER]);

        foreach ($examData['blueprint'] as $bp) {
            $row = $bpTable->addRow();
            $row->addCell(500)->addText($bp['number'] ?? '-', ['size' => 9], ['alignment' => Jc::CENTER]);
            $row->addCell(1600)->addText($this->cleanWordText($bp['tp_code'] ?? $examData['tp_code']), ['size' => 8.5]);
            $row->addCell(2200)->addText($this->cleanWordText($bp['material'] ?? '-'), ['size' => 8.5]);
            $row->addCell(3000)->addText($this->cleanWordText($bp['indicator'] ?? '-'), ['size' => 8.5]);
            $row->addCell(1100)->addText($this->cleanWordText($bp['question_type'] ?? '-'), ['size' => 8.5], ['alignment' => Jc::CENTER]);
            $row->addCell(600)->addText($this->cleanWordText($bp['cognitive_level'] ?? '-'), ['size' => 9], ['alignment' => Jc::CENTER]);
        }

        $section->addTextBreak(1);

        // Table 2: Kunci Jawaban & Rubrik
        $section->addText("B. KUNCI JAWABAN DAN PEDOMAN PENSKORAN", ['bold' => true, 'size' => 10.5], ['spaceAfter' => 40]);
        $keyTable = $section->addTable([
            'borderSize' => 6,
            'borderColor' => 'CBD5E1',
            'alignment' => JcTable::CENTER,
            'cellMargin' => 80,
            'unit' => TblWidth::TWIP,
            'width' => 9000,
        ]);

        $keyHeader = $keyTable->addRow();
        $keyHeader->addCell(500, ['bgColor' => 'F1F5F9'])->addText('No', ['bold' => true, 'size' => 9], ['alignment' => Jc::CENTER]);
        $keyHeader->addCell(1100, ['bgColor' => 'F1F5F9'])->addText('Bentuk', ['bold' => true, 'size' => 9]);
        $keyHeader->addCell(1800, ['bgColor' => 'F1F5F9'])->addText('Kunci', ['bold' => true, 'size' => 9]);
        $keyHeader->addCell(4700, ['bgColor' => 'F1F5F9'])->addText('Pembahasan / Rubrik Penskoran', ['bold' => true, 'size' => 9]);
        $keyHeader->addCell(900, ['bgColor' => 'F1F5F9'])->addText('Skor Maks', ['bold' => true, 'size' => 9], ['alignment' => Jc::CENTER]);

        foreach ($examData['answer_keys'] as $ak) {
            $row = $keyTable->addRow();
            $row->addCell(500)->addText($ak['number'] ?? '-', ['size' => 9], ['alignment' => Jc::CENTER]);
            $row->addCell(1100)->addText($this->cleanWordText($ak['question_type'] ?? '-'), ['size' => 8.5]);

            $ansCell = $row->addCell(1800);
            $ansLines = explode("\n", (string) ($ak['answer'] ?? '-'));
            foreach ($ansLines as $al) {
                if (trim($al) === '')
                    continue;
                $ansCell->addText($this->cleanWordText($al), ['bold' => true, 'size' => 8.5], ['spaceAfter' => 20]);
            }

            $expCell = $row->addCell(4700);
            $expLines = explode("\n", (string) ($ak['explanation'] ?? '-'));
            foreach ($expLines as $el) {
                if (trim($el) === '')
                    continue;
                $expCell->addText($this->cleanWordText($el), ['size' => 8.5], ['spaceAfter' => 20]);
            }

            $row->addCell(900)->addText($ak['max_score'] ?? '-', ['size' => 9], ['alignment' => Jc::CENTER]);
        }

        $section->addTextBreak(1);

        // Formula Nilai Akhir
        $formulaText = "Rumus Konversi Nilai Akhir: Nilai = (Total Skor Perolehan / " . $examData['total_score'] . ") x 100";
        $section->addText($this->cleanWordText($formulaText), ['bold' => true, 'italic' => true, 'size' => 9.5], ['spaceAfter' => 120]);

        // Signatures Table
        $sigTable = $section->addTable([
            'alignment' => JcTable::CENTER,
            'unit' => TblWidth::PERCENT,
            'width' => 100 * 50,
        ]);
        $sigRow = $sigTable->addRow();

        $sigCell1 = $sigRow->addCell(4500);
        $sigCell1->addText("Mengetahui,", ['size' => 10], ['alignment' => Jc::CENTER]);
        $sigCell1->addText("Kepala Sekolah,", ['size' => 10], ['alignment' => Jc::CENTER]);
        $sigCell1->addTextBreak(3);
        $sigCell1->addText($this->cleanWordText($examData['headmaster_name']), ['bold' => true, 'size' => 10, 'underline' => 'single'], ['alignment' => Jc::CENTER]);
        $sigCell1->addText("NIP. " . $this->cleanWordText($examData['headmaster_nip']), ['size' => 9.5], ['alignment' => Jc::CENTER]);

        $sigCell2 = $sigRow->addCell(4500);
        $sigCell2->addText("Buol, " . date('d F Y'), ['size' => 10], ['alignment' => Jc::CENTER]);
        $sigCell2->addText("Guru Mata Pelajaran,", ['size' => 10], ['alignment' => Jc::CENTER]);
        $sigCell2->addTextBreak(3);
        $sigCell2->addText($this->cleanWordText($examData['teacher_name']), ['bold' => true, 'size' => 10, 'underline' => 'single'], ['alignment' => Jc::CENTER]);
        $sigCell2->addText("NIP. " . $this->cleanWordText($examData['teacher_nip']), ['size' => 9.5], ['alignment' => Jc::CENTER]);

        // Save Word document to temporary file
        $tempDir = storage_path('app/temp');
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $safeClassName = preg_replace('/[^A-Za-z0-9_-]/', '_', str_replace([' ', '/', '\\', ','], '_', $examData['class_name']));
        $safeSubject = preg_replace('/[^A-Za-z0-9_-]/', '_', str_replace([' ', '/', '\\'], '_', $examData['subject_name']));
        $filename = "Soal_Offline_{$safeSubject}_{$safeClassName}_" . date('Ymd_His') . ".docx";
        $tempFile = $tempDir . '/' . uniqid('exam_', true) . '.docx';

        $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Length' => (string) filesize($tempFile),
        ])->deleteFileAfterSend(true);
    }
}
