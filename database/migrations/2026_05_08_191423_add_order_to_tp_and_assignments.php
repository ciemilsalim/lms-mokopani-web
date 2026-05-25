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
        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->integer('order')->default(0)->after('description');
        });

        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->integer('order')->default(0)->after('max_points');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->dropColumn('order');
        });

        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropColumn('order');
        });
    }
};
