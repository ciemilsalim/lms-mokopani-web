<?php

namespace App\Contracts;

interface AiProviderInterface
{
    /**
     * Check if the provider has valid configuration/keys.
     */
    public function isConfigured(): bool;

    /**
     * Set a custom API key dynamically (e.g. from user profile).
     */
    public function setCustomApiKey(string $key): self;

    /**
     * Get the active provider name (e.g. 'gemini', 'groq').
     */
    public function getProviderName(): string;

    /**
     * Generate complete Lesson Design (RPP, Assessment, LKPD).
     */
    public function generateFullOrchestratorDraft(
        string $subject, 
        string $class, 
        string $tp, 
        ?string $pedagogicalModel = null, 
        bool $regenerate = false
    ): array;

    /**
     * Suggest learning experiences (understanding, application, reflection).
     */
    public function suggestLearningExperiences(
        string $tpDescription, 
        string $tpContent, 
        string $subject, 
        ?string $pedagogicalModel = null, 
        bool $regenerate = false
    ): array;

    /**
     * Suggest assessments (instrument configuration).
     */
    public function suggestAssessment(
        string $tpDescription, 
        string $tpContent, 
        string $instrumentType, 
        bool $regenerate = false,
        ?string $observationMode = null,
        ?string $quizMode = null,
        ?string $assessmentType = null
    ): array;

    /**
     * Generate content dynamically from a raw prompt.
     */
    public function generateContent(string $prompt): ?string;
}
