<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'wallet_address' => '0xSEEDER0000000000000000000000000000000001', 'roles' => ['brand', 'artist']]
        );

        Schema::disableForeignKeyConstraints();
        \App\Models\Prompt::truncate();
        \App\Models\AiModel::truncate();
        \App\Models\Category::truncate();
        \App\Models\Contest::truncate();
        Schema::enableForeignKeyConstraints();

        $this->call([
            CategorySeeder::class,
            AiModelSeeder::class,
            PromptSeeder::class,
            ContestSeeder::class,
        ]);
    }
}
