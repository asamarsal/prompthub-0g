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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->string('sender_address');
            $table->foreign('sender_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->string('receiver_address');
            $table->foreign('receiver_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->uuid('hire_request_id')->nullable();
            $table->foreign('hire_request_id')->references('id')->on('hire_requests')->nullOnDelete();
            $table->text('content');
            $table->string('attachment_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
