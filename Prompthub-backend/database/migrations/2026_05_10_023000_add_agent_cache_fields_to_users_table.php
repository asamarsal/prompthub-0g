<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'agent_registered')) {
                $table->boolean('agent_registered')->default(false)->after('skills');
            }
            if (!Schema::hasColumn('users', 'agent_verified')) {
                $table->boolean('agent_verified')->default(false)->after('agent_registered');
            }
            if (!Schema::hasColumn('users', 'agent_metadata_uri')) {
                $table->string('agent_metadata_uri')->nullable()->after('agent_verified');
            }
            if (!Schema::hasColumn('users', 'agent_avg_rating')) {
                $table->unsignedInteger('agent_avg_rating')->default(0)->after('agent_metadata_uri');
            }
            if (!Schema::hasColumn('users', 'agent_completed_jobs')) {
                $table->unsignedInteger('agent_completed_jobs')->default(0)->after('agent_avg_rating');
            }
            if (!Schema::hasColumn('users', 'agent_total_reviews')) {
                $table->unsignedInteger('agent_total_reviews')->default(0)->after('agent_completed_jobs');
            }
            if (!Schema::hasColumn('users', 'agent_synced_at')) {
                $table->timestamp('agent_synced_at')->nullable()->after('agent_total_reviews');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'agent_registered',
                'agent_verified',
                'agent_metadata_uri',
                'agent_avg_rating',
                'agent_completed_jobs',
                'agent_total_reviews',
                'agent_synced_at',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
