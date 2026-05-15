<?php

namespace Database\Seeders;

use App\Models\Category;
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
            ],
            [
                'name' => 'AI Agents & Automation',
                'slug' => 'ai-agents-automation',
                'description' => 'Prompts for autonomous agents, workflow automation, tool use, task planning, and multi-step AI operations.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Prompt Engineering',
                'slug' => 'prompt-engineering',
                'description' => 'Reusable prompt frameworks, evaluation prompts, system prompts, prompt optimization, and meta-prompting workflows.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Business & Marketing',
                'slug' => 'business-marketing',
                'description' => 'Prompts for campaign strategy, product positioning, sales copy, market research, and growth workflows.',
                'type' => 'CURATED'
            ],
            [
                'name' => 'Data Analysis',
                'slug' => 'data-analysis',
                'description' => 'Prompts for analysis, reporting, data cleaning, insight generation, and spreadsheet or BI workflows.',
                'type' => 'CURATED'
            ],
            [
                'name' => '3D & Product Design',
                'slug' => '3d-product-design',
                'description' => 'Prompts for product visualization, 3D assets, concept design, packaging, and commercial render workflows.',
                'type' => 'CURATED'
            ]
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
