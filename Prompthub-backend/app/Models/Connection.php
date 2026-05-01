<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Connection extends Model
{
    protected $fillable = [
        'requester_address',
        'recipient_address',
        'status',
    ];

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_address', 'wallet_address');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_address', 'wallet_address');
    }
}
