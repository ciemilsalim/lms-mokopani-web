<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_p5_project_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('lms_p5_projects')->onDelete('cascade');
            $table->foreignId('student_id');
            $table->foreignId('sub_element_id')->constrained('lms_p5_sub_elements')->onDelete('cascade');
            $table->enum('nilai', ['BB', 'MB', 'BSH', 'SB'])->comment('BB=Belum Berkembang, MB=Mulai Berkembang, BSH=Berkembang Sesuai Harapan, SB=Sangat Baik');
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'student_id', 'sub_element_id'], 'p5_score_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_p5_project_scores');
    }
};
