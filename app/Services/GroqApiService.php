<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\LmsAiPrompt;
use App\Contracts\AiProviderInterface;

class GroqApiService implements AiProviderInterface
{
    private array $apiKeys;
    private int $currentKeyIndex = 0;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $keysString = env('GROQ_API_KEYS', '');
        $this->apiKeys = array_filter(array_map('trim', explode(',', $keysString)));
        $this->model   = env('GROQ_MODEL', 'llama3-70b-8192');
        $this->baseUrl = 'https://api.groq.com/openai/v1';
    }

    public function isConfigured(): bool
    {
        return count($this->apiKeys) > 0;
    }

    public function getProviderName(): string
    {
        return 'groq';
    }

    public function suggestLearningExperiences(
        string $tpDescription,
        string $content,
        string $subjectName,
        ?string $pedagogicalModel = null,
        bool $regenerate = false
    ): array {
        $hash = md5('groq_experiences_' . $tpDescription . $content . $subjectName . $pedagogicalModel);

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
        ?string $observationMode = null
    ): array {
        $hash = md5('groq_assessment_' . $tpDescription . $content . $instrumentType . ($observationMode ?? ''));

        if (!$regenerate) {
            $cached = \App\Models\LmsAiCache::getCache($hash);
            if ($cached) {
                return json_decode($cached, true) ?? [];
            }
        }

        $instrumentLabel = $this->getInstrumentLabel($instrumentType);
        $teacherId = Auth::user()?->teacher?->id;
        $template = LmsAiPrompt::getPromptFor('assessment', $teacherId);

        $prompt = str_replace([
            '{tp}', '{content}', '{instrument_label}', '{observation_mode}'
        ], [
            $tpDescription, $content, $instrumentLabel,
            $observationMode === 'anecdotal' ? 'anecdotal' : 'checklist'
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
        $hash = md5('groq_orchestrator_' . $subjectName . $className . $tpDescription . $pedagogicalModel);

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

    private function generateContent(string $prompt): ?string
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
                    'max_tokens' => 8192,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['choices'][0]['message']['content'] ?? null;
                }

                if ($response->status() === 429 || $response->status() === 403) {
                    Log::warning('Groq API rate limit/quota reached on key index ' . $this->currentKeyIndex);
                    $this->currentKeyIndex = ($this->currentKeyIndex + 1) % $maxAttempts;
                    $attempts++;
                    continue; 
                }

                Log::warning('Groq API request failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;

            } catch (\Exception $e) {
                Log::error('Groq API error', [
                    'message' => $e->getMessage(),
                ]);
                return null;
            }
        }
        
        Log::error('Groq API all keys exhausted or rate limited.');
        return null;
    }

    private function parseLearningExperiencesResponse(string $text): array
    {
        $result = ['understanding' => '', 'application' => '', 'reflection' => ''];
        // Supports both HTML <h2> and Markdown ## headers
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
            Log::warning('Failed to parse Groq JSON response', [
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
