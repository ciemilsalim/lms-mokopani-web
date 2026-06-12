<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. lms_learning_objectives: Drop foreign cp_id, recreate with cascade
        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            // Drop old constraint
            $table->dropForeign(['cp_id']);
            // Re-add with cascade
            $table->foreign('cp_id')
                  ->references('id')->on('lms_capaian_pembelajaran')
                  ->onDelete('cascade');
        });

        // 2. lms_materials: Drop foreign learning_objective_id, recreate with cascade
        Schema::table('lms_materials', function (Blueprint $table) {
            $table->dropForeign(['learning_objective_id']);
            $table->foreign('learning_objective_id')
                  ->references('id')->on('lms_learning_objectives')
                  ->onDelete('cascade');
        });

        // 3. lms_assignments: Drop foreign learning_objective_id, recreate with cascade
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropForeign(['learning_objective_id']);
            $table->foreign('learning_objective_id')
                  ->references('id')->on('lms_learning_objectives')
                  ->onDelete('cascade');
        });

        // 4. lms_remedial_records: Drop foreign assignment_id, recreate with cascade
        Schema::table('lms_remedial_records', function (Blueprint $table) {
            $table->dropForeign(['assignment_id']);
            $table->foreign('assignment_id')
                  ->references('id')->on('lms_assignments')
                  ->onDelete('cascade');
        });

        // 5. lms_feedback_revisions: Drop foreign submission_id, recreate with cascade
        Schema::table('lms_feedback_revisions', function (Blueprint $table) {
            $table->dropForeign(['submission_id']);
            $table->foreign('submission_id')
                  ->references('id')->on('lms_submissions')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Revert to original behaviors

        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->dropForeign(['cp_id']);
            $table->foreign('cp_id')
                  ->references('id')->on('lms_capaian_pembelajaran')
                  ->onDelete('set null');
        });

        Schema::table('lms_materials', function (Blueprint $table) {
            $table->dropForeign(['learning_objective_id']);
            $table->foreign('learning_objective_id')
                  ->references('id')->on('lms_learning_objectives')
                  ->onDelete('set null');
        });

        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropForeign(['learning_objective_id']);
            $table->foreign('learning_objective_id')
                  ->references('id')->on('lms_learning_objectives')
                  ->onDelete('set null');
        });

        Schema::table('lms_remedial_records', function (Blueprint $table) {
            $table->dropForeign(['assignment_id']);
            // Originally it did not have onDelete constraint explicitly, meaning restrict
            $table->foreign('assignment_id')
                  ->references('id')->on('lms_assignments');
        });

        Schema::table('lms_feedback_revisions', function (Blueprint $table) {
            $table->dropForeign(['submission_id']);
            $table->foreign('submission_id')
                  ->references('id')->on('lms_submissions');
        });
    }
};
