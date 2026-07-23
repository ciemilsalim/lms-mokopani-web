<?php

namespace Tests\Unit;

use App\Services\RaporCalculationService;
use PHPUnit\Framework\TestCase;

class RaporCalculationServiceTest extends TestCase
{
    protected RaporCalculationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RaporCalculationService();
    }

    /**
     * Test Average Calculation according to PPA 2025 example.
     * (85 + 83 + 60 + 84) / 4 = 312 / 4 = 78
     */
    public function test_calculate_average()
    {
        $scores = [85, 83, 60, 84];
        $result = $this->service->calculateAverage($scores);

        $this->assertEquals(78.0, $result);
    }

    /**
     * Test Weighted Calculation according to PPA 2025 example.
     * (85 x 20%) + (83 x 20%) + (60 x 20%) + (84 x 40%) = 17 + 16.6 + 12 + 33.6 = 79.2
     */
    public function test_calculate_weighted()
    {
        $scores = [85, 83, 60, 84];
        $weights = [0.20, 0.20, 0.20, 0.40];
        $result = $this->service->calculateWeighted($scores, $weights);

        $this->assertEquals(79.2, $result);
    }

    /**
     * Test Percentage Calculation according to PPA 2025 example.
     * Standar 75 => 3 dari 4 tuntas => (3 / 4) x 100 = 75
     */
    public function test_calculate_percentage()
    {
        $scores = [85, 83, 60, 84];
        $threshold = 75.0;
        $result = $this->service->calculatePercentage($scores, $threshold);

        $this->assertEquals(75.0, $result);
    }

    /**
     * Test Qualitative Description Generation according to PPA 2025 guidelines.
     */
    public function test_generate_qualitative_description()
    {
        $tpDetails = [
            ['code' => 'TP 7.1', 'title' => 'Berpikir Komputasional', 'score' => 85],
            ['code' => 'TP 7.2', 'title' => 'Sistem Komputer', 'score' => 83],
            ['code' => 'TP 7.3', 'title' => 'Literasi Digital - Riset Mesin Pencari dan Cek Fakta', 'score' => 60],
            ['code' => 'TP 7.4', 'title' => 'Aplikasi Pengolah Kata', 'score' => 84],
        ];

        $desc = $this->service->generateQualitativeDescription($tpDetails, 75.0, 'Ananda');

        $this->assertStringContainsString('Ananda menunjukkan penguasaan yang baik', $desc);
        $this->assertStringContainsString('masih perlu bimbingan dan peningkatan dalam literasi digital - riset mesin pencari dan cek fakta', $desc);
    }
}
