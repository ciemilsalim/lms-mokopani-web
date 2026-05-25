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
        Schema::create('lms_ai_caches', function (Blueprint $table) {
            $table->id();
            $table->string('prompt_hash')->unique();
            $table->string('prompt_type');
            $table->json('input_params')->nullable();
            $table->text('generated_response');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_ai_caches');
    }
};
