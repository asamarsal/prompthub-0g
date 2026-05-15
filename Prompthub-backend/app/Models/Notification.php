<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_address',
        'type',
        'is_read',
        'data'
    ];
    
    protected $casts = [
        'is_read' => 'boolean',
        'data' => 'array',
    ];
}
