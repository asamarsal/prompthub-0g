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
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('prompt_id');
            $table->foreign('prompt_id')->references('id')->on('prompts')->onDelete('cascade');
            
            $table->string('reviewer_address');
            $table->foreign('reviewer_address')->references('stx_address')->on('users')->onDelete('cascade');
            
            $table->unsignedTinyInteger('rating')->default(5); // 1-5 scale
            $table->text('comment')->nullable();
            
            $table->timestamps();
            
            // A user can only review a prompt once
            $table->unique(['prompt_id', 'reviewer_address']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
