<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            if (!Schema::hasColumn('prompts', 'storage_manifest')) {
                $table->json('storage_manifest')->nullable()->after('root_hash');
            }
            if (!Schema::hasColumn('prompts', 'prompt_txt_root_hash')) {
                $table->string('prompt_txt_root_hash')->nullable()->after('storage_manifest');
            }
            if (!Schema::hasColumn('prompts', 'prompt_txt_tx_hash')) {
                $table->string('prompt_txt_tx_hash')->nullable()->after('prompt_txt_root_hash');
            }
            if (!Schema::hasColumn('prompts', 'preview_root_hash')) {
                $table->string('preview_root_hash')->nullable()->after('prompt_txt_tx_hash');
            }
            if (!Schema::hasColumn('prompts', 'preview_tx_hash')) {
                $table->string('preview_tx_hash')->nullable()->after('preview_root_hash');
            }
            if (!Schema::hasColumn('prompts', 'text_package_root_hash')) {
                $table->string('text_package_root_hash')->nullable()->after('preview_tx_hash');
            }
            if (!Schema::hasColumn('prompts', 'text_package_tx_hash')) {
                $table->string('text_package_tx_hash')->nullable()->after('text_package_root_hash');
            }
            if (!Schema::hasColumn('prompts', 'ipfs_metadata_uri')) {
                $table->string('ipfs_metadata_uri')->nullable()->after('text_package_tx_hash');
            }
            if (!Schema::hasColumn('prompts', 'storage_status')) {
                $table->string('storage_status')->default('pending')->after('ipfs_metadata_uri');
            }
            if (!Schema::hasColumn('prompts', 'ai_quality_score')) {
                $table->json('ai_quality_score')->nullable()->after('storage_status');
            }
            if (!Schema::hasColumn('prompts', 'ai_quality_score_updated_at')) {
                $table->timestamp('ai_quality_score_updated_at')->nullable()->after('ai_quality_score');
            }
        });
    }

    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            foreach ([
                'storage_manifest',
                'prompt_txt_root_hash',
                'prompt_txt_tx_hash',
                'preview_root_hash',
                'preview_tx_hash',
                'text_package_root_hash',
                'text_package_tx_hash',
                'ipfs_metadata_uri',
                'storage_status',
                'ai_quality_score',
                'ai_quality_score_updated_at',
            ] as $column) {
                if (Schema::hasColumn('prompts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
