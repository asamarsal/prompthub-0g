<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hire_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('hire_requests', 'onchain_job_id')) {
                $table->unsignedBigInteger('onchain_job_id')->nullable()->after('tx_id');
            }
            if (!Schema::hasColumn('hire_requests', 'escrow_contract_address')) {
                $table->string('escrow_contract_address')->nullable()->after('onchain_job_id');
            }
            if (!Schema::hasColumn('hire_requests', 'escrow_verified_at')) {
                $table->timestamp('escrow_verified_at')->nullable()->after('escrow_contract_address');
            }
            if (!Schema::hasColumn('hire_requests', 'completion_tx_id')) {
                $table->string('completion_tx_id')->nullable()->after('escrow_verified_at');
            }
            if (!Schema::hasColumn('hire_requests', 'completed_onchain_at')) {
                $table->timestamp('completed_onchain_at')->nullable()->after('completion_tx_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('hire_requests', function (Blueprint $table) {
            foreach ([
                'onchain_job_id',
                'escrow_contract_address',
                'escrow_verified_at',
                'completion_tx_id',
                'completed_onchain_at',
            ] as $column) {
                if (Schema::hasColumn('hire_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
