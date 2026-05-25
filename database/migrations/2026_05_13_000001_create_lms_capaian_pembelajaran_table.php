<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_capaian_pembelajaran', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique()->comment('Contoh: CP.1');
            $table->enum('fase', ['Fondasi', 'A', 'B', 'C', 'D', 'E', 'F'])->default('D');
            $table->foreignId('subject_id');
            $table->text('deskripsi');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_capaian_pembelajaran');
    }
};
