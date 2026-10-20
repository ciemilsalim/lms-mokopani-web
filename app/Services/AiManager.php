<?php

namespace App\Services;

use App\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AiManager
{
    private AiProviderInterface $provider;

    public function __construct(
        GeminiApiService $gemini, 
        GroqApiService $groq, 
        OpenAiApiService $openai, 
        ClaudeApiService $claude,
        OpenRouterApiService $openrouter
    ) {
        $user = Auth::user();
        
        // Ambil provider utama langsung dari pusat data pengaturan SIPADA (Master AI)
        $globalProvider = 'openrouter';
        try {
            $dbProvider = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'global_ai_provider')->value('value');
            if (!empty($dbProvider)) {
                $globalProvider = $dbProvider;
            }
        } catch (\Exception $e) {
            $globalProvider = env('ACTIVE_AI_PROVIDER', 'openrouter');
        }
        
        $activeProvider = $globalProvider;
        $customApiKey = null;

        // Hanya gunakan personal provider jika user secara spesifik mengisikan personal API key
        if ($user && !empty($user->ai_api_key) && !empty($user->ai_provider)) {
            $activeProvider = $user->ai_provider;
            $customApiKey = $user->ai_api_key;
        }

        // Resolusi provider
        if ($activeProvider === 'openrouter') {
            $this->provider = $openrouter;
        } elseif ($activeProvider === 'groq') {
            $this->provider = $groq;
        } elseif ($activeProvider === 'openai') {
            $this->provider = $openai;
        } elseif ($activeProvider === 'claude') {
            $this->provider = $claude;
        } else {
            // Default ke gemini
            $this->provider = $gemini;
        }

        // Inject custom API key jika ada
        if (!empty($customApiKey)) {
            $this->provider->setCustomApiKey($customApiKey);
        }

        // Fallback jika provider tidak terkonfigurasi (baik dengan custom key maupun .env key)
        if (!$this->provider->isConfigured()) {
            if ($openrouter->isConfigured()) {
                $this->provider = $openrouter;
            } elseif ($gemini->isConfigured()) {
                $this->provider = $gemini;
            } elseif ($groq->isConfigured()) {
                $this->provider = $groq;
            }
        }
    }

    /**
     * Get the resolved active provider.
     */
    public function getActiveProvider(): AiProviderInterface
    {
        return $this->provider;
    }

    /**
     * Generate AI-assisted Rapor Description based on TP achievements.
     *
     * @param array $tpDetails
     * @param string $studentName
     * @return string
     */
    public function generateRaporDescription(array $tpDetails, string $studentName = 'Ananda'): string
    {
        $tpSummary = [];
        foreach ($tpDetails as $tp) {
            $code = $tp['code'] ?? '';
            $title = $tp['title'] ?? $tp['name'] ?? 'Materi';
            $score = $tp['score'] ?? 0;
            $tpSummary[] = "- {$code}: {$title} (Nilai: {$score})";
        }
        $tpText = implode("\n", $tpSummary);

        $prompt = <<<PROMPT
Anda adalah asisten guru profesional dalam Kurikulum Merdeka di Indonesia.
Tulis deskripsi capaian kompetensi rapor untuk siswa bernama {$studentName}.
Gunakan bahasa Indonesia baku yang apresiatif, mendidik, dan konstruktif sesuai Panduan Pembelajaran dan Asesmen (PPA) Kemendikbudristek.

Data Capaian Tujuan Pembelajaran (TP):
{$tpText}

Instruksi Penulisan:
1. Deskripsikan kompetensi yang sudah dikuasai dengan sangat baik/optimal.
2. Deskripsikan kompetensi yang masih perlu pendampingan atau peningkatan lebih lanjut jika ada TP dengan nilai rendah (< 75).
3. Buat narasi 2-4 kalimat yang mengalir, padat, dan jelas.
4. JANGAN gunakan pengantar seperti "Berikut adalah..." atau tanda petik pembuka/penutup. Berikan teks narasi deskripsi rapor langsung.
PROMPT;

        if ($this->provider->isConfigured()) {
            try {
                $generated = $this->provider->generateContent($prompt);
                if (!empty($generated)) {
                    return trim(str_replace(['"', '`'], '', $generated));
                }
            } catch (\Throwable $e) {
                Log::warning('AI Provider generateContent failed for Rapor: ' . $e->getMessage());
            }
        }

        // Fallback jika API provider tidak mengembalikan output atau belum dikonfigurasi
        $calcService = app(RaporCalculationService::class);
        return $calcService->generateQualitativeDescription($tpDetails, 75.0, $studentName);
    }

    /**
     * Magic call to forward any missing method calls to active provider if available.
     */
    public function __call($name, $arguments)
    {
        if (method_exists($this->provider, $name)) {
            return $this->provider->{$name}(...$arguments);
        }

        throw new \BadMethodCallException("Method {$name} does not exist on " . get_class($this) . " or its active provider.");
    }
}
