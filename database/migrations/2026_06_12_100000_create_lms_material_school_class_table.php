<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_material_school_class', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained('lms_materials')->onDelete('cascade');
            // Assuming school_classes is in a different database or same, but referencing it. 
            // In the codebase it uses 'mysql_absensi.school_classes', id. We'll just use foreignId without constrained if it's cross-db, or just bigInteger.
            // Let's check LmsMaterial.php migration or just use unsignedBigInteger.
            $table->unsignedBigInteger('school_class_id');
            $table->timestamps();
            
            $table->unique(['material_id', 'school_class_id'], 'material_class_unique');
        });

        // Copy existing data
        DB::statement('INSERT INTO lms_material_school_class (material_id, school_class_id, created_at, updated_at)
                       SELECT id, school_class_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM lms_materials WHERE school_class_id IS NOT NULL');

        // Drop the column from lms_materials
        Schema::table('lms_materials', function (Blueprint $table) {
            $table->dropColumn('school_class_id');
        });
    }

    public function down(): void
    {
        Schema::table('lms_materials', function (Blueprint $table) {
            $table->unsignedBigInteger('school_class_id')->nullable();
        });

        // Try to restore data (will only get one class back)
        DB::statement('UPDATE lms_materials m
                       JOIN (SELECT material_id, MIN(school_class_id) as school_class_id FROM lms_material_school_class GROUP BY material_id) p
                       ON m.id = p.material_id
                       SET m.school_class_id = p.school_class_id');

        Schema::dropIfExists('lms_material_school_class');
    }
};
