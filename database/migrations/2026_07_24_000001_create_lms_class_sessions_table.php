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
        if (!Schema::hasTable('lms_class_sessions')) {
            Schema::create('lms_class_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('modul_ajar_id')->nullable()->index();
                $table->foreignId('teacher_id')->index();
                $table->foreignId('school_class_id')->nullable()->index();
                $table->timestamp('start_time')->useCurrent();
                $table->timestamp('end_time')->nullable();
                $table->json('session_data')->nullable(); // observations, formative_assessments, summative_results, reflection
                $table->boolean('attendance_synced')->default(false);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_class_sessions');
    }
};
