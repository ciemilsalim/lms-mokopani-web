<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update existing null/empty religion to 'islam'
        if (Schema::hasTable('students') && Schema::hasColumn('students', 'religion')) {
            DB::table('students')
                ->whereNull('religion')
                ->orWhere('religion', '')
                ->update(['religion' => 'islam']);

            Schema::table('students', function (Blueprint $table) {
                $table->string('religion', 50)->default('islam')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('students') && Schema::hasColumn('students', 'religion')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('religion', 50)->nullable()->default(null)->change();
            });
        }
    }
};
