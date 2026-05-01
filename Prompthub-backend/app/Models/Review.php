<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Review extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'prompt_id',
        'reviewer_address',
        'rating',
        'comment',
    ];

    public function prompt()
    {
        return $this->belongsTo(Prompt::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_address', 'wallet_address');
    }
}
