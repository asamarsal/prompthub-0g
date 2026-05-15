<?php

use App\Models\Prompt;
use App\Models\User;
use App\Services\PromptContentProtectionService;
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

test('compute health endpoint reports configured model without leaking secrets', function () {
    scDisableComputeKey();
    Sanctum::actingAs(scUser());

    $this->getJson('/api/compute/health')
        ->assertOk()
        ->assertJsonPath('configured', false)
        ->assertJsonPath('model', '0GM-1.0-35B-A3B')
        ->assertJsonPath('fallback_model', 'deepseek/deepseek-chat-v3-0324')
        ->assertJsonMissing(['api_key'])
        ->assertJsonMissing(['ZG_COMPUTE_API_KEY']);
});

test('compute health endpoint rejects legacy non app sk keys before live request', function () {
    putenv('ZG_COMPUTE_API_KEY=sk-legacy');
    $_ENV['ZG_COMPUTE_API_KEY'] = 'sk-legacy';
    $_SERVER['ZG_COMPUTE_API_KEY'] = 'sk-legacy';
    Sanctum::actingAs(scUser());

    $this->getJson('/api/compute/health')
        ->assertStatus(422)
        ->assertJsonPath('source', 'config-validation')
        ->assertJsonPath('reason', 'ZG_COMPUTE_API_KEY must be a provider app-sk token for the /v1/proxy endpoint')
        ->assertJsonMissing(['sk-legacy']);
});

test('0g compute base url uses proxy surface', function () {
    expect(str_ends_with(config('0g.compute_base_url'), '/v1/proxy'))->toBeTrue();
});

test('prompt creation encrypts premium content and client storage key at rest', function () {
    scDisableComputeKey();
    $user = scUser();
    Sanctum::actingAs($user);

    $secretPrompt = 'ULTRA SECRET PROMPT: use exact seed 12345 and hidden style modifiers.';
    $response = $this->postJson('/api/prompts', [
        'title' => 'Encrypted Prompt',
        'description' => 'A protected prompt listing.',
        'price_0g' => 0.01,
        'preview_image_url' => 'https://example.test/preview.png',
        'cid_ipfs' => 'ipfs://metadata',
        'content_type' => 'TEXT',
        'license_type' => 'COMMERCIAL',
        'currency' => '0G',
        'contract_id' => 123,
        'og_tx_id' => '0x' . str_repeat('e', 64),
        'root_hash' => '0x' . str_repeat('a', 64),
        'prompt_txt_root_hash' => '0x' . str_repeat('b', 64),
        'preview_root_hash' => '0x' . str_repeat('c', 64),
        'text_package_root_hash' => '0x' . str_repeat('d', 64),
        'storage_status' => 'uploaded',
        'storage_manifest' => [
            'encryption' => [
                'scheme' => 'AES-256-GCM',
                'encrypted_roles' => ['prompt_txt', 'text_package'],
            ],
        ],
        'content_encryption' => [
            'scheme' => 'AES-256-GCM',
            'key_id' => (string) Str::uuid(),
            'key_b64' => base64_encode(random_bytes(32)),
            'encrypted_roles' => ['prompt_txt', 'text_package'],
        ],
        'original_content' => $secretPrompt,
    ]);

    $response->assertCreated()
        ->assertJsonMissing(['original_content' => $secretPrompt])
        ->assertJsonMissing(['encrypted_original_content']);

    $prompt = Prompt::findOrFail($response->json('id'));

    expect($prompt->original_content)->toBeNull()
        ->and($prompt->encrypted_original_content)->not->toBeNull()
        ->and($prompt->encrypted_original_content)->not->toContain($secretPrompt)
        ->and($prompt->contract_id)->toBe(123)
        ->and($prompt->og_tx_id)->toBe('0x' . str_repeat('e', 64))
        ->and($prompt->content_encryption_payload['key_ciphertext'] ?? null)->not->toBeNull()
        ->and($prompt->content_encryption_payload['key_ciphertext'])->not->toBe($response->json('content_encryption.key_b64'))
        ->and(app(PromptContentProtectionService::class)->decryptContent($prompt))->toBe($secretPrompt);
});

test('owner can record on-chain listing for a storage-only prompt', function () {
    $user = scUser();
    $prompt = scPrompt($user);
    Sanctum::actingAs($user);

    $txHash = '0x' . str_repeat('a', 64);
    $rootHash = '0x' . str_repeat('b', 64);
    $metadataUri = 'ipfs://QmListingMetadata';

    $this->postJson("/api/prompts/{$prompt->id}/onchain-listing", [
        'contract_id' => 77,
        'og_tx_id' => $txHash,
        'root_hash' => $rootHash,
        'ipfs_metadata_uri' => $metadataUri,
    ])
        ->assertOk()
        ->assertJsonPath('prompt.contract_id', 77)
        ->assertJsonPath('prompt.is_published', true)
        ->assertJsonPath('prompt.og_tx_id', $txHash)
        ->assertJsonPath('prompt.root_hash', $rootHash)
        ->assertJsonPath('prompt.ipfs_metadata_uri', $metadataUri)
        ->assertJsonPath('prompt.storage_status', 'uploaded');

    $this->assertDatabaseHas('prompts', [
        'id' => $prompt->id,
        'contract_id' => 77,
        'is_published' => true,
        'og_tx_id' => $txHash,
        'root_hash' => $rootHash,
    ]);
});

test('non owner cannot record on-chain listing', function () {
    $owner = scUser();
    $prompt = scPrompt($owner);
    $other = User::factory()->create([
        'email' => Str::uuid() . '@example.test',
        'wallet_address' => '0x' . str_repeat('2', 40),
    ]);
    Sanctum::actingAs($other);

    $this->postJson("/api/prompts/{$prompt->id}/onchain-listing", [
        'contract_id' => 78,
        'og_tx_id' => '0x' . str_repeat('c', 64),
    ])->assertForbidden();

    expect($prompt->fresh()->contract_id)->toBeNull();
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
