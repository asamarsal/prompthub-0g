<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
            'Social Media Pack'
        ];

        foreach ($specs as $spec) {
            \App\Models\Specialization::firstOrCreate([
                'slug' => \Illuminate\Support\Str::slug($spec)
            ], [
                'name' => $spec
            ]);
        }
    }
}
