<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('contract_token_id')->nullable()->after('prompt_id');
            $table->string('seller_address')->nullable()->after('buyer_address');
            $table->string('amount_paid_wei')->nullable()->after('amount_paid');
            $table->timestamp('verified_at')->nullable()->after('currency');
            $table->string('verification_source')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn([
                'contract_token_id',
                'seller_address',
                'amount_paid_wei',
                'verified_at',
                'verification_source',
            ]);
        });
    }
};
