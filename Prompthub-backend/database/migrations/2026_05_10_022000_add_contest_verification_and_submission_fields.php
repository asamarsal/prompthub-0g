<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contests', function (Blueprint $table) {
            if (!Schema::hasColumn('contests', 'contest_contract_address')) {
                $table->string('contest_contract_address')->nullable()->after('onchain_contest_id');
            }
            if (!Schema::hasColumn('contests', 'funding_verified_at')) {
                $table->timestamp('funding_verified_at')->nullable()->after('contest_contract_address');
            }
            if (!Schema::hasColumn('contests', 'winner_tx_id')) {
                $table->string('winner_tx_id')->nullable()->after('funding_verified_at');
            }
            if (!Schema::hasColumn('contests', 'winner_verified_at')) {
                $table->timestamp('winner_verified_at')->nullable()->after('winner_tx_id');
            }
        });

        Schema::table('contest_submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('contest_submissions', 'prompt_used')) {
                $table->text('prompt_used')->nullable()->after('preview_image_url');
            }
            if (!Schema::hasColumn('contest_submissions', 'tool')) {
                $table->string('tool')->nullable()->after('prompt_used');
            }
            if (!Schema::hasColumn('contest_submissions', 'storage_root_hash')) {
                $table->string('storage_root_hash')->nullable()->after('tool');
            }
            if (!Schema::hasColumn('contest_submissions', 'storage_tx_hash')) {
                $table->string('storage_tx_hash')->nullable()->after('storage_root_hash');
            }
            if (!Schema::hasColumn('contest_submissions', 'ipfs_metadata_uri')) {
                $table->string('ipfs_metadata_uri')->nullable()->after('storage_tx_hash');
            }
            if (!Schema::hasColumn('contest_submissions', 'onchain_entry_id')) {
                $table->string('onchain_entry_id')->nullable()->after('ipfs_metadata_uri');
            }
        });
    }

    public function down(): void
    {
        Schema::table('contests', function (Blueprint $table) {
            foreach (['contest_contract_address', 'funding_verified_at', 'winner_tx_id', 'winner_verified_at'] as $column) {
                if (Schema::hasColumn('contests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('contest_submissions', function (Blueprint $table) {
            foreach ([
                'prompt_used',
                'tool',
                'storage_root_hash',
                'storage_tx_hash',
                'ipfs_metadata_uri',
                'onchain_entry_id',
            ] as $column) {
                if (Schema::hasColumn('contest_submissions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
