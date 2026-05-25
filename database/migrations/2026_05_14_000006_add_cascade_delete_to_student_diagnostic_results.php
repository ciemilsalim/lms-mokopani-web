<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_diagnostic_results', function (Blueprint $table) {
            $table->dropForeign(['assignment_id']);
            $table->foreign('assignment_id')
                ->references('id')
                ->on('lms_assignments')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('student_diagnostic_results', function (Blueprint $table) {
            $table->dropForeign(['assignment_id']);
            $table->foreign('assignment_id')
                ->references('id')
                ->on('lms_assignments');
        });
    }
};
