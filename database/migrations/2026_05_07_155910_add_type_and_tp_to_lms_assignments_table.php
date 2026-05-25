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
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->enum('assessment_type', ['initial', 'formative', 'summative'])->default('summative')->after('id');
            $table->foreignId('learning_objective_id')->nullable()->after('subject_id')->constrained('lms_learning_objectives')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropForeign(['learning_objective_id']);
            $table->dropColumn(['assessment_type', 'learning_objective_id']);
        });
    }
};
