<?php

use App\Services\OnChainVerificationService;
use Illuminate\Support\Facades\Http;

const OC_RPC = 'https://rpc.verify.test';
const OC_ESCROW = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OC_CONTESTS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const OC_CLIENT = '0x1111111111111111111111111111111111111111';
const OC_ARTIST = '0x2222222222222222222222222222222222222222';
const OC_BRAND = '0x3333333333333333333333333333333333333333';
const OC_TX = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OC_JOB_CREATED_TOPIC = '0x8f4ee83cefe0dfb2f73fe6057bfa5b233fc43358bbb5f5606f444cbd4c5c4f8c';
const OC_JOB_COMPLETED_TOPIC = '0x4dbba472101e9f148a3a5ecbe793f0ee16a7efe4bf3f8cbfab5330e1642ef955';
const OC_CONTEST_FUNDED_TOPIC = '0x8280ff1879c6ac2c53ba231886d678c2ea3004dacf8236df357e456aedbaf47b';
const OC_WINNER_DECLARED_TOPIC = '0xddb6d9af7d3cc0b9e91ff116672c006a4a0cc4082a426e8d3c1593b11e22a1d2';

beforeEach(function () {
    config()->set('0g.rpc_url', OC_RPC);
    config()->set('0g.escrow_contract_address', OC_ESCROW);
    config()->set('0g.contests_contract_address', OC_CONTESTS);
});

function ocTopicUint(int|string $value): string
{
    return '0x' . str_pad(dechex((int) $value), 64, '0', STR_PAD_LEFT);
}

function ocTopicAddress(string $address): string
{
    return '0x' . str_pad(strtolower(substr($address, 2)), 64, '0', STR_PAD_LEFT);
}

function ocDataWord(int|string $value): string
{
    return str_pad(dechex((int) $value), 64, '0', STR_PAD_LEFT);
}

function ocReceipt(string $contract, string $topic, array $topics, string $data): array
{
    return [
        'status' => '0x1',
        'logs' => [[
            'address' => $contract,
            'topics' => [$topic, ...$topics],
            'data' => '0x' . $data,
        ]],
    ];
}

function ocFakeRpc(array $receipt, string $txTo): void
{
    Http::fake([
        OC_RPC => function ($request) use ($receipt, $txTo) {
            $payload = $request->data();
            $result = match ($payload['method'] ?? null) {
                'eth_getTransactionReceipt' => $receipt,
                'eth_getTransactionByHash' => ['to' => $txTo],
                default => null,
            };

            return Http::response(['jsonrpc' => '2.0', 'id' => 1, 'result' => $result], 200);
        },
    ]);
}

test('escrow job created verifier accepts matching event from configured contract', function () {
    ocFakeRpc(
        ocReceipt(
            OC_ESCROW,
            OC_JOB_CREATED_TOPIC,
            [ocTopicUint(7), ocTopicAddress(OC_CLIENT), ocTopicAddress(OC_ARTIST)],
            ocDataWord('5000000000000000')
        ),
        OC_ESCROW
    );

    $result = app(OnChainVerificationService::class)
        ->verifyEscrowJobCreated(OC_TX, OC_CLIENT, OC_ARTIST, '0.005');

    expect($result['valid'])->toBeTrue()
        ->and($result['jobId'])->toBe('7')
        ->and($result['amountWei'])->toBe('5000000000000000');
});

test('escrow job created verifier rejects amount mismatch', function () {
    ocFakeRpc(
        ocReceipt(
            OC_ESCROW,
            OC_JOB_CREATED_TOPIC,
            [ocTopicUint(7), ocTopicAddress(OC_CLIENT), ocTopicAddress(OC_ARTIST)],
            ocDataWord('4000000000000000')
        ),
        OC_ESCROW
    );

    $result = app(OnChainVerificationService::class)
        ->verifyEscrowJobCreated(OC_TX, OC_CLIENT, OC_ARTIST, '0.005');

    expect($result['valid'])->toBeFalse()
        ->and($result['reason'])->toBe('amount_mismatch');
});

test('verifier rejects transaction sent to another contract', function () {
    ocFakeRpc(
        ocReceipt(
            OC_ESCROW,
            OC_JOB_CREATED_TOPIC,
            [ocTopicUint(7), ocTopicAddress(OC_CLIENT), ocTopicAddress(OC_ARTIST)],
            ocDataWord('5000000000000000')
        ),
        OC_CONTESTS
    );

    $result = app(OnChainVerificationService::class)
        ->verifyEscrowJobCreated(OC_TX, OC_CLIENT, OC_ARTIST, '0.005');

    expect($result['valid'])->toBeFalse()
        ->and($result['reason'])->toBe('contract_mismatch');
});

test('job completed verifier accepts matching event', function () {
    ocFakeRpc(
        ocReceipt(
            OC_ESCROW,
            OC_JOB_COMPLETED_TOPIC,
            [ocTopicUint(7), ocTopicAddress(OC_ARTIST)],
            ocDataWord('4875000000000000')
        ),
        OC_ESCROW
    );

    $result = app(OnChainVerificationService::class)
        ->verifyJobCompleted(OC_TX, 7, OC_ARTIST);

    expect($result['valid'])->toBeTrue()
        ->and($result['jobId'])->toBe('7')
        ->and($result['artist'])->toBe(strtolower(OC_ARTIST));
});

test('contest funded verifier accepts pool and tier count from event data', function () {
    ocFakeRpc(
        ocReceipt(
            OC_CONTESTS,
            OC_CONTEST_FUNDED_TOPIC,
            [ocTopicUint(9), ocTopicAddress(OC_BRAND)],
            ocDataWord('10000000000000000') . ocDataWord(2)
        ),
        OC_CONTESTS
    );

    $result = app(OnChainVerificationService::class)
        ->verifyContestFunded(OC_TX, OC_BRAND, '0.01', 2);

    expect($result['valid'])->toBeTrue()
        ->and($result['contestId'])->toBe('9')
        ->and($result['numTiers'])->toBe(2);
});

test('winner declared verifier accepts contest id winner and place', function () {
    ocFakeRpc(
        ocReceipt(
            OC_CONTESTS,
            OC_WINNER_DECLARED_TOPIC,
            [ocTopicUint(9), ocTopicAddress(OC_ARTIST)],
            ocDataWord(1) . ocDataWord('9750000000000000')
        ),
        OC_CONTESTS
    );

    $result = app(OnChainVerificationService::class)
        ->verifyWinnerDeclared(OC_TX, 9, OC_ARTIST, 1);

    expect($result['valid'])->toBeTrue()
        ->and($result['contestId'])->toBe('9')
        ->and($result['winner'])->toBe(strtolower(OC_ARTIST));
});
