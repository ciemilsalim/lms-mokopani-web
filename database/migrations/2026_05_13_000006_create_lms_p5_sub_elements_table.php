<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_p5_sub_elements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('element_id')->constrained('lms_p5_elements')->onDelete('cascade');
            $table->string('nama');
            $table->text('deskripsi')->nullable();
            $table->enum('jenjang', ['SD', 'SMP', 'SMA', 'SMK'])->default('SMP');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_p5_sub_elements');
    }
};
