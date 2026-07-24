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
        if (Schema::hasTable('lms_modul_ajars')) {
            Schema::table('lms_modul_ajars', function (Blueprint $table) {
                if (!Schema::hasColumn('lms_modul_ajars', 'tp_list')) {
                    $table->json('tp_list')->nullable()->after('learning_objective_id');
                }
                if (!Schema::hasColumn('lms_modul_ajars', 'atp_order')) {
                    $table->json('atp_order')->nullable()->after('tp_list');
                }
                if (!Schema::hasColumn('lms_modul_ajars', 'atp_method')) {
                    $table->string('atp_method')->nullable()->after('atp_order');
                }
                if (!Schema::hasColumn('lms_modul_ajars', 'kktp_approach')) {
                    $table->string('kktp_approach')->default('rubric')->after('kktp_details');
                }
            });
        }

        if (Schema::hasTable('lms_ai_caches')) {
            Schema::table('lms_ai_caches', function (Blueprint $table) {
                if (!Schema::hasColumn('lms_ai_caches', 'prompt_type')) {
                    $table->string('prompt_type')->nullable()->after('prompt_hash');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lms_modul_ajars')) {
            Schema::table('lms_modul_ajars', function (Blueprint $table) {
                $table->dropColumn(['tp_list', 'atp_order', 'atp_method', 'kktp_approach']);
            });
        }

        if (Schema::hasTable('lms_ai_caches')) {
            Schema::table('lms_ai_caches', function (Blueprint $table) {
                if (Schema::hasColumn('lms_ai_caches', 'prompt_type')) {
                    $table->dropColumn('prompt_type');
                }
            });
        }
    }
};
