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
        Schema::table('lms_materials', function (Blueprint $table) {
            $table->text('image_prompt')->nullable()->after('reflection_activity')->comment('Deskripsi gambar ilustrasi visual dari AI');
            $table->text('lkpd')->nullable()->after('image_prompt')->comment('Lembar Kerja Peserta Didik (LKPD) dari AI');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_materials', function (Blueprint $table) {
            $table->dropColumn(['image_prompt', 'lkpd']);
        });
    }
};
