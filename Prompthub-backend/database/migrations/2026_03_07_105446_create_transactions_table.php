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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('tx_id')->unique();
            $table->string('buyer_address');
            $table->foreign('buyer_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->uuid('prompt_id')->nullable();
            $table->foreign('prompt_id')->references('id')->on('prompts')->nullOnDelete();
            $table->decimal('amount_paid', 18, 8);
            $table->string('currency')->default('0G'); // 0G, 0G
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
