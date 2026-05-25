<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->string('scoring_tool')->nullable()->after('instrument_config');
            $table->json('scoring_tool_config')->nullable()->after('scoring_tool');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropColumn(['scoring_tool', 'scoring_tool_config']);
        });
    }
};
