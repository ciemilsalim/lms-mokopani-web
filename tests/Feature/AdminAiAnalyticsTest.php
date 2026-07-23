<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAiAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test viewing Admin AI Analytics page.
     */
    public function test_can_view_admin_ai_analytics_page()
    {
        $user = User::factory()->make(['role' => 'admin']);

        $response = $this->actingAs($user)->get('/admin/ai-analytics');

        $response->assertStatus(200);
    }

    /**
     * Test updating school default weights and threshold settings.
     */
    public function test_can_update_school_settings()
    {
        $user = User::factory()->make(['role' => 'admin']);

        $response = $this->actingAs($user)->post('/admin/ai-analytics/settings', [
            'rapor_default_weights' => [0.15, 0.25, 0.25, 0.35],
            'kktp_default_threshold' => 78.0,
        ]);

        $response->assertStatus(302); // Redirect back
        $this->assertDatabaseHas('settings', [
            'key' => 'kktp_default_threshold',
            'value' => '78',
        ]);
    }
}
