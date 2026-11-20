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
        $cacheHash = md5("offline_exam_v12_{$tpKey}_{$classKey}_{$questionType}_{$questionCount}_{$generationEngine}_{$cognitiveLevel}_{$levelInfo['grade_label']}");

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
            while (count($questions) < $questionCount) {
                $num = count($questions) + 1;
                $currentAlloc = $allocMap[$num] ?? ($tpAllocations[0] ?? null);
                $targetTp = $currentAlloc ? $currentAlloc['tp'] : ($tps instanceof Collection ? $tps->first() : $tps[0]);
                $variant = $currentAlloc ? max(0, $num - $currentAlloc['start_number']) : ($num - 1);
                $q = $this->buildSingleMcQuestion($targetTp, $subjectName, $className, $num, $cognitiveLevel, $questionCount, $variant, $levelInfo);
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
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo);
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
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n, $levelInfo);
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

    protected function getDomainMcAngles(
        string $domain,
        string $effectiveLevel,
        bool $isSmp,
        string $coreNoun,
        string $subjectName,
        string $subLevel
    ): array {
        if ($domain === 'security_ethics') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Informasi pribadi di bawah ini yang termasuk kategori data sensitif dan tidak boleh disebarkan secara sembarangan di media sosial adalah...",
                        'correct' => "Nomor Induk Kependudukan (NIK) dan kata sandi akun pribadi.",
                        'distractors' => [
                            "Hobi berolahraga di akhir pekan.",
                            "Judul buku pelajaran yang sedang dibaca.",
                            "Warna seragam sekolah yang digunakan.",
                        ],
                        'indicator' => "Disajikan klasifikasi data, peserta didik mampu mengidentifikasi data pribadi sensitif.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "NIK dan kata sandi merupakan data sensitif privat yang berisiko disalahgunakan jika disebar ke publik.",
                        'explanation_distractors' => "Pilihan lainnya merupakan informasi umum yang tidak berisiko membahayakan identitas atau keamanan finansial.",
                    ],
                    [
                        'stem' => "Apa yang dimaksud dengan jejak digital (digital footprint) dalam dunia internet?",
                        'correct' => "Rekam jejak seluruh aktivitas, pesan, dan unggahan yang kita tinggalkan saat beraktivitas di internet.",
                        'distractors' => [
                            "Kabel penghubung antara perangkat komputer dengan stopkontak listrik.",
                            "Waktu yang diperlukan laptop untuk menyala dari posisi mati.",
                            "Kapasitas penyimpanan yang tersisa pada kartu memori smartphone.",
                        ],
                        'indicator' => "Disajikan konsep jejak digital, peserta didik mampu menjelaskan pengertian rekam jejak digital.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "Jejak digital adalah seluruh jejak riwayat aktivitas online yang tertinggal dan dapat dilacak di dunia maya.",
                        'explanation_distractors' => "Pilihan lainnya merujuk pada perangkat keras atau indikator fisik komputer.",
                    ],
                    [
                        'stem' => "Tindakan mencantumkan sumber asli saat kita menggunakan karya tulisan atau foto orang lain bertujuan untuk...",
                        'correct' => "Menghormati hak cipta pencipta karya dan menghindari perbuatan plagiarisme.",
                        'distractors' => [
                            "Mengurangi kecepatan pengiriman data pada koneksi jaringan internet.",
                            "Membuat berkas dokumen terkunci sehingga tidak bisa dibuka pengguna lain.",
                            "Menghilangkan teks penjelasan utama dari dokumen yang kita susun.",
                        ],
                        'indicator' => "Disajikan etika berkarya, peserta didik mampu mengidentifikasi tujuan pencantuman atribusi hak cipta.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "Atribusi atau sitasi adalah bentuk penghargaan terhadap hak cipta pembuat karya dan mencegah plagiasi.",
                        'explanation_distractors' => "Pilihan lainnya tidak memiliki kaitan dengan konsep hukum dan etika hak cipta.",
                    ],
                    [
                        'stem' => "Salah satu ciri utama dari kata sandi (password) yang kuat dan aman dari ancaman peretasan adalah...",
                        'correct' => "Mengombinasikan huruf besar, huruf kecil, angka, dan simbol khusus.",
                        'distractors' => [
                            "Hanya menggunakan tanggal lahir atau nomor telepon pribadi.",
                            "Menggunakan kata yang sama berulang kali seperti '12345678'.",
                            "Menuliskan kata sandi pada bio atau profil publik media sosial.",
                        ],
                        'indicator' => "Disajikan prinsip keamanan akun, peserta didik mampu mengenali karakteristik kata sandi yang aman.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "Kombinasi ragam karakter membuat kata sandi memiliki entropi tinggi dan sulit ditebak oleh serangan brute force.",
                        'explanation_distractors' => "Pilihan pengecoh sangat rentan ditebak oleh pelaku kejahatan siber.",
                    ],
                    [
                        'stem' => "Modus kejahatan siber berupa pesan tipuan yang berpura-pura menjadi pihak resmi untuk mencuri data pribadi disebut...",
                        'correct' => "Phishing.",
                        'distractors' => [
                            "Browsing.",
                            "Download.",
                            "Formatting.",
                        ],
                        'indicator' => "Disajikan istilah ancaman siber, peserta didik mampu mengidentifikasi kejahatan phishing.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "Phishing adalah penipuan rekayasa sosial untuk memancing korban memberikan kredensial rahasia.",
                        'explanation_distractors' => "Pilihan lainnya adalah aktivitas normal dalam pengoperasian komputer.",
                    ],
                    [
                        'stem' => "Prinsip etika kewargaan digital yang paling tepat saat kita ingin membagikan ulang kiriman informasi di media sosial adalah...",
                        'correct' => "Memastikan kebenaran informasi tersebut terlebih dahulu dan mempertimbangkan manfaatnya sebelum disebarkan.",
                        'distractors' => [
                            "Langsung membagikan informasi yang memicu kemarahan publik agar mendapat banyak tanggapan.",
                            "Mengubah isi informasi tersebut agar terdengar lebih dramatis.",
                            "Menyebarkan informasi tanpa membaca isinya sama sekali.",
                        ],
                        'indicator' => "Disajikan etika berbagi, peserta didik mampu menjelaskan prinsip saring sebelum sharing.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Dasar)",
                        'explanation_correct' => "Prinsip 'saring sebelum sharing' menjamin informasi yang disebarkan valid, tidak menyesatkan, dan bernilai positif.",
                        'explanation_distractors' => "Pilihan lainnya memicu penyebaran hoaks dan konflik digital.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Ketika kamu menerima tautan (link) mencurigakan dari nomor tidak dikenal yang meminta kamu memasukkan kata sandi akun, tindakan paling aman adalah...",
                        'correct' => "Mengabaikan tautan tersebut dan tidak memasukkan data pribadi apa pun.",
                        'distractors' => [
                            "Segera mengeklik tautan tersebut dan mengisi seluruh data pribadi.",
                            "Meneruskan tautan mencurigakan tersebut ke seluruh grup pertemanan.",
                            "Menonaktifkan pelindung antivirus pada perangkat komputer atau ponsel.",
                        ],
                        'indicator' => "Disajikan skenario tautan mencurigakan, peserta didik mampu menerapkan respons keamanan yang tepat.",
                        'sub_level' => "C3 - MOTS (Penerapan Keamanan)",
                        'explanation_correct' => "Mengabaikan dan tidak merespons tautan mencurigakan mencegah kebocoran data pada skenario phishing.",
                        'explanation_distractors' => "Pilihan pengecoh membahayakan keamanan data pribadi dan memperluas penyebaran ancaman.",
                    ],
                    [
                        'stem' => "Sebelum mengunggah foto kegiatan bersama teman-teman ke platform publik media sosial, etika digital yang wajib kamu lakukan adalah...",
                        'correct' => "Meminta persetujuan atau izin dari teman-teman yang berada di dalam foto tersebut.",
                        'distractors' => [
                            "Menandai lokasi rumah tinggal setiap teman secara detail di peta publik.",
                            "Mengunggah foto tanpa izin disertai komentar yang merendahkan.",
                            "Menghapus nama akun pemilik foto yang asli sebelum diunggah.",
                        ],
                        'indicator' => "Disajikan skenario publikasi konten, peserta didik mampu menerapkan etika persetujuan privasi.",
                        'sub_level' => "C3 - MOTS (Penerapan Etika)",
                        'explanation_correct' => "Meminta izin merupakan bentuk penghormatan mendasar terhadap hak privasi orang lain di ruang publik.",
                        'explanation_distractors' => "Pilihan lainnya melanggar privasi dan tata krama komunikasi digital.",
                    ],
                    [
                        'stem' => "Langkah terbaik untuk mengamankan akun digital pribadi dari upaya pengambilalihan akun secara ilegal adalah...",
                        'correct' => "Mengaktifkan fitur verifikasi dua langkah (two-factor authentication / 2FA).",
                        'distractors' => [
                            "Membagikan kata sandi kepada teman sebangku agar bisa saling menjaga akun.",
                            "Menggunakan komputer umum warnet tanpa pernah melakukan logout akun.",
                            "Menonaktifkan seluruh notifikasi keamanan pada pengaturan akun.",
                        ],
                        'indicator' => "Disajikan proteksi akun, peserta didik mampu mengaplikasikan perlindungan autentikasi ganda.",
                        'sub_level' => "C3 - MOTS (Penerapan Keamanan)",
                        'explanation_correct' => "Autentikasi dua langkah memberikan lapisan pertahanan ekstra meskipun kata sandi utama diketahui peretas.",
                        'explanation_distractors' => "Pilihan lainnya memperbesar risiko pengambilalihan akun.",
                    ],
                    [
                        'stem' => "Jika kamu ingin menambahkan lagu atau musik latar pada konten video yang akan dipublikasikan ke internet, tindakan yang benar adalah...",
                        'correct' => "Memilih lagu bebas royalti (royalty-free) atau yang berlisensi Creative Commons dengan mencantumkan atribusi.",
                        'distractors' => [
                            "Mengunduh musik berbayar tanpa izin lalu mengklaimnya sebagai karya ciptaan sendiri.",
                            "Menghapus judul lagu asli agar tidak terdeteksi oleh sistem hak cipta.",
                            "Mengabaikan izin hak cipta karena menganggap video dibuat untuk tugas sekolah.",
                        ],
                        'indicator' => "Disajikan integrasi multimedia, peserta didik mampu menerapkan lisensi hak cipta musik.",
                        'sub_level' => "C3 - MOTS (Penerapan Lisensi)",
                        'explanation_correct' => "Karya berlisensi Creative Commons atau royalty-free sah digunakan secara legal dengan mengikuti ketentuan lisensinya.",
                        'explanation_distractors' => "Penggunaan tanpa lisensi melanggar hak kekayaan intelektual pencipta.",
                    ],
                    [
                        'stem' => "Setelah selesai menggunakan komputer di laboratorium sekolah atau fasilitas umum, tindakan perlindungan privasi yang wajib dilakukan adalah...",
                        'correct' => "Keluar (log out) dari seluruh akun pribadi dan menghapus riwayat peramban (browser history).",
                        'distractors' => [
                            "Menyimpan kata sandi secara otomatis pada browser komputer umum.",
                            "Membiarkan akun media sosial tetap terbuka di layar monitor laboratorium.",
                            "Mematikan monitor tanpa menutup sesi login akun pada peramban.",
                        ],
                        'indicator' => "Disajikan penggunaan fasilitas umum, peserta didik mampu menerapkan prosedur penutupan sesi aman.",
                        'sub_level' => "C3 - MOTS (Penerapan Privasi)",
                        'explanation_correct' => "Melakukan logout dan membersihkan cache riwayat peramban mencegah pengguna berikutnya mengakses akun kita.",
                        'explanation_distractors' => "Membiarkan sesi terbuka membuka celah penyalahgunaan akun secara langsung.",
                    ],
                    [
                        'stem' => "Jika seorang teman mengirimkan pesan pribadi yang bersifat rahasia, etika kewargaan digital yang wajib kamu jaga adalah...",
                        'correct' => "Menjaga kerahasiaan pesan tersebut dan tidak menyebarkannya ke ruang publik tanpa izin.",
                        'distractors' => [
                            "Menyebarkan tangkapan layar (screenshot) pesan tersebut ke media sosial untuk konsumsi umum.",
                            "Menjual informasi rahasia tersebut kepada pihak ketiga.",
                            "Mengubah isi pesan rahasia tersebut dan meneruskannya ke grup kelas.",
                        ],
                        'indicator' => "Disajikan komunikasi privat, peserta didik mampu menerapkan kerahasiaan informasi personal.",
                        'sub_level' => "C3 - MOTS (Penerapan Etika)",
                        'explanation_correct' => "Menjaga kerahasiaan komunikasi privat adalah kewajiban etis mendasar warga digital yang bertanggung jawab.",
                        'explanation_distractors' => "Membagikan pesan privat tanpa izin merupakan pelanggaran etika serius.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Seorang siswa menemukan bahwa akun emailnya mengirimkan pesan spam mencurigakan tanpa sepengetahuannya. Langkah analisis dan penanganan terbaik yang harus dilakukan adalah...",
                        'correct' => "Segera mengganti kata sandi akun, memeriksa daftar sesi perangkat yang aktif, dan mengaktifkan verifikasi dua langkah (2FA).",
                        'distractors' => [
                            "Menghapus semua kontak di buku telepon dan tidak lagi menggunakan internet.",
                            "Mengirimkan balasan permohonan maaf ke setiap alamat spam tersebut.",
                            "Memformat ulang harddisk laptop tanpa pernah memperbarui kata sandi akun.",
                        ],
                        'indicator' => "Disajikan insiden kompromi akun, peserta didik mampu menganalisis titik kerentanan dan merumuskan mitigasi.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Keamanan)",
                        'explanation_correct' => "Penggantian kredensial, terminasi sesi liar, dan pengaktifan 2FA merupakan penanganan tuntas pada insiden pembajakan akun.",
                        'explanation_distractors' => "Tindakan pengecoh tidak menyelesaikan akar masalah pembajakan kredensial.",
                    ],
                    [
                        'stem' => "Mengapa mengunggah foto boarding pass pesawat atau tiket konser ke media sosial publik dinilai berbahaya bagi keselamatan data pribadi?",
                        'correct' => "Karena barcode atau QR code pada tiket memuat kode reservasi dan data identitas pribadi yang dapat diekstrak oleh pelaku kejahatan.",
                        'distractors' => [
                            "Karena dapat menyebabkan baterai perangkat ponsel pintar langsung rusak permanen.",
                            "Karena tiket tersebut otomatis menjadi tidak berlaku untuk digunakan bepergian.",
                            "Karena warna foto tiket akan merusak tampilan estetika profil media sosial.",
                        ],
                        'indicator' => "Disajikan studi kasus publikasi tiket, peserta didik mampu menganalisis potensi kebocoran data tersembunyi.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Privasi)",
                        'explanation_correct' => "Barcode/QR code memuat data PII (Personally Identifiable Information) yang rentan dieksploitasi untuk pengambilalihan akun atau penipuan.",
                        'explanation_distractors' => "Pilihan pengecoh mengasumsikan dampak fisik mustahil yang tidak berhubungan dengan data.",
                    ],
                    [
                        'stem' => "Sebuah aplikasi permainan sederhana meminta izin akses ke daftar kontak telepon, kamera, mikrofon, dan lokasi GPS secara penuh. Evaluasi keamanan yang paling tepat adalah...",
                        'correct' => "Permintaan izin tersebut tidak relevan dengan fungsi permainan sehingga berpotensi menyalahgunakan data pribadi dan sebaiknya ditolak.",
                        'distractors' => [
                            "Semua aplikasi permainan memang wajib meminta akses penuh ke kontak dan kamera pengguna.",
                            "Izin harus segera diberikan agar permainan berjalan lebih cepat dan mendapat skor tinggi.",
                            "Aplikasi tersebut pasti aman karena sudah terpasang di perangkat ponsel.",
                        ],
                        'indicator' => "Disajikan izin aplikasi (app permissions), peserta didik mampu mengevaluasi proporsionalitas hak akses data.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Risiko)",
                        'explanation_correct' => "Prinsip 'least privilege' menuntut aplikasi hanya meminta izin yang mutlak diperlukan untuk fungsionalitas intinya.",
                        'explanation_distractors' => "Pilihan pengecoh menormalisasi izin berlebih yang membahayakan privasi pengguna.",
                    ],
                    [
                        'stem' => "Jika kamu menerima pesan informasi mengejutkan yang disertai ajakan 'Sebarkan segera ke seluruh grup', langkah berpikir kritis yang harus kamu ambil adalah...",
                        'correct' => "Memeriksa keaslian sumber berita, tanggal publikasi, serta memverifikasi informasinya melalui situs cek fakta resmi.",
                        'distractors' => [
                            "Langsung membagikan pesan tersebut ke semua grup pertemanan agar menjadi yang pertama memberi kabar.",
                            "Mengubah judul pesan menjadi lebih heboh sebelum meneruskannya ke orang lain.",
                            "Mempercayai pesan tersebut sepenuhnya karena dikirim oleh teman dekat.",
                        ],
                        'indicator' => "Disajikan fenomena disinformasi, peserta didik mampu mengevaluasi validitas informasi digital.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Informasi)",
                        'explanation_correct' => "Klarifikasi melalui sumber otoritatif dan uji silang fakta mencegah penyebaran disinformasi dan hoaks.",
                        'explanation_distractors' => "Tindakan pengecoh merupakan pemicu utama penyebaran kabar bohong di masyarakat.",
                    ],
                    [
                        'stem' => "Apa dampak jangka panjang dari rekam jejak digital (digital footprint) negatif yang ditinggalkan seseorang di media sosial?",
                        'correct' => "Unggahan atau komentar negatif dapat tersimpan permanen dan berpotensi merugikan reputasi serta seleksi pendidikan atau karier di masa depan.",
                        'distractors' => [
                            "Resolusi layar komputer pengguna akan otomatis menurun kualitasnya secara drastis.",
                            "Semua file dokumen di dalam laptop akan berubah format menjadi teks acak.",
                            "Sinyal jaringan internet rumah akan terputus secara otomatis oleh penyedia layanan.",
                        ],
                        'indicator' => "Disajikan konsekuensi jejak digital, peserta didik mampu menganalisis dampak reputasi masa depan.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Dampak)",
                        'explanation_correct' => "Data di internet mudah diarsipkan pihak ketiga dan sering ditinjau dalam proses rekrutmen profesional maupun akademis.",
                        'explanation_distractors' => "Pilihan pengecoh mengarang kerusakan perangkat fisik yang tidak masuk akal.",
                    ],
                    [
                        'stem' => "Analisis risiko dari penggunaan kata sandi yang sama persis untuk semua akun media sosial, surel, dan perbankan digital adalah...",
                        'correct' => "Jika salah satu layanan mengalami kebocoran data, pelaku peretasan dapat dengan mudah membobol seluruh akun lainnya secara bersamaan (credential stuffing).",
                        'distractors' => [
                            "Koneksi internet akan menjadi dua kali lebih lambat saat membuka browser.",
                            "Setiap akun akan saling menggabungkan pesan obrolan secara otomatis.",
                            "Akun-akun tersebut otomatis terhapus dalam waktu dua puluh empat jam.",
                        ],
                        'indicator' => "Disajikan manajemen kata sandi, peserta didik mampu menganalisis kerentanan 'credential stuffing'.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Kerentanan)",
                        'explanation_correct' => "Daur ulang kata sandi (password reuse) memperluas dampak kebocoran satu situs ke seluruh aset digital pengguna.",
                        'explanation_distractors' => "Pilihan pengecoh tidak sesuai dengan cara kerja sistem keamanan digital.",
                    ],
                ];
            }
        }

        if ($domain === 'digital_content') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Format berkas di bawah ini yang paling tepat digunakan untuk menyimpan dokumen siap cetak agar tata letak (layout) teks dan gambar tidak berubah adalah...",
                        'correct' => "PDF (.pdf)",
                        'distractors' => [
                            "TXT (.txt)",
                            "BMP (.bmp)",
                            "HTML (.html)",
                        ],
                        'indicator' => "Disajikan ragam format berkas, peserta didik mampu mengidentifikasi format publikasi dokumen standar.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Format PDF mengunci tata letak, tipografi, dan elemen visual secara konsisten di berbagai perangkat.",
                        'explanation_distractors' => "Format TXT tidak memuat tata letak, sedangkan HTML dan BMP kurang tepat untuk dokumen siap cetak.",
                    ],
                    [
                        'stem' => "Prinsip utama dalam pemilihan warna teks pada slide presentasi agar mudah dibaca oleh penonton dari kejauhan adalah...",
                        'correct' => "Memiliki kontras warna yang tinggi antara warna teks dan warna latar belakang slide.",
                        'distractors' => [
                            "Menggunakan warna teks yang sama persis dengan warna latar belakang.",
                            "Memadukan minimal delapan warna cerah berbeda pada setiap baris kalimat.",
                            "Menggunakan teks berukuran sangat kecil dengan warna abu-abu redup.",
                        ],
                        'indicator' => "Disajikan keterbacaan teks, peserta didik mampu mengidentifikasi prinsip kontras warna.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Kontras yang tinggi (seperti teks gelap di latar terang atau sebaliknya) menjamin keterbacaan optimal.",
                        'explanation_distractors' => "Pilihan lainnya membuat teks menyatu dengan latar atau melelahkan mata pembaca.",
                    ],
                    [
                        'stem' => "Elemen konten digital visual yang paling tepat digunakan untuk menyajikan perbandingan data angka secara ringkas dan menarik adalah...",
                        'correct' => "Grafik atau diagram visual.",
                        'distractors' => [
                            "Paragraf teks yang sangat panjang tanpa tanda titik.",
                            "Rekaman suara audio tanpa tampilan visual.",
                            "Kumpulan tabel angka mentah tanpa judul kolom.",
                        ],
                        'indicator' => "Disajikan bentuk penyajian data, peserta didik mampu memilih elemen visual grafik yang tepat.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Grafik memvisualisasikan data kuantitatif menjadi pola visual yang mudah dan cepat dicerna oleh mata.",
                        'explanation_distractors' => "Paragraf panjang atau tabel mentah membutuhkan waktu lama untuk dipahami pembaca.",
                    ],
                    [
                        'stem' => "Tujuan utama penataan hierarki visual (judul utama besar, subjudul sedang, dan teks isi proporsional) dalam media presentasi adalah...",
                        'correct' => "Membantu audiens mengenali urutan informasi penting dari poin utama hingga ke rincian pendukung.",
                        'distractors' => [
                            "Membuat ukuran tulisan di seluruh lembar slide menjadi seragam tanpa penekanan.",
                            "Memenuhi seluruh bidang slide agar tidak menyisakan ruang kosong.",
                            "Mengaburkan fokus perhatian pembaca agar membaca secara acak.",
                        ],
                        'indicator' => "Disajikan hierarki visual, peserta didik mampu mengidentifikasi fungsi urutan bobot visual.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Hierarki visual memandu arah pandang audiens dalam menyerap informasi secara berjenjang dan logis.",
                        'explanation_distractors' => "Ukuran seragam atau slide yang terlalu padat menyulitkan audiens menangkap poin utama.",
                    ],
                    [
                        'stem' => "Format berkas gambar yang mendukung latar belakang transparan (transparent background) pada desain grafis adalah...",
                        'correct' => "PNG (.png)",
                        'distractors' => [
                            "JPEG (.jpg)",
                            "MP3 (.mp3)",
                            "CSV (.csv)",
                        ],
                        'indicator' => "Disajikan format gambar, peserta didik mampu mengidentifikasi format gambar beralur transparansi.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Format PNG memiliki kanal alfa (alpha channel) yang memungkinkan penyimpanan gambar berlatar transparan.",
                        'explanation_distractors' => "JPEG selalu mengisi latar kosong dengan warna pekat (biasanya putih), sedangkan MP3 dan CSV bukan berkas gambar.",
                    ],
                    [
                        'stem' => "Ciri desain slide presentasi yang terstruktur dan nyaman dipandang adalah...",
                        'correct' => "Memiliki tata letak elemen yang konsisten, jarak antarelemen yang rapi, dan informasi yang terfokus.",
                        'distractors' => [
                            "Memuat semua kalimat dari buku teks secara lengkap tanpa diringkas.",
                            "Menggunakan gambar latar belakang yang ramai sehingga teks sulit dibaca.",
                            "Menggunakan huruf hiasan yang berliku-liku untuk seluruh paragraf.",
                        ],
                        'indicator' => "Disajikan karakteristik desain, peserta didik mampu mengenali ciri tata letak terstruktur.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Konten)",
                        'explanation_correct' => "Konsistensi tata letak dan kebersihan ruang visual menciptakan fokus pemahaman bagi penonton.",
                        'explanation_distractors' => "Pilihan lainnya menurunkan mutu estetika dan mempersulit pemahaman audiens.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Saat kamu diminta menyajikan data kenaikan nilai rata-rata kelas dari semester satu ke semester dua, bentuk penyajian visual yang paling tepat adalah...",
                        'correct' => "Grafik batang (bar chart) atau grafik garis (line chart).",
                        'distractors' => [
                            "Grafik sebaran acak tanpa sumbu keterangan data.",
                            "Diagram lingkaran dengan seratus potongan warna-warni.",
                            "Tabel teks mentah tanpa pengelompokan angka.",
                        ],
                        'indicator' => "Disajikan data berkala, peserta didik mampu menerapkan jenis grafik perbandingan data yang tepat.",
                        'sub_level' => "C3 - MOTS (Penerapan Desain)",
                        'explanation_correct' => "Grafik batang dan garis ideal untuk menunjukkan perbandingan kuantitatif dan tren perkembangan antartahap.",
                        'explanation_distractors' => "Diagram lingkaran atau sebaran acak tidak tepat untuk memperlihatkan tren peningkatan nilai.",
                    ],
                    [
                        'stem' => "Langkah terbaik saat menyisipkan gambar ilustrasi ke dalam slide presentasi agar desain tetap proporsional adalah...",
                        'correct' => "Mengatur ukuran gambar dari sudut gambar secara proporsional dan tidak menutupi teks informasi penting.",
                        'distractors' => [
                            "Menarik gambar dari sisi samping secara paksa hingga bentuk objek menjadi gepeng dan terdistorsi.",
                            "Menumpuk gambar di atas paragraf penjelasan hingga menutupi kalimat utama.",
                            "Memperbesar gambar buram beresolusi rendah hingga menutupi seluruh halaman.",
                        ],
                        'indicator' => "Disajikan penataan gambar, peserta didik mampu menerapkan penskalaan proporsional.",
                        'sub_level' => "C3 - MOTS (Penerapan Desain)",
                        'explanation_correct' => "Penskalaan dari titik sudut (corner handles) menjaga rasio aspek (aspect ratio) gambar tetap utuh dan estetis.",
                        'explanation_distractors' => "Menarik dari samping membuat gambar distorsi gepeng dan merusak keterbacaan materi.",
                    ],
                    [
                        'stem' => "Jika materi presentasimu memuat beberapa poin penjelasan, teknik penyajian terbaik agar materi mudah ditangkap audiens adalah...",
                        'correct' => "Mengemas materi dalam poin-poin ringkas (bullet points) disertai ikon atau gambar pendukung yang relevan.",
                        'distractors' => [
                            "Menyalin seluruh isi bab buku pelajaran ke dalam satu halaman slide.",
                            "Memasang animasi gerakan yang berputar terus-menerus tanpa henti di setiap kata.",
                            "Menghapus semua ilustrasi dan hanya menyisakan teks berwarna abu-abu.",
                        ],
                        'indicator' => "Disajikan materi padat, peserta didik mampu menerapkan teknik peringkasan visual.",
                        'sub_level' => "C3 - MOTS (Penerapan Desain)",
                        'explanation_correct' => "Poin ringkas dan ikon tematik mempercepat daya serap dan mencegah audiens terbebani membaca teks panjang.",
                        'explanation_distractors' => "Teks dinding (wall of text) dan animasi berlebihan mengaburkan pesan utama materi.",
                    ],
                    [
                        'stem' => "Cara paling efektif untuk memastikan materi presentasi multimedia dapat ditampilkan lancar di komputer sekolah tanpa kendala tautan terputus adalah...",
                        'correct' => "Menyimpan file presentasi dan berkas media dalam satu folder terintegrasi serta menyiapkan salinan cadangan format PDF.",
                        'distractors' => [
                            "Hanya mengandalkan tautan online tanpa memeriksa ketersediaan jaringan internet di sekolah.",
                            "Menyimpan file di memori sementara tanpa pernah menyimpan ke media penyimpanan permanen.",
                            "Menghapus seluruh berkas gambar pendukung agar ukuran file presentasi sangat kecil.",
                        ],
                        'indicator' => "Disajikan portabilitas berkas, peserta didik mampu menerapkan pengemasan berkas presentasi terpadu.",
                        'sub_level' => "C3 - MOTS (Penerapan Praktik)",
                        'explanation_correct' => "Pengemasan berkas aset dalam satu folder dan cadangan PDF mengantisipasi masalah tautan hilang dan kompatibilitas sistem.",
                        'explanation_distractors' => "Mengabaikan konektivitas atau menghapus aset visual menggagalkan presentasi.",
                    ],
                    [
                        'stem' => "Kombinasi jenis huruf (font) yang paling rapi dan mudah dibaca untuk slide presentasi formal di depan kelas adalah...",
                        'correct' => "Huruf Sans-serif yang bersih dan jelas untuk teks isi, seperti Calibri, Arial, atau Segoe UI.",
                        'distractors' => [
                            "Huruf sambung dekoratif berliku-liku untuk seluruh isi paragraf presentasi.",
                            "Menggunakan lima jenis huruf yang berbeda gaya dalam satu halaman slide.",
                            "Huruf berukuran sangat kecil di bawah 8pt agar memuat banyak kalimat.",
                        ],
                        'indicator' => "Disajikan tipografi slide, peserta didik mampu memilih keluarga font yang ergonomis.",
                        'sub_level' => "C3 - MOTS (Penerapan Desain)",
                        'explanation_correct' => "Huruf sans-serif memiliki keterbacaan tinggi di layar proyeksi digital berkat garis hurufnya yang bersih dan tegas.",
                        'explanation_distractors' => "Font dekoratif atau kombinasi acak menyebabkan kelelahan mata penonton.",
                    ],
                    [
                        'stem' => "Jika kamu ingin membuat infografis ringkas tentang siklus air, langkah penyusunan visual yang paling runtut adalah...",
                        'correct' => "Menyusun alur tahapan secara berurutan dengan tanda panah pengarah dan teks penjelasan ringkas.",
                        'distractors' => [
                            "Menempatkan semua gambar tahapan secara acak tanpa tanda alur.",
                            "Menuliskan seluruh teks tanpa menyertakan gambar atau ikon pendukung.",
                            "Menumpuk semua gambar siklus dalam satu titik di sudut infografis.",
                        ],
                        'indicator' => "Disajikan penyusunan infografis, peserta didik mampu menerapkan alur visual sekuensial.",
                        'sub_level' => "C3 - MOTS (Penerapan Desain)",
                        'explanation_correct' => "Alur dengan indikator penunjuk arah mempermudah audiens memahami hubungan sebab-akibat antartahapan proses.",
                        'explanation_distractors' => "Penempatan acak atau ketiadaan visual merusak esensi infografis informatif.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Sebuah slide presentasi dikritik audiens karena terlihat sangat padat, membingungkan, dan melelahkan mata. Langkah evaluasi dan perbaikan desain yang paling tepat adalah...",
                        'correct' => "Menerapkan ruang kosong (white space), membagi materi ke dalam beberapa slide, dan meringkas teks menjadi kata kunci inti.",
                        'distractors' => [
                            "Mengecilkan ukuran huruf menjadi setengahnya agar semua teks muat dalam satu slide.",
                            "Menambahkan lebih banyak stiker animasi bergerak di setiap sudut slide.",
                            "Mengubah warna latar belakang menjadi hitam pekat dengan teks warna merah gelap.",
                        ],
                        'indicator' => "Disajikan kasus kepadatan desain, peserta didik mampu mengevaluasi dan merumuskan perbaikan ergonomi visual.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Desain)",
                        'explanation_correct' => "Pemanfaatan white space dan chunking materi menurunkan beban kognitif (cognitive load) audiens.",
                        'explanation_distractors' => "Mengecilkan huruf atau menambah stiker animasi justru memperparah kekacauan visual.",
                    ],
                    [
                        'stem' => "Mengapa infografis dinilai jauh lebih efektif dalam menyampaikan informasi data kompleks dibandingkan teks narasi panjang?",
                        'correct' => "Karena infografis memadukan data visual, struktur hierarki, dan ringkasan teks yang diproses otak secara visual lebih cepat.",
                        'distractors' => [
                            "Karena infografis tidak memuat informasi fakta yang membutuhkan pemikiran serius.",
                            "Karena infografis hanya berfungsi sebagai hiasan dinding tanpa menyampaikan pesan penting.",
                            "Karena ukuran file infografis selalu lebih kecil dibandingkan dokumen teks.",
                        ],
                        'indicator' => "Disajikan komunikasi visual, peserta didik mampu menganalisis keunggulan kognitif media infografis.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Komunikasi)",
                        'explanation_correct' => "Prinsip pemrosesan ganda (dual-coding theory) membuktikan visual dan teks ringkas meningkatkan retensi memori pemirsa.",
                        'explanation_distractors' => "Pilihan lainnya meremehkan substansi ilmiah dan fakta dalam infografis.",
                    ],
                    [
                        'stem' => "Kamu memiliki data persentase alokasi anggaran kas kelas untuk lima kegiatan yang berbeda. Bentuk penyajian visual yang paling tepat dan alasannya adalah...",
                        'correct' => "Diagram lingkaran (pie chart), karena efektif memperlihatkan proporsi setiap bagian terhadap total keseluruhan seratus persen.",
                        'distractors' => [
                            "Grafik garis kontinyu, karena menunjukkan fluktuasi pergerakan data per detik.",
                            "Diagram alur bercabang, karena menunjukkan alur pengambilan keputusan kode program.",
                            "Tabel acak tanpa total persentase, karena tidak memerlukan ketepatan hitungan.",
                        ],
                        'indicator' => "Disajikan data persentase komponen, peserta didik mampu mengevaluasi dan memilih jenis visualisasi data yang tepat.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Visualisasi)",
                        'explanation_correct' => "Diagram lingkaran dirancang khusus untuk memvisualisasikan rasio bagian terhadap keseluruhan (part-to-whole comparison).",
                        'explanation_distractors' => "Grafik garis untuk data waktu, sedangkan diagram alur untuk proses logika instruksi.",
                    ],
                    [
                        'stem' => "Ketika merancang konten presentasi digital untuk audiens yang duduk di baris belakang ruang kelas, pertimbangan tipografi yang paling krusial adalah...",
                        'correct' => "Ukuran font yang memadai (minimal 24–28 pt untuk teks isi) serta keterbacaan kontras yang tajam dari jarak jauh.",
                        'distractors' => [
                            "Warna tulisan yang menyatu dengan latar belakang agar tampak artistik dan samar.",
                            "Penambahan efek bayangan berlapis pada semua kata sehingga huruf terlihat tebal.",
                            "Penggunaan huruf dekoratif ukuran kecil agar slide terisi penuh teks.",
                        ],
                        'indicator' => "Disajikan skenario audiens jarak jauh, peserta didik mampu mengevaluasi kelayakan tipografi keterbacaan.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Tipografi)",
                        'explanation_correct' => "Skala keterbacaan ruang nyata menuntut ukuran font minimum dan kontras tinggi agar pesan sampai ke barisan terjauh.",
                        'explanation_distractors' => "Teks samar atau huruf dekoratif kecil mustahil dibaca dari jarak jauh.",
                    ],
                    [
                        'stem' => "Seorang siswa membuat poster digital tetapi penonton kesulitan membedakan mana pesan utama dan mana informasi tambahan. Analisis kelemahan desain poster tersebut terletak pada...",
                        'correct' => "Kurangnya penegasan hierarki visual pada ukuran judul, tata letak, dan penekanan warna.",
                        'distractors' => [
                            "Penggunaan format penyimpanan file yang menggunakan kompresi standar.",
                            "Pemilihan kertas cetak yang memiliki ukuran standar A4.",
                            "Pencantuman nama pembuat karya di sudut bawah poster.",
                        ],
                        'indicator' => "Disajikan analisis poster gagal fokus, peserta didik mampu mendeteksi ketiadaan hierarki visual.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Desain)",
                        'explanation_correct' => "Ketiadaan kontras ukuran dan penataan fokal menyebabkan seluruh elemen tampak sama penting dan membingungkan pembaca.",
                        'explanation_distractors' => "Pilihan lainnya adalah atribut teknis umum yang tidak menjadi akar masalah hierarki pesan.",
                    ],
                    [
                        'stem' => "Dalam produksi konten digital terintegrasi, mengapa konsistensi palet warna dan gaya elemen visual di sepanjang slide presentasi sangat penting?",
                        'correct' => "Menjaga kesatuan tema visual, memperkuat identitas pesan, dan mencegah kebingungan visual pada audiens.",
                        'distractors' => [
                            "Membuat ukuran file presentasi bertambah besar menjadi bergiga-gita byte.",
                            "Membatasi kreativitas pembuat konten sehingga hasilnya monoton.",
                            "Menjamin bahwa presentasi tidak bisa disunting oleh orang lain.",
                        ],
                        'indicator' => "Disajikan prinsip desain terpadu, peserta didik mampu mengevaluasi nilai konsistensi identitas visual.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Desain)",
                        'explanation_correct' => "Prinsip unity (kesatuan) memastikan seluruh slide dirasakan sebagai satu paket karya yang profesional dan terpadu.",
                        'explanation_distractors' => "Konsistensi bukan pembatas kreativitas, melainkan fondasi kejelasan komunikasi visual.",
                    ],
                ];
            }
        }

        if ($domain === 'computer_system') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Urutan siklus pemrosesan data yang benar pada sistem komputer adalah...",
                        'correct' => "Masukan (Input) -> Pemrosesan (Process) -> Keluaran (Output) -> Penyimpanan (Storage).",
                        'distractors' => [
                            "Keluaran (Output) -> Masukan (Input) -> Pemrosesan (Process) -> Pembersihan.",
                            "Penyimpanan -> Masukan -> Keluaran -> Penghapusan.",
                            "Pemrosesan -> Masukan -> Penyimpanan -> Keluaran.",
                        ],
                        'indicator' => "Disajikan siklus komputer, peserta didik mampu mengurutkan tahapan siklus input-proses-output.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "Siklus I-P-O-S merupakan siklus fundamental komputer dalam mengolah data mentah menjadi informasi bermanfaat.",
                        'explanation_distractors' => "Pilihan lainnya membalik alur logis pengolahan data.",
                    ],
                    [
                        'stem' => "Perangkat keras komputer di bawah ini yang berfungsi sebagai perangkat masukan (input device) adalah...",
                        'correct' => "Keyboard, mouse, dan scanner.",
                        'distractors' => [
                            "Monitor, printer, dan speaker.",
                            "Processor, RAM, dan Motherboard.",
                            "Harddisk, Flashdisk, dan SSD.",
                        ],
                        'indicator' => "Disajikan ragam hardware, peserta didik mampu mengelompokkan perangkat masukan (input).",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "Keyboard, mouse, dan scanner bertugas memasukkan data atau instruksi dari pengguna ke sistem komputer.",
                        'explanation_distractors' => "Monitor/printer adalah output, processor/RAM adalah pemroses/memori, dan SSD adalah media penyimpanan.",
                    ],
                    [
                        'stem' => "Komponen utama komputer yang bertindak sebagai otak untuk mengendalikan instruksi dan memproses perhitungan matematika/logika adalah...",
                        'correct' => "Central Processing Unit (CPU / Processor).",
                        'distractors' => [
                            "Power Supply Unit (PSU).",
                            "Monitor LED.",
                            "Casing Komputer.",
                        ],
                        'indicator' => "Disajikan fungsi komponen, peserta didik mampu mengidentifikasi peran CPU.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "CPU adalah unit pemroses pusat yang mengeksekusi instruksi aritmatika dan logika program.",
                        'explanation_distractors' => "PSU menyalurkan daya listrik, monitor menampilkan gambar, dan casing melindungi fisik komponen.",
                    ],
                    [
                        'stem' => "Memori utama komputer yang berfungsi menyimpan data dan instruksi sementara saat komputer sedang beroperasi adalah...",
                        'correct' => "Random Access Memory (RAM).",
                        'distractors' => [
                            "Read Only Memory (ROM).",
                            "Compact Disc (CD).",
                            "Flashdisk USB.",
                        ],
                        'indicator' => "Disajikan jenis memori, peserta didik mampu mengidentifikasi karakteristik memori kerja RAM.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "RAM menyimpan data sementara (volatile) yang sedang diproses langsung oleh processor.",
                        'explanation_distractors' => "ROM berisi instruksi booting permanen, sedangkan CD dan Flashdisk adalah penyimpanan eksternal.",
                    ],
                    [
                        'stem' => "Perangkat keras yang bertugas menampilkan informasi visual hasil pengolahan data komputer kepada pengguna adalah...",
                        'correct' => "Monitor.",
                        'distractors' => [
                            "Mikrofon.",
                            "Motherboard.",
                            "Harddisk internal.",
                        ],
                        'indicator' => "Disajikan perangkat keluaran, peserta didik mampu mengidentifikasi fungsi monitor.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "Monitor adalah perangkat output visual utama untuk menampilkan antarmuka grafis kepada pengguna.",
                        'explanation_distractors' => "Mikrofon adalah input audio, motherboard papan sirkuit, dan harddisk media penyimpanan.",
                    ],
                    [
                        'stem' => "Papan sirkuit utama yang menjadi tempat terhubungnya seluruh komponen komputer seperti CPU, RAM, dan kartu grafis disebut...",
                        'correct' => "Motherboard (Mainboard).",
                        'distractors' => [
                            "Sound Card.",
                            "Heatsink Fan.",
                            "Optical Drive.",
                        ],
                        'indicator' => "Disajikan arsitektur komputer, peserta didik mampu mengenali motherboard sebagai papan induk.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Sistem)",
                        'explanation_correct' => "Motherboard menjadi tulang punggung penghubung jalur komunikasi data antarkomponen perangkat keras.",
                        'explanation_distractors' => "Sound card mengolah suara, heatsink mendinginkan suhu, dan optical drive membaca piringan cakram.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Saat kamu mengetik huruf pada keyboard dan huruf tersebut langsung tampil di layar monitor, alur interaksi antarkomponen yang terjadi adalah...",
                        'correct' => "Keyboard mengirim sinyal input -> CPU memproses kode karakter -> GPU/Monitor menampilkan output visual.",
                        'distractors' => [
                            "Monitor mengirim instruksi langsung ke keyboard tanpa melalui CPU.",
                            "RAM langsung mencetak huruf ke printer tanpa melewati proses CPU.",
                            "Power supply mengubah huruf menjadi gambar tanpa bantuan processor.",
                        ],
                        'indicator' => "Disajikan skenario pengetikan, peserta didik mampu menerapkan alur interaksi komponen I-P-O.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "Interaksi komputer selalu mengalir dari perangkat input menuju CPU/pengolah sebelum dikirim ke penampil output.",
                        'explanation_distractors' => "Pilihan pengecoh mengabaikan peran sentral pemrosesan CPU.",
                    ],
                    [
                        'stem' => "Jika kamu ingin menyimpan dokumen tugas agar tetap ada dan tidak hilang saat komputer dimatikan, tindakan yang tepat adalah...",
                        'correct' => "Menyimpan file ke dalam media penyimpanan sekunder (storage) seperti SSD atau Harddisk.",
                        'distractors' => [
                            "Membiarkan dokumen hanya berada di dalam memori sementara RAM.",
                            "Mencabut kabel power komputer secara langsung dari stopkontak.",
                            "Menutup aplikasi lembar kerja tanpa menekan tombol Simpan (Save).",
                        ],
                        'indicator' => "Disajikan penyimpanan berkas, peserta didik mampu menerapkan penyimpanan non-volatile.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "Penyimpanan sekunder (SSD/HDD) bersifat non-volatile sehingga data tetap tersimpan saat aliran daya mati.",
                        'explanation_distractors' => "Membiarkan di RAM atau mencabut daya menyebabkan kehilangan data secara permanen.",
                    ],
                    [
                        'stem' => "Perangkat keras yang tepat dihubungkan ke komputer jika seorang guru ingin memproyeksikan tampilan layar laptop ke dinding kelas agar terlihat oleh seluruh siswa adalah...",
                        'correct' => "Proyektor LCD (LCD Projector).",
                        'distractors' => [
                            "Scanner gambar.",
                            "Webcam.",
                            "Barcode reader.",
                        ],
                        'indicator' => "Disajikan kebutuhan presentasi kelas, peserta didik mampu memilih perangkat keluaran proyektor.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "Proyektor LCD memproyeksikan sinyal video keluaran ke bidang layar lebar yang dapat dilihat massal.",
                        'explanation_distractors' => "Scanner, webcam, dan barcode reader adalah perangkat masukan (input).",
                    ],
                    [
                        'stem' => "Fungsi utama dari sistem operasi (seperti Windows, Linux, atau macOS) dalam sistem komputer adalah...",
                        'correct' => "Mengelola sumber daya perangkat keras dan menjembatani komunikasi dengan perangkat lunak aplikasi pengguna.",
                        'distractors' => [
                            "Menyuplai aliran listrik tegangan tinggi ke komponen motherboard.",
                            "Mendinginkan processor saat suhu perangkat naik drastis.",
                            "Membersihkan debu fisik dari dalam komponen laptop.",
                        ],
                        'indicator' => "Disajikan peran sistem operasi, peserta didik mampu menjelaskan fungsi manajemen sistem operasi.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "Sistem operasi bertindak sebagai jembatan pengendali perangkat keras agar aplikasi dapat berjalan teratur.",
                        'explanation_distractors' => "Pilihan lainnya merupakan fungsi fisik kelistrikan atau perawatan perangkat keras.",
                    ],
                    [
                        'stem' => "Ketika komputer mulai terasa melambat saat membuka banyak aplikasi secara bersamaan (multitasking), komponen yang paling berpengaruh terhadap kapasitas tampung aplikasi aktif tersebut adalah...",
                        'correct' => "Kapasitas Random Access Memory (RAM).",
                        'distractors' => [
                            "Resolusi lensa kamera webcam.",
                            "Panjang kabel mouse yang digunakan.",
                            "Daya output speaker audio.",
                        ],
                        'indicator' => "Disajikan skenario multitasking, peserta didik mampu mengidentifikasi peran kapasitas RAM.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "RAM menampung proses seluruh aplikasi aktif; kapasitas yang mencukupi mencegah komputer mengalami paging lambat.",
                        'explanation_distractors' => "Webcam, mouse, dan speaker tidak memengaruhi performa penampungan memori komputasi.",
                    ],
                    [
                        'stem' => "Jika kamu ingin mencetak hasil ketikan tugas dokumen komputer ke atas lembar kertas fisik, perangkat keluaran yang kamu gunakan adalah...",
                        'correct' => "Printer.",
                        'distractors' => [
                            "Plotter digital.",
                            "Scanner.",
                            "Microphone.",
                        ],
                        'indicator' => "Disajikan pencetakan dokumen, peserta didik mampu memilih perangkat keluaran printer fisik.",
                        'sub_level' => "C3 - MOTS (Penerapan Sistem)",
                        'explanation_correct' => "Printer adalah perangkat keluaran keras (hard copy) standar untuk mencetak teks dan gambar pada kertas.",
                        'explanation_distractors' => "Scanner dan mikrofon adalah perangkat input, sedangkan plotter untuk cetak cetak biru berukuran raksasa.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Komputer seorang siswa menyala normal tetapi monitor tidak menampilkan gambar apa pun (layar hitam kosong), padahal lampu daya CPU aktif. Langkah analisis pertama yang paling tepat adalah...",
                        'correct' => "Memeriksa kabel koneksi video (HDMI/VGA) antara monitor dan CPU serta memastikan monitor terhubung ke sumber daya.",
                        'distractors' => [
                            "Segera membeli processor baru dan membongkar motherboard.",
                            "Menghapus sistem operasi dari dalam media penyimpanan.",
                            "Mengganti keyboard dan mouse dengan tipe yang baru.",
                        ],
                        'indicator' => "Disajikan kendala layar mati, peserta didik mampu menganalisis troubleshooting koneksi display output.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Masalah)",
                        'explanation_correct' => "Troubleshooting logis dimulai dari verifikasi kabel sinyal tampilan dan pasokan daya monitor sebelum menduga kerusakan komponen internal.",
                        'explanation_distractors' => "Membeli processor baru atau menghapus sistem operasi adalah tindakan prematur tanpa dasar analisis.",
                    ],
                    [
                        'stem' => "Mengapa sistem komputer tetap memerlukan media penyimpanan sekunder (seperti SSD/HDD) meskipun kecepatan baca RAM jauh lebih cepat?",
                        'correct' => "Karena RAM bersifat volatile (data hilang saat aliran listrik mati), sedangkan SSD bersifat non-volatile (data tersimpan permanen).",
                        'distractors' => [
                            "Karena SSD bertugas mengeksekusi instruksi logika aritmatika menggantikan CPU.",
                            "Karena RAM hanya bisa menyimpan berkas suara dan tidak bisa menyimpan teks.",
                            "Karena SSD tidak memerlukan aliran listrik sama sekali untuk bekerja di komputer.",
                        ],
                        'indicator' => "Disajikan perbandingan memori, peserta didik mampu mengevaluasi perbedaan sifat retensi data memori primer dan sekunder.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Arsitektur)",
                        'explanation_correct' => "Sifat volatile RAM mengharuskan adanya media penyimpanan permanen (non-volatile) untuk menjaga integritas data jangka panjang.",
                        'explanation_distractors' => "SSD tidak mengeksekusi instruksi aritmatika CPU dan RAM dapat menyimpan segala tipe data digital.",
                    ],
                    [
                        'stem' => "Jika kipas pendingin (heatsink fan) pada processor berhenti berputar atau tersumbat debu tebal, akibat yang akan dialami sistem komputer adalah...",
                        'correct' => "Suhu processor melonjak tinggi (overheating) sehingga performa melambat drastis atau komputer mati mendadak untuk melindungi sirkuit.",
                        'distractors' => [
                            "Kapasitas RAM akan bertambah dua kali lipat secara otomatis.",
                            "Resolusi tampilan layar monitor akan berubah menjadi format hitam putih permanen.",
                            "Kecepatan jaringan internet pada komputer akan meningkat drastis.",
                        ],
                        'indicator' => "Disajikan kegagalan pendinginan, peserta didik mampu menganalisis fenomena thermal throttling dan shutdown protektif.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Kausalitas)",
                        'explanation_correct' => "Panas berlebih memicu thermal throttling (penurunan clockspeed otomatis) dan thermal shutdown guna mencegah kerusakan fisik silikon CPU.",
                        'explanation_distractors' => "Pilihan pengecoh mengasumsikan fenomena aneh yang mustahil secara teknis.",
                    ],
                    [
                        'stem' => "Seorang siswa memasukkan data angka pada aplikasi lembar kerja, namun hasil penjumlahan salah karena rumusnya keliru. Analisis komponen yang mengalami kesalahan adalah...",
                        'correct' => "Logika instruksi pengguna atau perangkat lunak (software/brainware), karena perangkat keras (hardware) hanya memproses instruksi yang diberikan.",
                        'distractors' => [
                            "Kabel daya listrik komputer karena memberikan tegangan listrik yang kurang.",
                            "Layar monitor karena sengaja mengubah angka yang ditampilkan.",
                            "Motherboard karena menolak membaca angka desimal.",
                        ],
                        'indicator' => "Disajikan kesalahan hitung rumus, peserta didik mampu memisahkan peran logika software/brainware dan eksekusi hardware.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Masalah)",
                        'explanation_correct' => "Prinsip GIGO (Garbage In, Garbage Out) menegaskan perangkat keras memproses data secara patuh sesuai rumus instruksi yang dimasukkan.",
                        'explanation_distractors' => "Hardware fisik tidak bertanggung jawab atas kesalahan sintaksis atau logika rumus yang diketik manusia.",
                    ],
                    [
                        'stem' => "Perbedaan mendasar antara Solid State Drive (SSD) dan Hard Disk Drive (HDD) dalam kinerja pemrosesan data komputer adalah...",
                        'correct' => "SSD menggunakan chip memori flash tanpa komponen bergerak sehingga kecepatan akses datanya jauh lebih tinggi dibandingkan HDD bermagnetik piringan.",
                        'distractors' => [
                            "HDD lebih cepat karena piringan logamnya berputar dengan kecepatan tinggi tanpa henti.",
                            "SSD hanya dapat digunakan untuk menyimpan file gambar dan bukan sistem operasi.",
                            "HDD tidak memerlukan ruang pemasangan pada casing komputer.",
                        ],
                        'indicator' => "Disajikan teknologi storage, peserta didik mampu mengevaluasi keunggulan performa teknologi SSD.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Teknologi)",
                        'explanation_correct' => "Ketiadaan latensi mekanis pada chip semikonduktor flash membuat kecepatan baca/tulis acak SSD melampaui piringan putar HDD.",
                        'explanation_distractors' => "Pilihan lainnya salah mengidentifikasi mekanisme mekanis dan batas fungsional storage.",
                    ],
                    [
                        'stem' => "Jika kapasitas RAM sebuah komputer hampir penuh saat menjalankan program grafis berat, solusi optimal tanpa harus mengganti komputer adalah...",
                        'correct' => "Menutup aplikasi latar belakang yang tidak digunakan atau meningkatkan kapasitas keping memori RAM.",
                        'distractors' => [
                            "Menurunkan kecerahan layar monitor hingga batas paling redup.",
                            "Memformat ulang keyboard dan mouse melalui pengaturan kontrol panel.",
                            "Mencabut kabel jaringan internet selama menjalankan aplikasi grafis.",
                        ],
                        'indicator' => "Disajikan keterbatasan sumber daya RAM, peserta didik mampu merumuskan solusi optimal peningkatan kinerja.",
                        'sub_level' => "{$subLevel} - HOTS (Pemecahan Masalah)",
                        'explanation_correct' => "Mengosongkan alokasi memori kerja dari proses latar atau menambah RAM fisik secara langsung menyelesaikan bottleneck memori.",
                        'explanation_distractors' => "Pilihan lainnya tidak membebaskan ruang memori utama komputer sama sekali.",
                    ],
                ];
            }
        }

        if ($domain === 'algorithm_coding') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Pengertian algoritma yang paling tepat dalam ilmu komputer adalah...",
                        'correct' => "Urutan langkah-langkah logis dan sistematis untuk memecahkan suatu masalah atau mencapai tujuan tertentu.",
                        'distractors' => [
                            "Kumpulan kabel jaringan yang menghubungkan komputer ke internet.",
                            "Daftar harga suku cadang perangkat keras di toko komputer.",
                            "Tampilan latar belakang layar desktop komputer.",
                        ],
                        'indicator' => "Disajikan konsep dasar, peserta didik mampu mendefinisikan pengertian algoritma.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Algoritma adalah serangkaian instruksi terdefinisi dengan jelas yang diproses secara bertahap untuk menghasilkan luaran tertentu.",
                        'explanation_distractors' => "Pilihan lainnya merujuk pada perangkat keras atau antarmuka visual biasa.",
                    ],
                    [
                        'stem' => "Simbol bangun belah ketupat (diamond) pada bagan alir (flowchart) berfungsi untuk melambangkan...",
                        'correct' => "Pengambilan keputusan atau kondisi percabangan (decision).",
                        'distractors' => [
                            "Titik awal atau akhir program (terminator).",
                            "Proses perhitungan matematika biasa (process).",
                            "Aliran data masukan dari keyboard (input).",
                        ],
                        'indicator' => "Disajikan simbol flowchart, peserta didik mampu mengidentifikasi simbol percabangan keputusan.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Simbol belah ketupat mengevaluasi kondisi logis (Ya/Tidak) yang menentukan percabangan alur program.",
                        'explanation_distractors' => "Terminator berbentuk elips/kapsul, proses berbentuk persegi panjang, dan input berbentuk jajar genjang.",
                    ],
                    [
                        'stem' => "Struktur kontrol dalam pemrograman yang berfungsi untuk menjalankan instruksi yang sama secara berulang-ulang selama kondisi terpenuhi disebut...",
                        'correct' => "Perulangan (Looping).",
                        'distractors' => [
                            "Percabangan (Branching).",
                            "Variabel (Variable).",
                            "Komentar (Comment).",
                        ],
                        'indicator' => "Disajikan struktur kontrol, peserta didik mampu mengenali konsep perulangan (loop).",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Perulangan mengulang blok kode otomatis hingga syarat terminasi tercapai.",
                        'explanation_distractors' => "Percabangan memilih alur alternatif, variabel menyimpan data, dan komentar adalah catatan kode.",
                    ],
                    [
                        'stem' => "Tempat dalam memori program komputer yang digunakan untuk menampung nilai data yang dapat berubah selama program berjalan disebut...",
                        'correct' => "Variabel (Variable).",
                        'distractors' => [
                            "Konstanta statis.",
                            "Kabel data.",
                            "Tipe monitor.",
                        ],
                        'indicator' => "Disajikan konsep pemrograman, peserta didik mampu mengidentifikasi pengertian variabel.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Variabel adalah pengenal bernama yang menyimpan nilai dinamis dalam memori aplikasi.",
                        'explanation_distractors' => "Konstanta bernilai tetap yang tidak dapat diubah, sedangkan kabel data dan monitor adalah fisik.",
                    ],
                    [
                        'stem' => "Tipe data yang hanya dapat bernilai Benar (True) atau Salah (False) dalam logika pemrograman adalah...",
                        'correct' => "Boolean.",
                        'distractors' => [
                            "Integer.",
                            "String.",
                            "Float.",
                        ],
                        'indicator' => "Disajikan jenis tipe data, peserta didik mampu mengidentifikasi tipe data Boolean.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Boolean hanya merepresentasikan nilai kebenaran biner: True (1) atau False (0).",
                        'explanation_distractors' => "Integer untuk bilangan bulat, String untuk teks, dan Float untuk bilangan desimal.",
                    ],
                    [
                        'stem' => "Simbol persegi panjang pada diagram alir (flowchart) melambangkan...",
                        'correct' => "Proses pemrosesan atau perhitungan data (process).",
                        'distractors' => [
                            "Titik mulai atau selesai program.",
                            "Kondisi percabangan ya atau tidak.",
                            "Masukan data manual dari keyboard.",
                        ],
                        'indicator' => "Disajikan bagan alir, peserta didik mampu mengidentifikasi fungsi simbol proses.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Algoritma)",
                        'explanation_correct' => "Persegi panjang digunakan untuk operasi penugasan nilai, manipulasi data, atau operasi aritmatika.",
                        'explanation_distractors' => "Pilihan lainnya diwakili oleh kapsul terminator, belah ketupat, dan jajar genjang.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Jika lampu lalu lintas menyala merah maka kendaraan berhenti, jika menyala hijau maka jalan. Struktur logika algoritma yang tepat untuk kasus ini adalah...",
                        'correct' => "Percabangan kondisi (IF - ELSE).",
                        'distractors' => [
                            "Perulangan tanpa henti (Infinite Loop).",
                            "Pengurutan gelembung (Bubble Sort).",
                            "Deklarasi fungsi rekursif.",
                        ],
                        'indicator' => "Disajikan skenario rambu lalu lintas, peserta didik mampu menerapkan struktur percabangan IF-ELSE.",
                        'sub_level' => "C3 - MOTS (Penerapan Algoritma)",
                        'explanation_correct' => "Kondisi pengambilan keputusan berbasis aturan syarat logis membutuhkan percabangan IF-ELSE.",
                        'explanation_distractors' => "Perulangan atau algoritma pengurutan tidak cocok untuk pemilihan keputusan alternatif.",
                    ],
                    [
                        'stem' => "Langkah pertama yang paling tepat dilakukan seorang programmer sebelum mulai mengetik baris kode program di komputer adalah...",
                        'correct' => "Menganalisis permasalahan dan merancang alur logika algoritma penyelesaiannya.",
                        'distractors' => [
                            "Langsung mengompilasi lembar kode yang masih kosong.",
                            "Mematikan sambungan daya komputer dan menutup buku panduan.",
                            "Mengunggah program yang belum selesai dibuat ke toko aplikasi.",
                        ],
                        'indicator' => "Disajikan metodologi pembuatan program, peserta didik mampu menerapkan fase perancangan algoritma.",
                        'sub_level' => "C3 - MOTS (Penerapan Prosedural)",
                        'explanation_correct' => "Perancangan logika yang matang mencegah kesalahan arsitektural saat tahap implementasi koding berlangsung.",
                        'explanation_distractors' => "Mengompilasi lembar kosong atau langsung menerbitkan aplikasi merupakan langkah tidak masuk akal.",
                    ],
                    [
                        'stem' => "Diberikan algoritma: Nilai A = 5, Nilai B = 3. Kemudian dieksekusi perintah: A = A + B. Berapakah nilai akhir dari variabel A?",
                        'correct' => "8",
                        'distractors' => [
                            "5",
                            "3",
                            "15",
                        ],
                        'indicator' => "Disajikan operasi penugasan variabel, peserta didik mampu menghitung nilai luaran operasi aritmatika.",
                        'sub_level' => "C3 - MOTS (Penerapan Perhitungan)",
                        'explanation_correct' => "Variabel A menampung hasil 5 + 3, sehingga nilai variabel A kini diperbarui menjadi 8.",
                        'explanation_distractors' => "Pilihan 5 dan 3 adalah nilai sebelum penambahan, sedangkan 15 hasil perkalian.",
                    ],
                    [
                        'stem' => "Proses melacak dan memperbaiki kesalahan atau galat (bug) di dalam kode program disebut...",
                        'correct' => "Debugging.",
                        'distractors' => [
                            "Rendering.",
                            "Booting.",
                            "Formatting.",
                        ],
                        'indicator' => "Disajikan perbaikan kode, peserta didik mampu mengidentifikasi aktivitas debugging.",
                        'sub_level' => "C3 - MOTS (Penerapan Praktik)",
                        'explanation_correct' => "Debugging melibatkan investigasi alur kode, identifikasi penyebab bug, dan penyuntingan kode solusi.",
                        'explanation_distractors' => "Rendering untuk pemrosesan grafis, booting menyalakan komputer, dan formatting membersihkan drive.",
                    ],
                    [
                        'stem' => "Jika kamu ingin mencetak teks kalimat 'Tetap Semangat!' sebanyak 50 kali secara otomatis, struktur logika terbaik yang digunakan adalah...",
                        'correct' => "Menggunakan struktur perulangan (For / While loop) dengan pencacah angka hingga 50.",
                        'distractors' => [
                            "Mengetik perintah cetak secara manual satu per satu sebanyak 50 baris kalimat.",
                            "Menggunakan struktur percabangan IF bersarang 50 tingkatan.",
                            "Menghapus deklarasi variabel teks dari dalam kode program.",
                        ],
                        'indicator' => "Disajikan kebutuhan repetisi teks, peserta didik mampu menerapkan struktur perulangan teratur.",
                        'sub_level' => "C3 - MOTS (Penerapan Algoritma)",
                        'explanation_correct' => "Looping mengotomatiskan eksekusi perintah berulang dengan ringkas dan hemat baris kode.",
                        'explanation_distractors' => "Mengetik manual 50 baris atau menyusun IF bersarang sangat tidak efisien dan rentan galat.",
                    ],
                    [
                        'stem' => "Urutan tahapan pembuatan program komputer yang sistematis dan benar adalah...",
                        'correct' => "Analisis Masalah -> Perancangan Algoritma -> Penulisan Kode (Coding) -> Pengujian (Testing).",
                        'distractors' => [
                            "Pengujian -> Analisis Masalah -> Penulisan Kode -> Perancangan Algoritma.",
                            "Penulisan Kode -> Publikasi -> Analisis Masalah -> Perancangan Algoritma.",
                            "Perancangan Algoritma -> Publikasi -> Pengujian -> Analisis Masalah.",
                        ],
                        'indicator' => "Disajikan siklus hidup program, peserta didik mampu mengurutkan alur pengembangan software.",
                        'sub_level' => "C3 - MOTS (Penerapan Prosedural)",
                        'explanation_correct' => "Siklus baku rekayasa perangkat lunak dimulai dari analisis kebutuhan hingga pengujian mutu hasil karya.",
                        'explanation_distractors' => "Pilihan lainnya memutarbalikkan logika proses rekayasa sistem.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Sebuah program mengalami kondisi perulangan tak terhingga (infinite loop) sehingga komputer membeku. Analisis penyebab utama dari masalah ini adalah...",
                        'correct' => "Kondisi henti perulangan tidak pernah bernilai False karena nilai variabel pencacah tidak bertambah atau tidak diperbarui.",
                        'distractors' => [
                            "Kapasitas ruang penyimpanan harddisk sekunder komputer habis.",
                            "Pengguna menekan tombol spasi keyboard dengan terlalu cepat.",
                            "Warna antarmuka grafis program terlalu terang.",
                        ],
                        'indicator' => "Disajikan anomali infinite loop, peserta didik mampu menganalisis kesalahan terminasi logika perulangan.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Logika)",
                        'explanation_correct' => "Ketiadaan pembaruan counter membuat kondisi syarat terus terpenuhi (True) sehingga loop tidak pernah berhenti.",
                        'explanation_distractors' => "Pilihan pengecoh mengasumsikan faktor hardware dan grafis yang tidak memengaruhi logika loop.",
                    ],
                    [
                        'stem' => "Diberikan aturan logika: 'JIKA nilai >= 75 MAKA Lulus, SELAIN ITU Remedial'. Jika siswa bernama Budi memperoleh nilai 75, apa hasil luaran program dan alasannya?",
                        'correct' => "Lulus, karena nilai 75 memenuhi syarat kondisi lebih besar atau sama dengan (>=) 75.",
                        'distractors' => [
                            "Remedial, karena nilai 75 belum melampaui angka 75.",
                            "Program galat, karena angka 75 tidak dapat dibandingkan oleh logika komputer.",
                            "Program berhenti, karena tidak ada penanganan untuk angka yang nilainya sama.",
                        ],
                        'indicator' => "Disajikan operator perbandingan, peserta didik mampu mengevaluasi nilai ambang batas logika percabangan.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Logika)",
                        'explanation_correct' => "Operator relasional '>=' mencakup nilai batas pembanding sehingga angka 75 valid menghasilkan kondisi Lulus.",
                        'explanation_distractors' => "Pilihan lainnya salah memahami arti inklusif dari operator '>='.",
                    ],
                    [
                        'stem' => "Dua algoritma menghasilkan luaran yang sama persis. Algoritma A membutuhkan 10 langkah operasi, sedangkan Algoritma B membutuhkan 1.000 langkah operasi. Evaluasi yang tepat adalah...",
                        'correct' => "Algoritma A jauh lebih efisien karena membutuhkan waktu eksekusi dan pemakaian sumber daya komputasi yang lebih hemat.",
                        'distractors' => [
                            "Algoritma B lebih unggul karena memiliki lebih banyak baris kode sehingga terlihat lebih canggih.",
                            "Kedua algoritma sama efisiennya karena hasil akhir keduanya sama persis.",
                            "Algoritma A pasti memiliki galat karena jumlah langkahnya terlalu sedikit.",
                        ],
                        'indicator' => "Disajikan komparasi algoritma, peserta didik mampu mengevaluasi kompleksitas efisiensi komputasi.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Kompleksitas)",
                        'explanation_correct' => "Efisiensi algoritma diukur dari jumlah langkah eksekusi waktu (time complexity) dan memori yang dipakai.",
                        'explanation_distractors' => "Banyaknya baris kode yang boros operasi justru menandakan algoritma yang tidak efisien.",
                    ],
                    [
                        'stem' => "Mengapa dekomposisi (memecah masalah besar menjadi submasalah kecil) merupakan keterampilan krusial dalam berpikir komputasional?",
                        'correct' => "Karena memecah masalah membuat setiap bagian lebih sederhana untuk dianalisis, dirancang logikanya, dan diuji secara terpisah.",
                        'distractors' => [
                            "Karena komputer menolak memproses permasalahan yang memiliki lebih dari satu baris instruksi.",
                            "Agar kita bisa menghindari kewajiban merancang kode program sama sekali.",
                            "Supaya ukuran kapasitas file kode program menjadi berlipat ganda lebih besar.",
                        ],
                        'indicator' => "Disajikan konsep computational thinking, peserta didik mampu menganalisis peran teknik dekomposisi masalah.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Komputasional)",
                        'explanation_correct' => "Dekomposisi mereduksi kompleksitas sistem sehingga penyelesaian per modul lebih terfokus dan mudah di-debug.",
                        'explanation_distractors' => "Pilihan lainnya menyimpang dari esensi metodologi berpikir komputasional.",
                    ],
                    [
                        'stem' => "Perbedaan mendasar antara kesalahan sintaksis (syntax error) dan kesalahan logika (logic error) dalam pemrograman adalah...",
                        'correct' => "Syntax error melanggar aturan tata bahasa kode sehingga program gagal dijalankan, sedangkan logic error program tetap berjalan tetapi hasil akhirnya salah.",
                        'distractors' => [
                            "Syntax error membuat komputer mati mendadak, sedangkan logic error membuat layar monitor berkedip.",
                            "Syntax error hanya terjadi pada komputer lama, sedangkan logic error terjadi pada ponsel cerdas modern.",
                            "Syntax error dapat diperbaiki otomatis oleh browser tanpa campur tangan programmer.",
                        ],
                        'indicator' => "Disajikan taksonomi galat program, peserta didik mampu membedakan syntax error dan logic error.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Galat)",
                        'explanation_correct' => "Syntax error ditolak parser compiler/interpreter, sedangkan logic error lolos kompilasi namun menghasilkan keluaran keliru.",
                        'explanation_distractors' => "Pilihan lainnya mengarang dampak fisik yang keliru.",
                    ],
                    [
                        'stem' => "Jika seorang siswa membuat program kalkulator dan saat memasukkan pembagian dengan angka nol program langsung macet (crash), evaluasi penanganan yang perlu ditambahkan adalah...",
                        'correct' => "Menambahkan validasi kondisi IF untuk mengecek jika angka pembagi sama dengan nol maka tampilkan peringatan 'Pembagi tidak boleh nol'.",
                        'distractors' => [
                            "Mengganti jenis monitor komputer dengan monitor beresolusi lebih tinggi.",
                            "Menghapus seluruh tombol angka pada tampilan antarmuka kalkulator.",
                            "Mematikan fitur perhitungan perkalian dan pengurangan pada kalkulator.",
                        ],
                        'indicator' => "Disajikan penanganan exception pembagian nol, peserta didik mampu merancang validasi error handling.",
                        'sub_level' => "{$subLevel} - HOTS (Perancangan Solusi)",
                        'explanation_correct' => "Pencegahan division by zero memerlukan validasi input (defensive programming) sebelum operasi aritmatika dieksekusi.",
                        'explanation_distractors' => "Pilihan lainnya tidak menyelesaikan akar penyebab crash perhitungan matematika.",
                    ],
                ];
            }
        }

        if ($domain === 'data_analysis') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Fungsi rumus pada aplikasi lembar sebar (spreadsheet) yang digunakan untuk menjumlahkan sekumpulan data angka adalah...",
                        'correct' => "=SUM(...)",
                        'distractors' => [
                            "=AVERAGE(...)",
                            "=MAX(...)",
                            "=COUNT(...)",
                        ],
                        'indicator' => "Disajikan fungsi rumus spreadsheet, peserta didik mampu mengidentifikasi fungsi SUM.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Fungsi =SUM digunakan untuk menjumlahkan total seluruh nilai numerik dalam rentang sel yang ditentukan.",
                        'explanation_distractors' => "AVERAGE untuk rata-rata, MAX untuk nilai terbesar, dan COUNT untuk menghitung frekuensi sel angka.",
                    ],
                    [
                        'stem' => "Fungsi rumus lembar sebar yang digunakan untuk menghitung nilai rata-rata dari sekumpulan data angka adalah...",
                        'correct' => "=AVERAGE(...)",
                        'distractors' => [
                            "=SUM(...)",
                            "=MIN(...)",
                            "=IF(...)",
                        ],
                        'indicator' => "Disajikan fungsi rumus spreadsheet, peserta didik mampu mengidentifikasi fungsi AVERAGE.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Fungsi =AVERAGE membagi jumlah total nilai dengan banyaknya data secara otomatis.",
                        'explanation_distractors' => "SUM untuk penjumlahan total, MIN untuk nilai terkecil, dan IF untuk logika syarat.",
                    ],
                    [
                        'stem' => "Kotak pertemuan antara kolom huruf vertikal dan baris angka horizontal pada lembar kerja spreadsheet disebut...",
                        'correct' => "Sel (Cell).",
                        'distractors' => [
                            "Range.",
                            "Toolbar.",
                            "Ribbon.",
                        ],
                        'indicator' => "Disajikan elemen lembar kerja, peserta didik mampu mengenali pengertian sel (cell).",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Sel adalah unit terkecil tempat memasukkan data yang diidentifikasi oleh koordinat kolom dan baris (contoh: B4).",
                        'explanation_distractors' => "Range adalah kumpulan beberapa sel, sedangkan toolbar/ribbon adalah deretan menu perintah.",
                    ],
                    [
                        'stem' => "Fitur yang digunakan untuk mengurutkan data dari nilai terkecil ke terbesar (A ke Z) pada tabel spreadsheet adalah...",
                        'correct' => "Sort Ascending.",
                        'distractors' => [
                            "Filter.",
                            "Merge Cells.",
                            "Wrap Text.",
                        ],
                        'indicator' => "Disajikan pengorganisasian data, peserta didik mampu mengidentifikasi fitur Sort Ascending.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Sort Ascending menyusun data dari urutan terendah ke tertinggi atau abjad A menuju Z.",
                        'explanation_distractors' => "Filter menyaring baris data, Merge Cells menggabungkan sel, dan Wrap Text melipat teks panjang.",
                    ],
                    [
                        'stem' => "Fitur pada lembar sebar yang berfungsi menyaring dan menampilkan baris data tertentu saja yang memenuhi kriteria adalah...",
                        'correct' => "Filter.",
                        'distractors' => [
                            "Delete.",
                            "Underline.",
                            "Zoom.",
                        ],
                        'indicator' => "Disajikan manipulasi data, peserta didik mampu mengenali fungsi Filter.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Fitur Filter membatasi tampilan baris lembar kerja hanya pada baris yang sesuai dengan parameter syarat yang dipilih.",
                        'explanation_distractors' => "Delete menghapus data, Underline memberi garis bawah, dan Zoom mengubah skala pandang layar.",
                    ],
                    [
                        'stem' => "Fungsi rumus spreadsheet yang digunakan untuk mencari nilai angka terkecil dari suatu rentang sel adalah...",
                        'correct' => "=MIN(...)",
                        'distractors' => [
                            "=MAX(...)",
                            "=SUM(...)",
                            "=COUNT(...)",
                        ],
                        'indicator' => "Disajikan fungsi rumus spreadsheet, peserta didik mampu mengidentifikasi fungsi MIN.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Data)",
                        'explanation_correct' => "Fungsi =MIN mengevaluasi rentang sel dan mengembalikan nilai numerik paling rendah.",
                        'explanation_distractors' => "MAX mencari nilai tertinggi, SUM mencari jumlah total, dan COUNT menghitung jumlah data.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Jika sel B2 bernilai 80 dan sel B3 bernilai 90, rumus yang tepat untuk menghitung nilai rata-rata kedua sel tersebut adalah...",
                        'correct' => "=AVERAGE(B2:B3)",
                        'distractors' => [
                            "=SUM(B2:B3)",
                            "=MAX(B2:B3)",
                            "=COUNT(B2:B3)",
                        ],
                        'indicator' => "Disajikan alamat sel nilai, peserta didik mampu menerapkan rumus fungsi AVERAGE secara benar.",
                        'sub_level' => "C3 - MOTS (Penerapan Formula)",
                        'explanation_correct' => "Sintaks =AVERAGE(B2:B3) menjumlahkan 80 + 90 lalu membaginya dengan 2 menghasilkan nilai rata-rata 85.",
                        'explanation_distractors' => "Fungsi lainnya menghasilkan nilai jumlah (170), nilai maksimal (90), atau jumlah sel (2).",
                    ],
                    [
                        'stem' => "Tanda baca yang wajib dituliskan di awal setiap penulisan rumus fungsi perhitungan pada spreadsheet adalah...",
                        'correct' => "Tanda sama dengan ( = )",
                        'distractors' => [
                            "Tanda pagar ( # )",
                            "Tanda tanya ( ? )",
                            "Tanda petik dua ( \" )",
                        ],
                        'indicator' => "Disajikan penulisan rumus, peserta didik mampu menerapkan tanda awal penulisan formula spreadsheet.",
                        'sub_level' => "C3 - MOTS (Penerapan Formula)",
                        'explanation_correct' => "Tanda sama dengan '=' memberi sinyal pada aplikasi bahwa teks yang diketik adalah rumus perhitungan yang harus dieksekusi.",
                        'explanation_distractors' => "Tanpa tanda '=', aplikasi akan menganggap isian sel sebagai teks biasa.",
                    ],
                    [
                        'stem' => "Langkah paling cepat untuk mencari nilai tertinggi dari daftar nilai ulangan siswa pada rentang sel C2 sampai C30 adalah menggunakan fungsi...",
                        'correct' => "=MAX(C2:C30)",
                        'distractors' => [
                            "=MIN(C2:C30)",
                            "=SUM(C2:C30)",
                            "=MEDIAN(C2:C30)",
                        ],
                        'indicator' => "Disajikan daftar nilai kelas, peserta didik mampu menerapkan fungsi MAX pada rentang data.",
                        'sub_level' => "C3 - MOTS (Penerapan Formula)",
                        'explanation_correct' => "Fungsi =MAX memindai seluruh data pada rentang C2:C30 dan menampilkan angka nilai tertinggi.",
                        'explanation_distractors' => "MIN mencari nilai terendah, SUM menjumlahkan, dan MEDIAN mencari nilai tengah.",
                    ],
                    [
                        'stem' => "Jika kamu ingin menggabungkan beberapa sel yang bersebelahan menjadi satu sel besar untuk judul tabel, fitur yang digunakan adalah...",
                        'correct' => "Merge & Center.",
                        'distractors' => [
                            "Conditional Formatting.",
                            "Text to Columns.",
                            "Data Validation.",
                        ],
                        'indicator' => "Disajikan perapian tabel, peserta didik mampu menerapkan fitur penggabungan sel Merge & Center.",
                        'sub_level' => "C3 - MOTS (Penerapan Format)",
                        'explanation_correct' => "Merge & Center menggabungkan area sel terpilih menjadi satu bidang sel dan memposisikan teks di tengah.",
                        'explanation_distractors' => "Pilihan lainnya untuk format bersyarat, pemisahan kolom teks, dan pembatasan input.",
                    ],
                    [
                        'stem' => "Saat menyalin rumus yang menggunakan alamat sel relatif (relative reference) dari baris 2 ke baris 3, perubahan yang terjadi adalah...",
                        'correct' => "Nomor baris pada rumus akan otomatis menyesuaikan bertambah satu menjadi baris 3.",
                        'distractors' => [
                            "Rumus akan terkunci dan nilainya menjadi nol.",
                            "Seluruh isi data pada baris 2 akan terhapus otomatis.",
                            "Rumus berubah menjadi teks biasa tanpa hasil perhitungan.",
                        ],
                        'indicator' => "Disajikan penyalinan formula, peserta didik mampu menerapkan prinsip referensi sel relatif.",
                        'sub_level' => "C3 - MOTS (Penerapan Formula)",
                        'explanation_correct' => "Referensi relatif memperbarui indeks baris/kolom secara otomatis mengikuti posisi tujuan penyalinan.",
                        'explanation_distractors' => "Referensi tidak terkunci menjadi nol dan data baris awal tidak terhapus.",
                    ],
                    [
                        'stem' => "Jika kamu ingin menghitung berapa banyak siswa yang ada di daftar nilai berdasarkan rentang sel nama A2 sampai A40, fungsi yang tepat adalah...",
                        'correct' => "=COUNTA(A2:A40)",
                        'distractors' => [
                            "=SUM(A2:A40)",
                            "=AVERAGE(A2:A40)",
                            "=MAX(A2:A40)",
                        ],
                        'indicator' => "Disajikan perhitungan entri data teks, peserta didik mampu menerapkan fungsi COUNTA.",
                        'sub_level' => "C3 - MOTS (Penerapan Formula)",
                        'explanation_correct' => "Fungsi =COUNTA menghitung banyaknya sel yang tidak kosong (berisi teks maupun angka).",
                        'explanation_distractors' => "SUM, AVERAGE, dan MAX hanya memproses data numerik dan mengabaikan teks nama siswa.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Pada sel hasil rumus spreadsheet muncul pesan galat '#DIV/0!'. Analisis penyebab galat tersebut yang paling tepat adalah...",
                        'correct' => "Rumus mencoba membagi suatu bilangan dengan angka nol atau sel yang kosong.",
                        'distractors' => [
                            "Teks di dalam sel terlalu panjang untuk lebar kolom yang tersedia.",
                            "Komputer tidak terhubung ke jaringan internet lokal.",
                            "Nama fungsi rumus salah ketik (misalnya mengetik =SUMM).",
                        ],
                        'indicator' => "Disajikan kode galat spreadsheet, peserta didik mampu menganalisis penyebab galat #DIV/0!.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Galat)",
                        'explanation_correct' => "Galat #DIV/0! (Division by Zero) terjadi saat operasi matematika melakukan pembagian dengan penyebut bernilai nol atau kosong.",
                        'explanation_distractors' => "Kolom sempit memunculkan '###', sedangkan salah ketik fungsi memunculkan '#NAME?'.",
                    ],
                    [
                        'stem' => "Mengapa penggunaan tanda dolar ($) pada rumus sel absolut (misal $A$1) sangat penting saat menyalin rumus ke banyak baris lain?",
                        'correct' => "Agar referensi sel yang dikunci tetap merujuk ke sel A1 dan tidak bergeser saat rumus disalin ke baris atau kolom lain.",
                        'distractors' => [
                            "Agar hasil perhitungan otomatis dikonversi ke dalam mata uang dolar Amerika.",
                            "Agar sel tersebut tidak bisa dibaca oleh pengguna lain di lembar kerja.",
                            "Untuk mempercepat perhitungan matematika pada prosesor komputer.",
                        ],
                        'indicator' => "Disajikan penguncian sel absolut, peserta didik mampu mengevaluasi fungsi penguncian referensi sel ($).",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Formula)",
                        'explanation_correct' => "Karakter '$' mengunci koordinat absolut baris dan kolom agar tidak mengalami pergeseran relatif saat autofill diseret.",
                        'explanation_distractors' => "Tanda '$' bukan simbol konversi mata uang dan tidak memengaruhi kecepatan clock prosesor.",
                    ],
                    [
                        'stem' => "Diberikan tabel data penjualan kantin selama 1 tahun. Jika kepala sekolah ingin melihat tren kenaikan dan penurunan penjualan per bulan, representasi visual terbaik adalah...",
                        'correct' => "Grafik garis (line chart) dengan sumbu X nama bulan dan sumbu Y total penjualan.",
                        'distractors' => [
                            "Diagram lingkaran (pie chart) dengan 365 irisan per hari.",
                            "Tabel angka mentah tanpa pengurutan dan tanpa grafik.",
                            "Diagram batang horizontal acak tanpa label waktu.",
                        ],
                        'indicator' => "Disajikan data berkala tahunan, peserta didik mampu mengevaluasi dan memilih visualisasi tren garis yang optimal.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Visualisasi Data)",
                        'explanation_correct' => "Grafik garis secara visual menghubungkan titik data berurutan waktu sehingga pola kenaikan dan penurunan tren langsung terlihat jelas.",
                        'explanation_distractors' => "Diagram lingkaran dengan ratusan irisan tidak terbaca, dan tabel mentah tidak menonjolkan tren visual.",
                    ],
                    [
                        'stem' => "Jika sel C2 berisi rumus: =IF(B2>=75; \"Tuntas\"; \"Remedial\"), apa yang terjadi jika isi sel B2 diubah dari 80 menjadi 70?",
                        'correct' => "Nilai di sel C2 otomatis berubah dari 'Tuntas' menjadi 'Remedial' secara dinamis.",
                        'distractors' => [
                            "Muncul pesan error karena rumus tidak bisa menghitung ulang data yang diganti.",
                            "Isi sel C2 tetap 'Tuntas' sampai komputer dimatikan dan dinyalakan ulang.",
                            "Sel C2 terhapus permanen dari lembar sebar.",
                        ],
                        'indicator' => "Disajikan rumus logika IF dinamis, peserta didik mampu menganalisis perubahan status kalkulasi otomatis.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Formula)",
                        'explanation_correct' => "Spreadsheet menghitung ulang formula secara reaktif; nilai 70 tidak memenuhi syarat '>=75' sehingga mengevaluasi kondisi alternatif.",
                        'explanation_distractors' => "Pilihan lainnya bertentangan dengan sifat kalkulasi reaktif otomatis pada software lembar sebar.",
                    ],
                    [
                        'stem' => "Evaluasi manfaat penggunaan fitur Conditional Formatting pada tabel data nilai siswa adalah...",
                        'correct' => "Mempermudah identifikasi visual (misalnya warna merah otomatis untuk nilai di bawah KKM) sehingga analisis data lebih cepat.",
                        'distractors' => [
                            "Mengubah angka nilai siswa secara otomatis menjadi nilai sempurna 100.",
                            "Menghapus data siswa yang tidak lulus secara permanen tanpa konfirmasi.",
                            "Mengunci file spreadsheet agar tidak bisa dicetak menggunakan printer.",
                        ],
                        'indicator' => "Disajikan penyajian data tabel, peserta didik mampu mengevaluasi nilai efisiensi Conditional Formatting.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Analisis Data)",
                        'explanation_correct' => "Pewarnaan otomatis berbasis aturan mempercepat deteksi pencilan (outliers) dan siswa yang membutuhkan remedial.",
                        'explanation_distractors' => "Fitur format tampilan tidak mengubah isi data mentah dan tidak menghapus rekaman data.",
                    ],
                    [
                        'stem' => "Pada kolom tanggal muncul tanda '######' di seluruh sel. Evaluasi penyebab dan cara mengatasi tampilan tersebut adalah...",
                        'correct' => "Lebar kolom terlalu sempit untuk menampilkan angka tanggal, solusinya perlebar ukuran kolom tersebut.",
                        'distractors' => [
                            "Data di dalam sel telah rusak dan harus diketik ulang dari awal.",
                            "Format sel harus diubah menjadi rumus matematika.",
                            "Komputer terkena virus dan harus dimatikan.",
                        ],
                        'indicator' => "Disajikan anomali tampilan kolom, peserta didik mampu menganalisis penyebab string '######'.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Tampilan)",
                        'explanation_correct' => "Tanda '###' adalah sinyal bahwa representasi format angka/tanggal melebihi batas lebar fisik kolom sel.",
                        'explanation_distractors' => "Data tidak rusak dan tidak berkaitan dengan serangan virus.",
                    ],
                ];
            }
        }

        if ($domain === 'network_internet') {
            if ($effectiveLevel === 'lots') {
                return [
                    [
                        'stem' => "Jaringan komputer yang mencakup area lokal terbatas seperti laboratorium komputer sekolah, ruang kelas, atau gedung kantor disebut...",
                        'correct' => "Local Area Network (LAN).",
                        'distractors' => [
                            "Wide Area Network (WAN).",
                            "Metropolitan Area Network (MAN).",
                            "Internet Global.",
                        ],
                        'indicator' => "Disajikan cakupan jaringan, peserta didik mampu mengidentifikasi karakteristik jaringan LAN.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "LAN mencakup wilayah geografis lokal terbatas dengan kecepatan transfer data tinggi antarperangkat setempat.",
                        'explanation_distractors' => "MAN mencakup skala kota, WAN mencakup antarnegara, dan Internet mencakup seluruh dunia.",
                    ],
                    [
                        'stem' => "Perangkat keras jaringan yang berfungsi membagi dan merutekan koneksi data internet ke beberapa perangkat klien adalah...",
                        'correct' => "Router / Access Point.",
                        'distractors' => [
                            "Processor.",
                            "Monitor LED.",
                            "Flashdisk USB.",
                        ],
                        'indicator' => "Disajikan perangkat jaringan, peserta didik mampu mengenali fungsi router.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "Router mengarahkan paket data antarjaringan dan mendistribusikan koneksi internet ke perangkat pengguna.",
                        'explanation_distractors' => "Processor adalah pemroses CPU, monitor penampil visual, dan flashdisk media penyimpanan.",
                    ],
                    [
                        'stem' => "Perangkat lunak (software) yang digunakan pengguna untuk membuka dan menjelajahi halaman situs web di internet adalah...",
                        'correct' => "Web Browser (seperti Google Chrome, Microsoft Edge, atau Mozilla Firefox).",
                        'distractors' => [
                            "Search Engine (seperti Google Search atau Bing).",
                            "Operating System.",
                            "Spreadsheet.",
                        ],
                        'indicator' => "Disajikan aplikasi internet, peserta didik mampu mengidentifikasi peramban web (browser).",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "Web browser adalah aplikasi klien yang menerjemahkan kode HTML/CSS dari server web menjadi halaman visual.",
                        'explanation_distractors' => "Search engine adalah situs mesin pencari di web, OS pengendali komputer, dan spreadsheet pengolah angka.",
                    ],
                    [
                        'stem' => "Tanda ikon gembok terkunci pada bilah alamat situs web di peramban (browser) menandakan bahwa...",
                        'correct' => "Koneksi ke situs web menggunakan protokol enkripsi yang aman (HTTPS).",
                        'distractors' => [
                            "Situs web tersebut sedang mengalami kerusakan server.",
                            "Komputer dilarang mengakses informasi pada situs tersebut.",
                            "Pengguna harus membayar biaya langganan untuk membaca artikel.",
                        ],
                        'indicator' => "Disajikan indikator keamanan web, peserta didik mampu mengidentifikasi makna simbol gembok HTTPS.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "Ikon gembok menunjukkan sertifikat SSL/TLS aktif yang mengenkripsi jalur transmisi data antara klien dan server.",
                        'explanation_distractors' => "Pilihan lainnya tidak memiliki kaitan dengan sertifikasi enkripsi web.",
                    ],
                    [
                        'stem' => "Alamat unik berupa kombinasi angka atau nama domain yang digunakan untuk mengidentifikasi komputer atau server di internet disebut...",
                        'correct' => "IP Address (atau URL/Domain).",
                        'distractors' => [
                            "MAC Processor.",
                            "RAM Register.",
                            "Serial Key Office.",
                        ],
                        'indicator' => "Disajikan pengalamatan jaringan, peserta didik mampu mengenali fungsi IP Address dan Domain.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "IP Address dan nama domain menjadi alamat unik tujuan pengiriman paket data di jaringan komputer global.",
                        'explanation_distractors' => "Pilihan lainnya adalah register internal perangkat atau lisensi software.",
                    ],
                    [
                        'stem' => "Jaringan komunikasi global tanpa kabel yang menghubungkan jutaan komputer di seluruh dunia menggunakan protokol TCP/IP disebut...",
                        'correct' => "Internet.",
                        'distractors' => [
                            "Intranet.",
                            "LAN kabel.",
                            "Bluetooth.",
                        ],
                        'indicator' => "Disajikan konsep jaringan global, peserta didik mampu mendefinisikan internet.",
                        'sub_level' => "{$subLevel} - LOTS (Pemahaman Jaringan)",
                        'explanation_correct' => "Internet (Interconnected Network) adalah jaringan interkoneksi raksasa berskala global berbasis protokol TCP/IP.",
                        'explanation_distractors' => "Intranet bersifat internal privat, LAN berskala lokal gedung, dan Bluetooth berjarak sangat dekat.",
                    ],
                ];
            } elseif ($effectiveLevel === 'mots') {
                return [
                    [
                        'stem' => "Ketika laptopmu terhubung ke sinyal Wi-Fi sekolah namun muncul keterangan 'No Internet Access', langkah verifikasi awal yang tepat adalah...",
                        'correct' => "Memeriksa apakah router sekolah terhubung ke sumber internet penyedia jasa (ISP) atau mencoba menyambungkan ulang Wi-Fi.",
                        'distractors' => [
                            "Langsung membongkar casing laptop untuk mengganti kartu memori.",
                            "Menghapus semua file tugas di dalam harddisk laptop.",
                            "Mematikan layar laptop dan menyalakannya berulang-ulang.",
                        ],
                        'indicator' => "Disajikan gangguan koneksi Wi-Fi, peserta didik mampu menerapkan langkah verifikasi konektivitas jaringan.",
                        'sub_level' => "C3 - MOTS (Penerapan Jaringan)",
                        'explanation_correct' => "Keterangan tersebut menunjukkan laptop terhubung ke LAN router namun router belum menerima suplai internet dari ISP.",
                        'explanation_distractors' => "Membongkar hardware atau menghapus tugas tidak ada hubungannya dengan status link internet.",
                    ],
                    [
                        'stem' => "Tindakan yang paling tepat jika kamu ingin mengunduh bahan materi pelajaran dari internet secara aman adalah...",
                        'correct' => "Mengunduh dari portal resmi sekolah atau situs sumber tepercaya dan memindainya dengan antivirus.",
                        'distractors' => [
                            "Mengeklik banner iklan unduhan yang berkedip-kedip di situs mencurigakan.",
                            "Mengunduh file berekstensi .exe dari pengirim yang tidak dikenal di media sosial.",
                            "Mematikan sistem keamanan antivirus sebelum mengunduh.",
                        ],
                        'indicator' => "Disajikan unduhan berkas, peserta didik mampu menerapkan praktik pengunduhan dokumen yang aman.",
                        'sub_level' => "C3 - MOTS (Penerapan Keamanan)",
                        'explanation_correct' => "Memverifikasi reputasi domain penyedia berkas dan memindai malware menjamin keaslian dan keamanan berkas.",
                        'explanation_distractors' => "Mengeklik banner iklan atau berkas .exe misterius berisiko tinggi menginfeksi malware.",
                    ],
                    [
                        'stem' => "Perbedaan fungsi mendasar antara Web Browser dan Search Engine saat kita mencari materi di internet adalah...",
                        'correct' => "Web browser adalah aplikasi untuk menampilkan situs web, sedangkan search engine adalah layanan di web untuk mencari informasi kata kunci.",
                        'distractors' => [
                            "Web browser hanya bekerja tanpa koneksi internet, sedangkan search engine membutuhkan kabel LAN.",
                            "Web browser adalah perangkat keras monitor, sedangkan search engine adalah perangkat lunak printer.",
                            "Keduanya memiliki arti dan fungsi yang sama persis tanpa perbedaan.",
                        ],
                        'indicator' => "Disajikan penjelajahan web, peserta didik mampu membedakan peran browser dan mesin pencari.",
                        'sub_level' => "C3 - MOTS (Penerapan Jaringan)",
                        'explanation_correct' => "Browser merupakan pintu pembuka (perangkat lunak klien), sementara search engine adalah situs web direktori indeks informasi.",
                        'explanation_distractors' => "Pilihan lainnya keliru mendeskripsikan jenis perangkat dan ketergantungan koneksi.",
                    ],
                    [
                        'stem' => "Saat mengirim email tugas kepada guru dengan menyertakan berkas dokumen tugas, fitur yang harus kamu klik adalah...",
                        'correct' => "Lampiran (Attachment) dengan ikon klip kertas.",
                        'distractors' => [
                            "Kotak Sampah (Spam/Trash).",
                            "Tombol Bintang (Favorite).",
                            "Tanda Blokir Akun (Block Sender).",
                        ],
                        'indicator' => "Disajikan pengiriman surel tugas, peserta didik mampu menerapkan fitur lampiran (attachment).",
                        'sub_level' => "C3 - MOTS (Penerapan Jaringan)",
                        'explanation_correct' => "Fitur attachment menyematkan berkas digital ke dalam pesan email agar dapat diunduh oleh guru penerima.",
                        'explanation_distractors' => "Pilihan lainnya untuk menghapus email, menandai favorit, atau memblokir pengirim.",
                    ],
                    [
                        'stem' => "Keuntungan utama menggunakan penyimpanan berbasis awan (cloud storage seperti Google Drive) untuk menyimpan tugas sekolah adalah...",
                        'correct' => "Berkas tugas dapat diakses dan disunting dari mana saja melalui internet tanpa takut hilang jika perangkat fisik rusak.",
                        'distractors' => [
                            "Kapasitas penyimpanan awan membuat baterai laptop tidak pernah berkurang.",
                            "Tugas akan otomatis dikerjakan oleh server awan tanpa campur tangan siswa.",
                            "Awan penyimpanan hanya bisa dibuka saat cuaca mendung.",
                        ],
                        'indicator' => "Disajikan pemanfaatan cloud storage, peserta didik mampu menerapkan penyimpanan berkas awan.",
                        'sub_level' => "C3 - MOTS (Penerapan Praktis)",
                        'explanation_correct' => "Cloud storage menyinkronkan data ke server terdistribusi sehingga portabel dan tahan terhadap kerusakan flashdisk lokal.",
                        'explanation_distractors' => "Pilihan lainnya adalah asumsi fiktif yang tidak berdasar sains teknologi.",
                    ],
                    [
                        'stem' => "Jika seorang siswa ingin menghubungkan komputernya ke printer nirkabel tanpa menggunakan kabel panjang di ruangan lab, teknologi koneksi yang digunakan adalah...",
                        'correct' => "Wi-Fi atau Bluetooth.",
                        'distractors' => [
                            "Kabel VGA.",
                            "Kabel HDMI.",
                            "Flashdisk.",
                        ],
                        'indicator' => "Disajikan perangkat nirkabel, peserta didik mampu menerapkan konektivitas Wi-Fi atau Bluetooth.",
                        'sub_level' => "C3 - MOTS (Penerapan Jaringan)",
                        'explanation_correct' => "Teknologi transmisi radio nirkabel seperti Wi-Fi dan Bluetooth menghubungkan perangkat periferal tanpa bentangan kabel fisik.",
                        'explanation_distractors' => "VGA dan HDMI adalah kabel display monitor berkawat tembaga.",
                    ],
                ];
            } else {
                return [
                    [
                        'stem' => "Mengapa menggunakan jaringan Wi-Fi publik gratis tanpa kata sandi di tempat umum rentan terhadap ancaman keamanan data?",
                        'correct' => "Karena lalu lintas data yang tidak terenkripsi pada jaringan publik dapat disadap oleh penyerang siber dalam jaringan yang sama (sniffing).",
                        'distractors' => [
                            "Karena sinyal Wi-Fi gratis otomatis merusak baterai ponsel secara fisik.",
                            "Karena penyedia Wi-Fi akan menghapus semua file foto di galeri ponsel.",
                            "Karena ponsel akan otomatis mengirimkan pesan SMS berbayar ke luar negeri.",
                        ],
                        'indicator' => "Disajikan risiko Wi-Fi publik, peserta didik mampu menganalisis ancaman penyadapan paket data jaringan.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Keamanan Jaringan)",
                        'explanation_correct' => "Ketiadaan enkripsi level jaringan memungkinkan teknik packet sniffing dan Man-in-the-Middle (MITM) menyadap data kredensial.",
                        'explanation_distractors' => "Pilihan pengecoh mengarang kerusakan baterai atau manipulasi SMS yang mustahil.",
                    ],
                    [
                        'stem' => "Analisis keunggulan koneksi internet menggunakan kabel LAN (UTP) dibandingkan koneksi nirkabel (Wi-Fi) dalam ruang lab komputer adalah...",
                        'correct' => "Koneksi kabel LAN memiliki kecepatan transmisi data yang lebih stabil dan minim gangguan interferensi sinyal dibandingkan Wi-Fi.",
                        'distractors' => [
                            "Koneksi Wi-Fi selalu lebih stabil saat terhalang dinding beton tebal dibandingkan kabel LAN.",
                            "Kabel LAN tidak memerlukan aliran sinyal data sama sekali untuk menghubungkan komputer.",
                            "Koneksi Wi-Fi memerlukan pemasangan soket tembaga di setiap meja siswa.",
                        ],
                        'indicator' => "Disajikan perbandingan media transmisi, peserta didik mampu mengevaluasi keandalan kabel tembaga terhadap gelombang radio.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Transmisi)",
                        'explanation_correct' => "Media terpandu (guided media) seperti kabel tembaga bebas dari pelemahan gelombang radio akibat rintangan fisik dan frekuensi bentrok.",
                        'explanation_distractors' => "Gelombang Wi-Fi justru terdegradasi parah saat menembus dinding beton.",
                    ],
                    [
                        'stem' => "Seorang siswa mencoba mengakses situs web sekolah tetapi muncul pesan '404 Not Found'. Evaluasi yang paling tepat mengenai pesan galat tersebut adalah...",
                        'correct' => "Server web aktif merespons, namun halaman atau alamat URL spesifik yang diminta tidak ditemukan atau telah dipindahkan.",
                        'distractors' => [
                            "Kabel listrik monitor komputer siswa terputus.",
                            "Sistem operasi komputer siswa telah kedaluwarsa dan harus diganti.",
                            "Seluruh jaringan internet global di dunia sedang dimatikan sementara.",
                        ],
                        'indicator' => "Disajikan kode status HTTP, peserta didik mampu mengevaluasi arti status 404 Not Found.",
                        'sub_level' => "{$subLevel} - HOTS (Evaluasi Protokol)",
                        'explanation_correct' => "Kode status HTTP 404 menandakan server berhasil dihubungi (handshake sukses), tetapi endpoint URL yang diminta tidak eksis.",
                        'explanation_distractors' => "Pilihan lainnya mencampuradukkan galat listrik atau mematikan internet global.",
                    ],
                    [
                        'stem' => "Mengapa protokol HTTPS jauh lebih disarankan dibandingkan HTTP biasa saat melakukan transaksi atau pengisian formulir di internet?",
                        'correct' => "Karena HTTPS mengenkripsi data yang dikirim antara browser dan server sehingga tidak bisa dibaca oleh pihak ketiga di tengah jalan.",
                        'distractors' => [
                            "Karena HTTPS membuat ukuran halaman web menjadi dua kali lebih besar dan lambat.",
                            "Karena HTTP biasa hanya boleh digunakan oleh instansi militer dan pemerintah.",
                            "Karena HTTPS tidak membutuhkan koneksi jaringan internet untuk membuka halaman.",
                        ],
                        'indicator' => "Disajikan enkripsi protokol web, peserta didik mampu menganalisis pentingnya saluran terenkripsi HTTPS.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Protokol)",
                        'explanation_correct' => "Kriptografi SSL/TLS pada HTTPS mengamankan kerahasiaan dan integritas data dari aksi penyadapan (eavesdropping).",
                        'explanation_distractors' => "HTTPS tidak melipatgandakan bobot halaman dan tetap memerlukan koneksi jaringan.",
                    ],
                    [
                        'stem' => "Jika kecepatan unduh (download speed) cepat tetapi latensi (ping) sangat tinggi saat melakukan pembelajaran tatap muka daring, dampak yang dirasakan adalah...",
                        'correct' => "Terjadi keterlambatan suara dan video (lag/delay) saat berkomunikasi interaktif dua arah.",
                        'distractors' => [
                            "Video akan otomatis terputar dengan kecepatan dua kali lebih cepat tanpa jeda.",
                            "Tampilan warna video di layar akan berubah menjadi format hitam putih.",
                            "Laptop akan menolak memutar suara dari pembicara.",
                        ],
                        'indicator' => "Disajikan parameter jaringan bandwidth vs latency, peserta didik mampu menganalisis dampak latensi tinggi pada komunikasi real-time.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Kinerja Jaringan)",
                        'explanation_correct' => "Aplikasi real-time interaktif sangat sensitif terhadap round-trip time (ping); latensi tinggi menyebabkan delay percakapan.",
                        'explanation_distractors' => "Latensi tinggi tidak mengubah format warna video atau mempercepat pemutaran suara.",
                    ],
                    [
                        'stem' => "Analisis risiko dari mengeklik tautan URL yang dipendekkan (short link) dari sumber yang tidak jelas adalah...",
                        'correct' => "Tautan tersebut dapat mengarahkan pengguna ke situs web tiruan (phishing) atau memicu pengunduhan malware berbahaya.",
                        'distractors' => [
                            "Kapasitas RAM komputer akan berkurang separuh.",
                            "Suhu ruangan lab komputer akan meningkat drastis.",
                            "Speaker komputer akan otomatis memutar musik keras.",
                        ],
                        'indicator' => "Disajikan pemendek tautan, peserta didik mampu menganalisis risiko pengelabuan alamat tujuan web.",
                        'sub_level' => "{$subLevel} - HOTS (Analisis Keamanan)",
                        'explanation_correct' => "Short link menyembunyikan domain tujuan asli sehingga sering dimanfaatkan penyerang untuk mengelabui korban.",
                        'explanation_distractors' => "Short link tidak memotong kapasitas RAM atau menaikkan suhu ruangan secara fisik.",
                    ],
                ];
            }
        }

        // Generic / Fallback (Purely substantive for any other subjects / topics)
        if ($effectiveLevel === 'lots') {
            return [
                [
                    'stem' => "Konsep dasar yang menjadi inti pembahasan materi {$coreNoun} adalah...",
                    'correct' => "Keterpaduan hubungan fungsional antarelemen materi yang tersusun sistematis untuk mencapai sasaran terukur.",
                    'distractors' => [
                        "Kumpulan data acak yang tidak memiliki keterkaitan operasional satu sama lain.",
                        "Asumsi subjektif tanpa bukti empiris atau fakta pendukung yang terverifikasi.",
                        "Prosedur historis yang sudah ditinggalkan dan tidak lagi relevan dengan topik ini.",
                    ],
                    'indicator' => "Disajikan konsep dasar, peserta didik mampu mengidentifikasi substansi keilmuan materi {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Pilihan ini mendefinisikan esensi materi {$coreNoun} secara tepat berdasarkan keterpaduan antarelemen penyusunnya.",
                    'explanation_distractors' => "Pilihan pengecoh mengasumsikan data acak, ketiadaan bukti empiris, atau prosedur usang.",
                ],
                [
                    'stem' => "Karakteristik utama yang membedakan materi {$coreNoun} dari bahasan lainnya ditunjukkan oleh...",
                    'correct' => "Memiliki aturan baku, komponen terstruktur, serta alur kerja yang terstandarisasi.",
                    'distractors' => [
                        "Bekerja secara spontan tanpa memerlukan parameter atau kriteria mutu tertentu.",
                        "Hanya berlaku dalam kondisi khusus tanpa memiliki dasar prinsip yang jelas.",
                        "Mengabaikan hubungan sebab-akibat antarunsur pembentuknya.",
                    ],
                    'indicator' => "Disajikan karakteristik materi, peserta didik mampu membedakan ciri pokok {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Karakteristik fundamental materi keilmuan terletak pada keteraturan kaidah dan standarisasi prosesnya.",
                    'explanation_distractors' => "Pilihan lainnya mencerminkan ketiadaan aturan baku atau pengabaian prinsip kausalitas.",
                ],
                [
                    'stem' => "Elemen mendasar yang paling menentukan ketepatan pelaksanaan materi {$coreNoun} adalah...",
                    'correct' => "Ketepatan identifikasi variabel awal dan kepatuhan terhadap kaidah keilmuan yang berlaku.",
                    'distractors' => [
                        "Kecepatan menyelesaikan langkah kerja dengan mengabaikan pemeriksaan kualitas.",
                        "Penggunaan praduga pribadi tanpa mencocokkan dengan parameter materi.",
                        "Pengurangan tahapan penting dengan tujuan mempercepat hasil.",
                    ],
                    'indicator' => "Disajikan elemen penentu, peserta didik mampu mengidentifikasi faktor ketepatan pelaksanaan {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Ketepatan variabel awal dan kepatuhan kaidah ilmiah adalah fondasi mutu setiap penerapan materi.",
                    'explanation_distractors' => "Mengejar kecepatan tanpa kontrol kualitas mengorbankan keabsahan luaran.",
                ],
                [
                    'stem' => "Dalam konteks {$subjectName}, fungsi mendasar dari materi {$coreNoun} adalah...",
                    'correct' => "Menyediakan landasan analitis guna memahami dan menguraikan permasalahan secara logis.",
                    'distractors' => [
                        "Membatasi eksplorasi ide baru yang relevan dengan perkembangan keilmuan.",
                        "Menciptakan kerumitan proses tanpa memberikan nilai tambah keilmuan.",
                        "Menggantikan peran pengamatan empiris dengan spekulasi tanpa bukti.",
                    ],
                    'indicator' => "Disajikan fungsi materi, peserta didik mampu menguraikan peran analitis {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Materi ini berperan strategis sebagai kerangka logis dalam membedah dan menyelesaikan permasalahan.",
                    'explanation_distractors' => "Pilihan lainnya mengklaim pembatasan inovasi atau kerumitan tanpa faedah.",
                ],
                [
                    'stem' => "Prinsip keilmuan yang mendasari keabsahan materi {$coreNoun} adalah...",
                    'correct' => "Setiap luaran atau hasil akhir sangat ditentukan oleh keabsahan proses dan kualitas data awal.",
                    'distractors' => [
                        "Kualitas hasil akhir tidak dipengaruhi oleh ketelitian proses yang ditempuh.",
                        "Prosedur kerja dapat diubah sewaktu-waktu tanpa perhitungan dampak teknis.",
                        "Penyederhanaan proses dilakukan dengan menghapus tahapan verifikasi utama.",
                    ],
                    'indicator' => "Disajikan prinsip keilmuan, peserta didik mampu memvalidasi kaidah dasar {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Kaidah ilmiah universal menegaskan bahwa integritas proses dan masukan menentukan keandalan produk akhir.",
                    'explanation_distractors' => "Pilihan pengecoh mengabaikan hubungan kausalitas antara proses dan kualitas luaran.",
                ],
                [
                    'stem' => "Kaidah penting yang harus diperhatikan dalam menelaah materi {$coreNoun} adalah...",
                    'correct' => "Memperhatikan keterkaitan sebab-akibat yang mendasari setiap perubahan atau fenomena.",
                    'distractors' => [
                        "Mengabaikan fakta empiris dan hanya berpegang pada opini pribadi.",
                        "Menganggap semua bagian berdiri sendiri tanpa hubungan sistemik.",
                        "Menghilangkan parameter pengukuran agar analisis lebih mudah.",
                    ],
                    'indicator' => "Disajikan kaidah telaah, peserta didik mampu menjelaskan hubungan kausalitas pada {$coreNoun}.",
                    'sub_level' => "{$subLevel} - LOTS (Pemahaman Konseptual)",
                    'explanation_correct' => "Analisis ilmiah menuntut pengamatan relasi sebab-akibat yang terstruktur dan berbasis fakta objektif.",
                    'explanation_distractors' => "Pilihan lainnya bertentangan dengan metodologi keilmuan.",
                ],
            ];
        } elseif ($effectiveLevel === 'mots') {
            return [
                [
                    'stem' => "Langkah prosedural pertama yang paling tepat dilakukan saat mengimplementasikan materi {$coreNoun} adalah...",
                    'correct' => "Mengidentifikasi parameter awal, merumuskan sasaran kerja, dan menyiapkan instrumen pendukung yang valid.",
                    'distractors' => [
                        "Langsung menarik kesimpulan akhir sebelum data terkumpul secara lengkap.",
                        "Mengabaikan petunjuk prosedur baku demi menghemat waktu pengerjaan.",
                        "Melakukan tahapan implementasi secara acak tanpa rencana kerja terarah.",
                    ],
                    'indicator' => "Disajikan implementasi materi, peserta didik mampu menerapkan langkah persiapan prosedural {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Prosedural)",
                    'explanation_correct' => "Persiapan instrumen dan identifikasi parameter adalah prasyarat mutlak sebelum tindakan teknis dijalankan.",
                    'explanation_distractors' => "Melompati persiapan atau menyimpulkan sebelum data ada menyebabkan kesalahan fatal.",
                ],
                [
                    'stem' => "Alur kerja sistematis yang paling tepat untuk menyelesaikan persoalan pada materi {$coreNoun} adalah...",
                    'correct' => "Pengumpulan dan verifikasi data awal -> Analisis proses sesuai kaidah -> Validasi hasil akhir.",
                    'distractors' => [
                        "Perumusan kesimpulan -> Pelaksanaan tahapan acak -> Pengabaian pemeriksaan ulang.",
                        "Eksekusi proses tanpa data -> Pengujian luaran -> Pengubahan hasil agar sesuai harapan.",
                        "Pengabaian kaidah materi -> Pengerjaan cepat -> Penyerahan tanpa verifikasi.",
                    ],
                    'indicator' => "Disajikan pemecahan persoalan, peserta didik mampu menerapkan alur sistematis pada {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Prosedural)",
                    'explanation_correct' => "Alur persiapan-pemrosesan-validasi menjamin akurasi dan akuntabilitas hasil kerja.",
                    'explanation_distractors' => "Pilihan pengecoh memutarbalikkan urutan logis dan meniadakan tahapan pembuktian.",
                ],
                [
                    'stem' => "Tindakan yang harus diambil jika ditemukan ketidaksesuaian data pada saat menerapkan konsep {$coreNoun} adalah...",
                    'correct' => "Menelusuri kembali sumber data awal, memverifikasi ulang instrumen, dan memperbaiki bagian yang keliru.",
                    'distractors' => [
                        "Mengubah angka data secara sepihak agar terlihat sesuai dengan target.",
                        "Mengabaikan ketidaksesuaian tersebut dan menganggap hasilnya tetap benar.",
                        "Menghapus seluruh rekaman data tanpa melakukan telaah penyebab kesalahan.",
                    ],
                    'indicator' => "Disajikan anomali data, peserta didik mampu menerapkan tindakan korektif terstandar pada {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Korektif)",
                    'explanation_correct' => "Penelusuran sumber dan verifikasi instrumen adalah prosedur korektif baku dalam penjaminan mutu.",
                    'explanation_distractors' => "Manipulasi data atau pengabaian anomali melanggar integritas keilmuan.",
                ],
                [
                    'stem' => "Kriteria utama untuk memastikan bahwa penerapan materi {$coreNoun} telah memenuhi standar mutu adalah...",
                    'correct' => "Hasil akhir sesuai dengan parameter yang ditetapkan dan dapat diverifikasi secara objektif.",
                    'distractors' => [
                        "Pengerjaan selesai dalam waktu yang sangat singkat meskipun menyimpang dari aturan.",
                        "Tampilan laporan terlihat tebal tanpa memperhatikan ketepatan isi data.",
                        "Hasil pekerjaan disetujui tanpa melalui proses pengujian atau pengecekan.",
                    ],
                    'indicator' => "Disajikan kendali mutu, peserta didik mampu memverifikasi standar ketercapaian {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Verifikasi)",
                    'explanation_correct' => "Standar mutu tercapai jika luaran dapat dibuktikan kesesuaiannya terhadap parameter terukur.",
                    'explanation_distractors' => "Kecepatan semu atau ketebalan fisik laporan tidak mencerminkan kebenaran substansi.",
                ],
                [
                    'stem' => "Pendekatan paling tepat saat menghubungkan konsep {$coreNoun} dengan kasus nyata di lapangan adalah...",
                    'correct' => "Menganalisis karakteristik kasus, memilih kaidah yang relevan, lalu menerapkan solusi yang terukur.",
                    'distractors' => [
                        "Menyamaratakan semua kasus tanpa mempertimbangkan faktor-faktor spesifik di lapangan.",
                        "Memilih solusi yang paling mudah tanpa melihat kesesuaian dengan kaidah materi.",
                        "Mengabaikan data lapangan dan memaksakan asumsi yang belum teruji.",
                    ],
                    'indicator' => "Disajikan studi kasus kontekstual, peserta didik mampu mengaplikasikan pendekatan analitis pada {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Kontekstual)",
                    'explanation_correct' => "Aplikasi kontekstual menuntut penyesuaian solusi berdasarkan karakteristik empiris di lapangan.",
                    'explanation_distractors' => "Generalisasi buta atau pemaksaan asumsi berisiko gagal memecahkan masalah.",
                ],
                [
                    'stem' => "Tindakan verifikasi standar setelah menyelesaikan tahapan kerja pada materi {$coreNoun} adalah...",
                    'correct' => "Melakukan audit kesesuaian antara hasil kerja dengan kriteria capaian yang telah ditetapkan.",
                    'distractors' => [
                        "Menutup seluruh dokumentasi proses tanpa melakukan pemeriksaan ulang.",
                        "Mengasumsikan hasil kerja sudah sempurna tanpa memerlukan pengujian empiris.",
                        "Menghapus data tahapan awal untuk menghemat ruang pencatatan.",
                    ],
                    'indicator' => "Disajikan fase pasca-implementasi, peserta didik mampu menerapkan audit kesesuaian {$coreNoun}.",
                    'sub_level' => "C3 - MOTS (Penerapan Audit)",
                    'explanation_correct' => "Audit kesesuaian kriteria memastikan tidak ada penyimpangan prosedur yang terlewatkan.",
                    'explanation_distractors' => "Menutup tanpa cek ulang atau berasumsi tanpa bukti empiris berisiko meloloskan kesalahan.",
                ],
            ];
        } else {
            return [
                [
                    'stem' => "Faktor utama yang paling berpotensi menyebabkan ketidaktercapaian sasaran pada implementasi {$coreNoun} adalah...",
                    'correct' => "Kelemahan validasi data awal dan ketidakteraturan dalam mengeksekusi tahapan prosedur.",
                    'distractors' => [
                        "Penerapan standar operasional yang terlalu ketat dan terdokumentasi.",
                        "Penggunaan instrumen pengukuran yang telah terkalibrasi secara resmi.",
                        "Pelibatan proses pengujian berkala pada setiap tahapan kerja.",
                    ],
                    'indicator' => "Disajikan potensi kegagalan, peserta didik mampu menganalisis akar penyebab anomali pada {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Data yang tidak tervalidasi dan eksekusi non-prosedural adalah akar utama deviasi sistemik.",
                    'explanation_distractors' => "Pilihan lainnya justru merupakan praktik rekayasa terbaik untuk mencegah kegagalan.",
                ],
                [
                    'stem' => "Jika terjadi anomali atau penyimpangan luaran pada materi {$coreNoun}, langkah analisis kritis terbaik adalah...",
                    'correct' => "Mengisolasi tahapan yang bermasalah, membandingkan parameter riil dengan standar acuan, lalu merumuskan solusi korektif.",
                    'distractors' => [
                        "Mengganti seluruh sistem tanpa mengetahui bagian mana yang mengalami kegagalan.",
                        "Menyembunyikan penyimpangan agar proses kerja dianggap berjalan lancar.",
                        "Menghentikan seluruh aktivitas secara permanen tanpa melakukan penyelidikan teknis.",
                    ],
                    'indicator' => "Disajikan anomali luaran, peserta didik mampu menganalisis akar masalah dan merumuskan perbaikan pada {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Isolasi titik anomali dan perbandingan terhadap standar acuan menghasilkan solusi korektif terukur.",
                    'explanation_distractors' => "Merombak buta tanpa analisis atau menyembunyikan galat memperparah kerusakan sistem.",
                ],
                [
                    'stem' => "Di antara dua metode pemecahan masalah pada materi {$coreNoun}, kriteria evaluasi yang paling tepat untuk menentukan metode terbaik adalah...",
                    'correct' => "Tingkat akurasi hasil, keandalan proses, efisiensi sumber daya, dan minimnya risiko kesalahan.",
                    'distractors' => [
                        "Metode yang paling banyak menggunakan istilah rumit meskipun sulit diterapkan.",
                        "Metode yang mengabaikan keselamatan kerja demi percepatan waktu.",
                        "Metode yang paling jarang diuji karena dianggap otomatis sempurna.",
                    ],
                    'indicator' => "Disajikan komparasi solusi, peserta didik mampu mengevaluasi metode optimal pada {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Evaluasi optimalitas menuntut keseimbangan antara presisi luaran, efisiensi, dan keandalan sistem.",
                    'explanation_distractors' => "Kerumitan semu atau pengabaian keselamatan bukanlah kriteria rekayasa yang baik.",
                ],
                [
                    'stem' => "Bagaimanakah cara membuktikan secara ilmiah bahwa inovasi perbaikan pada materi {$coreNoun} memberikan dampak positif?",
                    'correct' => "Membandingkan data performa sebelum dan sesudah perbaikan menggunakan indikator terukur dan objektif.",
                    'distractors' => [
                        "Mendasarkan penilaian semata-mata pada perkiraan tanpa data perbandingan yang jelas.",
                        "Mengabaikan indikator performa dan langsung mengklaim keberhasilan secara sepihak.",
                        "Memilih hanya data yang mendukung keberhasilan dan membuang data yang menunjukkan kekurangan.",
                    ],
                    'indicator' => "Disajikan validasi inovasi, peserta didik mampu mengevaluasi data komparasi efektivitas {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Uji empiris sebelum-sesudah (pre-post evaluation) memberikan bukti kausalitas yang sahih secara ilmiah.",
                    'explanation_distractors' => "Klaim subjektif atau pemilahan data sepihak (cherry-picking) melanggar kaidah keilmuan.",
                ],
                [
                    'stem' => "Karakteristik pemikiran tingkat tinggi (HOTS) yang paling tercermin saat menyelesaikan masalah kompleks terkait {$coreNoun} adalah...",
                    'correct' => "Mampu menghubungkan berbagai konsep terkait, menguji keabsahan argumen, dan menyusun solusi orisinal yang logis.",
                    'distractors' => [
                        "Menghafal rumus atau teks definisi secara persis kata demi kata tanpa memahami maknanya.",
                        "Menerima setiap informasi tanpa melakukan konfirmasi atau pengecekan silang.",
                        "Mengandalkan tebakan spekulatif dalam mengambil keputusan penting.",
                    ],
                    'indicator' => "Disajikan pemecahan masalah kompleks, peserta didik mampu menganalisis sintesis konsep {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Sintesis konseptual dan evaluasi kritis adalah ciri pemikiran tingkat tinggi dalam memecahkan masalah baru.",
                    'explanation_distractors' => "Hafalan mekanis dan tebakan spekulatif berada pada tingkat kognitif rendah.",
                ],
                [
                    'stem' => "Strategi terbaik untuk memitigasi risiko kegagalan berulang pada implementasi {$coreNoun} di masa depan adalah...",
                    'correct' => "Menyusun dokumentasi evaluasi kesalahan terdahulu dan menetapkan titik kontrol mutu pada setiap tahapan kritis.",
                    'distractors' => [
                        "Menghindari penerapan materi secara menyeluruh agar tidak menghadapi risiko.",
                        "Menyalahkan faktor lingkungan eksternal tanpa meninjau prosedur internal.",
                        "Melanjutkan prosedur lama tanpa melakukan revisi pada titik kelemahan.",
                    ],
                    'indicator' => "Disajikan mitigasi risiko, peserta didik mampu merumuskan strategi penjaminan mutu preventif pada {$coreNoun}.",
                    'sub_level' => "{$subLevel} - HOTS (Penalaran Kritis)",
                    'explanation_correct' => "Dokumentasi retrospektif dan penempatan quality gates pada titik rawan mencegah terulangnya anomali.",
                    'explanation_distractors' => "Menghindari implementasi atau melempar kesalahan tidak menghasilkan perbaikan berkelanjutan.",
                ],
            ];
        }
    }

    protected function buildSingleMcQuestion(
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

        // Domain classification for 100% substantive questions
        $domain = $this->detectTpDomain($analysis, $subjectName);
        $angles = $this->getDomainMcAngles($domain, $effectiveLevel, $isSmp, $coreNoun, $subjectName, $subLevel);

        $angleIndex = ($number + $variant - 1) % count($angles);
        $angle = $angles[$angleIndex];

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
