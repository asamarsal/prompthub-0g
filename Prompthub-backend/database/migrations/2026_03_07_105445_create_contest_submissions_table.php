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
        Schema::create('contest_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('contest_id');
            $table->foreign('contest_id')->references('id')->on('contests')->onDelete('cascade');
            $table->string('artist_address');
            $table->foreign('artist_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->string('cid_ipfs')->nullable();
            $table->string('preview_image_url')->nullable();
            $table->boolean('is_winner')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contest_submissions');
    }
};
