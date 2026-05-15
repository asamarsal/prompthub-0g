<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            if (!Schema::hasColumn('prompts', 'encrypted_original_content')) {
                $table->longText('encrypted_original_content')->nullable()->after('original_content');
            }
            if (!Schema::hasColumn('prompts', 'content_encryption_payload')) {
                $table->json('content_encryption_payload')->nullable()->after('encrypted_original_content');
            }
            if (!Schema::hasColumn('prompts', 'preview_teaser')) {
                $table->text('preview_teaser')->nullable()->after('description');
            }
            if (!Schema::hasColumn('prompts', 'preview_teaser_source')) {
                $table->string('preview_teaser_source')->nullable()->after('preview_teaser');
            }
            if (!Schema::hasColumn('prompts', 'preview_teaser_model')) {
                $table->string('preview_teaser_model')->nullable()->after('preview_teaser_source');
            }
            if (!Schema::hasColumn('prompts', 'preview_teaser_generated_at')) {
                $table->timestamp('preview_teaser_generated_at')->nullable()->after('preview_teaser_model');
            }
        });
    }

    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            foreach ([
                'encrypted_original_content',
                'content_encryption_payload',
                'preview_teaser',
                'preview_teaser_source',
                'preview_teaser_model',
                'preview_teaser_generated_at',
            ] as $column) {
                if (Schema::hasColumn('prompts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
