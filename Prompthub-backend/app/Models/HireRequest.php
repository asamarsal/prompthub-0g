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
        'onchain_job_id',
        'escrow_contract_address',
        'escrow_verified_at',
        'completion_tx_id',
        'completed_onchain_at',
        'status',
    ];

    protected $casts = [
        'budget_0g' => 'decimal:8',
        'onchain_job_id' => 'integer',
        'escrow_verified_at' => 'datetime',
        'completed_onchain_at' => 'datetime',
    ];
}
