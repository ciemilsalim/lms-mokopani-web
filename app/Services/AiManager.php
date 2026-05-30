<?php

namespace App\Services;

use App\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Log;

class AiManager
{
    private AiProviderInterface $provider;

    public function __construct(GeminiApiService $gemini, GroqApiService $groq)
    {
        $activeProvider = env('ACTIVE_AI_PROVIDER', 'gemini');

        if ($activeProvider === 'groq' && $groq->isConfigured()) {
            $this->provider = $groq;
        } elseif ($activeProvider === 'gemini' && $gemini->isConfigured()) {
            $this->provider = $gemini;
        } else {
            // Fallback logic
            if ($gemini->isConfigured()) {
                $this->provider = $gemini;
            } elseif ($groq->isConfigured()) {
                $this->provider = $groq;
            } else {
                // Return default (will fail gracefully since it's not configured)
                $this->provider = $gemini;
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
