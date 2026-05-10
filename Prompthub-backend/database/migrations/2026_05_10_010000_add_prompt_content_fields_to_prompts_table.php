<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->text('negative_prompt')->nullable()->after('original_content');
            $table->text('usage_notes')->nullable()->after('negative_prompt');
            $table->unsignedBigInteger('view_count')->default(0)->after('total_sold');
            $table->boolean('commercial_use_allowed')->default(true)->after('license_type');
        });
    }

    public function down(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->dropColumn([
                'negative_prompt',
                'usage_notes',
                'view_count',
                'commercial_use_allowed',
            ]);
        });
    }
};
