<?php

use App\Models\Prompt;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

const X402_MARKETPLACE = '0x52739b3c73bfa5ed6d2d79ba438e94cd09d35415';
const X402_BUYER = '0x1111111111111111111111111111111111111111';
const X402_SELLER = '0x2222222222222222222222222222222222222222';
const X402_EVENT_TOPIC = '0x0a266a787da51d05458e31e30f069b6df3c2db67ac445b7c781793fe6965ab56';

beforeEach(function () {
    config()->set('0g.marketplace_contract_address', X402_MARKETPLACE);
    config()->set('0g.rpc_url', 'https://rpc.test');
});

function x402User(string $address): User
{
    return User::factory()->create([
        'wallet_address' => strtolower($address),
        'email' => Str::uuid() . '@example.test',
    ]);
}

function x402Prompt(User $creator, int $contractId = 7, string $price = '0.005'): Prompt
{
    return Prompt::create([
        'id' => (string) Str::uuid(),
        'user_id' => $creator->id,
        'title' => 'Premium Prompt',
        'description' => 'Premium gated prompt',
        'price_0g' => $price,
        'preview_image_url' => 'https://example.test/preview.png',
        'cid_ipfs' => 'ipfs://prompt',
        'content_type' => 'TEXT',
        'license_type' => 'COMMERCIAL',
        'is_published' => true,
        'contract_id' => $contractId,
        'original_content' => 'secret prompt content',
        'currency' => '0G',
    ]);
}

function x402TopicUint(int $value): string
{
    return '0x' . str_pad(dechex($value), 64, '0', STR_PAD_LEFT);
}

function x402TopicAddress(string $address): string
{
    return '0x' . str_pad(strtolower(substr($address, 2)), 64, '0', STR_PAD_LEFT);
}

function x402Receipt(int $tokenId = 7, string $buyer = X402_BUYER, string $priceHex = '11c37937e08000'): array
{
    return [
        'status' => '0x1',
        'to' => X402_MARKETPLACE,
        'from' => $buyer,
        'logs' => [
            [
                'address' => X402_MARKETPLACE,
                'topics' => [
                    X402_EVENT_TOPIC,
                    x402TopicUint($tokenId),
                    x402TopicAddress($buyer),
                    x402TopicAddress(X402_SELLER),
                ],
                'data' => '0x' . str_pad($priceHex, 64, '0', STR_PAD_LEFT),
            ],
        ],
    ];
}

test('prompt owner can access content without payment', function () {
    $creator = x402User(X402_SELLER);
    $prompt = x402Prompt($creator);
    Sanctum::actingAs($creator);

    $this->getJson("/api/prompts/{$prompt->id}/content")
        ->assertOk()
        ->assertJsonPath('original_content', 'secret prompt content');
});

test('valid x402 transaction unlocks only the matching prompt token', function () {
    $creator = x402User(X402_SELLER);
    $buyer = x402User(X402_BUYER);
    $prompt = x402Prompt($creator, 7);
    $txHash = '0x' . str_repeat('a', 64);

    Http::fake(['https://rpc.test' => Http::response(['result' => x402Receipt(7)], 200)]);
    Sanctum::actingAs($buyer);

    $this->withHeader('X-Payment', $txHash)
        ->getJson("/api/prompts/{$prompt->id}/content")
        ->assertOk()
        ->assertJsonPath('original_content', 'secret prompt content');

    expect(Transaction::where('tx_id', $txHash)->first())
        ->contract_token_id->toBe(7)
        ->amount_paid_wei->toBe('5000000000000000');
});

test('transaction for another prompt token is rejected', function () {
    $creator = x402User(X402_SELLER);
    $buyer = x402User(X402_BUYER);
    $prompt = x402Prompt($creator, 8);

    Http::fake(['https://rpc.test' => Http::response(['result' => x402Receipt(7)], 200)]);
    Sanctum::actingAs($buyer);

    $this->withHeader('X-Payment', '0x' . str_repeat('b', 64))
        ->getJson("/api/prompts/{$prompt->id}/content")
        ->assertStatus(402);
});

test('transaction from another buyer is rejected', function () {
    $creator = x402User(X402_SELLER);
    $buyer = x402User(X402_BUYER);
    $prompt = x402Prompt($creator, 7);

    Http::fake(['https://rpc.test' => Http::response([
        'result' => x402Receipt(7, '0x3333333333333333333333333333333333333333'),
    ], 200)]);
    Sanctum::actingAs($buyer);

    $this->withHeader('X-Payment', '0x' . str_repeat('c', 64))
        ->getJson("/api/prompts/{$prompt->id}/content")
        ->assertStatus(402);
});

test('underpaid purchase event is rejected', function () {
    $creator = x402User(X402_SELLER);
    $buyer = x402User(X402_BUYER);
    $prompt = x402Prompt($creator, 7, '0.005');

    Http::fake(['https://rpc.test' => Http::response([
        'result' => x402Receipt(7, X402_BUYER, '38d7ea4c68000'),
    ], 200)]);
    Sanctum::actingAs($buyer);

    $this->withHeader('X-Payment', '0x' . str_repeat('d', 64))
        ->getJson("/api/prompts/{$prompt->id}/content")
        ->assertStatus(402);
});

test('verify purchase cannot rebind an existing tx to another prompt', function () {
    $creator = x402User(X402_SELLER);
    $buyer = x402User(X402_BUYER);
    $firstPrompt = x402Prompt($creator, 7);
    $secondPrompt = x402Prompt($creator, 8);
    $txHash = '0x' . str_repeat('e', 64);

    Transaction::create([
        'tx_id' => $txHash,
        'buyer_address' => strtolower(X402_BUYER),
        'prompt_id' => $firstPrompt->id,
        'contract_token_id' => 7,
        'amount_paid' => $firstPrompt->price_0g,
        'amount_paid_wei' => '5000000000000000',
        'currency' => '0G',
    ]);

    Http::fake(['https://rpc.test' => Http::response(['result' => x402Receipt(8)], 200)]);
    Sanctum::actingAs($buyer);

    $this->postJson("/api/prompts/{$secondPrompt->id}/verify-purchase", ['tx_id' => $txHash])
        ->assertStatus(409);
});
