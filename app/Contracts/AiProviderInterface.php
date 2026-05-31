<?php

namespace App\Contracts;

interface AiProviderInterface
{
    /**
     * Check if the provider has valid configuration/keys.
     */
    public function isConfigured(): bool;

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
        ?string $observationMode = null
    ): array;
}
