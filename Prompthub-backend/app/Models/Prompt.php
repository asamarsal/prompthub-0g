<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prompt extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'title',
        'description',
        'price_0g',
        'preview_image_url',
        'cid_ipfs',
        'ai_model',
        'category',
        'tags',
        'content_type',
        'is_nsfw',
        'license_type',
        'royalty_percentage',
        'is_published',
        'is_curated',
        'total_sold',
        'original_content',
        'contract_id',
        'og_tx_id',
        'root_hash',
        'currency',
        'additional_info',
        'reference_images',
        'watermarked_preview_url'
    ];

    protected $casts = [
        'tags' => 'array',
        'price_0g' => 'decimal:6',
        'is_nsfw' => 'boolean',
        'is_published' => 'boolean',
        'is_curated' => 'boolean',
        'royalty_percentage' => 'integer',
        'total_sold' => 'integer',
        'contract_id' => 'integer',
        'additional_info' => 'array',
        'reference_images' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bookmarkedBy()
    {
        return $this->belongsToMany(User::class, 'bookmarks', 'prompt_id', 'user_id')->withTimestamps();
    }
}
