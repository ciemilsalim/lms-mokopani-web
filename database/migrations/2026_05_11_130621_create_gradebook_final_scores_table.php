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
        Schema::create('gradebook_final_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('subject_id');
            $table->foreignId('school_class_id');
            $table->foreignId('academic_year_id')->nullable();
            $table->foreignId('semester_id')->nullable();
            $table->integer('score')->default(0);
            $table->timestamps();

            $table->unique(['student_id', 'subject_id', 'school_class_id', 'academic_year_id', 'semester_id'], 'final_score_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gradebook_final_scores');
    }
};
