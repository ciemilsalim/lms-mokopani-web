<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\LmsAiPrompt;
use App\Contracts\AiProviderInterface;

class OpenAiApiService implements AiProviderInterface
{
    private array $apiKeys;
    private int $currentKeyIndex = 0;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $keysString = env('OPENAI_API_KEY', '');
        $this->apiKeys = array_filter(array_map('trim', explode(',', $keysString)));
        // Default to gpt-4o-mini as it's the cost-effective model, or gpt-3.5-turbo
        $this->model   = env('OPENAI_MODEL', 'gpt-4o-mini');
        $this->baseUrl = 'https://api.openai.com/v1';
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
        return 'openai';
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

    public function generateContent(string $prompt): ?string
    {
        if (empty($this->apiKeys)) return null;

        $attempts = 0;
        $maxAttempts = count($this->apiKeys);

        while ($attempts < $maxAttempts) {
            $currentKey = $this->apiKeys[$this->currentKeyIndex];
            
            try {
                $url = "{$this->baseUrl}/chat/completions";

                $response = Http::withToken($currentKey)->timeout(60)->post($url, [
                    'model' => $this->model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt]
                    ],
                    'temperature' => 0.7,
                    'top_p' => 0.9,
                    'max_tokens' => 4096,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['choices'][0]['message']['content'] ?? null;
                }

                if ($response->status() === 429 || $response->status() === 403) {
                    Log::warning('OpenAI API rate limit/quota reached on key index ' . $this->currentKeyIndex);
                    $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $maxAttempts;
                    $attempts++;
                    continue; 
                }

                Log::warning('OpenAI API request failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;

            } catch (\Exception $e) {
                Log::error('OpenAI API error', [
                    'message' => $e->getMessage(),
                ]);
                return null;
            }
        }
        
        Log::error('OpenAI API all keys exhausted or rate limited.');
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
            Log::warning('Failed to parse OpenAI JSON response', [
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
}
