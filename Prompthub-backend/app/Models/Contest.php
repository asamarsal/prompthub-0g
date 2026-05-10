<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contest extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'brand_address', 'title', 'brand_name', 'category',
        'about_brand', 'brief', 'tags', 'require_prompt_submission',
        'prize_tiers', 'total_prize_0g', 'deadline', 'status',
        'tx_id', 'onchain_contest_id', 'contest_contract_address',
        'funding_verified_at', 'winner_tx_id', 'winner_verified_at',
        'winner_submission_id'
    ];

    protected $casts = [
        'tags' => 'array',
        'prize_tiers' => 'array',
        'require_prompt_submission' => 'boolean',
        'total_prize_0g' => 'decimal:8',
        'deadline' => 'datetime',
        'onchain_contest_id' => 'integer',
        'funding_verified_at' => 'datetime',
        'winner_verified_at' => 'datetime',
    ];

    public function submissions()
    {
        return $this->hasMany(ContestSubmission::class);
    }
}
