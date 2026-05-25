<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_p5_projects', function (Blueprint $table) {
            $table->id();
            $table->string('judul');
            $table->text('deskripsi')->nullable();
            $table->string('tema')->nullable()->comment('Tema Projek: Gaya Hidup Berkelanjutan, dll');
            $table->foreignId('school_class_id');
            $table->foreignId('academic_year_id');
            $table->foreignId('semester_id');
            $table->json('dimensi_ids')->comment('Array of lms_p5_dimensi ids');
            $table->integer('alokasi_waktu')->nullable()->comment('Total JP');
            $table->enum('status', ['draft', 'active', 'selesai'])->default('draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_p5_projects');
    }
};
