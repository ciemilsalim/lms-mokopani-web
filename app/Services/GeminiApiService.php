<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use App\Models\LmsAiPrompt;
use App\Contracts\AiProviderInterface;

class GeminiApiService implements AiProviderInterface
{
    private array $apiKeys;
    private int $currentKeyIndex = 0;
    private string $model;
    private string $baseUrl;
    public ?string $lastError = null;

    public function __construct()
    {
        $keysString = config('services.gemini.api_key', '');
        $this->apiKeys = array_filter(array_map('trim', explode(',', $keysString)));
        $this->model   = config('services.gemini.model', 'gemini-2.0-flash');
        $this->baseUrl = config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta');
    }

    /**
     * Periksa apakah API key sudah terkonfigurasi.
     */
    public function isConfigured(): bool
    {
        return count($this->apiKeys) > 0;
    }

    public function setCustomApiKey(string $key): self
    {
        // Replace existing keys with the single custom key
        $this->apiKeys = [$key];
        $this->currentKeyIndex = 0;
        return $this;
    }

    public function getProviderName(): string
    {
        return 'gemini';
    }

    /**
     * Generate Rancangan Kegiatan Pembelajaran berdasarkan TP.
     *
     * @param string $tpDescription Deskripsi Tujuan Pembelajaran
     * @param string $content Konten/Materi TP
     * @param string $subjectName Nama Mata Pelajaran
     * @param string|null $pedagogicalModel Model Pedagogis (PjBL, PBL, Inquiry, Discovery)
     * @return array{understanding: string, application: string, reflection: string}
     */
    public function suggestLearningExperiences(
        string $tpDescription,
        string $content,
        string $subjectName,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('experiences_' . $tpDescription . $content . $subjectName . $pedagogicalModel);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('experiences', $teacherId);

        $prompt = str_replace([
            '{subject}',
            '{tp}',
            '{content}',
            '{pedagogical_model}'
        ], [
            $subjectName,
            $tpDescription,
            $content,
            $pedagogicalModel ?? 'Umum/Direct'
        ], $template);

        $response = $this->generateContent($prompt);

        if (!$response) {
            $result = [
                'understanding' => '',
                'application'   => '',
                'reflection'    => '',
            ];
        } else {
            $result = $this->parseLearningExperiencesResponse($response);
        }

        \App\Models\LmsAiCache::setCache($hash, 'experiences', [
            'subject' => $subjectName,
            'tp' => $tpDescription,
            'content' => $content,
            'pedagogical_model' => $pedagogicalModel
        ], json_encode($result));

        return $result;
    }

    /**
     * Generate instrumen asesmen berdasarkan TP dan jenis instrumen.
     *
     * @param string $tpDescription Deskripsi Tujuan Pembelajaran
     * @param string $content Konten/Materi TP
     * @param string $instrumentType Jenis instrumen asesmen
     * @return array
     */
    public function suggestAssessment(
        string $tpDescription,
        string $content,
        string $instrumentType,
        bool $regenerate = false,
        ?string $observationMode = null,
        ?string $quizMode = null,
        ?string $assessmentType = null
    ): array {
        $instrumentLabel = $this->getInstrumentLabel($instrumentType) . ' ("' . $instrumentType . '")';
        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('assessment', $teacherId);

        $prompt = str_replace([
            '{tp}',
            '{content}',
            '{instrument_label}',
            '{observation_mode}',
            '{quiz_mode}',
            '{assessment_type}'
        ], [
            $tpDescription,
            $content,
            $instrumentLabel,
            $observationMode === 'anecdotal' ? 'anecdotal' : 'checklist',
            $quizMode ?? 'mcq',
            $assessmentType ?? 'formative'
        ], $template);

        $response = $this->generateContent($prompt);

        return $response ? $this->parseJsonResponse($response) : [];
    }

    /**
     * Generate entire Lesson Design Package (RPP, Assessment, LKPD) in one API call.
     */
    public function generateFullOrchestratorDraft(
        string $subjectName,
        string $className,
        string $tpDescription,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('orchestrator_' . $subjectName . $className . $tpDescription . $pedagogicalModel);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('orchestrator_draft', $teacherId);

        $prompt = str_replace([
            '{subject}',
            '{class}',
            '{tp}',
            '{pedagogical_model}'
        ], [
            $subjectName,
            $className,
            $tpDescription,
            $pedagogicalModel ?? 'Umum/Direct'
        ], $template);

        $response = $this->generateContent($prompt);

        $result = $response ? $this->parseJsonResponse($response) : [];

        \App\Models\LmsAiCache::setCache($hash, 'orchestrator_draft', [
            'subject' => $subjectName,
            'class' => $className,
            'tp' => $tpDescription,
            'pedagogical_model' => $pedagogicalModel
        ], json_encode($result));

        return $result;
    }

    /**
     * Break down a general TP into specific Sub-TPs.
     */
    public function breakdownTp(string $tpDescription, bool $regenerate = false): array
    {
        $hash = md5('breakdown_' . $tpDescription);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $prompt = "Tujuan Pembelajaran utama: \"{$tpDescription}\".\n\nTujuan ini masih terlalu umum. Tolong pecah menjadi 2 hingga 5 Sub-Tujuan Pembelajaran (Alur Tujuan Pembelajaran) yang lebih spesifik, logis, dan berurutan dari yang paling dasar hingga paling kompleks (taksonomi Bloom).\nKeluarkan HANYA array JSON (tanpa markdown), format: [\"Sub-TP 1\", \"Sub-TP 2\", ...]. Pastikan setiap kalimat jelas dan operasional.";

        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];

        if (!empty($result)) {
            \App\Models\LmsAiCache::setCache($hash, 'breakdown_tp', ['tp' => $tpDescription], json_encode($result));
        }

        return is_array($result) ? $result : [];
    }

    public function suggestSequence(array $tps, string $method, bool $regenerate = false): array
    {
        $hash = md5('sequence_' . json_encode($tps) . '_' . $method);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $list = "";
        foreach ($tps as $tp) {
            $list .= "- ID: " . $tp['id'] . " | " . $tp['description'] . "\n";
        }

        $prompt = "Berikut adalah daftar Tujuan Pembelajaran (TP):\n" . $list . "\nUrutkan TP tersebut menggunakan metode '{$method}'. Keluarkan HANYA array JSON (tanpa markdown) berisi urutan ID saja, contoh: [5, 2, 8, 1].";

        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];

        if (!empty($result)) {
            \App\Models\LmsAiCache::setCache($hash, 'sequence_tp', ['method' => $method], json_encode($result));
        }

        return is_array($result) ? $result : [];
    }

    /**
     * Kirim prompt ke Gemini API dan terima respons teks.
     */
    public function generateContent(string $prompt): ?string
    {
        if (empty($this->apiKeys)) return null;

        $attempts = 0;
        $maxAttempts = count($this->apiKeys) * 2;
        $candidateModels = array_unique(array_filter([
            $this->model,
            'gemini-2.0-flash',
            'gemini-1.5-flash',
        ]));

        while ($attempts < $maxAttempts) {
            $currentKey = $this->apiKeys[$this->currentKeyIndex];
            $currentModel = $candidateModels[$attempts % count($candidateModels)];
            
            try {
                $url = "{$this->baseUrl}/models/{$currentModel}:generateContent?key={$currentKey}";

                $response = Http::timeout(120)->connectTimeout(15)->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature'     => 0.7,
                        'topP'            => 0.9,
                        'maxOutputTokens' => 8192,
                    ],
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $this->lastError = null;
                    return $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                }

                $errBody = $response->json();
                $errMsg = $errBody['error']['message'] ?? ('HTTP ' . $response->status());

                // If rate limited (429), forbidden/quota (403), or model not found (404), rotate key / model
                if ($response->status() === 429 || $response->status() === 403 || $response->status() === 404 || $response->status() === 503) {
                    Log::warning("Gemini API issue ({$response->status()}) on model {$currentModel} with key index {$this->currentKeyIndex}");
                    $this->currentKeyIndex = ($this->currentKeyIndex + 1) % count($this->apiKeys);
                    $attempts++;
                    continue; // Coba model / key berikutnya
                }

                $this->lastError = "Gemini API Error ({$errMsg})";
                Log::warning('Gemini API request failed', [
                    'model'  => $currentModel,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                
                $this->currentKeyIndex = ($this->currentKeyIndex + 1) % count($this->apiKeys);
                $attempts++;
                continue;

            } catch (\Exception $e) {
                Log::warning("Gemini API exception on model {$currentModel}: " . $e->getMessage());
                $this->currentKeyIndex = ($this->currentKeyIndex + 1) % count($this->apiKeys);
                $attempts++;
                if ($attempts >= $maxAttempts) {
                    $this->lastError = "Koneksi ke Gemini API terputus. Silakan klik tombol generate kembali.";
                    return null;
                }
                continue;
            }
        }
        
        $this->lastError = "Semua percobaan ke Gemini API telah mencapai batas atau mengalami kendala koneksi.";
        Log::error('Gemini API all keys or candidate models exhausted.');
        return null;
    }

    /**
     * Parse respons kegiatan pembelajaran dari format teks terstruktur.
     */
    private function parseLearningExperiencesResponse(string $text): array
    {
        $result = [
            'understanding' => '',
            'application'   => '',
            'reflection'    => '',
        ];

        // Parse berdasarkan header HTML <h2>Memahami</h2> atau Markdown ## Memahami
        // Supports both formats for backward compatibility
        $sections = preg_split('/<h2>\s*(Memahami|Mengaplikasi|Merefleksi)\s*<\/h2>|##\s+(Memahami|Mengaplikasi|Merefleksi)/i', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);

        if ($sections && count($sections) > 1) {
            for ($i = 0; $i < count($sections); $i++) {
                $headerCandidate = strtolower(trim($sections[$i]));
                
                if (in_array($headerCandidate, ['memahami', 'mengaplikasi', 'merefleksi'])) {
                    $content = trim($sections[$i + 1] ?? '');
                    
                    if (str_contains($headerCandidate, 'memahami')) {
                        $result['understanding'] = $content;
                    } elseif (str_contains($headerCandidate, 'mengaplikasi')) {
                        $result['application'] = $content;
                    } elseif (str_contains($headerCandidate, 'merefleksi')) {
                        $result['reflection'] = $content;
                    }
                    $i++; // skip the content part since we consumed it
                }
            }
        }

        // Fallback: jika parsing gagal, masukkan seluruh teks ke understanding
        if (empty($result['understanding']) && empty($result['application']) && empty($result['reflection'])) {
            $result['understanding'] = $text;
        }

        return $result;
    }

    /**
     * Parse respons JSON dari Gemini API (membersihkan markdown fence jika ada).
     */
    private function parseJsonResponse(string $text): array
    {
        // Hapus markdown code fence jika ada
        $text = preg_replace('/```(?:json)?/i', '', $text);
        $text = trim($text);

        if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
            $text = $matches[0];
        }

        $decoded = json_decode($text, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('Failed to parse Gemini JSON response', [
                'error' => json_last_error_msg(),
                'text'  => substr($text, 0, 500),
            ]);
            return [];
        }

        return $decoded;
    }

    /**
     * Konversi kode instrument_type ke label yang lebih manusiawi.
     */
    private function getInstrumentLabel(string $type): string
    {
        return match ($type) {
            'rubric'                  => 'Rubrik Penilaian',
            'oral_qa'                 => 'Tanya Jawab Lisan',
            'quiz_survey'             => 'Kuis / Survei Diagnostik',
            'observation_checklist'   => 'Lembar Observasi (Checklist)',
            'performance_observation' => 'Observasi',
            'exit_ticket'             => 'Exit Ticket (Tiket Keluar)',
            'self_assessment'         => 'Penilaian Diri (Self Assessment)',
            'reflective_journal'      => 'Jurnal Reflektif',
            'peer_assessment'         => 'Penilaian Antar Teman',
            'concept_map'             => 'Peta Konsep',
            'project'                 => 'Penilaian Proyek',
            'portfolio'               => 'Penilaian Portofolio',
            'performance'             => 'Kinerja (Praktik, Projek, Produk)',
            'written_test'            => 'Tes Tertulis',
            'formative_quiz'          => 'Tes/Penugasan Singkat',
            'guided_discussion'       => 'Diskusi Terpandu',
            'structured_assignment'   => 'Penugasan Terstruktur (LKPD)',
            'assignment'              => 'Penugasan (Laporan/Studi Kasus)',
            default                   => $type,
        };
    }

    /**
     * Generate suggested TPs directly from CP description.
     */
    public function suggestDirectTp(string $cpDescription, bool $regenerate = false): array
    {
        $hash = md5('tp_direct_' . $cpDescription);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('tp_direct', $teacherId);

        $prompt = str_replace('{cp_desc}', $cpDescription, $template);
        $response = $this->generateContent($prompt);

        $result = $response ? $this->parseJsonResponse($response) : [];

        \App\Models\LmsAiCache::setCache($hash, 'tp_direct', [
            'cp_desc' => $cpDescription
        ], json_encode($result));

        return $result;
    }

    /**
     * Analyze CP to extract Competences and Content, and formulate a TP statement.
     */
    public function analyzeCompetenceAndContent(string $cpDescription, bool $regenerate = false): array
    {
        $hash = md5('tp_analysis_' . $cpDescription);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('tp_analysis', $teacherId);

        $prompt = str_replace('{cp_desc}', $cpDescription, $template);
        $response = $this->generateContent($prompt);

        $result = $response ? $this->parseJsonResponse($response) : [];

        \App\Models\LmsAiCache::setCache($hash, 'tp_analysis', [
            'cp_desc' => $cpDescription
        ], json_encode($result));

        return $result;
    }

    /**
     * Synthesize multiple CPs into a combined TP.
     */
    public function suggestCrossElementTp(array $cpDescriptions, bool $regenerate = false): string
    {
        $cpsText = '';
        foreach ($cpDescriptions as $index => $desc) {
            $cpsText .= ($index + 1) . ". " . $desc . "\n";
        }
        
        $hash = md5('tp_cross_' . $cpsText);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached !== null) {
                return $cached;
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('tp_cross_element', $teacherId);

        $prompt = str_replace('{cps_desc}', $cpsText, $template);
        $response = $this->generateContent($prompt);

        $result = $response ? trim($response) : '';

        \App\Models\LmsAiCache::setCache($hash, 'tp_cross_element', [
            'cps' => $cpDescriptions
        ], $result);

        return $result;
    }
}
