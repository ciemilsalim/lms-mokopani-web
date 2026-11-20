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
        $cacheHash = md5("offline_exam_v5_{$tpKey}_{$classKey}_{$questionType}_{$questionCount}_{$generationEngine}_{$cognitiveLevel}_{$levelInfo['grade_label']}");

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
   c. JANGAN PERNAH menyalin mentah-mentah frasa kurikulum seperti "Peserta didik mampu..." atau "Peserta didik dapat..." ke dalam kalimat soal.
   d. DILARANG KERAS menyisipkan teks artifisial seperti "(soal nomor X)!" pada kalimat soal.
   e. Jika sebuah TP dialokasikan lebih dari 1 butir soal, setiap butir soal pada TP tersebut WAJIB menguji aspek materi yang BERBEDA (contoh: butir 1 fokus pengertian/alur, butir 2 fokus manfaat, butir 3 fokus komponen/bagian, butir 4 fokus contoh nyata, butir 5 fokus urutan langkah kerja). DILARANG KERAS membuat soal kembar atau berulang dengan redaksi yang sama!
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
     * Clean and analyze a Learning Objective (TP) to extract true pedagogical concepts,
     * stripping instructional curriculum boilerplate like "Peserta didik mampu...".
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

        // 3. Determine pure topic concept (without operational verbs)
        if ($rawContent !== '') {
            $concept = trim($rawContent, " \t\n\r\0\x0B.,:;");
        } else {
            // Strip leading operational verbs from cleanedDesc to extract the pure subject matter concept
            $concept = preg_replace('/^(menjelaskan|mengidentifikasi|menganalisis|memahami|menerapkan|mengevaluasi|menguraikan|mempraktikkan|mendeskripsikan|merancang|menyusun|membedakan)\s+/iu', '', $cleanedDesc);
            $concept = trim($concept, " \t\n\r\0\x0B.,:;");
            if ($concept === '') {
                $concept = $cleanedDesc ?: ($subjectName ?: 'materi pembelajaran');
            }
        }

        // 4. Operational verb
        $verb = 'memahami';
        if (preg_match('/^(menjelaskan|mengidentifikasi|menganalisis|memahami|menerapkan|mengevaluasi|menguraikan|mempraktikkan|mendeskripsikan|merancang|menyusun|membedakan)/iu', $cleanedDesc, $vMatch)) {
            $verb = mb_strtolower($vMatch[1]);
        }

        return [
            'raw_description' => $rawDesc,
            'cleaned_description' => $cleanedDesc,
            'concept' => $concept,
            'verb' => $verb,
            'sub_topics' => $subTopics,
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
        ?array $levelInfo = null
    ): array {
        $levelInfo = $levelInfo ?? $this->resolveEducationLevel([], $className);
        $analysis = $this->analyzeTp($tp, $subjectName);
        $concept = $analysis['concept'];
        $gradeLabel = $levelInfo['grade_label'] ?? 'Kelas 8 SMP';
        $isSmp = ($levelInfo['pedagogical_tone'] ?? 'smp') === 'smp';

        // Determine effective cognitive level for this question
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

        $correctLetter = ['A', 'B', 'C', 'D'][($number + $variant + 1) % 4];

        if ($effectiveLevel === 'lots') {
            // Level 1: LOTS (C1 - Mengingat / C2 - Memahami)
            $subLevel = (($number + $variant) % 2 === 1) ? 'C1' : 'C2';
            $verb = ($subLevel === 'C1') ? 'mengingat dan mengidentifikasi' : 'menjelaskan';

            if ($isSmp) {
                $stems = [
                    "Apa pengertian utama dari {$concept} dalam pembelajaran {$subjectName}?",
                    "Berikut ini yang merupakan bagian atau ciri pokok dari {$concept} adalah...",
                    "Apa manfaat utama yang kamu peroleh setelah mempelajari materi {$concept}?",
                    "Contoh sederhana penerapan {$concept} yang paling sering kamu jumpai sehari-hari adalah...",
                    "Pernyataan yang paling benar mengenai materi {$concept} adalah...",
                ];
                $options = [
                    'A' => "Konsep atau cara dasar dalam {$concept} yang bertujuan mempermudah pemahaman siswa.",
                    'B' => "Bagian dari materi {$concept} yang berfungsi mengenali istilah dan aturan pokok yang berlaku.",
                    'C' => "Bentuk penerapan dasar {$concept} yang digunakan untuk mengenalkan materi secara konseptual.",
                    'D' => "Prinsip utama {$concept} yang membedakannya dari materi lain dalam pembelajaran {$subjectName}.",
                ];
                $options[$correctLetter] = "Pengenalan dan pemahaman konsep utama mengenai {$concept} secara utuh dan sistematis.";
            } else {
                $stems = [
                    "Berdasarkan materi {$subjectName}, apa yang menjadi fokus atau pengertian pokok dari {$concept}?",
                    "Berikut ini yang merupakan ciri-ciri atau bagian mendasar dari {$concept} adalah...",
                    "Dalam ruang lingkup materi {$subjectName}, pernyataan manakah yang paling tepat menjelaskan konsep {$concept}?",
                    "Fungsi atau tujuan utama dari mempelajari {$concept} pada mata pelajaran {$subjectName} adalah...",
                    "Salah satu contoh bentuk penerapan sederhana dari {$concept} yang sering dijumpai sehari-hari adalah...",
                ];
                $options = [
                    'A' => "Konsep atau cara dasar dalam {$concept} yang bertujuan untuk mempermudah pemahaman peserta didik.",
                    'B' => "Bagian dari materi {$concept} yang berfungsi mengenali istilah, fakta, dan aturan pokok yang berlaku.",
                    'C' => "Bentuk dasar penerapan {$concept} yang digunakan untuk mengenalkan materi secara konseptual.",
                    'D' => "Prinsip utama {$concept} yang membedakannya dari materi lain dalam pembelajaran {$subjectName}.",
                ];
                $options[$correctLetter] = "Pengenalan dan pemahaman konsep utama mengenai {$concept} secara utuh dan sistematis.";
            }
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: {$subLevel} - LOTS / Pemahaman Dasar)\n\n"
                . "Pembahasan Rinci:\n"
                . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
                . "   Pilihan ini tepat karena menyatakan pemahaman dasar dan definisi esensial dari materi {$concept} secara lugas dan sesuai dengan kaidah materi {$subjectName}.\n\n"
                . "2. Analisis Opsi Pengecoh:\n"
                . "   Pilihan lainnya kurang tepat karena hanya mendeskripsikan aspek parsial atau tidak mencakup substansi utama dari {$concept}.";

            $indicator = "Disajikan konsep dasar, peserta didik mampu {$verb} materi terkait {$concept}.";
            $levelCode = $subLevel;
        } elseif ($effectiveLevel === 'mots') {
            // Level 2: MOTS (C3 - Menerapkan / Aplikasi)
            $verb = 'menerapkan';
            $levelCode = 'C3';

            if ($isSmp) {
                $stems = [
                    "Langkah pertama yang paling tepat kamu lakukan saat mempraktikkan materi {$concept} adalah...",
                    "Jika kamu diminta menggunakan konsep {$concept} untuk menyelesaikan tugas sekolah, tindakan yang paling benar adalah...",
                    "Contoh tindakan siswa yang benar dalam menerapkan materi {$concept} di kelas adalah...",
                    "Bagaimanakah urutan langkah kerja yang tepat saat kamu menggunakan {$concept} untuk menyelesaikan tugas?",
                    "Pilihan berikut yang menunjukkan cara kerja {$concept} yang benar dan teratur adalah...",
                ];
                $options = [
                    'A' => "Mengikuti urutan langkah kerja materi {$concept} secara bertahap dan teratur.",
                    'B' => "Menyesuaikan langkah kerja dengan memperhatikan aturan pokok dan tujuan dari {$concept}.",
                    'C' => "Menggunakan konsep {$concept} sebagai acuan utama dalam memilih cara kerja yang efisien.",
                    'D' => "Mempraktikkan cara penyelesaian masalah dengan menerapkan prinsip yang telah dipelajari pada {$concept}.",
                ];
                $options[$correctLetter] = "Menerapkan langkah kerja yang sistematis dan terarah sesuai kaidah {$concept} dalam mencapai tujuan.";
            } else {
                $stems = [
                    "Seorang siswa ingin menerapkan prinsip {$concept} dalam kegiatan pembelajaran {$subjectName}. Tindakan pertama yang paling tepat dilakukan adalah...",
                    "Perhatikan situasi sehari-hari: Jika Anda diminta menggunakan konsep {$concept} untuk menyelesaikan suatu tugas, langkah yang paling sesuai adalah...",
                    "Dalam praktik pembelajaran {$subjectName}, penerapan materi {$concept} yang benar ditunjukkan oleh...",
                    "Bagaimanakah prosedur atau alur kerja yang tepat saat kita memanfaatkan {$concept} untuk memecahkan persoalan praktis?",
                    "Manakah di antara pilihan berikut yang menunjukkan contoh implementasi langsung prinsip {$concept} secara terencana?",
                ];
                $options = [
                    'A' => "Mengikuti tahapan prosedur baku materi {$concept} secara bertahap dan terencana.",
                    'B' => "Menyesuaikan langkah kerja dengan memperhatikan aturan pokok dan tujuan dari {$concept}.",
                    'C' => "Menggunakan konsep {$concept} sebagai acuan utama dalam memilih tindakan praktis yang efisien.",
                    'D' => "Mempraktikkan cara penyelesaian masalah dengan menerapkan prinsip yang telah dipelajari pada {$concept}.",
                ];
                $options[$correctLetter] = "Menerapkan langkah kerja yang sistematis dan terarah sesuai kaidah {$concept} dalam mencapai tujuan.";
            }
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: C3 - MOTS / Penerapan)\n\n"
                . "Pembahasan Rinci:\n"
                . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
                . "   Pilihan ini benar karena menunjukkan kemampuan penerapan (aplikasi) prosedur dan cara kerja materi {$concept} dalam konteks tugas nyata.\n\n"
                . "2. Analisis Opsi Pengecoh:\n"
                . "   Opsi pengecoh lainnya kurang tepat karena urutan penerapannya tidak sistematis atau belum menunjukkan aplikasi menyeluruh terhadap kaidah {$concept}.";

            $indicator = "Disajikan situasi kontekstual, peserta didik mampu {$verb} konsep {$concept} untuk menyelesaikan tugas.";
        } else {
            // Level 3: HOTS (C4 - Menganalisis / C5 - Mengevaluasi)
            $subLevel = (($number + $variant) % 2 === 1) ? 'C4' : 'C5';
            $verb = ($subLevel === 'C4') ? 'menganalisis' : 'mengevaluasi';
            $levelCode = $subLevel;

            if ($isSmp) {
                $stems = [
                    "Jika hasil tugasmu pada materi {$concept} belum sesuai petunjuk, langkah pemeriksaan yang harus kamu lakukan pertama kali adalah...",
                    "Mengapa kamu perlu memahami aturan {$concept} sebelum mulai mengerjakan tugas praktiknya?",
                    "Apa yang akan terjadi jika salah satu bagian penting dalam materi {$concept} mengalami kerusakan?",
                    "Ketika kamu menemukan kesalahan saat mempraktikkan {$concept}, tindakan perbaikan yang paling tepat adalah...",
                    "Di antara dua cara kerja dalam materi {$concept}, tindakan yang paling tepat dan hemat waktu adalah...",
                ];
                $options = [
                    'A' => "Mencari tahu penyebab gangguan pada komponen pendukung dan memperbaiki proses kerja konsep {$concept}.",
                    'B' => "Memeriksa kembali bagian-bagian penting dalam materi {$concept} yang belum dilakukan dengan cermat.",
                    'C' => "Memperbaiki kesalahan langkah kerja agar tujuan materi {$concept} dapat tercapai dengan benar.",
                    'D' => "Melakukan pemeriksaan ulang terhadap petunjuk dasar yang digunakan dalam penerapan {$concept}.",
                ];
                $options[$correctLetter] = "Mencari tahu bagian yang mengalami kendala lalu memperbaikinya sesuai aturan materi {$concept}.";
            } else {
                $stems = [
                    "Disajikan studi kasus: Dalam pelaksanaan kegiatan terkait {$concept}, terjadi ketidaksesuaian antara rencana dan hasil akhir. Analisis penyebab yang paling kritis adalah...",
                    "Mengapa pemahaman mendalam tentang {$concept} sangat menentukan keberhasilan pemecahan masalah yang kompleks dalam {$subjectName}?",
                    "Apabila salah satu prinsip pokok pada {$concept} diabaikan atau tidak terpenuhi, dampak lanjutan yang paling signifikan adalah...",
                    "Berdasarkan analisis perbandingan dua metode dalam {$concept}, manakah evaluasi yang paling tepat mengenai solusi yang paling efektif dan efisien?",
                    "Seorang siswa menemukan hasil kerja yang tidak sinkron saat menerapkan aturan {$concept}. Evaluasi kritis yang harus dilakukan pertama kali adalah...",
                ];
                $options = [
                    'A' => "Terjadinya ketidakselarasan antara faktor pendukung dan mekanisme pelaksanaan konsep {$concept}.",
                    'B' => "Hasil evaluasi menunjukkan bahwa variabel utama dalam materi {$concept} belum diperhitungkan dengan cermat.",
                    'C' => "Dampak kesalahan logika atau prosedur menyebabkan tujuan materi {$concept} tidak tercapai secara optimal.",
                    'D' => "Diperlukannya pengkajian ulang secara kritis terhadap asumsi dasar yang mendasari penerapan {$concept}.",
                ];
                $options[$correctLetter] = "Analisis mendalam membuktikan bahwa pengabaian kaidah {$concept} menimbulkan kendala sistemik dalam pemecahan masalah.";
            }
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: {$subLevel} - HOTS / Penalaran Kritis)\n\n"
                . "Pembahasan Rinci:\n"
                . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
                . "   Pilihan ini benar karena mampu mengurai hubungan sebab-akibat secara mendalam dan memberikan kesimpulan kritis yang valid terhadap dinamika materi {$concept}.\n\n"
                . "2. Analisis Opsi Pengecoh:\n"
                . "   Opsi-opsi pengecoh hanya melihat gejala permukaan tanpa menganalisis akar masalah secara komprehensif.";

            $indicator = "Disajikan permasalahan kontekstual, peserta didik mampu {$verb} hubungan sebab-akibat dan menentukan solusi terbaik pada materi {$concept}.";
        }

        return [
            'number' => $number,
            'type' => 'multiple_choice',
            'question' => $stem,
            'options' => $options,
            'answer' => $correctLetter,
            'explanation' => $explanation,
            'indicator' => $indicator,
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
                        'stem' => "Apa manfaat yang kamu peroleh setelah mempelajari materi {$concept} dalam kehidupan sehari-hari?",
                        'indicator' => "Peserta didik mampu menyebutkan manfaat materi {$concept} dalam kehidupan sehari-hari.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menuliskan manfaat konkret materi {$concept} dalam mempermudah kegiatan belajar atau aktivitas harian siswa.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Manfaat dijelaskan secara jelas, relevan, dan kontekstual dengan kehidupan siswa.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menyebutkan manfaat namun penjelasannya masih bersifat umum.\n"
                            . "• Skor 3 - 5 (Cukup): Manfaat yang dituliskan kurang relevan dengan materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian jawaban tidak menunjukkan pemahaman manfaat materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Bagian / Komponen Pokok SMP
                    [
                        'stem' => "Sebutkan 3 (tiga) bagian atau tahapan penting yang ada pada materi {$concept}!",
                        'indicator' => "Peserta didik mampu menyebutkan bagian atau tahapan penting materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyebutkan minimal 3 bagian, komponen, atau tahapan utama dari materi {$concept} secara tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menyebutkan 3 bagian/tahapan penting dengan sangat tepat dan lengkap.\n"
                            . "• Skor 6 - 8 (Baik): Menyebutkan 2 bagian penting dengan tepat.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan 1 bagian penting dengan tepat.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Bagian yang disebutkan tidak tepat atau keliru.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Contoh Nyata Sehari-hari SMP
                    [
                        'stem' => "Tuliskan 2 (dua) contoh penerapan {$concept} yang pernah kamu temui di sekolah atau di rumah!",
                        'indicator' => "Peserta didik mampu memberikan contoh konkret materi {$concept} dalam konteks harian.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menuliskan 2 contoh penerapan nyata materi {$concept} yang dekat dengan keseharian siswa.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Memberikan 2 contoh konkret yang sangat tepat dan relevan.\n"
                            . "• Skor 6 - 8 (Baik): Memberikan 1 contoh yang tepat atau 2 contoh yang masih bersifat umum.\n"
                            . "• Skor 3 - 5 (Cukup): Contoh yang diberikan kurang sesuai dengan konteks materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Contoh yang dituliskan keliru atau tidak relevan.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Ciri Utama Pembeda SMP
                    [
                        'stem' => "Sebutkan ciri-ciri utama yang membedakan materi {$concept} dengan materi lainnya!",
                        'indicator' => "Peserta didik mampu menyebutkan ciri pembeda utama materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan ciri khas pembeda utama materi {$concept} secara tepat.",
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
                        'stem' => "Apa peranan dan fungsi pokok dari materi {$concept} dalam pembelajaran {$subjectName}?",
                        'indicator' => "Peserta didik mampu menguraikan fungsi pokok materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan peranan dan fungsi utama materi {$concept} dalam disiplin ilmu {$subjectName} secara tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Peranan dan fungsi materi dijelaskan secara tajam, runtut, dan tepat sasaran.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan fungsi materi secara tepat, tetapi penjelasan peranan masih umum.\n"
                            . "• Skor 3 - 5 (Cukup): Penjelasan fungsi masih sangat terbatas.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menyentuh fungsi esensial materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Komponen Mendasar
                    [
                        'stem' => "Sebutkan komponen-komponen mendasar yang membangun sistem materi {$concept}!",
                        'indicator' => "Peserta didik mampu menyebutkan komponen mendasar materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyebutkan komponen-komponen pokok dari materi {$concept} secara lengkap dan tepat.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Komponen mendasar disebutkan secara lengkap, tepat, dan sistematis.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menyebutkan sebagian besar komponen pokok dengan benar.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan sebagian kecil komponen yang relevan.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Komponen yang disebutkan keliru.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Contoh Konkret Implementasi
                    [
                        'stem' => "Tuliskan 2 (dua) contoh konkret implementasi prinsip {$concept} dalam kehidupan nyata!",
                        'indicator' => "Peserta didik mampu memberikan contoh konkret terkait materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menyajikan minimal 2 contoh implementasi nyata yang relevan dengan prinsip {$concept}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Memberikan 2 contoh implementasi yang sangat relevan dan kontekstual.\n"
                            . "• Skor 6 - 8 (Baik): Memberikan 2 contoh namun penjelasannya singkat, atau 1 contoh dengan penjelasan baik.\n"
                            . "• Skor 3 - 5 (Cukup): Contoh yang diberikan kurang kontekstual dengan materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Contoh tidak relevan dengan konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Karakteristik Pembeda
                    [
                        'stem' => "Uraikan karakteristik khusus yang membedakan materi {$concept} dari konsep lainnya!",
                        'indicator' => "Peserta didik mampu mendeskripsikan karakteristik pembeda materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                            . "1. Menguraikan karakteristik pembeda utama dari materi {$concept} secara akurat.",
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
                        'stem' => "Bagaimanakah urutan langkah yang kamu lakukan saat mempraktikkan materi {$concept} di kelas?",
                        'indicator' => "Peserta didik mampu menguraikan tahapan penerapan konsep {$concept} secara runtut.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan langkah-langkah kerja materi {$concept} dari awal hingga selesai secara runtut.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menguraikan tahapan penerapan secara sistematis, jelas, dan berurutan.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan tahapan penerapan dengan cukup jelas, namun ada sebagian langkah yang terlewat.\n"
                            . "• Skor 3 - 5 (Cukup): Langkah-langkah yang diuraikan masih acak dan belum terstruktur.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian langkah tidak relevan dengan materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Alur Tugas / Proyek Sederhana SMP
                    [
                        'stem' => "Tuliskan susunan rencana pembagian tugas kelompokmu saat mengerjakan praktik materi {$concept}!",
                        'indicator' => "Peserta didik mampu menyusun alur kerja kelompok berbasis konsep {$concept}.",
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
                        'stem' => "Langkah apa yang akan kamu lakukan jika hasil praktik materi {$concept} milikmu belum sesuai petunjuk?",
                        'indicator' => "Peserta didik mampu merumuskan langkah pemeriksaan operasional pada materi {$concept}.",
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
                        'stem' => "Apa akibatnya bagi hasil tugasmu jika kamu melewati salah satu tahapan penting dalam materi {$concept}?",
                        'indicator' => "Peserta didik mampu menjelaskan dampak pengabaian prosedur materi {$concept}.",
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
                            : "Jelaskan urutan alur kerja pada materi {$concept} dari awal hingga menghasilkan luaran (output)!",
                        'indicator' => "Peserta didik mampu mendeskripsikan siklus proses dan luaran materi {$concept}.",
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
                        'stem' => "Bagaimanakah langkah-langkah praktis dalam menerapkan konsep {$concept} saat menyelesaikan tugas {$subjectName}?",
                        'indicator' => "Peserta didik mampu menguraikan tahapan penerapan konsep {$concept} secara runtut.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menjelaskan tahapan penerapan materi {$concept} secara runtut dari awal hingga akhir.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Menguraikan tahapan penerapan secara sistematis, terstruktur, dan jelas.\n"
                            . "• Skor 6 - 8 (Baik): Menguraikan tahapan penerapan dengan cukup jelas, namun ada sebagian langkah yang terlewat.\n"
                            . "• Skor 3 - 5 (Cukup): Langkah-langkah yang diuraikan masih acak dan belum menunjukkan alur kerja yang terstruktur.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian langkah tidak relevan.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Alur Kerja Terstruktur
                    [
                        'stem' => "Susunlah alur kerja terstruktur yang Anda lakukan saat mempraktikkan konsep {$concept}!",
                        'indicator' => "Peserta didik mampu menyusun alur kerja operasional berbasis konsep {$concept}.",
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
                        'stem' => "Langkah pemeriksaan apa yang Anda ambil jika menemukan ketidaksesuaian hasil saat menerapkan kaidah {$concept}?",
                        'indicator' => "Peserta didik mampu merumuskan langkah penyelesaian masalah operasional menggunakan kaidah {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menetapkan urutan tindakan pemeriksaan dan perbaikan yang tepat berbasis kaidah {$concept}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Tindakan pemeriksaan sistematis, realistis, dan dilengkapi verifikasi keakuratan.\n"
                            . "• Skor 6 - 8 (Baik): Tindakan pemeriksaan tepat tetapi langkah pengecekan hasil belum diuraikan.\n"
                            . "• Skor 3 - 5 (Cukup): Tindakan pemeriksaan masih umum dan belum spesifik pada kaidah materi.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Langkah tindakan tidak sesuai dengan konteks masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 3: Kepatuhan Kaidah Prosedur
                    [
                        'stem' => "Mengapa kepatuhan terhadap kaidah {$concept} sangat menentukan efisiensi kerja Anda?",
                        'indicator' => "Peserta didik mampu menjelaskan urgensi kaidah konsep {$concept} dalam efisiensi kerja.",
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
                        'stem' => "Jelaskan siklus alur proses kerja yang berlangsung pada materi {$concept} dari tahap awal hingga akhir!",
                        'indicator' => "Peserta didik mampu mendeskripsikan siklus proses luaran pada materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                            . "1. Menguraikan siklus proses kerja materi {$concept} dari input hingga hasil akhir secara terstruktur.",
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
                        'stem' => "Jika saat mempraktikkan materi {$concept} terjadi kendala pada hasil akhirnya, bagaimana cara terbaikmu untuk memperbaikinya?",
                        'indicator' => "Peserta didik mampu merumuskan solusi perbaikan logis pada materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menguraikan solusi perbaikan yang logis, kreatif, dan sesuai dengan prinsip materi {$concept}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Solusi perbaikan logis, realistis, dan tepat menyelesaikan kendala.\n"
                            . "• Skor 6 - 8 (Baik): Solusi perbaikan cukup baik, namun langkah tindakannya masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Solusi yang diajukan kurang realistis atau masih umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian belum menyentuh pemecahan masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Menentukan Pilihan Terbaik SMP
                    [
                        'stem' => "Di antara dua cara penyelesaian tugas pada materi {$concept}, cara mana yang menurutmu paling mudah dan aman digunakan?",
                        'indicator' => "Peserta didik mampu menentukan pilihan pendekatan terbaik pada materi {$concept}.",
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
                        'stem' => "Apa akibat yang akan terjadi pada hasil kerja secara keseluruhan jika salah satu bagian penting dalam materi {$concept} tidak berfungsi?",
                        'indicator' => "Peserta didik mampu menganalisis dampak gangguan komponen pada materi {$concept}.",
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
                        'stem' => "Saran perbaikan apa yang akan kamu berikan jika melihat tugas temanmu tentang materi {$concept} masih belum rapi dan belum lengkap?",
                        'indicator' => "Peserta didik mampu memberikan evaluasi dan saran perbaikan konstruktif pada materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Memberikan saran konkret dan mudah diterapkan oleh teman untuk memperbaiki tugas materi {$concept}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Saran perbaikan sangat jelas, konstruktif, dan mudah diterapkan.\n"
                            . "• Skor 6 - 8 (Baik): Saran perbaikan tepat, tetapi penjelasan cara menerapkannya masih singkat.\n"
                            . "• Skor 3 - 5 (Cukup): Saran yang diberikan masih bersifat umum.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Saran tidak relevan dengan konsep materi.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 4: Gagasan Kreatif Siswa SMP
                    [
                        'stem' => "Ide kreatif apa yang bisa kamu buat dengan memanfaatkan materi {$concept} untuk membantu kegiatan belajarmu di sekolah?",
                        'indicator' => "Peserta didik mampu merancang ide kreatif aplikatif berbasis materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Mengusulkan gagasan kreatif dan aplikatif berbasis materi {$concept} yang bermanfaat bagi aktivitas belajar.",
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
                        'stem' => "Lakukan analisis kritis: Bagaimana langkah perbaikan terbaik yang Anda rumuskan jika terjadi kendala pada implementasi materi {$concept}?",
                        'indicator' => "Peserta didik mampu merumuskan solusi alternatif logis pada materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Merumuskan solusi alternatif yang kreatif, logis, dan dapat diterapkan secara konkret pada materi {$concept}.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Analisis kritis sangat mendalam dan solusi alternatif inovatif serta realistis.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menawarkan solusi, namun argumentasi penalaran masih sederhana.\n"
                            . "• Skor 3 - 5 (Cukup): Hanya menyebutkan solusi tanpa analisis mendalam.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian belum menyentuh pemecahan masalah.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 1: Evaluasi Keunggulan Pendekatan
                    [
                        'stem' => "Evaluasilah keunggulan utama pendekatan materi {$concept} dalam memecahkan persoalan pada bidang {$subjectName}!",
                        'indicator' => "Peserta didik mampu mengevaluasi keunggulan materi {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Menyajikan telaah evaluatif mengenai keunggulan utama dari pendekatan {$concept} secara objektif.",
                        'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                            . "• Skor 9 - 10 (Sangat Baik): Evaluasi keunggulan diuraikan kritis, tajam, dan disertai justifikasi yang kuat.\n"
                            . "• Skor 6 - 8 (Baik): Mampu menguraikan keunggulan, namun justifikasi masih normatif.\n"
                            . "• Skor 3 - 5 (Cukup): Uraian keunggulan masih dangkal.\n"
                            . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menunjukkan daya kritis.\n"
                            . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                    ],
                    // Angle 2: Analisis Dampak Sistemik
                    [
                        'stem' => "Analisislah dampak sistemik yang terjadi apabila salah satu elemen kunci pada materi {$concept} tidak beroperasi semestinya!",
                        'indicator' => "Peserta didik mampu menganalisis hubungan sebab-akibat sistemik pada materi {$concept}.",
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
                        'stem' => "Di antara dua pendekatan dalam materi {$concept}, pendekatan manakah yang paling optimal Anda gunakan beserta alasannya?",
                        'indicator' => "Peserta didik mampu membandingkan dan menentukan pilihan solusi optimal pada materi {$concept}.",
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
                        'stem' => "Rancanglah suatu gagasan solutif berbasis prinsip {$concept} untuk menjawab persoalan di lingkungan sekitar Anda!",
                        'indicator' => "Peserta didik mampu merancang strategi integratif dan solutif berbasis prinsip {$concept}.",
                        'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                            . "1. Merumuskan gagasan atau rancangan solutif terstruktur dengan memanfaatkan prinsip utama materi {$concept}.",
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
            'school_logo' => school_logo_url(),
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
     * Get local filesystem path to school logo for PhpWord export if available.
     */
    protected function getLocalSchoolLogoPath(): ?string
    {
        $path = school_setting('app_logo');
        if (!$path) {
            return null;
        }

        $paths = [
            storage_path('app/public/' . $path),
            base_path('../aplikasi-absensi/storage/app/public/' . $path),
            public_path('storage/' . $path),
        ];

        foreach ($paths as $fullPath) {
            $fullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $fullPath);
            if (file_exists($fullPath)) {
                return $fullPath;
            }
        }

        return null;
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

        // 1. Kop Surat
        $kopTable = $section->addTable([
            'borderBottomSize' => 18,
            'borderBottomColor' => '000000',
            'alignment' => JcTable::CENTER,
            'unit' => TblWidth::PERCENT,
            'width' => 100 * 50,
        ]);
        $kopRow = $kopTable->addRow();

        $logoPath = $this->getLocalSchoolLogoPath();
        if ($logoPath) {
            $logoCell = $kopRow->addCell(1500, ['valign' => 'center']);
            $logoCell->addImage($logoPath, [
                'width' => 60,
                'height' => 60,
                'alignment' => Jc::CENTER,
            ]);
            $textCellWidth = 8500;
        } else {
            $textCellWidth = 10000;
        }

        $kopCell = $kopRow->addCell($textCellWidth, ['valign' => 'center']);
        $kopCell->addText('PEMERINTAH KABUPATEN BUOL', ['bold' => true, 'size' => 11], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText('DINAS PENDIDIKAN DAN KEBUDAYAAN', ['bold' => true, 'size' => 11], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText($this->cleanWordText(strtoupper($examData['school_name'])), ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER, 'spaceAfter' => 30]);

        $metaSchoolText = $this->cleanWordText($examData['school_address'] . ' | Telp: ' . $examData['school_phone'] . ' | Email: ' . $examData['school_email']);
        $kopCell->addText($metaSchoolText, ['size' => 8.5, 'italic' => true], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);

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
