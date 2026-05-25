<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_feedback_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('lms_submissions');
            $table->foreignId('teacher_id');
            $table->text('feedback');
            $table->enum('status', ['pending_revision', 'revised', 'approved'])->default('pending_revision');
            $table->integer('revision_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_feedback_revisions');
    }
};
