<?php

namespace Database\Seeders;

use App\Models\Prompt;
use App\Models\User;
use App\Models\AiModel;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PromptSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure we have a user to attribute prompts to
        $user = User::first() ?? User::factory()->create([
            'name' => 'Demo Artist',
            'email' => 'artist@prompthub.xyz',
        ]);

        $prompts = [
            // IMAGE GENERATION
            [
                'title' => 'Hyper-Realistic Cyberpunk Cityscape',
                'description' => 'A detailed cyberpunk street at night with neon lights, rain reflections, and flying cars. Optimized for high resolution.',
                'price_0g' => 10.5,
                'preview_image_url' => 'https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2070&auto=format&fit=crop',
                'cid_ipfs' => 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
                'ai_model' => 'Midjourney v6',
                'category' => 'Image Generation',
                'tags' => ['cyberpunk', 'futuristic', 'neon', 'cityscape'],
                'content_type' => 'IMAGE',
                'license_type' => 'COMMERCIAL',
            ],
            [
                'title' => 'Ethereal Forest Spirit Portrait',
                'description' => 'Beautiful portrait of a forest spirit made of leaves and starlight. Cinematic lighting and magical atmosphere.',
                'price_0g' => 5.0,
                'preview_image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1974&auto=format&fit=crop',
                'cid_ipfs' => 'QmYwAPJzvfS6RE93n9k6dAnNHJp93n9k6dAnNHJp93n9k6d',
                'ai_model' => 'DALL-E 3',
                'category' => 'Image Generation',
                'tags' => ['fantasy', 'spirit', 'nature', 'portrait'],
                'content_type' => 'IMAGE',
                'license_type' => 'EXCLUSIVE',
            ],
            
            // TEXT GENERATION
            [
                'title' => 'Ultimate SEO Blog Post Generator',
                'description' => 'Advanced prompt for generating high-ranking SEO articles on any topic. Includes outline, keywords, and meta description.',
                'price_0g' => 15.0,
                'preview_image_url' => 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1973&auto=format&fit=crop',
                'cid_ipfs' => 'QmZ4tjB7S5N4pE9z8wWn1q2r3s4t5u6v7w8x9y0z1a2b3c',
                'ai_model' => 'GPT-4o',
                'category' => 'Text Generation',
                'tags' => ['marketing', 'seo', 'blogging', 'writer'],
                'content_type' => 'TEXT',
                'license_type' => 'COMMERCIAL',
            ],
            [
                'title' => 'Creative Sci-Fi Worldbuilder',
                'description' => 'Generate deep lore, factions, and planetary descriptions for your next science fiction novel or RPG campaign.',
                'price_0g' => 8.25,
                'preview_image_url' => 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=2054&auto=format&fit=crop',
                'cid_ipfs' => 'Qmaa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
                'ai_model' => 'Claude 3.5 Sonnet',
                'category' => 'Text Generation',
                'tags' => ['scifi', 'writing', 'roleplay', 'worldbuilding'],
                'content_type' => 'TEXT',
                'license_type' => 'FREE',
            ],

            // CODE GENERATION
            [
                'title' => 'Smart Contract Security Auditor',
                'description' => 'Analyze smart contracts for vulnerabilities, reentrancy attacks, and optimization opportunities. Works best with Solidity.',
                'price_0g' => 25.0,
                'preview_image_url' => 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop',
                'cid_ipfs' => 'Qmbb2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w',
                'ai_model' => 'GitHub Copilot',
                'category' => 'Code Generation',
                'tags' => ['blockchain', 'solidity', 'security', 'audit'],
                'content_type' => 'CODE',
                'license_type' => 'EXCLUSIVE',
            ],

            // VIDEO GENERATION
            [
                'title' => 'Cinematic Nature Drone Shot',
                'description' => 'Prompt for generating breathtaking 4K drone footage of mountains and waterfalls. Smooth camera motion and realistic physics.',
                'price_0g' => 30.0,
                'preview_image_url' => 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
                'cid_ipfs' => 'Qmcc3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x',
                'ai_model' => 'Sora',
                'category' => 'Video Generation',
                'tags' => ['drone', 'cinematic', 'nature', '4k'],
                'content_type' => 'VIDEO',
                'license_type' => 'COMMERCIAL',
            ],

            // AUDIO GENERATION
            [
                'title' => 'Lo-Fi Chill Beats Producer',
                'description' => 'Create endless relaxing lo-fi tracks for studying or working. Optimized for atmosphere and soft instrumentals.',
                'price_0g' => 12.0,
                'preview_image_url' => 'https://images.unsplash.com/photo-1516280440614-37939bb92583?q=80&w=2070&auto=format&fit=crop',
                'cid_ipfs' => 'Qmdd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y',
                'ai_model' => 'Suno AI',
                'category' => 'Audio Generation',
                'tags' => ['music', 'lofi', 'chill', 'beats'],
                'content_type' => 'AUDIO',
                'license_type' => 'COMMERCIAL',
            ],
        ];

        foreach ($prompts as $data) {
            $data['id'] = (string) Str::uuid();
            $data['user_id'] = $user->id;
            $data['is_published'] = true;
            $data['is_curated'] = rand(0, 1);
            $data['total_sold'] = rand(0, 50);
            $data['royalty_percentage'] = 10;
            $data['original_content'] = 'This is the hidden source prompt for ' . $data['title'] . '. Protected by x402 protocol.';
            
            Prompt::create($data);
        }
    }
}
