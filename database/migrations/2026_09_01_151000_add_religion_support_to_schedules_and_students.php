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
        // 1. Tambah kolom religion pada students jika belum ada
        if (Schema::hasTable('students') && !Schema::hasColumn('students', 'religion')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('religion', 50)->nullable()->after('school_class_id');
            });
        }

        // 2. Tambah kolom category & religion_key pada subjects jika belum ada
        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                if (!Schema::hasColumn('subjects', 'category')) {
                    $table->string('category', 50)->default('general')->after('name'); // 'general' atau 'religion'
                }
                if (!Schema::hasColumn('subjects', 'religion_key')) {
                    $table->string('religion_key', 50)->nullable()->after('category'); // 'islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu', dll
                }
            });
        }

        // 3. Buat tabel pivot teaching_assignment_student untuk mapping manual / override
        if (!Schema::hasTable('teaching_assignment_student')) {
            Schema::create('teaching_assignment_student', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teaching_assignment_id')->constrained('teaching_assignments')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['teaching_assignment_id', 'student_id'], 'ta_student_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('teaching_assignment_student')) {
            Schema::dropIfExists('teaching_assignment_student');
        }

        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                if (Schema::hasColumn('subjects', 'religion_key')) {
                    $table->dropColumn('religion_key');
                }
                if (Schema::hasColumn('subjects', 'category')) {
                    $table->dropColumn('category');
                }
            });
        }

        if (Schema::hasTable('students') && Schema::hasColumn('students', 'religion')) {
            Schema::table('students', function (Blueprint $table) {
                $table->dropColumn('religion');
            });
        }
    }
};
