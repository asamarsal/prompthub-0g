<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Prompt;

class PromptContractIdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Assigns sequential contract_ids to existing prompts for testing real smart contract calls.
     */
    public function run(): void
    {
        $prompts = Prompt::all();
        $counter = 1;

        foreach ($prompts as $prompt) {
            $prompt->update(['contract_id' => $counter++]);
        }

        $this->command->info("Assigned contract_ids to " . count($prompts) . " prompts.");
    }
}
