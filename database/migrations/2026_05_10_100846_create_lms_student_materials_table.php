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
        Schema::create('lms_student_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('material_id')->constrained('lms_materials')->onDelete('cascade');
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'material_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_student_materials');
    }
};
