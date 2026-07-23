<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--path' => [
            '../sistem-pangkalan-data/database/migrations/0001_01_01_000000_create_users_table.php',
            '../sistem-pangkalan-data/database/migrations/2026_05_05_132006_create_lms_tables.php',
            '../sistem-pangkalan-data/database/migrations/2026_06_14_100000_create_lms_modul_ajars_table.php',
            '../sistem-pangkalan-data/database/migrations/2026_07_24_000001_create_lms_class_sessions_table.php',
            '../sistem-pangkalan-data/database/migrations/2026_07_24_000002_create_lms_rapor_reports_table.php',
            '../sistem-pangkalan-data/database/migrations/2026_07_24_000003_create_lms_kktp_criteria_table.php',
            '../sistem-pangkalan-data/database/migrations/2026_07_24_000004_enhance_lms_modul_ajars_and_ai_cache.php',
        ]]);
    }
}
