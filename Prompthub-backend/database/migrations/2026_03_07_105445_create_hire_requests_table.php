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
        Schema::create('hire_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('client_address');
            $table->foreign('client_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->string('artist_address');
            $table->foreign('artist_address')->references('stx_address')->on('users')->onDelete('cascade');
            $table->text('project_brief');
            $table->decimal('budget_sbtc', 18, 8)->nullable();
            $table->string('status')->default('PENDING'); // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hire_requests');
    }
};
