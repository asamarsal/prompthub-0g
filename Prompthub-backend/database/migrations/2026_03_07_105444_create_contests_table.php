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
        Schema::create('contests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('brand_address');
            $table->foreign('brand_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->string('title');
            $table->string('brand_name')->nullable();
            $table->string('category')->nullable();
            $table->text('about_brand')->nullable();
            $table->text('brief');
            $table->json('tags')->nullable();
            $table->boolean('require_prompt_submission')->default(false);
            $table->json('prize_tiers'); // e.g. [{"place":1,"prize_sbtc":"0.005"},{"place":2,"prize_sbtc":"0.002"}]
            $table->decimal('total_prize_sbtc', 18, 8)->default(0);
            $table->timestamp('deadline')->nullable();
            $table->string('status')->default('PENDING_FUNDING'); // PENDING_FUNDING, OPEN, VOTING, COMPLETED, CANCELLED
            $table->string('tx_id')->nullable(); // 0G blockchain escrow TX ID
            $table->uuid('winner_submission_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contests');
    }
};
