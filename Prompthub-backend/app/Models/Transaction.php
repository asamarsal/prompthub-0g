<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'tx_id',
        'buyer_address',
        'prompt_id',
        'amount_paid',
        'currency',
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
