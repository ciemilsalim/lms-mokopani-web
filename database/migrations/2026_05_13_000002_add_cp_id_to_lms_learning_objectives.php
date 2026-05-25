<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->foreignId('cp_id')->nullable()->constrained('lms_capaian_pembelajaran')->onDelete('set null')->after('order');
        });
    }

    public function down(): void
    {
        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->dropForeign(['cp_id']);
            $table->dropColumn('cp_id');
        });
    }
};
