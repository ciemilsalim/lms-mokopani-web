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
        Schema::table('lms_capaian_pembelajaran', function (Blueprint $table) {
            $table->string('elemen')->nullable()->after('fase');
        });

        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->text('competence')->nullable()->after('description');
            $table->text('content')->nullable()->after('competence');
            $table->enum('formulation_method', ['direct', 'analysis', 'cross_element'])->default('direct')->after('content');
            $table->string('sequencing_method')->nullable()->after('formulation_method');
            $table->text('sequencing_notes')->nullable()->after('sequencing_method');
        });

        Schema::create('lms_tp_cp', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tp_id')->constrained('lms_learning_objectives')->onDelete('cascade');
            $table->foreignId('cp_id')->constrained('lms_capaian_pembelajaran')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_tp_cp');

        Schema::table('lms_learning_objectives', function (Blueprint $table) {
            $table->dropColumn(['competence', 'content', 'formulation_method', 'sequencing_method', 'sequencing_notes']);
        });

        Schema::table('lms_capaian_pembelajaran', function (Blueprint $table) {
            $table->dropColumn('elemen');
        });
    }
};
