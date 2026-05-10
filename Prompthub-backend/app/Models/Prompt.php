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
        'negative_prompt',
        'usage_notes',
        'view_count',
        'contract_id',
        'og_tx_id',
        'root_hash',
        'storage_manifest',
        'prompt_txt_root_hash',
        'prompt_txt_tx_hash',
        'preview_root_hash',
        'preview_tx_hash',
        'text_package_root_hash',
        'text_package_tx_hash',
        'ipfs_metadata_uri',
        'storage_status',
        'ai_quality_score',
        'ai_quality_score_updated_at',
        'currency',
        'additional_info',
        'reference_images',
        'watermarked_preview_url',
        'commercial_use_allowed'
    ];

    protected $casts = [
        'tags' => 'array',
        'price_0g' => 'decimal:6',
        'is_nsfw' => 'boolean',
        'is_published' => 'boolean',
        'is_curated' => 'boolean',
        'royalty_percentage' => 'integer',
        'total_sold' => 'integer',
        'view_count' => 'integer',
        'contract_id' => 'integer',
        'storage_manifest' => 'array',
        'ai_quality_score' => 'array',
        'ai_quality_score_updated_at' => 'datetime',
        'additional_info' => 'array',
        'reference_images' => 'array',
        'commercial_use_allowed' => 'boolean'
    ];

    protected $appends = ['average_rating'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function bookmarkedBy()
    {
        return $this->belongsToMany(User::class, 'bookmarks', 'prompt_id', 'user_id')->withTimestamps();
    }

    public function getAverageRatingAttribute(): float
    {
        return round((float) $this->reviews()->avg('rating'), 1) ?: 0;
    }
}
