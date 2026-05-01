<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HireRequest extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'client_address',
        'artist_address',
        'project_brief',
        'budget_0g',
        'tx_id',
        'status',
    ];

    protected $casts = [
        'budget_0g' => 'decimal:8',
    ];
}
