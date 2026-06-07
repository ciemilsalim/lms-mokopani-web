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
        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->boolean('is_remedial_open')->default(false)->after('attempts');
            $table->json('remedial_history')->nullable()->after('is_remedial_open');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->dropColumn(['is_remedial_open', 'remedial_history']);
        });
    }
};
