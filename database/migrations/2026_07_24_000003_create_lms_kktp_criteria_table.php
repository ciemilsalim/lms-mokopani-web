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
        if (!Schema::hasTable('lms_kktp_criteria')) {
            Schema::create('lms_kktp_criteria', function (Blueprint $table) {
                $table->id();
                $table->foreignId('modul_ajar_id')->nullable()->index();
                $table->foreignId('learning_objective_id')->nullable()->index();
                $table->enum('approach', ['rubric', 'checklist', 'interval', 'percentage'])->default('rubric');
                $table->string('mastery_threshold')->default('Cakap');
                $table->json('criteria_details')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_kktp_criteria');
    }
};
