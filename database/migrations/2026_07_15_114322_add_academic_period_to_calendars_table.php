<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('calendars', function (Blueprint $table) {
            $table->unsignedBigInteger('academic_year_id')->nullable()->after('id');
            $table->unsignedBigInteger('semester_id')->nullable()->after('academic_year_id');
        });

        // Backfill data with current active semester from settings
        $activeSemesterId = DB::table('settings')->where('key', 'active_semester_id')->value('value');
        $activeAcademicYearId = DB::table('settings')->where('key', 'active_academic_year_id')->value('value');

        if ($activeSemesterId) {
            DB::table('calendars')->whereNull('semester_id')->update([
                'semester_id' => $activeSemesterId,
                'academic_year_id' => $activeAcademicYearId
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('calendars', function (Blueprint $table) {
            $table->dropColumn(['academic_year_id', 'semester_id']);
        });
    }
};
