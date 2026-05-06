<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'type'];

    public function aiModels()
    {
        return $this->hasMany(AiModel::class);
    }
}
