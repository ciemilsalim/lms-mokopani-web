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
        Schema::create('lms_modul_ajars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id');
            $table->foreignId('subject_id');
            $table->foreignId('school_class_id');
            $table->foreignId('learning_objective_id');
            $table->foreignId('material_id');
            $table->foreignId('academic_year_id')->nullable();
            $table->foreignId('semester_id')->nullable();
            $table->string('pedagogical_model')->nullable();
            
            // 7 main sections of Modul Ajar PPA 2026
            $table->longText('general_info')->nullable();      // 1. Identifikasi & Informasi Umum
            $table->longText('learning_design')->nullable();    // 2. Desain Pembelajaran
            $table->longText('learning_steps')->nullable();     // 3. Langkah-langkah Pembelajaran
            $table->longText('assessment_plan')->nullable();    // 4. Asesmen & Rencana Tindak Lanjut
            $table->longText('kktp_details')->nullable();       // 5. Detail KKTP & Rubrik Asesmen
            $table->longText('lkpd')->nullable();               // 6. LKPD
            $table->longText('learning_resources')->nullable();  // 7. Sumber Belajar
            
            $table->longText('ai_prompt_used')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_modul_ajars');
    }
};
