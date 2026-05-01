<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->string('follower_address');
            $table->foreign('follower_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->string('following_address');
            $table->foreign('following_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['follower_address', 'following_address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};
