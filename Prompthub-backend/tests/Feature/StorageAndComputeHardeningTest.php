<?php

use App\Models\Prompt;
use App\Models\User;
use App\Services\ZeroGStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function scUser(): User
{
    return User::factory()->create([
        'email' => Str::uuid() . '@example.test',
        'wallet_address' => '0x' . str_repeat('1', 40),
    ]);
}

function scPrompt(User $creator): Prompt
{
    return Prompt::create([
        'id' => (string) Str::uuid(),
        'user_id' => $creator->id,
        'title' => 'Structured Prompt',
        'description' => "Generate a product shot.\nNegative prompt: blurry, unsafe.\nUse seed {seed}.",
        'price_0g' => '0.005',
        'preview_image_url' => 'https://example.test/preview.png',
        'cid_ipfs' => 'ipfs://metadata',
        'content_type' => 'TEXT',
        'license_type' => 'COMMERCIAL',
        'is_published' => true,
        'original_content' => "Create a premium product render with sections:\nSubject: {subject}\nLighting: softbox\nNegative prompt: blurry, unsafe",
        'currency' => '0G',
    ]);
}

function scDisableComputeKey(): void
{
    putenv('ZG_COMPUTE_API_KEY=');
    $_ENV['ZG_COMPUTE_API_KEY'] = '';
    $_SERVER['ZG_COMPUTE_API_KEY'] = '';
}

test('prompt scoring stores heuristic fallback when 0g compute key is absent', function () {
    scDisableComputeKey();
    $user = scUser();
    $prompt = scPrompt($user);
    Sanctum::actingAs($user);

    $this->postJson("/api/prompts/{$prompt->id}/score")
        ->assertOk()
        ->assertJsonPath('source', 'heuristic')
        ->assertJsonStructure(['overall', 'clarity', 'completeness', 'safety', 'reproducibility', 'innovation', 'reasoning']);

    expect($prompt->fresh()->ai_quality_score)
        ->toBeArray()
        ->and($prompt->fresh()->ai_quality_score['source'])->toBe('heuristic');
});

test('preview scoring endpoint returns a usable score before publish', function () {
    scDisableComputeKey();
    Sanctum::actingAs(scUser());

    $this->postJson('/api/prompts/preview-score', [
        'prompt_text' => "Subject: futuristic marketplace\nStyle: cinematic\nNegative prompt: blurry\nUse variable {product}",
    ])
        ->assertOk()
        ->assertJsonPath('source', 'heuristic')
        ->assertJsonStructure(['overall', 'clarity', 'completeness', 'safety', 'reproducibility', 'innovation']);
});

test('strict 0g storage upload fails instead of returning a local fallback hash', function () {
    Storage::fake('local');
    config()->set('0g.storage_node_url', null);
    config()->set('0g.storage_indexer_url', null);

    $file = UploadedFile::fake()->createWithContent('prompt.txt', 'prompt body');

    expect(fn () => app(ZeroGStorageService::class)->uploadStrict($file, 'content'))
        ->toThrow(RuntimeException::class, '0G Storage node/indexer is not configured.');
});

test('best effort storage upload still marks local fallback explicitly', function () {
    Storage::fake('local');
    config()->set('0g.storage_node_url', null);
    config()->set('0g.storage_indexer_url', null);

    $file = UploadedFile::fake()->createWithContent('attachment.zip', 'zip body');
    $result = app(ZeroGStorageService::class)->uploadBestEffort($file, 'attachment');

    expect($result['storage'])->toBe('local-with-hash')
        ->and($result['rootHash'])->toStartWith('0x')
        ->and($result['filename'])->toBe('attachment.zip');
});
