<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_non_cognitive_diagnostics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('subject_id')->nullable();
            $table->string('learning_style')->nullable();
            $table->json('learning_style_detail')->nullable();
            $table->json('motivation_level')->nullable();
            $table->json('interests')->nullable();
            $table->json('family_background')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_non_cognitive_diagnostics');
    }
};
