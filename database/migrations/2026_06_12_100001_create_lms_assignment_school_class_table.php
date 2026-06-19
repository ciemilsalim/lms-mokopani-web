<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_assignment_school_class', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('lms_assignments')->onDelete('cascade');
            $table->unsignedBigInteger('school_class_id');
            $table->timestamps();
            
            $table->unique(['assignment_id', 'school_class_id'], 'assignment_class_unique');
        });

        // Copy existing data
        DB::statement('INSERT INTO lms_assignment_school_class (assignment_id, school_class_id, created_at, updated_at)
                       SELECT id, school_class_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM lms_assignments WHERE school_class_id IS NOT NULL');

        // Drop the column from lms_assignments
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropColumn('school_class_id');
        });
    }

    public function down(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('school_class_id')->nullable();
        });

        // Try to restore data
        DB::statement('UPDATE lms_assignments a
                       JOIN (SELECT assignment_id, MIN(school_class_id) as school_class_id FROM lms_assignment_school_class GROUP BY assignment_id) p
                       ON a.id = p.assignment_id
                       SET a.school_class_id = p.school_class_id');

        Schema::dropIfExists('lms_assignment_school_class');
    }
};
