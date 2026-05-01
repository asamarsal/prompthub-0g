<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModel extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'category_id'];

    /**
     * Get the category (generation type) that owns the AI model.
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
