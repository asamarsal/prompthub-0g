<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'tx_id',
        'buyer_address',
        'prompt_id',
        'contract_token_id',
        'seller_address',
        'amount_paid',
        'amount_paid_wei',
        'currency',
        'verified_at',
        'verification_source',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function prompt()
    {
        return $this->belongsTo(Prompt::class);
    }

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_address', 'wallet_address');
    }
}
