<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    protected $fillable = [
        'wallet_address',
        'email',
        'google_id',
        'username',
        'name',
        'bio',
        'avatar_url',
        'cover_url',
        'roles',
        'is_available_for_freelance',
        'hourly_rate',
        'hourly_rate_currency',
        'skills',
        'specialization_id',
        'agent_registered',
        'agent_verified',
        'agent_metadata_uri',
        'agent_avg_rating',
        'agent_completed_jobs',
        'agent_total_reviews',
        'agent_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'roles' => 'array',
            'is_available_for_freelance' => 'boolean',
            'hourly_rate' => 'decimal:4',
            'skills' => 'array',
            'specialization_id' => 'array',
            'agent_registered' => 'boolean',
            'agent_verified' => 'boolean',
            'agent_avg_rating' => 'integer',
            'agent_completed_jobs' => 'integer',
            'agent_total_reviews' => 'integer',
            'agent_synced_at' => 'datetime',
        ];
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }

    public function bookmarkedPrompts()
    {
        return $this->belongsToMany(Prompt::class, 'bookmarks', 'user_id', 'prompt_id')->withTimestamps();
    }

    public function reviewsReceived()
    {
        return $this->hasMany(ArtistReview::class, 'artist_id');
    }

    public function prompts()
    {
        return $this->hasMany(Prompt::class, 'user_id');
    }

    public function getMappedSpecialties()
    {
        $map = [
            1 => 'Brand Identity',
            2 => 'Product Photography',
            3 => 'Ad Creative',
            4 => 'Video / Motion',
            5 => 'Character Design',
            6 => '3D Render',
            7 => 'NFT Collection',
            8 => 'Social Media Pack',
        ];

        $specs = is_array($this->specialization_id) ? $this->specialization_id : json_decode($this->specialization_id, true) ?? [];
        $mapped = array_filter(array_map(fn($id) => $map[$id] ?? null, $specs));
        
        return !empty($mapped) ? array_values($mapped) : ['AI Artist'];
    }

    public function getMappedTools()
    {
        $map = [
            'gpt-4' => 'GPT-4',
            'gpt-4o' => 'GPT-4o',
            'claude-3-5-sonnet' => 'Claude 3.5',
            'gemini-1-5-pro' => 'Gemini 1.5',
            'dall-e-3' => 'DALL-E 3',
            'midjourney-v6' => 'Midjourney v6',
            'stable-diffusion-3' => 'SD 3',
            'flux-1' => 'Flux.1',
            'sora' => 'Sora',
            'runway-gen-3' => 'Runway Gen-3',
            'elevenlabs' => 'ElevenLabs',
        ];

        // Skills is an array of slugs or IDs. Assuming slugs for now based on AiModelSeeder.
        // If they are IDs, we would need to fetch names from AIModel table.
        // But for a quick fix, let's assume popular tool names as fallback.
        if (empty($this->skills)) return ['Midjourney v6', 'DALL-E 3'];

        return array_map(function($skill) use ($map) {
            return $map[$skill] ?? ucfirst(str_replace('-', ' ', $skill));
        }, $this->skills);
    }
}
