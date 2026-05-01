<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_address',
        'title',
        'message',
        'type',
        'link',
        'is_read',
        'data'
    ];
    
    protected $casts = [
        'is_read' => 'boolean',
        'data' => 'array',
    ];
}
