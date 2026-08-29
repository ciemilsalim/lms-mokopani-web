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
}
