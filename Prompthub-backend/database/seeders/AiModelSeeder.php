<?php

namespace Database\Seeders;

use App\Models\AiModel;
use App\Models\Category;
use Illuminate\Database\Seeder;

class AiModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('slug');

        $data = [
            'text-generation' => [
                ['name' => '0GM-1.0-35B-A3B', 'slug' => '0gm-1-0-35b-a3b'],
                ['name' => 'DeepSeek Chat V3 0324', 'slug' => 'deepseek-chat-v3-0324'],
                ['name' => 'DeepSeek V4 Pro', 'slug' => 'deepseek-v4-pro'],
                ['name' => 'Qwen 3.6 Plus', 'slug' => 'qwen-3-6-plus'],
                ['name' => 'GLM-5 FP8', 'slug' => 'glm-5-fp8'],
                ['name' => 'GLM-5.1 FP8', 'slug' => 'glm-5-1-fp8'],
                ['name' => 'GPT-4', 'slug' => 'gpt-4'],
                ['name' => 'GPT-4o', 'slug' => 'gpt-4o'],
                ['name' => 'GPT-5', 'slug' => 'gpt-5'],
                ['name' => 'Claude 3.5 Sonnet', 'slug' => 'claude-3-5-sonnet'],
                ['name' => 'Claude 3 Opus', 'slug' => 'claude-3-opus'],
                ['name' => 'Gemini 1.5 Pro', 'slug' => 'gemini-1-5-pro'],
                ['name' => 'Gemini 1.5 Flash', 'slug' => 'gemini-1-5-flash'],
                ['name' => 'Mistral Large', 'slug' => 'mistral-large'],
                ['name' => 'Grok-2', 'slug' => 'grok-2'],
                ['name' => 'DeepSeek-V3', 'slug' => 'deepseek-v3'],
            ],
            'image-generation' => [
                ['name' => 'Z-Image', 'slug' => 'z-image'],
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
                ['name' => 'Whisper Large V3', 'slug' => 'whisper-large-v3'],
                ['name' => 'ElevenLabs', 'slug' => 'elevenlabs'],
                ['name' => 'Suno AI', 'slug' => 'suno-ai'],
                ['name' => 'Udio', 'slug' => 'udio'],
                ['name' => 'Whisper v3', 'slug' => 'whisper-v3'],
            ],
            'code-generation' => [
                ['name' => '0GM-1.0-35B-A3B', 'slug' => '0gm-1-0-35b-a3b-code'],
                ['name' => 'DeepSeek Chat V3 0324', 'slug' => 'deepseek-chat-v3-0324-code'],
                ['name' => 'GitHub Copilot', 'slug' => 'github-copilot'],
                ['name' => 'Code Llama', 'slug' => 'code-llama'],
                ['name' => 'DeepSeek Coder', 'slug' => 'deepseek-coder'],
            ],
            'ai-agents-automation' => [
                ['name' => '0GM-1.0-35B-A3B', 'slug' => '0gm-1-0-35b-a3b-agents'],
                ['name' => 'DeepSeek V4 Pro', 'slug' => 'deepseek-v4-pro-agents'],
                ['name' => 'Qwen 3.6 Plus', 'slug' => 'qwen-3-6-plus-agents'],
            ],
            'prompt-engineering' => [
                ['name' => '0GM-1.0-35B-A3B', 'slug' => '0gm-1-0-35b-a3b-prompts'],
                ['name' => 'DeepSeek Chat V3 0324', 'slug' => 'deepseek-chat-v3-0324-prompts'],
                ['name' => 'Qwen 3.6 Plus', 'slug' => 'qwen-3-6-plus-prompts'],
            ],
            'business-marketing' => [
                ['name' => 'GPT-4o', 'slug' => 'gpt-4o-marketing'],
                ['name' => 'Claude 3.5 Sonnet', 'slug' => 'claude-3-5-sonnet-marketing'],
                ['name' => '0GM-1.0-35B-A3B', 'slug' => '0gm-1-0-35b-a3b-marketing'],
            ],
            'data-analysis' => [
                ['name' => 'Qwen 3.6 Plus', 'slug' => 'qwen-3-6-plus-data'],
                ['name' => 'DeepSeek Chat V3 0324', 'slug' => 'deepseek-chat-v3-0324-data'],
                ['name' => 'GPT-4o', 'slug' => 'gpt-4o-data'],
            ],
            '3d-product-design' => [
                ['name' => 'Z-Image', 'slug' => 'z-image-product'],
                ['name' => 'Midjourney v6', 'slug' => 'midjourney-v6-product'],
                ['name' => 'Flux.1', 'slug' => 'flux-1-product'],
            ],
        ];

        foreach ($data as $catSlug => $models) {
            $cat = $categories->get($catSlug);
            if ($cat) {
                foreach ($models as $m) {
                    AiModel::updateOrCreate(
                        ['slug' => $m['slug']],
                        [
                            'name' => $m['name'],
                            'category_id' => $cat->id,
                            'description' => "{$m['name']} model for {$cat->name}.",
                        ]
                    );
                }
            }
        }
    }
}
