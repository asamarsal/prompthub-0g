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
        Schema::create('prompts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->decimal('price_stx', 16, 6)->default(0);
            $table->string('preview_image_url')->nullable();
            $table->string('cid_ipfs')->nullable();
            $table->string('ai_model')->nullable();
            $table->string('category')->nullable();
            $table->json('tags')->nullable();
            $table->string('content_type')->default('IMAGE');
            $table->boolean('is_nsfw')->default(false);
            $table->enum('license_type', ['FREE', 'COMMERCIAL', 'EXCLUSIVE'])->default('COMMERCIAL');
            $table->integer('royalty_percentage')->default(0);
            $table->boolean('is_published')->default(false);
            $table->boolean('is_curated')->default(false);
            $table->integer('total_sold')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prompts');
    }
};
