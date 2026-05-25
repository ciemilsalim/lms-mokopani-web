<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->renameColumn('teacher_feedback', 'feedback');
        });
    }

    public function down(): void
    {
        Schema::table('lms_submissions', function (Blueprint $table) {
            $table->renameColumn('feedback', 'teacher_feedback');
        });
    }
};
