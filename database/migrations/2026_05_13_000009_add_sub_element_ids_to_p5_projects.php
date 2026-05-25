<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lms_p5_projects', function (Blueprint $table) {
            $table->json('sub_element_ids')->nullable()->after('dimensi_ids');
        });
    }

    public function down(): void
    {
        Schema::table('lms_p5_projects', function (Blueprint $table) {
            $table->dropColumn('sub_element_ids');
        });
    }
};
