<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LmsAiWizardTest extends TestCase
{
    /**
     * Test suggest-tp endpoint validation when CP text is missing.
     */
    public function test_suggest_tp_validation_fails_without_cp()
    {
        $user = User::factory()->make(['role' => 'teacher']);
        
        $response = $this->actingAs($user)->postJson('/api/ai/suggest-tp', []);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    /**
     * Test suggest-tp endpoint with valid CP text.
     */
    public function test_suggest_tp_returns_success_or_fallback()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->postJson('/api/ai/suggest-tp', [
            'cp_text' => 'Menerapkan berpikir komputasional untuk memecahkan masalah sehari-hari.',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('status', $response->json());
        $this->assertArrayHasKey('data', $response->json());
    }

    /**
     * Test suggest-atp endpoint with TP list.
     */
    public function test_suggest_atp_returns_success()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $tpList = [
            ['code' => 'TP 7.1', 'title' => 'Menerapkan 4 fondasi berpikir komputasional'],
            ['code' => 'TP 7.2', 'title' => 'Mendeskripsikan komponen sistem komputer'],
        ];

        $response = $this->actingAs($user)->postJson('/api/ai/suggest-atp', [
            'tp_list' => $tpList,
            'method' => 'Hierarki Konsep',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('status', $response->json());
    }

    /**
     * Test generate-kktp endpoint with TP text.
     */
    public function test_generate_kktp_returns_rubric()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->postJson('/api/ai/generate-kktp', [
            'tp_text' => 'Menerapkan 4 fondasi berpikir komputasional untuk menyelesaikan masalah.',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('status', $response->json());
    }
}
