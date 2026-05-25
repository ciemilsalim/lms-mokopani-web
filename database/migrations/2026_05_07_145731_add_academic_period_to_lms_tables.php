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
            $table->foreignId('academic_year_id')->nullable()->after('school_class_id');
            $table->foreignId('semester_id')->nullable()->after('academic_year_id');
        });

        Schema::table('lms_materials', function (Blueprint $table) {
            $table->foreignId('academic_year_id')->nullable()->after('teacher_id');
            $table->foreignId('semester_id')->nullable()->after('academic_year_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropForeign(['academic_year_id']);
            $table->dropForeign(['semester_id']);
            $table->dropColumn(['academic_year_id', 'semester_id']);
        });

        Schema::table('lms_materials', function (Blueprint $table) {
            $table->dropForeign(['academic_year_id']);
            $table->dropForeign(['semester_id']);
            $table->dropColumn(['academic_year_id', 'semester_id']);
        });
    }
};
