<?php

use App\Models\Contest;
use App\Models\HireRequest;
use App\Models\Prompt;
use App\Models\User;
use App\Services\AgentRegistryService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:sync-prompt-ids', function () {
    $missing = Prompt::whereNull('contract_id')
        ->orWhere('contract_id', 0)
        ->count();

    $this->info("Prompt on-chain ID audit complete. Missing contract_id: {$missing}");
})->purpose('Audit prompts that still need marketplace contract IDs');

Artisan::command('app:audit-storage-refs', function () {
    $total = Prompt::count();
    $missingCritical = Prompt::whereNull('text_package_root_hash')
        ->whereNull('prompt_txt_root_hash')
        ->count();
    $missingPreview = Prompt::whereNull('preview_root_hash')->count();
    $missingIpfs = Prompt::whereNull('ipfs_metadata_uri')
        ->whereNull('cid_ipfs')
        ->count();

    $this->info("Prompts audited: {$total}");
    $this->line("Missing critical 0G text refs: {$missingCritical}");
    $this->line("Missing 0G preview image refs: {$missingPreview}");
    $this->line("Missing Pinata/IPFS metadata refs: {$missingIpfs}");

    return $missingCritical > 0 ? 1 : 0;
})->purpose('Audit prompt 0G Storage and Pinata/IPFS references');

Artisan::command('app:audit-onchain-verification', function () {
    $hiresWithoutEscrow = HireRequest::whereIn('status', ['PENDING_FUNDING', 'PENDING'])
        ->whereNull('escrow_verified_at')
        ->count();
    $hiresWithoutCompletion = HireRequest::whereIn('status', ['IN_PROGRESS', 'ACCEPTED'])
        ->whereNull('completed_onchain_at')
        ->count();
    $contestsWithoutFunding = Contest::whereNull('funding_verified_at')->count();
    $contestsWithoutWinner = Contest::where('status', 'COMPLETED')
        ->whereNull('winner_verified_at')
        ->count();

    $this->info('On-chain verification audit complete.');
    $this->line("Hire requests awaiting escrow verification: {$hiresWithoutEscrow}");
    $this->line("Hire requests awaiting completion verification: {$hiresWithoutCompletion}");
    $this->line("Contests missing funding verification: {$contestsWithoutFunding}");
    $this->line("Completed contests missing winner verification: {$contestsWithoutWinner}");

    return ($hiresWithoutEscrow + $hiresWithoutCompletion + $contestsWithoutFunding + $contestsWithoutWinner) > 0 ? 1 : 0;
})->purpose('Audit pending on-chain verification gaps for hire and contest flows');

Artisan::command('app:sync-agent-cache', function () {
    $users = User::query()
        ->whereNotNull('wallet_address')
        ->where('wallet_address', 'like', '0x%')
        ->get();
    $synced = 0;
    $failed = 0;
    $service = app(AgentRegistryService::class);

    foreach ($users as $user) {
        try {
            $status = $service->fetchStatus((string) $user->wallet_address);
            $user->forceFill([
                'agent_registered' => $status['registered'],
                'agent_verified' => $status['verified'],
                'agent_metadata_uri' => $status['metadataUri'],
                'agent_avg_rating' => $status['avgRating'],
                'agent_completed_jobs' => $status['completedJobs'],
                'agent_total_reviews' => $status['totalReviews'],
                'agent_synced_at' => now(),
            ])->save();
            $synced++;
        } catch (Throwable $e) {
            $failed++;
            $this->warn("Agent sync failed for {$user->wallet_address}: {$e->getMessage()}");
        }
    }

    $this->info("Agent cache sync complete. Synced: {$synced}. Failed: {$failed}.");

    return $failed > 0 ? 1 : 0;
})->purpose('Sync cached Agent ID verification and reputation data from chain');

Schedule::command('app:sync-prompt-ids')->everyMinute();
