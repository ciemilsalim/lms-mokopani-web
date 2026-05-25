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
        Schema::create('lms_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id');
            $table->foreignId('teacher_id');
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_type')->nullable(); // pdf, video, link, etc.
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('lms_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id');
            $table->foreignId('teacher_id');
            $table->string('title');
            $table->text('description');
            $table->dateTime('due_date')->nullable();
            $table->integer('max_points')->default(100);
            $table->timestamps();
        });

        Schema::create('lms_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('lms_assignments')->onDelete('cascade');
            $table->foreignId('student_id');
            $table->text('content')->nullable();
            $table->string('file_path')->nullable();
            $table->integer('score')->nullable();
            $table->text('teacher_feedback')->nullable();
            $table->dateTime('submitted_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_submissions');
        Schema::dropIfExists('lms_assignments');
        Schema::dropIfExists('lms_materials');
    }
};
