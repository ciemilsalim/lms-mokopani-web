<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop foreign key so we can drop the unique constraint
        try {
            DB::statement('ALTER TABLE school_classes DROP FOREIGN KEY school_classes_teacher_id_foreign');
        } catch (\Exception $e) {}
        
        // 2. Drop the old global unique constraints
        try {
            DB::statement('ALTER TABLE school_classes DROP INDEX school_classes_name_unique');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE school_classes DROP INDEX school_classes_teacher_id_unique');
        } catch (\Exception $e) {}
        
        // 3. Re-add the foreign key
        try {
            DB::statement('ALTER TABLE school_classes ADD CONSTRAINT school_classes_teacher_id_foreign FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL');
        } catch (\Exception $e) {}

        // 4. Add the new scoped composite unique constraints
        try {
            DB::statement('ALTER TABLE school_classes ADD UNIQUE INDEX school_classes_name_year_sem_unique (name, academic_year_id, semester_id)');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE school_classes ADD UNIQUE INDEX school_classes_teacher_year_sem_unique (teacher_id, academic_year_id, semester_id)');
        } catch (\Exception $e) {}
    }

    public function down(): void
    {
        // Revert to original state
        try {
            DB::statement('ALTER TABLE school_classes DROP FOREIGN KEY school_classes_teacher_id_foreign');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE school_classes DROP INDEX school_classes_name_year_sem_unique');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE school_classes DROP INDEX school_classes_teacher_year_sem_unique');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE school_classes ADD UNIQUE INDEX school_classes_name_unique (name)');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE school_classes ADD UNIQUE INDEX school_classes_teacher_id_unique (teacher_id)');
        } catch (\Exception $e) {}
        
        try {
            DB::statement('ALTER TABLE school_classes ADD CONSTRAINT school_classes_teacher_id_foreign FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL');
        } catch (\Exception $e) {}
    }
};

