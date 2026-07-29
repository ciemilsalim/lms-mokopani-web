<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create pivot table
        Schema::create('lms_modul_ajar_classes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('modul_ajar_id');
            $table->unsignedBigInteger('school_class_id');
            $table->timestamps();

            $table->foreign('modul_ajar_id')->references('id')->on('lms_modul_ajars')->onDelete('cascade');
            $table->index('school_class_id');
            
            $table->unique(['modul_ajar_id', 'school_class_id'], 'modul_ajar_class_unique');
        });

        // 2. Migrate existing data
        $modulAjars = DB::table('lms_modul_ajars')->whereNotNull('school_class_id')->get();
        foreach ($modulAjars as $ma) {
            DB::table('lms_modul_ajar_classes')->insert([
                'modul_ajar_id' => $ma->id,
                'school_class_id' => $ma->school_class_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Drop old column
        Schema::table('lms_modul_ajars', function (Blueprint $table) {
            $table->dropColumn('school_class_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_modul_ajars', function (Blueprint $table) {
            $table->unsignedBigInteger('school_class_id')->nullable()->after('subject_id');
        });

        $pivotData = DB::table('lms_modul_ajar_classes')->get();
        foreach ($pivotData as $data) {
            // Restore only the first class found for the modul ajar to avoid constraint errors
            DB::table('lms_modul_ajars')
                ->where('id', $data->modul_ajar_id)
                ->whereNull('school_class_id')
                ->update(['school_class_id' => $data->school_class_id]);
        }

        Schema::dropIfExists('lms_modul_ajar_classes');
    }
};
