<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::connection('mysql_absensi')->hasColumn('subjects', 'kktp')) {
            Schema::connection('mysql_absensi')->table('subjects', function (Blueprint $table) {
                $table->integer('kktp')->default(70)->after('fase');
            });
        }
    }

    public function down(): void
    {
        if (Schema::connection('mysql_absensi')->hasColumn('subjects', 'kktp')) {
            Schema::connection('mysql_absensi')->table('subjects', function (Blueprint $table) {
                $table->dropColumn('kktp');
            });
        }
    }
};
