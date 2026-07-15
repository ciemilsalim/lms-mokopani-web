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
        ClaudeApiService $claude
    ) {
        $user = Auth::user();
        
        $activeProvider = env('ACTIVE_AI_PROVIDER', 'gemini');
        $customApiKey = null;

        // Jika user sedang login dan memiliki preferensi AI Provider
        if ($user && $user->ai_provider) {
            $activeProvider = $user->ai_provider;
            $customApiKey = $user->ai_api_key;
        }

        // Resolusi provider
        if ($activeProvider === 'groq') {
            $this->provider = $groq;
        } elseif ($activeProvider === 'openai') {
            $this->provider = $openai;
        } elseif ($activeProvider === 'claude') {
            $this->provider = $claude;
        } else {
            // Default ke gemini jika provider lain tidak tersedia/didukung
            $this->provider = $gemini;
        }

        // Inject custom API key jika ada
        if (!empty($customApiKey)) {
            $this->provider->setCustomApiKey($customApiKey);
        }

        // Fallback jika provider tidak terkonfigurasi (baik dengan custom key maupun .env key)
        if (!$this->provider->isConfigured()) {
            if ($gemini->isConfigured()) {
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
