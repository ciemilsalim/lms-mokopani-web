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
        Schema::create('lms_ai_prompts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teacher_id')->nullable()->comment('Null untuk prompt default sistem, terisi id guru untuk kustomisasi');
            $table->string('key'); // e.g., 'orchestrator_draft', 'assessment_suggest'
            $table->string('name'); // Nama yang ramah pengguna
            $table->text('description')->nullable(); // Penjelasan singkat kegunaan prompt
            $table->text('prompt_text'); // Isi teks prompt
            $table->json('placeholders')->nullable(); // Informasi placeholder yang bisa digunakan
            $table->timestamps();

            $table->unique(['teacher_id', 'key']); // Memastikan kombinasi unik per guru
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_ai_prompts');
    }
};
