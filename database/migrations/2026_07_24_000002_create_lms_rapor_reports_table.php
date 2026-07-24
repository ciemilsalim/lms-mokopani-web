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
        if (!Schema::hasTable('lms_rapor_reports')) {
            Schema::create('lms_rapor_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->index();
                $table->foreignId('modul_ajar_id')->nullable()->index();
                $table->foreignId('school_class_id')->nullable()->index();
                $table->foreignId('subject_id')->nullable()->index();
                $table->enum('calculation_method', ['average', 'weighted', 'percentage'])->default('average');
                $table->decimal('final_score', 5, 2);
                $table->text('description')->nullable();
                $table->json('tp_scores_breakdown')->nullable();
                $table->foreignId('created_by')->index();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_rapor_reports');
    }
};
