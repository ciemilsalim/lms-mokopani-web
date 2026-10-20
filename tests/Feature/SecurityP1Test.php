<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SecurityP1Test extends TestCase
{
    use RefreshDatabase;

    public function test_media_proxy_blocks_path_traversal()
    {
        $response = $this->get('/media-proxy/../../.env');
        $response->assertStatus(404);

        $response2 = $this->get('/media-proxy/subdir/../../../.env');
        $response2->assertStatus(404);
    }

    public function test_sso_debug_requires_admin_authentication()
    {
        // 1. Guest must be redirected to login or forbidden
        $response = $this->get('/sso/debug');
        $this->assertTrue(in_array($response->status(), [302, 401, 403]));

        // 2. Student cannot access sso debug
        $studentUser = User::factory()->create(['role' => 'student']);
        $responseStudent = $this->actingAs($studentUser)->get('/sso/debug');
        $responseStudent->assertStatus(403);

        // 3. Teacher cannot access sso debug
        $teacherUser = User::factory()->create(['role' => 'teacher']);
        $responseTeacher = $this->actingAs($teacherUser)->get('/sso/debug');
        $responseTeacher->assertStatus(403);

        // 4. Admin can access, but response must not leak sensitive raw tokens
        $adminUser = User::factory()->create(['role' => 'admin']);
        $responseAdmin = $this->actingAs($adminUser)->get('/sso/debug');
        $responseAdmin->assertStatus(200);
        $responseAdmin->assertDontSee('db_password');
    }

    public function test_clear_cache_requires_admin_authentication()
    {
        // Guest cannot trigger clear-cache
        $response = $this->get('/clear-cache');
        $this->assertTrue(in_array($response->status(), [302, 401, 403]));

        // Student cannot trigger clear-cache
        $studentUser = User::factory()->create(['role' => 'student']);
        $responseStudent = $this->actingAs($studentUser)->get('/clear-cache');
        $responseStudent->assertStatus(403);

        // Admin can trigger clear-cache
        $adminUser = User::factory()->create(['role' => 'admin']);
        $responseAdmin = $this->actingAs($adminUser)->get('/clear-cache');
        $responseAdmin->assertStatus(302); // Redirect back with success message
    }

    public function test_sso_expired_token_is_rejected()
    {
        $user = User::factory()->create(['role' => 'teacher']);
        
        // Insert expired token (created 2 hours ago, expired 1 hour ago)
        DB::table('sso_tokens')->insert([
            'user_id' => $user->id,
            'token' => 'expired-token-123',
            'expires_at' => now()->subHours(1),
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ]);

        $response = $this->get('/sso/login?token=expired-token-123');
        $response->assertRedirect('/login');
        $response->assertSessionHasErrors('sso');
        $this->assertGuest();
    }
}
