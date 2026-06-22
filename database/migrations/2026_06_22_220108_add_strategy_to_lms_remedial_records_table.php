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
        Schema::table('lms_remedial_records', function (Blueprint $table) {
            $table->string('remedial_strategy')->nullable()->after('remedial_score');
            $table->string('remedial_focus')->nullable()->after('remedial_strategy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_remedial_records', function (Blueprint $table) {
            $table->dropColumn(['remedial_strategy', 'remedial_focus']);
        });
    }
};
