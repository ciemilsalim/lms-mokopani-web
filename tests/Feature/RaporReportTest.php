<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\LmsRaporReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RaporReportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test viewing Rapor Wizard page.
     */
    public function test_can_view_rapor_wizard()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->get('/rapor/wizard');

        $response->assertStatus(200);
    }

    /**
     * Test generating Rapor report via Average method.
     */
    public function test_can_generate_rapor_average()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->post('/rapor/generate', [
            'student_id' => 1,
            'calculation_method' => 'average',
            'tp_scores' => [
                'TP 7.1' => 85,
                'TP 7.2' => 83,
                'TP 7.3' => 60,
                'TP 7.4' => 84,
            ],
            'student_name' => 'Ananda Pratama',
        ]);

        $response->assertStatus(302); // Redirect to rapor.show
        $this->assertDatabaseHas('lms_rapor_reports', [
            'student_id' => 1,
            'calculation_method' => 'average',
            'final_score' => 78.0,
        ]);
    }

    /**
     * Test generating Rapor report via Weighted method.
     */
    public function test_can_generate_rapor_weighted()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->post('/rapor/generate', [
            'student_id' => 2,
            'calculation_method' => 'weighted',
            'tp_scores' => [
                'TP 7.1' => 85,
                'TP 7.2' => 83,
                'TP 7.3' => 60,
                'TP 7.4' => 84,
            ],
            'weights' => [0.2, 0.2, 0.2, 0.4],
            'student_name' => 'Budi Santoso',
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('lms_rapor_reports', [
            'student_id' => 2,
            'calculation_method' => 'weighted',
            'final_score' => 79.2,
        ]);
    }

    /**
     * Test generating AI qualitative description endpoint.
     */
    public function test_can_generate_ai_rapor_description()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $response = $this->actingAs($user)->postJson('/api/rapor/generate-description', [
            'student_name' => 'Siti Rahma',
            'tp_details' => [
                ['code' => 'TP 7.1', 'title' => 'Menerapkan 4 fondasi komputasional', 'score' => 88],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertArrayHasKey('description', $response->json());
    }

    /**
     * Test exporting Rapor report to PDF and CSV.
     */
    public function test_can_export_rapor_pdf_and_csv()
    {
        $user = User::factory()->make(['role' => 'teacher']);

        $report = LmsRaporReport::create([
            'student_id' => 1,
            'calculation_method' => 'average',
            'final_score' => 78.0,
            'description' => 'Ananda menunjukkan penguasaan yang sangat baik.',
            'tp_scores_breakdown' => [
                'scores' => ['TP 7.1' => 85],
                'details' => [['code' => 'TP 7.1', 'title' => 'Komputasional', 'score' => 85]],
            ],
            'created_by' => 1,
        ]);

        $pdfResponse = $this->actingAs($user)->get("/rapor/{$report->id}/export/pdf");
        $pdfResponse->assertStatus(200);
        $pdfResponse->assertHeader('content-type', 'application/pdf');

        $csvResponse = $this->actingAs($user)->get("/rapor/{$report->id}/export/csv");
        $csvResponse->assertStatus(200);
        $csvResponse->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
