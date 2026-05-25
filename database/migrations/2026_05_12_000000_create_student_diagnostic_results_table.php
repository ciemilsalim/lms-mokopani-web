<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_diagnostic_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('assignment_id')->constrained('lms_assignments');
            $table->foreignId('subject_id');
            $table->foreignId('learning_objective_id')->nullable()->constrained('lms_learning_objectives');
            $table->decimal('total_score', 5, 2)->nullable();
            $table->decimal('pass_threshold', 5, 2)->default(60);
            $table->boolean('is_passed')->default(false);
            $table->json('topic_breakdown')->nullable();
            $table->json('recommendations')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'assignment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_diagnostic_results');
    }
};
