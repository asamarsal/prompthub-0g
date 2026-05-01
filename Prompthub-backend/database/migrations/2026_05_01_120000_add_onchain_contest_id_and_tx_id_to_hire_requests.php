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
        Schema::table('contests', function (Blueprint $table) {
            $table->unsignedBigInteger('onchain_contest_id')->nullable()->after('tx_id');
        });

        Schema::table('hire_requests', function (Blueprint $table) {
            $table->string('tx_id')->nullable()->after('budget_sbtc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contests', function (Blueprint $table) {
            $table->dropColumn('onchain_contest_id');
        });

        Schema::table('hire_requests', function (Blueprint $table) {
            $table->dropColumn('tx_id');
        });
    }
};
