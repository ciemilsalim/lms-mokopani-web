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
        Schema::create('lms_learning_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id');
            $table->foreignId('teacher_id');
            $table->foreignId('academic_year_id');
            $table->foreignId('semester_id');
            $table->string('code')->nullable()->comment('Contoh: TP 1.1');
            $table->text('description');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_learning_objectives');
    }
};
