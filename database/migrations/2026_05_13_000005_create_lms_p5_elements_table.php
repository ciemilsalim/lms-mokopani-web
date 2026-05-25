<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_p5_elements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dimensi_id')->constrained('lms_p5_dimensi')->onDelete('cascade');
            $table->string('nama');
            $table->text('deskripsi')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_p5_elements');
    }
};
