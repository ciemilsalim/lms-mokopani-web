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
            $table->integer('max_points')->nullable()->change();
            $table->integer('passing_grade')->nullable()->change();
        });

        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->string('qualitative_score')->nullable()->after('score');
            $table->json('kktp_details')->nullable()->after('qualitative_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->dropColumn(['qualitative_score', 'kktp_details']);
        });

        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->integer('max_points')->nullable(false)->change();
            $table->integer('passing_grade')->nullable(false)->change();
        });
    }
};
