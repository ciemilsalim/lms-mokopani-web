<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('subjects', 'fase')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->enum('fase', ['Fondasi', 'A', 'B', 'C', 'D', 'E', 'F'])->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('subjects', 'fase')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropColumn('fase');
            });
        }
    }
};
