<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\LmsAiPrompt;
use App\Contracts\AiProviderInterface;

class ClaudeApiService implements AiProviderInterface
{
    private array $apiKeys;
    private int $currentKeyIndex = 0;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $keysString = env('CLAUDE_API_KEY', '');
        $this->apiKeys = array_filter(array_map('trim', explode(',', $keysString)));
        // Default to claude-3-5-sonnet which is the current flagship
        $this->model   = env('CLAUDE_MODEL', 'claude-3-5-sonnet-20240620');
        $this->baseUrl = 'https://api.anthropic.com/v1';
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
        return 'claude';
    }

    public function suggestLearningExperiences(
        string $tpDescription,
        string $content,
        string $subjectName,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('claude_experiences_' . $tpDescription . $content . $subjectName . $pedagogicalModel);

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
        $hash = md5('claude_assessment_' . $tpDescription . $content . $instrumentType . ($observationMode ?? '') . ($quizMode ?? '') . ($assessmentType ?? ''));

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
        $result = $response ? $this->parseJsonResponse($response) : [];

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
        $hash = md5('claude_orchestrator_' . $subjectName . $className . $tpDescription . $pedagogicalModel);

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

    public function generateContent(string $prompt): ?string
    {
        if (empty($this->apiKeys)) return null;

        $attempts = 0;
        $maxAttempts = count($this->apiKeys);

        while ($attempts < $maxAttempts) {
            $currentKey = $this->apiKeys[$this->currentKeyIndex];
            
            try {
                $url = "{$this->baseUrl}/messages";

                $response = Http::withHeaders([
                    'x-api-key' => $currentKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])->timeout(60)->post($url, [
                    'model' => $this->model,
                    'max_tokens' => 4096,
                    'temperature' => 0.7,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt]
                    ],
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['content'][0]['text'] ?? null;
                }

                if ($response->status() === 429 || $response->status() === 403) {
                    Log::warning('Claude API rate limit/quota reached on key index ' . $this->currentKeyIndex);
                    $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $maxAttempts;
                    $attempts++;
                    continue; 
                }

                Log::warning('Claude API request failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;

            } catch (\Exception $e) {
                Log::error('Claude API error', [
                    'message' => $e->getMessage(),
                ]);
                return null;
            }
        }
        
        Log::error('Claude API all keys exhausted or rate limited.');
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
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/i', '', $text);
        $text = trim($text);
        $decoded = json_decode($text, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning('Failed to parse Claude JSON response', [
                'error' => json_last_error_msg(),
                'text'  => substr($text, 0, 500),
            ]);
            return [];
        }
        return $decoded;
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

    public function suggestDirectTp(string $cpDescription, bool $regenerate = false): array
    {
        $hash = md5('tp_direct_' . $cpDescription);
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) return json_decode($cached, true) ?? [];
        }
        $template = LmsAiPrompt::getPromptFor('tp_direct', Auth::user()?->teacher?->id);
        $prompt = str_replace('{cp_desc}', $cpDescription, $template);
        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];
        \App\Models\LmsAiCache::setCache($hash, 'tp_direct', ['cp_desc' => $cpDescription], json_encode($result));
        return $result;
    }

    public function analyzeCompetenceAndContent(string $cpDescription, bool $regenerate = false): array
    {
        $hash = md5('tp_analysis_' . $cpDescription);
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) return json_decode($cached, true) ?? [];
        }
        $template = LmsAiPrompt::getPromptFor('tp_analysis', Auth::user()?->teacher?->id);
        $prompt = str_replace('{cp_desc}', $cpDescription, $template);
        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];
        \App\Models\LmsAiCache::setCache($hash, 'tp_analysis', ['cp_desc' => $cpDescription], json_encode($result));
        return $result;
    }

    public function suggestCrossElementTp(array $cpDescriptions, bool $regenerate = false): string
    {
        $cpsText = '';
        foreach ($cpDescriptions as $index => $desc) $cpsText .= ($index + 1) . ". " . $desc . "\n";
        $hash = md5('tp_cross_' . $cpsText);
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached !== null) return $cached;
        }
        $template = LmsAiPrompt::getPromptFor('tp_cross_element', Auth::user()?->teacher?->id);
        $prompt = str_replace('{cps_desc}', $cpsText, $template);
        $response = $this->generateContent($prompt);
        $result = $response ? trim($response) : '';
        \App\Models\LmsAiCache::setCache($hash, 'tp_cross', ['cps_desc' => $cpsText], $result);
        return $result;
    }

    public function breakdownTp(string $tpDescription, bool $regenerate = false): array
    {
        $hash = md5('breakdown_' . $tpDescription);
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) return json_decode($cached, true) ?? [];
        }
        $prompt = "Tujuan Pembelajaran utama: \"{$tpDescription}\".\n\nTolong pecah menjadi 2 hingga 5 Sub-Tujuan Pembelajaran spesifik. Keluarkan HANYA array JSON (tanpa markdown), format: [\"Sub-TP 1\", \"Sub-TP 2\", ...].";
        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];
        if (!empty($result)) \App\Models\LmsAiCache::setCache($hash, 'breakdown_tp', ['tp' => $tpDescription], json_encode($result));
        return is_array($result) ? $result : [];
    }

    public function suggestSequence(array $tps, string $method, bool $regenerate = false): array
    {
        $hash = md5('sequence_' . json_encode($tps) . '_' . $method);
        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) return json_decode($cached, true) ?? [];
        }
        $list = "";
        foreach ($tps as $tp) $list .= "- ID: " . $tp['id'] . " | " . $tp['description'] . "\n";
        $prompt = "Berikut adalah daftar Tujuan Pembelajaran (TP):\n" . $list . "\nUrutkan TP tersebut menggunakan metode '{$method}'. Keluarkan HANYA array JSON: [5, 2, 8, 1].";
        $response = $this->generateContent($prompt);
        $result = $response ? $this->parseJsonResponse($response) : [];
        if (!empty($result)) \App\Models\LmsAiCache::setCache($hash, 'sequence_tp', ['method' => $method], json_encode($result));
        return is_array($result) ? $result : [];
    }
}
