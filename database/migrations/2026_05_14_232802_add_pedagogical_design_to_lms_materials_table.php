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
        Schema::table('lms_materials', function (Blueprint $blueprint) {
            $blueprint->string('pedagogical_model')->nullable()->after('content')->comment('PjBL, PBL, Inquiry, etc');
            $blueprint->string('learning_environment')->nullable()->after('pedagogical_model')->comment('Physical, Virtual, Hybrid');
            $blueprint->text('understanding_activity')->nullable()->after('learning_environment')->comment('Tahap Memahami');
            $blueprint->text('application_activity')->nullable()->after('understanding_activity')->comment('Tahap Mengaplikasi');
            $blueprint->text('reflection_activity')->nullable()->after('application_activity')->comment('Tahap Merefleksi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_materials', function (Blueprint $blueprint) {
            $blueprint->dropColumn([
                'pedagogical_model',
                'learning_environment',
                'understanding_activity',
                'application_activity',
                'reflection_activity'
            ]);
        });
    }
};
