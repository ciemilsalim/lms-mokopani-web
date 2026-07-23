<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\LmsClassSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassSessionTest extends TestCase
{
    use RefreshDatabase;
    /**
     * Test creating a new class session.
     */
    public function test_can_create_class_session()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->post('/class-sessions', [
            'school_class_id' => 1,
        ]);

        $response->assertStatus(302); // Redirects to live session view
    }

    /**
     * Test viewing live class session page.
     */
    public function test_can_view_live_class_session()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $session = LmsClassSession::create([
            'teacher_id' => 1,
            'school_class_id' => 1,
            'start_time' => now(),
            'session_data' => [
                'observations' => ['Siswa aktif bertanya.'],
            ]
        ]);

        $response = $this->actingAs($user)->get("/class-sessions/{$session->id}/live");

        $response->assertStatus(200);
    }

    /**
     * Test updating session data via autosave.
     */
    public function test_can_autosave_session_data()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $session = LmsClassSession::create([
            'teacher_id' => 1,
            'school_class_id' => 1,
            'start_time' => now(),
        ]);

        $response = $this->actingAs($user)->putJson("/class-sessions/{$session->id}", [
            'session_data' => [
                'observations' => ['Diskusi kelompok berjalan lancar.'],
                'reflection' => 'Materi dipahami 80% murid.'
            ]
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    /**
     * Test generate-learning-steps AI endpoint.
     */
    public function test_can_generate_learning_steps()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->postJson('/api/ai/generate-learning-steps', [
            'tp_text' => 'Menerapkan 4 fondasi berpikir komputasional untuk menyelesaikan masalah.',
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('status', $response->json());
    }
}
