<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::connection('mysql_absensi')->hasColumn('subjects', 'fase')) {
            Schema::connection('mysql_absensi')->table('subjects', function (Blueprint $table) {
                $table->enum('fase', ['Fondasi', 'A', 'B', 'C', 'D', 'E', 'F'])->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::connection('mysql_absensi')->hasColumn('subjects', 'fase')) {
            Schema::connection('mysql_absensi')->table('subjects', function (Blueprint $table) {
                $table->dropColumn('fase');
            });
        }
    }
};
