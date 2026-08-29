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
        
        // Ambil provider utama dari .env atau pusat data SIPADA
        $envProvider = env('ACTIVE_AI_PROVIDER');
        $globalProvider = $envProvider ?: 'gemini';
        try {
            $dbProvider = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'global_ai_provider')->value('value');
            if (!empty($dbProvider) && empty($envProvider)) {
                $globalProvider = $dbProvider;
            }
        } catch (\Exception $e) {
            // Silently ignore if table doesn't exist
        }
        
        $activeProvider = $globalProvider;
        $customApiKey = null;

        // Jika user sedang login dan memiliki preferensi AI Provider (jika masih digunakan di LMS)
        if ($user && isset($user->ai_provider) && !empty($user->ai_provider)) {
            $activeProvider = $user->ai_provider;
            $customApiKey = $user->ai_api_key ?? null;
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
