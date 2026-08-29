<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\LmsAiPrompt;
use App\Contracts\AiProviderInterface;

class OpenRouterApiService implements AiProviderInterface
{
    private array $apiKeys;
    private int $currentKeyIndex = 0;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $keysString = '';
        $model = 'openrouter/free';
        try {
            $keysString = DB::table('settings')->where('key', 'global_ai_api_key')->value('value') ?? '';
            $model = DB::table('settings')->where('key', 'global_ai_model')->value('value') ?: 'openrouter/free';
        } catch (\Exception $e) {
            // Silently ignore if table doesn't exist
        }

        $this->apiKeys = array_filter(array_map('trim', explode(',', $keysString)));
        $this->model   = $model;
        $this->baseUrl = 'https://openrouter.ai/api/v1';
    }

    public function isConfigured(): bool
    {
        return count($this->apiKeys) > 0;
    }

    public function setCustomApiKey(string $key): self
    {
        $this->apiKeys = [$key];
        $this->currentKeyIndex = 0;
        return $this;
    }

    public function getProviderName(): string
    {
        return 'openrouter';
    }

    public function suggestLearningExperiences(
        string $tpDescription,
        string $content,
        string $subjectName,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('openai_experiences_' . $tpDescription . $content . $subjectName . $pedagogicalModel);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('experiences', $teacherId);

        $prompt = str_replace([
            '{subject}', '{tp}', '{content}', '{pedagogical_model}'
        ], [
            $subjectName, $tpDescription, $content, $pedagogicalModel ?? 'Umum/Direct'
        ], $template);

        $response = $this->generateContent($prompt);
        if (!$response) {
            $result = ['understanding' => '', 'application' => '', 'reflection' => ''];
        } else {
            $result = $this->parseLearningExperiencesResponse($response);
        }

        \App\Models\LmsAiCache::setCache($hash, 'experiences', [
            'subject' => $subjectName, 'tp' => $tpDescription, 'content' => $content, 'pedagogical_model' => $pedagogicalModel
        ], json_encode($result));

        return $result;
    }

    public function suggestAssessment(
        string $tpDescription,
        string $content,
        string $instrumentType,
        bool $regenerate = false,
        ?string $observationMode = null,
        ?string $quizMode = null,
        ?string $assessmentType = null
    ): array {
        $hash = md5('openai_assessment_' . $tpDescription . $content . $instrumentType . ($observationMode ?? '') . ($quizMode ?? '') . ($assessmentType ?? ''));

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded)) {
                    $needsQuestions = in_array($instrumentType, ['formative_quiz', 'quiz_survey', 'written_test', 'exit_ticket', 'reflective_journal', 'oral_test']);
                    if (!$needsQuestions || !empty($decoded['questions'])) {
                        return $decoded;
                    }
                }
            }
        }

        $instrumentLabel = $this->getInstrumentLabel($instrumentType) . ' ("' . $instrumentType . '")';
        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('assessment', $teacherId);

        $prompt = str_replace([
            '{tp}', '{content}', '{instrument_label}', '{observation_mode}', '{quiz_mode}', '{assessment_type}'
        ], [
            $tpDescription, $content, $instrumentLabel,
            $observationMode === 'anecdotal' ? 'anecdotal' : 'checklist',
            $quizMode ?? 'mcq',
            $assessmentType ?? 'formative'
        ], $template);

        $response = $this->generateContent($prompt);
        \Illuminate\Support\Facades\Log::info('AI Assessment Generation Log:', [
            'prompt' => $prompt,
            'raw_response' => $response,
        ]);
        $result = $response ? $this->parseJsonResponse($response) : [];
        \Illuminate\Support\Facades\Log::info('AI Assessment Parsed JSON:', [
            'result' => $result
        ]);

        \App\Models\LmsAiCache::setCache($hash, 'assessment', [
            'tp' => $tpDescription, 'content' => $content, 'instrument_type' => $instrumentType
        ], json_encode($result));

        return $result;
    }

    public function generateFullOrchestratorDraft(
        string $subjectName,
        string $className,
        string $tpDescription,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('openai_orchestrator_' . $subjectName . $className . $tpDescription . $pedagogicalModel);

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('orchestrator_draft', $teacherId);

        $prompt = str_replace([
            '{subject}', '{class}', '{tp}', '{pedagogical_model}'
        ], [
            $subjectName, $className, $tpDescription, $pedagogicalModel ?? 'Umum/Direct'
        ], $template);

        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];

        \App\Models\LmsAiCache::setCache($hash, 'orchestrator_draft', [
            'subject' => $subjectName, 'class' => $className, 'tp' => $tpDescription, 'pedagogical_model' => $pedagogicalModel
        ], json_encode($result));

        return $result;
    }

    public ?string $lastError = null;

    public function generateContent(string $prompt): ?string
    {
        if (empty($this->apiKeys)) {
            $this->lastError = 'API Key OpenRouter belum dikonfigurasi.';
            return null;
        }

        $attempts = 0;
        $candidateModels = array_values(array_unique(array_filter([
            $this->model,
            'google/gemini-2.5-flash',
            'deepseek/deepseek-chat',
            'openai/gpt-4o-mini',
            'openrouter/auto',
        ])));
        $keyCount = count($this->apiKeys);
        $keys = array_values($this->apiKeys);
        $maxAttempts = $keyCount * count($candidateModels);

        while ($attempts < $maxAttempts) {
            $currentKey = $keys[$this->currentKeyIndex % $keyCount];
            $currentModel = $candidateModels[$attempts % count($candidateModels)];
            
            try {
                $url = "{$this->baseUrl}/chat/completions";

                $response = Http::withToken($currentKey)->withHeaders([
                    'HTTP-Referer' => config('app.url', 'http://localhost'),
                    'X-Title' => config('app.name', 'LMS Mokopani'),
                ])->timeout(120)->connectTimeout(15)->post($url, [
                    'model' => $currentModel,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt]
                    ],
                    'temperature' => 0.7,
                    'top_p' => 0.9,
                    'max_tokens' => 8192,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $this->lastError = null;
                    return $data['choices'][0]['message']['content'] ?? null;
                }

                $errBody = $response->json();
                $errMsg = $errBody['error']['message'] ?? ('HTTP ' . $response->status());

                if ($response->status() === 429 || $response->status() === 403 || $response->status() === 404 || $response->status() === 400 || $response->status() === 503) {
                    Log::warning("OpenRouter API issue ({$response->status()}) on model {$currentModel}: {$errMsg}");
                    $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $keyCount;
                    $attempts++;
                    continue; 
                }

                $this->lastError = "OpenRouter API Error: {$errMsg}";
                Log::warning('OpenRouter API request failed', [
                    'model'  => $currentModel,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $keyCount;
                $attempts++;
                continue;

            } catch (\Exception $e) {
                Log::warning("OpenRouter API exception on model {$currentModel}: " . $e->getMessage());
                $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $keyCount;
                $attempts++;
                if ($attempts >= $maxAttempts) {
                    $this->lastError = "Koneksi ke OpenRouter API terputus: " . $e->getMessage();
                    return null;
                }
                continue;
            }
        }
        
        $this->lastError = 'Semua model atau kuota OpenRouter telah habis.';
        Log::error('OpenRouter API all keys or models exhausted.');
        return null;
    }

    private function parseLearningExperiencesResponse(string $text): array
    {
        $result = ['understanding' => '', 'application' => '', 'reflection' => ''];
        $sections = preg_split('/<h2>\s*(Memahami|Mengaplikasi|Merefleksi)\s*<\/h2>|##\s+(Memahami|Mengaplikasi|Merefleksi)/i', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        if ($sections && count($sections) > 1) {
            for ($i = 0; $i < count($sections); $i++) {
                $headerCandidate = strtolower(trim($sections[$i]));
                if (in_array($headerCandidate, ['memahami', 'mengaplikasi', 'merefleksi'])) {
                    $content = trim($sections[$i + 1] ?? '');
                    if (str_contains($headerCandidate, 'memahami')) $result['understanding'] = $content;
                    elseif (str_contains($headerCandidate, 'mengaplikasi')) $result['application'] = $content;
                    elseif (str_contains($headerCandidate, 'merefleksi')) $result['reflection'] = $content;
                    $i++;
                }
            }
        }
        if (empty($result['understanding']) && empty($result['application']) && empty($result['reflection'])) {
            $result['understanding'] = $text;
        }
        return $result;
    }

    private function parseJsonResponse(string $text): array
    {
        $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)\s*```/i', '$1', $text);
        if (preg_match('/\{[\s\S]*\}/', $clean, $matches)) {
            $clean = $matches[0];
        } else {
            $clean = trim($clean);
        }

        $decoded = json_decode($clean, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('Failed to parse OpenRouter JSON response', [
                'error' => json_last_error_msg(),
                'text'  => substr($text, 0, 500),
            ]);
            return [];
        }
        return is_array($decoded) ? $decoded : [];
    }

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

        \App\Models\LmsAiCache::setCache($hash, 'tp_cross', [
            'cps_desc' => $cpsText
        ], $result);

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

    /**
     * Suggest logical sequence order for TPs.
     */
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
}
