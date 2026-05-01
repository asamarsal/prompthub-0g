<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'sender_address',
        'receiver_address',
        'content',
        'attachment_url',
        'hire_request_id',
        'is_read',
    ];
}
