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
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\JcTable;

class OfflineExamGeneratorService
{
    protected AiManager $aiManager;

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Clean text for XML output inside Microsoft Word .docx to prevent XML entity corruption.
     */
    public function cleanWordText(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        // Replace bare ampersands not part of an existing valid XML entity
        $cleaned = preg_replace('/&(?!(?:amp|lt|gt|quot|apos);)/u', '&amp;', $text);
        // Strip any null bytes or control characters except tab, LF, CR
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $cleaned);

        return $cleaned;
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
        $cacheHash = md5("offline_exam_{$tpKey}_{$classKey}_{$questionType}_{$questionCount}_{$generationEngine}_{$cognitiveLevel}");

        if (!$regenerate) {
            $cachedJson = LmsAiCache::getCache($cacheHash);
            if ($cachedJson) {
                $decoded = json_decode($cachedJson, true);
                if (is_array($decoded) && !empty($decoded['questions'])) {
                    // Enforce strict question type filtering even on cached payload
                    $filtered = $this->enforceStrictQuestionType($decoded, $tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel);
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
                        $cognitiveLevel
                    );
                }
            }
        }

        // If 'fast' engine or testing environment, immediately use deterministic pedagogical generator (0.05s, 0 token cost, 100% no 503 timeout)
        if ($generationEngine === 'fast' || app()->environment('testing')) {
            $aiResult = $this->buildPedagogicalFallback($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel);
        } else {
            // Try AI generation first
            $aiResult = $this->callAiForExam($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel);

            if (!$aiResult || empty($aiResult['questions'])) {
                // Fallback: Generate structured pedagogical questions deterministically
                $aiResult = $this->buildPedagogicalFallback($tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel);
            }
        }

        // Post-validation: Enforce STRICT question type consistency and TP allocation
        $aiResult = $this->enforceStrictQuestionType($aiResult, $tpList, $subjectName, $classNames, $questionType, $questionCount, $tpAllocations, $cognitiveLevel);

        // Cache successful output
        try {
            LmsAiCache::setCache($cacheHash, 'offline_exam', [
                'tp_ids' => $tpList->pluck('id')->all(),
                'class_ids' => $classIds,
                'type' => $questionType,
                'count' => $questionCount,
                'engine' => $generationEngine,
                'cognitive_level' => $cognitiveLevel,
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
            $cognitiveLevel
        );
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
        string $cognitiveLevel = 'all'
    ): array {
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
                $q = $this->buildSingleEssayQuestion($targetTp, $subjectName, $className, $num, $cognitiveLevel, $questionCount, $variant);
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
                $q = $this->buildSingleMcQuestion($targetTp, $subjectName, $className, $num, $cognitiveLevel, $questionCount, $variant);
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
                $fallback = $this->buildPedagogicalFallback($tps, $subjectName, $className, 'mixed', $questionCount, $tpAllocations, $cognitiveLevel);
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
        string $cognitiveLevel = 'all'
    ): ?array {
        $typeInstruction = match ($questionType) {
            'essay' => "PERINGATAN KHUSUS: Jenis soal WAJIB 100% 'essay' (Esai / Uraian) sebanyak {$questionCount} nomor. DILARANG KERAS menghasilkan soal pilihan ganda ataupun opsi A/B/C/D!",
            'mixed' => "Jenis soal adalah 'mixed' (Campuran Pilihan Ganda & Esai) dengan total {$questionCount} nomor (misal 70% Pilihan Ganda, 30% Esai).",
            default => "PERINGATAN KHUSUS: Jenis soal WAJIB 100% 'multiple_choice' (Pilihan Ganda 4 Opsi: A, B, C, D) sebanyak {$questionCount} nomor. DILARANG KERAS menghasilkan soal esai!",
        };

        $cognitiveInstruction = match ($cognitiveLevel) {
            'lots' => "TINGKAT KOGNITIF: WAJIB Level 1 - LOTS (C1-C2 / Mengingat & Memahami). Gunakan bahasa yang sederhana, mudah dipahami siswa SMP/SMA, pertanyaan langsung/lugas, kenalkan istilah & definisi dasar, dan HINDARI kalimat yang berbelit-belit atau terlalu rumit.",
            'mots' => "TINGKAT KOGNITIF: WAJIB Level 2 - MOTS (C3 / Menerapkan & Aplikasi). Fokus pada prosedur langkah kerja, contoh konkret harian, dan penerapan aturan materi pada situasi nyata.",
            'hots' => "TINGKAT KOGNITIF: WAJIB Level 3 - HOTS (C4-C6 / Menganalisis, Mengevaluasi, Pemecahan Masalah). Sajikan stimulus kasus kontekstual yang menuntut penalaran kritis.",
            default => "TINGKAT KOGNITIF: Campuran Proporsional Kurikulum Merdeka (sekitar 30% LOTS C1-C2 pada nomor-nomor awal, 50% MOTS C3 pada nomor tengah, dan 20% HOTS C4-C5 pada nomor akhir).",
        };

        $tpAllocationsText = "";
        foreach ($tpAllocations as $alloc) {
            $tpAllocationsText .= "- [{$alloc['tp_code']}] {$alloc['description']} -> Dialokasikan {$alloc['count']} Butir Soal (Nomor {$alloc['start_number']} s/d {$alloc['end_number']})\n";
        }

        $prompt = <<<PROMPT
Anda adalah ahli penyusun instrumen asesmen dan kurikulum Kurikulum Merdeka untuk jenjang sekolah menengah di Indonesia.
Tolong buatkan perangkat soal asesmen pembelajaran offline cetak lengkap berdasarkan Tujuan Pembelajaran (TP) yang telah dibagi rata:

INFORMASI UJIAN:
- Mata Pelajaran: {$subjectName}
- Kelas / Sasaran: {$className}
- Bentuk Soal: {$questionType} ({$typeInstruction})
- Tingkat Kognitif / Kesulitan: {$cognitiveInstruction}
- Total Butir Soal: {$questionCount} Nomor

DAFTAR TUJUAN PEMBELAJARAN (TP) DAN PEMBAGIAN RATA BUTIR SOAL:
{$tpAllocationsText}

ATURAN WAJIB & SANGAT KETAT:
1. Pastikan total soal di array 'questions' tepat {$questionCount} butir.
2. Butir soal WAJIB dibagi rata sesuai rentang nomor alokasi masing-masing TP di atas.
3. Cantumkan kode TP ('tp_code') pada setiap butir soal di 'questions' dan 'blueprint'.
4. PEDOMAN REDAKSI BUTIR PERTANYAAN (MUTLAK):
   a. JANGAN PERNAH menyalin mentah-mentah frasa kurikulum seperti "Peserta didik mampu..." atau "Peserta didik dapat..." ke dalam kalimat soal. Ubah deskripsi TP menjadi kalimat pertanyaan/stimulus yang lugas, alami, dan langsung ditujukan kepada siswa.
   b. DILARANG KERAS menyisipkan teks artifisial seperti "(soal nomor X)!" pada kalimat soal.
   c. Jika sebuah TP dialokasikan lebih dari 1 butir soal, setiap butir soal pada TP tersebut WAJIB menguji aspek materi yang BERBEDA (contoh: definisi konsep, komponen/bagian, cara kerja/siklus, contoh konkret sehari-hari, dan pemecahan masalah). DILARANG KERAS membuat soal kembar atau berulang dengan redaksi yang sama!
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
        string $cognitiveLevel = 'all'
    ): array {
        $questions = [];

        foreach ($tpAllocations as $alloc) {
            $currentTp = $alloc['tp'];
            $countForThisTp = $alloc['count'];
            $startNum = $alloc['start_number'];

            if ($questionType === 'essay') {
                for ($n = 0; $n < $countForThisTp; $n++) {
                    $qNum = $startNum + $n;
                    $q = $this->buildSingleEssayQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
            } elseif ($questionType === 'multiple_choice') {
                for ($n = 0; $n < $countForThisTp; $n++) {
                    $qNum = $startNum + $n;
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n);
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
                    $q = $this->buildSingleMcQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n);
                    $q['tp_code'] = $alloc['tp_code'];
                    $q['material'] = $alloc['content'];
                    $questions[] = $q;
                }
                for ($n = 0; $n < $essayForTp; $n++) {
                    $qNum = $startNum + $mcForTp + $n;
                    $q = $this->buildSingleEssayQuestion($currentTp, $subjectName, $className, $qNum, $cognitiveLevel, $questionCount, $n);
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
        $cleanedDesc = preg_replace('/^(diharapkan\s+)?(peserta didik|siswa|murid)\s+(mampu|dapat|diharapkan mampu|diharapkan dapat)\s+/iu', '', $rawDesc);
        $cleanedDesc = preg_replace('/^(mampu|dapat)\s+/iu', '', $cleanedDesc);
        $cleanedDesc = trim($cleanedDesc, " \t\n\r\0\x0B.");

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
            $concept = $rawContent;
        } else {
            // Strip leading operational verbs from cleanedDesc to extract the pure subject matter concept
            $concept = preg_replace('/^(menjelaskan|mengidentifikasi|menganalisis|memahami|menerapkan|mengevaluasi|menguraikan|mempraktikkan|mendeskripsikan|merancang|menyusun|membedakan)\s+/iu', '', $cleanedDesc);
            $concept = trim($concept, " \t\n\r\0\x0B.");
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
        int $variant = 0
    ): array {
        $analysis = $this->analyzeTp($tp, $subjectName);
        $concept = $analysis['concept'];

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

            $stems = [
                "Berdasarkan materi {$subjectName}, apa yang menjadi fokus atau pengertian pokok dari {$concept}?",
                "Berikut ini yang merupakan ciri-ciri atau bagian mendasar dari {$concept} adalah...",
                "Dalam ruang lingkup materi {$subjectName}, pernyataan manakah yang paling tepat menjelaskan konsep {$concept}?",
                "Fungsi atau tujuan utama dari mempelajari {$concept} pada mata pelajaran {$subjectName} adalah...",
                "Salah satu contoh bentuk penerapan sederhana dari {$concept} yang sering dijumpai sehari-hari adalah...",
            ];
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $options = [
                'A' => "Konsep atau cara dasar dalam {$concept} yang bertujuan untuk mempermudah pemahaman peserta didik.",
                'B' => "Bagian dari materi {$concept} yang berfungsi mengenali istilah, fakta, dan aturan pokok yang berlaku.",
                'C' => "Bentuk dasar penerapan {$concept} yang digunakan untuk mengenalkan materi secara konseptual.",
                'D' => "Prinsip utama {$concept} yang membedakannya dari materi lain dalam pembelajaran {$subjectName}.",
            ];
            $options[$correctLetter] = "Pengenalan dan pemahaman konsep utama mengenai {$concept} secara utuh dan sistematis.";

            $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: {$subLevel} - LOTS / Pemahaman Dasar)\n\n"
                . "Pembahasan Rinci:\n"
                . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
                . "   Pilihan ini tepat karena menyatakan pemahaman dasar dan definisi esensial dari materi {$concept} secara lugas dan sesuai dengan kaidah keilmuan {$subjectName}.\n\n"
                . "2. Analisis Opsi Pengecoh:\n"
                . "   Pilihan lainnya kurang tepat karena hanya mendeskripsikan aspek parsial atau tidak mencakup substansi utama dari {$concept}.";

            $indicator = "Disajikan konsep dasar, peserta didik mampu {$verb} materi terkait {$concept}.";
            $levelCode = $subLevel;
        } elseif ($effectiveLevel === 'mots') {
            // Level 2: MOTS (C3 - Menerapkan / Aplikasi)
            $verb = 'menerapkan';
            $levelCode = 'C3';

            $stems = [
                "Seorang siswa ingin menerapkan prinsip {$concept} dalam kegiatan pembelajaran {$subjectName}. Tindakan pertama yang paling tepat dilakukan adalah...",
                "Perhatikan situasi sehari-hari: Jika Anda diminta menggunakan konsep {$concept} untuk menyelesaikan suatu tugas, langkah yang paling sesuai adalah...",
                "Dalam praktik pembelajaran {$subjectName}, penerapan materi {$concept} yang benar ditunjukkan oleh...",
                "Bagaimanakah prosedur atau alur kerja yang tepat saat kita memanfaatkan {$concept} untuk memecahkan persoalan praktis?",
                "Manakah di antara pilihan berikut yang menunjukkan contoh implementasi langsung prinsip {$concept} secara terencana?",
            ];
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $options = [
                'A' => "Mengikuti tahapan prosedur baku materi {$concept} secara bertahap dan terencana.",
                'B' => "Menyesuaikan langkah kerja dengan memperhatikan aturan pokok dan tujuan dari {$concept}.",
                'C' => "Menggunakan konsep {$concept} sebagai acuan utama dalam memilih tindakan praktis yang efisien.",
                'D' => "Mempraktikkan cara penyelesaian masalah dengan menerapkan prinsip yang telah dipelajari pada {$concept}.",
            ];
            $options[$correctLetter] = "Menerapkan langkah kerja yang sistematis dan terarah sesuai kaidah {$concept} dalam mencapai tujuan.";

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

            $stems = [
                "Disajikan studi kasus: Dalam pelaksanaan kegiatan terkait {$concept}, terjadi ketidaksesuaian antara rencana dan hasil akhir. Analisis penyebab yang paling kritis adalah...",
                "Mengapa pemahaman mendalam tentang {$concept} sangat menentukan keberhasilan pemecahan masalah yang kompleks dalam {$subjectName}?",
                "Apabila salah satu prinsip pokok pada {$concept} diabaikan atau tidak terpenuhi, dampak lanjutan yang paling signifikan adalah...",
                "Berdasarkan analisis perbandingan dua metode dalam {$concept}, manakah evaluasi yang paling tepat mengenai solusi yang paling efektif dan efisien?",
                "Seorang siswa menemukan hasil kerja yang tidak sinkron saat menerapkan aturan {$concept}. Evaluasi kritis yang harus dilakukan pertama kali adalah...",
            ];
            $stem = $stems[($number + $variant - 1) % count($stems)];

            $options = [
                'A' => "Terjadinya ketidakselarasan antara faktor pendukung dan mekanisme pelaksanaan konsep {$concept}.",
                'B' => "Hasil evaluasi menunjukkan bahwa variabel utama dalam materi {$concept} belum diperhitungkan dengan cermat.",
                'C' => "Dampak kesalahan logika atau prosedur menyebabkan tujuan materi {$concept} tidak tercapai secara optimal.",
                'D' => "Diperlukannya pengkajian ulang secara kritis terhadap asumsi dasar yang mendasari penerapan {$concept}.",
            ];
            $options[$correctLetter] = "Analisis mendalam membuktikan bahwa pengabaian kaidah {$concept} menimbulkan kendala sistemik dalam pemecahan masalah.";

            $explanation = "Kunci Jawaban: Pilihan {$correctLetter} (Tingkat Kognitif: {$subLevel} - HOTS / Penalaran Kritis)\n\n"
                . "Pembahasan Rinci:\n"
                . "1. Analisis Opsi Benar (Pilihan {$correctLetter}):\n"
                . "   Pilihan ini benar karena mampu mengurai hubungan sebab-akibat secara mendalam dan memberikan kesimpulan kritis yang valid terhadap dinamika materi {$concept}.\n\n"
                . "2. Analisis Opsi Pengecoh:\n"
                . "   Opsi-opsi pengecoh hanya melihat gejala permukaan tanpa menganalisis akar masalah secara komprehensif.";

            $indicator = "Disajikan permasalahan kontekstual kompleks, peserta didik mampu {$verb} hubungan sebab-akibat dan menentukan solusi terbaik pada materi {$concept}.";
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
        int $variant = 0
    ): array {
        $analysis = $this->analyzeTp($tp, $subjectName);
        $concept = $analysis['concept'];

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
            $angles = [
                // Angle 0: Definisi Konsep & Elemen Pokok
                [
                    'stem' => "Jelaskan dengan bahasa Anda sendiri apa yang dimaksud dengan {$concept}, dan sebutkan minimal 2 (dua) karakteristik atau elemen pokoknya!",
                    'indicator' => "Peserta didik mampu mendeskripsikan konsep dasar {$concept} serta menyebutkan elemen pokoknya.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                        . "1. Menuliskan definisi atau pemahaman mengenai {$concept} dengan kalimat yang jelas, runtut, dan benar menggunakan bahasa sendiri.\n"
                        . "2. Menyebutkan minimal 2 (dua) karakteristik atau elemen utama yang sesuai dengan konsep materi tersebut.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Definisi dijelaskan dengan tepat menggunakan bahasa sendiri serta menyertakan minimal 2 elemen/karakteristik pokok dengan benar.\n"
                        . "• Skor 6 - 8 (Baik): Definisi tepat namun hanya menyebutkan 1 elemen pokok, atau penjelasan masih singkat.\n"
                        . "• Skor 3 - 5 (Cukup): Definisi masih kurang lengkap dan belum memberikan elemen yang relevan.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Hanya menuliskan beberapa kata kunci tanpa membentuk penjelasan konsep yang utuh.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 1: Fungsi & Peranan Materi
                [
                    'stem' => "Dalam konteks mata pelajaran {$subjectName}, apa peran dan fungsi utama dari {$concept}? Jelaskan mengapa konsep ini penting untuk dipelajari!",
                    'indicator' => "Peserta didik mampu menguraikan fungsi pokok dan pentingnya materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                        . "1. Menguraikan fungsi atau peranan pokok dari {$concept} dalam pembelajaran {$subjectName} secara tepat.\n"
                        . "2. Menjelaskan alasan mengapa pemahaman materi tersebut sangat esensial bagi peserta didik.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Menguraikan fungsi dan urgensi materi secara jelas, runtut, dan tepat sasaran.\n"
                        . "• Skor 6 - 8 (Baik): Menguraikan fungsi materi secara tepat, tetapi penjelasan urgensi masih bersifat umum.\n"
                        . "• Skor 3 - 5 (Cukup): Penjelasan fungsi masih terbatas dan belum menguraikan urgensi secara jelas.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Hanya menyebutkan poin singkat tanpa elaboration memadai.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 2: Keterkaitan & Bagian-Bagian
                [
                    'stem' => "Uraikan bagian-bagian atau tahapan mendasar yang berkaitan dengan {$concept}, dan jelaskan bagaimana bagian-bagian tersebut saling terhubung!",
                    'indicator' => "Peserta didik mampu menguraikan bagian mendasar dan hubungan timbal balik materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                        . "1. Menyebutkan bagian, tahapan, atau komponen mendasar dari {$concept} secara lengkap.\n"
                        . "2. Menjelaskan hubungan timbal balik atau keterkaitan antarkomponen tersebut secara logis.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Menyebutkan komponen secara lengkap dan menjelaskan keterhubungannya secara tepat dan sistematis.\n"
                        . "• Skor 6 - 8 (Baik): Menyebutkan sebagian besar komponen namun penjelasan keterhubungannya masih sederhana.\n"
                        . "• Skor 3 - 5 (Cukup): Hanya menyebutkan komponen tanpa menjelaskan bagaimana keterkaitan di antaranya.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Komponen yang disebutkan belum tepat dan tidak ada penjelasan hubungan.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 3: Contoh Konkret / Manifestasi
                [
                    'stem' => "Berikan 2 (dua) contoh konkret atau ilustrasi sederhana dari {$concept} yang sering dijumpai dalam kehidupan sehari-hari atau lingkungan sekitar!",
                    'indicator' => "Peserta didik mampu memberikan contoh konkret terkait materi {$concept} dalam konteks harian.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                        . "1. Menyajikan minimal 2 contoh konkret atau ilustrasi nyata yang relevan dengan {$concept}.\n"
                        . "2. Memberikan penjelasan singkat mengapa contoh-contoh tersebut mencerminkan konsep yang dipelajari.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Memberikan 2 contoh konkret yang sangat relevan dan disertai penjelasan hubungan konsep yang tepat.\n"
                        . "• Skor 6 - 8 (Baik): Memberikan 2 contoh relevan namun penjelasannya singkat, atau hanya 1 contoh dengan penjelasan baik.\n"
                        . "• Skor 3 - 5 (Cukup): Contoh yang diberikan kurang kontekstual atau kurang sesuai dengan materi.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Contoh tidak relevan dengan konsep yang dibahas.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 4: Ciri Khusus & Istilah Pokok
                [
                    'stem' => "Deskripsikan ciri-ciri khusus yang menjadi pembeda pokok materi {$concept}, dan sebutkan istilah-istilah penting yang harus dipahami di dalamnya!",
                    'indicator' => "Peserta didik mampu mendeskripsikan ciri khusus dan istilah kunci materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 1 / LOTS):\n"
                        . "1. Menjelaskan ciri-ciri pembeda utama dari {$concept} secara jelas.\n"
                        . "2. Menyebutkan dan menjelaskan arti dari istilah-istilah penting yang terkandung di dalamnya.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Ciri pembeda diuraikan secara akurat dan istilah-istilah penting dijelaskan dengan tepat.\n"
                        . "• Skor 6 - 8 (Baik): Ciri pembeda diuraikan dengan cukup baik, namun penjelasan istilah masih terbatas.\n"
                        . "• Skor 3 - 5 (Cukup): Penjelasan ciri pembeda masih umum dan istilah penting belum lengkap.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menyentuh ciri pembeda konsep materi.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
            ];
            $selected = $angles[$angleIndex];
        } elseif ($effectiveLevel === 'mots') {
            // MOTS (C3 - Menerapkan / Prosedur & Aplikasi)
            $levelCode = 'C3';
            $angles = [
                // Angle 0: Langkah-langkah Prosedural
                [
                    'stem' => "Uraikan langkah-langkah praktis dan sistematis dalam menerapkan konsep {$concept} saat menyelesaikan suatu tugas pembelajaran {$subjectName}!",
                    'indicator' => "Peserta didik mampu menguraikan tahapan penerapan konsep {$concept} secara runtut dan terarah.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                        . "1. Menjelaskan langkah atau tahapan penerapan materi {$concept} secara runtut dari awal hingga akhir.\n"
                        . "2. Memberikan alasan mengapa tahapan tersebut penting dilakukan untuk mencapai hasil yang diinginkan.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Menguraikan tahapan penerapan secara sistematis, jelas, dan memberikan alasan yang tepat.\n"
                        . "• Skor 6 - 8 (Baik): Menguraikan tahapan penerapan dengan cukup jelas, namun ada sebagian langkah yang terlewat.\n"
                        . "• Skor 3 - 5 (Cukup): Langkah-langkah yang diuraikan masih acak dan belum menunjukkan alur kerja yang terstruktur.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Hanya menyebutkan tujuan tanpa ada uraian langkah penerapan konkret.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 1: Alur Kerja Proyek / Praktik
                [
                    'stem' => "Bayangkan Anda diminta mempraktikkan konsep {$concept} pada suatu tugas atau proyek sederhana. Bagaimanakah alur kerja yang Anda susun mulai dari persiapan hingga pengujian hasil?",
                    'indicator' => "Peserta didik mampu menyusun alur kerja operasional berbasis konsep {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                        . "1. Menyusun alur kerja praktis mencakup tahap persiapan, tahap pelaksanaan, dan tahap verifikasi hasil.\n"
                        . "2. Menjelaskan cara memastikan setiap tahapan berjalan sesuai aturan materi {$concept}.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Alur kerja terstruktur lengkap (persiapan-pelaksanaan-verifikasi) dan sesuai kaidah operasional materi.\n"
                        . "• Skor 6 - 8 (Baik): Alur kerja terstruktur cukup baik namun tahapan verifikasi atau persiapan kurang detail.\n"
                        . "• Skor 3 - 5 (Cukup): Alur kerja masih sederhana dan ada lompatan tahapan yang krusial.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Rencana kerja tidak sistematis dan belum menerapkan konsep secara benar.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 2: Penyelesaian Kasus Operasional
                [
                    'stem' => "Jika Anda menghadapi situasi nyata di sekolah yang menuntut penerapan {$concept}, langkah-langkah penyelesaian apa yang akan Anda ambil agar hasil yang diperoleh akurat?",
                    'indicator' => "Peserta didik mampu merumuskan langkah penyelesaian masalah operasional menggunakan kaidah {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                        . "1. Mengidentifikasi kebutuhan data atau kondisi awal yang diperlukan dalam situasi tersebut.\n"
                        . "2. Menetapkan urutan tindakan penyelesaian yang tepat berbasis kaidah {$concept}.\n"
                        . "3. Menjelaskan cara memeriksa keakuratan hasil akhir.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Tindakan penyelesaian masalah sistematis, realistis, dan dilengkapi verifikasi keakuratan.\n"
                        . "• Skor 6 - 8 (Baik): Tindakan penyelesaian tepat tetapi langkah pengecekan hasil belum diuraikan.\n"
                        . "• Skor 3 - 5 (Cukup): Tindakan penyelesaian masih umum dan belum spesifik pada kaidah {$concept}.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Langkah tindakan tidak sesuai dengan konteks masalah.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 3: Kaidah Pemilihan Metode
                [
                    'stem' => "Bagaimanakah kaidah atau aturan pokok dalam {$concept} Anda terapkan saat harus memilih strategi kerja yang paling efektif dan efisien?",
                    'indicator' => "Peserta didik mampu menerapkan aturan konsep {$concept} dalam penentuan strategi kerja efisien.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                        . "1. Menjelaskan kaidah pokok yang dijadikan pedoman dalam materi {$concept}.\n"
                        . "2. Menguraikan pertimbangan pemilihan strategi agar pekerjaan berjalan lebih hemat waktu dan sumber daya.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Kaidah dijelaskan dengan tepat dan pertimbangan efisiensi diuraikan dengan sangat logis.\n"
                        . "• Skor 6 - 8 (Baik): Kaidah dijelaskan dengan benar, namun pertimbangan efisiensi masih terbatas.\n"
                        . "• Skor 3 - 5 (Cukup): Uraian kaidah kurang mendalam dan kaitan dengan efisiensi kerja belum tampak.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Jawaban tidak relevan dengan kaidah konsep yang dimaksud.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 4: Siklus dan Luaran Proses
                [
                    'stem' => "Jelaskan siklus atau alur proses kerja yang berlangsung pada {$concept}, dan deskripsikan bentuk hasil (output) yang diharapkan pada setiap tahapannya!",
                    'indicator' => "Peserta didik mampu mendeskripsikan siklus proses dan luaran pada materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 2 / MOTS):\n"
                        . "1. Menguraikan siklus proses kerja materi {$concept} dari input hingga hasil akhir.\n"
                        . "2. Menjelaskan output atau luaran spesifik yang dihasilkan dari tiap tahapan proses.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Siklus proses dan output setiap tahapan diuraikan secara komprehensif, benar, dan runtut.\n"
                        . "• Skor 6 - 8 (Baik): Siklus proses diuraikan dengan baik namun penjelasan output tiap tahapan belum lengkap.\n"
                        . "• Skor 3 - 5 (Cukup): Alur siklus masih terpotong-potong dan output belum dijelaskan.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Uraian siklus salah atau tidak sesuai konsep materi.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
            ];
            $selected = $angles[$angleIndex];
        } else {
            // HOTS (C4/C5 - Analisis Kasus, Evaluasi & Pemecahan Masalah Kritis)
            $levelCode = (($number + $variant) % 2 === 1) ? 'C4' : 'C5';
            $angles = [
                // Angle 0: Analisis Akar Masalah & Solusi
                [
                    'stem' => "Lakukan analisis kritis: Jika dalam implementasi {$concept} terjadi kendala atau kegagalan sistematis, bagaimana cara Anda mengidentifikasi akar penyebab masalah tersebut dan merumuskan solusi alternatif yang paling efektif?",
                    'indicator' => "Peserta didik mampu menganalisis permasalahan, mengevaluasi faktor penyebab, dan merumuskan solusi logis pada materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                        . "1. Mengidentifikasi minimal 2 faktor penyebab utama terjadinya masalah pada implementasi {$concept}.\n"
                        . "2. Merumuskan solusi alternatif yang kreatif, logis, dan dapat diterapkan secara konkret.\n"
                        . "3. Menyertakan argumen penalaran kritis yang menghubungkan solusi dengan prinsip keilmuan yang dipelajari.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Analisis kritis sangat mendalam, pemetaan akar masalah tepat, dan solusi alternatif inovatif serta realistis.\n"
                        . "• Skor 6 - 8 (Baik): Mampu mengidentifikasi penyebab dan menawarkan solusi, namun argumentasi penalaran masih sederhana.\n"
                        . "• Skor 3 - 5 (Cukup): Hanya menyebutkan masalah tanpa analisis mendalam mengenai alternatif solusi.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Uraian belum menyentuh pemecahan masalah dan argumentasi tidak logis.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 1: Evaluasi Kelebihan & Keterbatasan
                [
                    'stem' => "Evaluasilah kelebihan dan potensi keterbatasan dari pendekatan {$concept}. Mengapa pertimbangan kritis terhadap kedua aspek tersebut penting sebelum mengambil suatu keputusan final?",
                    'indicator' => "Peserta didik mampu mengevaluasi kelebihan, kelemahan, dan urgensi pertimbangan materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                        . "1. Menyajikan telaah objektif mengenai keunggulan/kelebihan utama dari {$concept}.\n"
                        . "2. Menguraikan keterbatasan atau tantangan yang mungkin timbul saat diterapkan.\n"
                        . "3. Memberikan justifikasi evaluatif mengapa pertimbangan seimbang ini penting bagi pengambil keputusan.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Evaluasi kelebihan dan keterbatasan diuraikan berimbang, kritis, dan disertai justifikasi yang kuat.\n"
                        . "• Skor 6 - 8 (Baik): Mampu menguraikan kelebihan dan keterbatasan, namun justifikasi pengambilan keputusan masih normatif.\n"
                        . "• Skor 3 - 5 (Cukup): Hanya menguraikan salah satu sisi (kelebihan saja atau kelemahan saja).\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Uraian evaluasi sangat dangkal dan tidak menunjukkan daya kritis.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 2: Analisis Dampak Sistemik & Sebab-Akibat
                [
                    'stem' => "Disajikan analisis kasus: Apabila salah satu elemen penting dalam {$concept} mengalami gangguan atau tidak berfungsi semestinya, analisislah dampak berantai yang ditimbulkannya terhadap keseluruhan sistem atau hasil kerja!",
                    'indicator' => "Peserta didik mampu menganalisis hubungan sebab-akibat dan dampak sistemik pada materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                        . "1. Menganalisis peran kritis elemen yang mengalami gangguan dalam sistem {$concept}.\n"
                        . "2. Menguraikan rantai sebab-akibat terhadap komponen lain yang saling bergantung.\n"
                        . "3. Menyimpulkan dampak akhir terhadap integritas atau kinerja sistem secara keseluruhan.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Analisis sebab-akibat sangat runtut, memetakan dampak berantai secara komprehensif, dan kesimpulan valid.\n"
                        . "• Skor 6 - 8 (Baik): Mampu memetakan sebagian besar dampak, namun penjelasan keterkaitan antarkomponen kurang mendalam.\n"
                        . "• Skor 3 - 5 (Cukup): Hanya menyebutkan dampak langsung tanpa menganalisis hubungan sebab-akibat berantai.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Analisis tidak tepat dan tidak mencerminkan pemahaman sistemik materi.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 3: Perbandingan Kritis Dua Solusi
                [
                    'stem' => "Bandingkan 2 (dua) pendekatan atau strategi yang berbeda dalam menyelesaikan persoalan terkait {$concept}. Berikan penilaian kritis mengenai pendekatan mana yang paling optimal, disertai argumentasi logis!",
                    'indicator' => "Peserta didik mampu membandingkan berbagai pendekatan dan menentukan pilihan solusi terbaik pada materi {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                        . "1. Membandingkan minimal 2 pendekatan dari parameter efektivitas, efisiensi, atau kemudahan implementasi dalam {$concept}.\n"
                        . "2. Menentukan pendekatan yang paling optimal dengan landasan argumen logis dan berbasis bukti.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Komparasi kedua pendekatan tajam, kriteria penilaian jelas, dan penetapan solusi optimal sangat meyakinkan.\n"
                        . "• Skor 6 - 8 (Baik): Mampu membandingkan kedua pendekatan, tetapi kriteria penilaian solusi optimal masih sederhana.\n"
                        . "• Skor 3 - 5 (Cukup): Perbandingan masih bersifat deskriptif tanpa penilaian kritis yang memadai.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Uraian tidak menunjukkan perbandingan dua pendekatan yang jelas.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
                // Angle 4: Perancangan Strategi Inovatif
                [
                    'stem' => "Bagaimanakah Anda merancang suatu strategi atau gagasan terintegrasi dengan memanfaatkan prinsip {$concept} untuk mengantisipasi persoalan atau kebutuhan di masa depan?",
                    'indicator' => "Peserta didik mampu merancang strategi integratif dan solutif berbasis prinsip {$concept}.",
                    'answer' => "Kriteria Model Jawaban Lengkap (Level 3 / HOTS):\n"
                        . "1. Merumuskan gagasan atau strategi yang terstruktur dengan mengintegrasikan prinsip utama {$concept}.\n"
                        . "2. Menjelaskan kebaruan atau efektivitas strategi tersebut dalam menjawab tantangan di masa depan.\n"
                        . "3. Menguraikan faktor pendukung yang dibutuhkan agar strategi dapat terealisasi.",
                    'explanation' => "Pedoman & Rubrik Penskoran Analitik (Skor Maksimal: 10):\n"
                        . "• Skor 9 - 10 (Sangat Baik): Rancangan strategi sangat terstruktur, orisinal, aplikatif, dan didukung penalaran ilmiah yang solid.\n"
                        . "• Skor 6 - 8 (Baik): Rancangan strategi cukup baik dan terarah, namun aspek antisipasi masa depan masih umum.\n"
                        . "• Skor 3 - 5 (Cukup): Gagasan yang diajukan masih sederhana dan belum terintegrasi secara utuh dengan prinsip materi.\n"
                        . "• Skor 1 - 2 (Perlu Bimbingan): Rancangan strategi tidak realistis atau tidak relevan dengan konsep materi.\n"
                        . "• Skor 0 (Tidak Menjawab): Lembar jawaban kosong atau tidak ada substansi yang relevan sama sekali.",
                ],
            ];
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
        string $cognitiveLevel = 'all'
    ): array {
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
     * Export exam data to native Microsoft Word (.docx) using PhpWord.
     * All text nodes are strictly XML-sanitized to guarantee valid OOXML document.xml.
     */
    public function exportDocx(array $examData): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);

        $section = $phpWord->addSection([
            'marginTop' => 1134,    // 2 cm
            'marginBottom' => 1134, // 2 cm
            'marginLeft' => 1417,   // 2.5 cm
            'marginRight' => 1134,  // 2 cm
        ]);

        // 1. Kop Surat
        $kopTable = $section->addTable([
            'borderBottomSize' => 18,
            'borderBottomColor' => '000000',
            'alignment' => JcTable::CENTER,
            'width' => 100 * 50,
        ]);
        $kopRow = $kopTable->addRow();

        $kopCell = $kopRow->addCell(9000, ['valign' => 'center']);
        $kopCell->addText('PEMERINTAH KABUPATEN BUOL', ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText('DINAS PENDIDIKAN DAN KEBUDAYAAN', ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $kopCell->addText($this->cleanWordText(strtoupper($examData['school_name'])), ['bold' => true, 'size' => 14], ['alignment' => Jc::CENTER, 'spaceAfter' => 40]);

        $metaSchoolText = $this->cleanWordText($examData['school_address'] . ' | Telp: ' . $examData['school_phone'] . ' | Email: ' . $examData['school_email']);
        $kopCell->addText($metaSchoolText, ['size' => 9, 'italic' => true], ['alignment' => Jc::CENTER, 'spaceAfter' => 60]);

        $section->addTextBreak(1);

        // 2. Exam Title
        $section->addText($this->cleanWordText($examData['title']), ['bold' => true, 'size' => 13, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        $section->addText('TAHUN AJARAN ' . $this->cleanWordText(strtoupper($examData['period'])), ['bold' => true, 'size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 120]);

        // 3. Metadata Table (2 Columns)
        $metaTable = $section->addTable(['alignment' => JcTable::CENTER, 'width' => 100 * 50]);
        $metaRow1 = $metaTable->addRow();
        $metaCell1 = $metaRow1->addCell(5000);
        $metaCell1->addText("Mata Pelajaran : " . $this->cleanWordText($examData['subject_name']), ['bold' => true]);
        $metaCell1->addText("Kelas / Rombel : " . $this->cleanWordText($examData['class_name']));
        $metaCell1->addText("Hari / Tanggal : ........................................");

        $metaCell2 = $metaRow1->addCell(4000);
        $metaCell2->addText("Waktu          : " . $this->cleanWordText($examData['time_limit']), ['bold' => true]);
        $metaCell2->addText("Nama Siswa     : ........................................");
        $metaCell2->addText("Nomor Absen    : ........................................");

        $section->addTextBreak(1);

        // 4. Petunjuk Umum
        $section->addText("PETUNJUK UMUM:", ['bold' => true, 'size' => 10]);
        foreach ($examData['instructions'] as $idx => $inst) {
            $section->addText(($idx + 1) . ". " . $this->cleanWordText($inst), ['size' => 9.5], ['spaceAfter' => 20]);
        }
        $section->addTextBreak(1);

        // 5. Daftar Soal (HANYA tampilkan bagian yang memiliki soal!)
        if (!empty($examData['mc_questions'])) {
            $section->addText("BAGIAN I: PILIHAN GANDA", ['bold' => true, 'size' => 11, 'color' => '1E293B']);
            $section->addText("Petunjuk: Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D!", ['italic' => true, 'size' => 9.5], ['spaceAfter' => 80]);

            foreach ($examData['mc_questions'] as $q) {
                $section->addText("{$q['number']}. " . $this->cleanWordText($q['question']), ['bold' => false], ['spaceAfter' => 40]);
                if (!empty($q['options']) && is_array($q['options'])) {
                    foreach ($q['options'] as $key => $val) {
                        $section->addText("      {$key}. " . $this->cleanWordText($val), ['size' => 10], ['spaceAfter' => 20]);
                    }
                }
                $section->addTextBreak(1);
            }
        }

        if (!empty($examData['essay_questions'])) {
            $sectionTitle = empty($examData['mc_questions']) ? "DAFTAR SOAL ESAI / URAIAN" : "BAGIAN II: ESAI / URAIAN";
            $section->addText($sectionTitle, ['bold' => true, 'size' => 11, 'color' => '1E293B']);
            $section->addText("Petunjuk: Jawablah pertanyaan-pertanyaan berikut dengan jelas, tepat, dan terstruktur!", ['italic' => true, 'size' => 9.5], ['spaceAfter' => 80]);

            foreach ($examData['essay_questions'] as $q) {
                $section->addText("{$q['number']}. " . $this->cleanWordText($q['question']), ['bold' => false], ['spaceAfter' => 40]);
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

        $section->addText("LAMPIRAN DOKUMEN PENDIDIK (PEGANGAN GURU)", ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 20]);
        // Use 'DAN' instead of bare '&' to prevent XML entity reference failure
        $section->addText("KISI-KISI SOAL, KUNCI JAWABAN DAN RUBRIK PENILAIAN", ['bold' => true, 'size' => 11, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 100]);

        $section->addText("Mata Pelajaran : " . $this->cleanWordText($examData['subject_name']) . " | Kelas : " . $this->cleanWordText($examData['class_name']) . " | Tingkat Kognitif : " . $this->cleanWordText($examData['cognitive_level_label'] ?? 'Campuran Proporsional'), ['size' => 9.5, 'bold' => true]);
        $tpDisplayText = count($examData['tp_allocations'] ?? []) > 1
            ? "[" . $this->cleanWordText($examData['tp_code']) . "] (" . count($examData['tp_allocations']) . " TP Diujikan - Dibagi Rata)"
            : "[" . $this->cleanWordText($examData['tp_code']) . "] " . $this->cleanWordText($examData['tp_description']);
        $section->addText("Tujuan Pembelajaran : " . $tpDisplayText, ['size' => 10, 'italic' => true], ['spaceAfter' => 100]);

        // Table 1: Kisi-kisi Soal (Blueprint)
        $section->addText("A. KISI-KISI PENYUSUNAN SOAL", ['bold' => true, 'size' => 10.5], ['spaceAfter' => 40]);
        $bpTable = $section->addTable([
            'borderSize' => 6,
            'borderColor' => 'CBD5E1',
            'alignment' => JcTable::CENTER,
            'cellMargin' => 80,
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
        $sigTable = $section->addTable(['alignment' => JcTable::CENTER, 'width' => 100 * 50]);
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

        $safeClassName = str_replace([' ', '/', '\\', ','], '_', $examData['class_name']);
        $safeSubject = str_replace([' ', '/', '\\'], '_', $examData['subject_name']);
        $filename = "Soal_Offline_{$safeSubject}_{$safeClassName}_" . date('Ymd_His') . ".docx";
        $tempFile = $tempDir . '/' . uniqid('exam_', true) . '.docx';

        $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }
}
