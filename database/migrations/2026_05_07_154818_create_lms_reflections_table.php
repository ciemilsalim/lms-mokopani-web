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
        Schema::create('lms_reflections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('assignment_id')->nullable()->constrained('lms_assignments')->onDelete('cascade');
            $table->foreignId('material_id')->nullable()->constrained('lms_materials')->onDelete('cascade');
            $table->integer('understanding_level')->comment('1-5 scale');
            $table->text('interesting_thing')->nullable();
            $table->text('difficulty')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_reflections');
    }
};
