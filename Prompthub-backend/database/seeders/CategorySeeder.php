<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Image Generation',
                'slug' => 'image-generation',
                'description' => 'Prompts for generating images using models like Midjourney, DALL-E, or Stable Diffusion.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Text Generation',
                'slug' => 'text-generation',
                'description' => 'Prompts for large language models to generate articles, stories, or conversational content.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Code Generation',
                'slug' => 'code-generation',
                'description' => 'Prompts specialized in generating code snippets, debugging, or architectural patterns.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Audio Generation',
                'slug' => 'audio-generation',
                'description' => 'Prompts for music, sound effects, or voice synthesis using AI.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Video Generation',
                'slug' => 'video-generation',
                'description' => 'Prompts for AI video models to create animations, cinematic shots, or clips.',
                'type' => 'CURATED'
            ]
        ];

        foreach ($categories as $category) {
            \App\Models\Category::create($category);
        }
    }
}
