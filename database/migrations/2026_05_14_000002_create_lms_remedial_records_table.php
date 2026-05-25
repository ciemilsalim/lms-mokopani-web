<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_remedial_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('assignment_id')->constrained('lms_assignments');
            $table->foreignId('subject_id');
            $table->foreignId('teacher_id');
            $table->enum('type', ['remedial', 'pengayaan'])->default('remedial');
            $table->integer('initial_score')->nullable();
            $table->integer('remedial_score')->nullable();
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->enum('status', ['assigned', 'in_progress', 'completed', 'expired'])->default('assigned');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_remedial_records');
    }
};
