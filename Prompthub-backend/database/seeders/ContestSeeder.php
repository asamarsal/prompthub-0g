<?php

namespace Database\Seeders;

use App\Models\Contest;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ContestSeeder extends Seeder
{
    public function run(): void
    {
        $brand = User::where('email', 'test@example.com')->first();
        if (!$brand) {
            $brand = User::create([
                'wallet_address' => '0xSEEDER0000000000000000000000000000000001',
                'email' => 'test@example.com',
                'name' => 'NeonX Labs',
                'roles' => ['BRAND'],
            ]);
        }

        Contest::truncate();

        $contests = [
            [
                'id' => Str::uuid()->toString(),
                'brand_address' => $brand->wallet_address,
                'title' => 'Neon Horizon — Brand Visual Identity',
                'brand_name' => 'NeonX Labs',
                'about_brand' => 'We\'re a Web3 gaming studio launching our new IP, Neon Horizon. We need a signature visual identity — think cyberpunk meets anime, bold neon palette, and futuristic typography feel.',
                'brief' => 'Create a hero visual (1920×1080) that encapsulates the Neon Horizon brand universe. Must include: a central character silhouette, neon cityscape, and the text \'NEON HORIZON\' styled to match the world.',
                'total_prize_0g' => 0.5,
                'prize_tiers' => [
                    ['place' => 1, 'prize_0g' => 0.25],
                    ['place' => 2, 'prize_0g' => 0.15],
                    ['place' => 3, 'prize_0g' => 0.07],
                    ['place' => 4, 'prize_0g' => 0.01],
                ],
                'category' => 'Brand Visual Identity',
                'tags' => ['cyberpunk', 'gaming', 'anime', 'neon'],
                'deadline' => now()->addDays(7),
                'status' => 'OPEN',
                'tx_id' => '0xMockTxId1',
            ],
            [
                'id' => Str::uuid()->toString(),
                'brand_address' => $brand->wallet_address,
                'title' => '0GBrew — Product Launch Campaign',
                'brand_name' => '0GBrew Coffee',
                'about_brand' => '0GBrew is the world\'s first 0G-native coffee brand. We\'re launching our limited edition 0G Roast and need campaign visuals that blend coffee culture with Web3 aesthetics.',
                'brief' => 'Create 3 social media visuals (1:1 format) for our 0G Roast launch. Mood: warm, premium, with subtle 0G/blockchain motifs. No text required — visuals only.',
                'total_prize_0g' => 0.3,
                'prize_tiers' => [
                    ['place' => 1, 'prize_0g' => 0.15],
                    ['place' => 2, 'prize_0g' => 0.09],
                    ['place' => 3, 'prize_0g' => 0.06],
                ],
                'category' => 'Product Launch Campaign',
                'tags' => ['coffee', '0g', 'lifestyle', 'product'],
                'deadline' => now()->addDays(2),
                'status' => 'OPEN',
                'tx_id' => '0xMockTxId2',
            ],
            [
                'id' => Str::uuid()->toString(),
                'brand_address' => $brand->wallet_address,
                'title' => 'DreamDAO — NFT Character Design Challenge',
                'brand_name' => 'DreamDAO',
                'about_brand' => 'DreamDAO is launching a 10,000-piece PFP NFT collection. We need a signature character — our \'Dreamer\' — that will define the collection\'s visual identity.',
                'brief' => 'Design the base Dreamer character: humanoid, expressive, Web3-native aesthetic. Must be adaptable for trait variation. Deliverable: full body + portrait crop.',
                'total_prize_0g' => 0.8,
                'prize_tiers' => [
                    ['place' => 1, 'prize_0g' => 0.4],
                    ['place' => 2, 'prize_0g' => 0.22],
                    ['place' => 3, 'prize_0g' => 0.1],
                    ['place' => 4, 'prize_0g' => 0.02],
                ],
                'category' => 'NFT Collection Design',
                'tags' => ['nft', 'character', 'pfp', 'dao'],
                'deadline' => now()->addDays(14),
                'status' => 'OPEN',
                'tx_id' => '0xMockTxId3',
            ]
        ];

        foreach ($contests as $contest) {
            Contest::create($contest);
        }
    }
}
