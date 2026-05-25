<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_p5_dimensi', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20)->unique()->comment('Contoh: BERIMAN, BERKEBINEKAAN, GOTONG_ROYONG, MANDIRI, BERNALAR_KREATIF');
            $table->string('nama');
            $table->text('deskripsi')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_p5_dimensi');
    }
};
