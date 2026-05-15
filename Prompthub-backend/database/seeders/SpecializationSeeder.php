<?php

namespace Database\Seeders;

use App\Models\Specialization;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;

class SpecializationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $specs = [
            'Brand Identity',
            'Product Photography',
            'Ad Creative',
            'Video / Motion',
            'Character Design',
            '3D Render',
            'NFT Collection',
            'Social Media Pack',
            'Prompt Engineering',
            'AI Agent Builder',
            'Workflow Automation',
            'Marketplace Listing Optimization',
            '0G Storage Integration',
            '0G Compute Integration',
            'Smart Contract Integration',
            'Data Analysis',
            'Copywriting',
            'SEO Content',
            'E-commerce Creative',
            'Game Asset Design',
            'UI/UX Prompting',
            'Architecture Visualization',
            'Music & Voice Prompting',
            'Video Storyboarding',
        ];

        foreach ($specs as $spec) {
            Specialization::withTrashed()->updateOrCreate([
                'slug' => Str::slug($spec)
            ], [
                'name' => $spec,
                'is_active' => true,
                'deleted_at' => null,
            ]);
        }
    }
}
