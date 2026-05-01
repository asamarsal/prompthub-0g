<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AiModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = \App\Models\Category::all()->keyBy('slug');

        $data = [
            'text-generation' => [
                ['name' => 'GPT-4', 'slug' => 'gpt-4'],
                ['name' => 'GPT-4o', 'slug' => 'gpt-4o'],
                ['name' => 'GPT-5', 'slug' => 'gpt-5'],
                ['name' => 'Claude 3.5 Sonnet', 'slug' => 'claude-3-5-sonnet'],
                ['name' => 'Claude 3 Opus', 'slug' => 'claude-3-opus'],
                ['name' => 'Gemini 1.5 Pro', 'slug' => 'gemini-1-5-pro'],
                ['name' => 'Gemini 1.5 Flash', 'slug' => 'gemini-1-5-flash'],
                ['name' => 'Llama 3.1', 'slug' => 'llama-3-1'],
                ['name' => 'Mistral Large', 'slug' => 'mistral-large'],
                ['name' => 'Grok-2', 'slug' => 'grok-2'],
                ['name' => 'DeepSeek-V3', 'slug' => 'deepseek-v3'],
            ],
            'image-generation' => [
                ['name' => 'DALL-E 3', 'slug' => 'dall-e-3'],
                ['name' => 'Midjourney v6', 'slug' => 'midjourney-v6'],
                ['name' => 'Stable Diffusion 3', 'slug' => 'stable-diffusion-3'],
                ['name' => 'Flux.1', 'slug' => 'flux-1'],
                ['name' => 'Ideogram 2.0', 'slug' => 'ideogram-2'],
            ],
            'video-generation' => [
                ['name' => 'Sora', 'slug' => 'sora'],
                ['name' => 'Luma Dream Machine', 'slug' => 'luma-dream-machine'],
                ['name' => 'Runway Gen-3', 'slug' => 'runway-gen-3'],
                ['name' => 'Kling AI', 'slug' => 'kling-ai'],
            ],
            'audio-generation' => [
                ['name' => 'ElevenLabs', 'slug' => 'elevenlabs'],
                ['name' => 'Suno AI', 'slug' => 'suno-ai'],
                ['name' => 'Udio', 'slug' => 'udio'],
                ['name' => 'Whisper v3', 'slug' => 'whisper-v3'],
            ],
            'code-generation' => [
                ['name' => 'GitHub Copilot', 'slug' => 'github-copilot'],
                ['name' => 'Code Llama', 'slug' => 'code-llama'],
                ['name' => 'DeepSeek Coder', 'slug' => 'deepseek-coder'],
            ]
        ];

        foreach ($data as $catSlug => $models) {
            $cat = $categories->get($catSlug);
            if ($cat) {
                foreach ($models as $m) {
                    $m['category_id'] = $cat->id;
                    $m['description'] = "{$m['name']} model for {$cat->name}.";
                    \App\Models\AiModel::create($m);
                }
            }
        }
    }
}
