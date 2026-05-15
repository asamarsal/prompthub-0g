<?php

namespace App\Services;

use App\Events\NotificationSent;
use App\Models\Notification;
use App\Models\Prompt;
use App\Models\Transaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class X402PaymentVerifier
{
    private const PROMPT_PURCHASED_TOPIC = '0x0a266a787da51d05458e31e30f069b6df3c2db67ac445b7c781793fe6965ab56';

    public function verifyPromptPurchase(Prompt $prompt, string $txId, ?string $expectedBuyer = null): array
    {
        $txHash = $this->normalizeTxHash($txId);
        if (!$txHash) {
            return $this->invalid('invalid_tx_hash');
        }

        if (!$prompt->contract_id) {
            return $this->invalid('prompt_not_listed_onchain', ['txHash' => $txHash]);
        }

        $marketplaceAddress = $this->normalizeAddress((string) config('0g.marketplace_contract_address'));
        if (!$marketplaceAddress) {
            return $this->invalid('marketplace_not_configured', ['txHash' => $txHash]);
        }

        $expectedBuyer = $expectedBuyer ? $this->normalizeAddress($expectedBuyer) : null;
        if ($expectedBuyer === null && func_num_args() >= 3) {
            return $this->invalid('invalid_expected_buyer', ['txHash' => $txHash]);
        }

        $receipt = $this->fetchReceipt($txHash);
        if (!$receipt) {
            return $this->invalid('receipt_not_found', ['txHash' => $txHash]);
        }

        if (($receipt['status'] ?? null) !== '0x1') {
            return $this->invalid('transaction_failed', ['txHash' => $txHash]);
        }

        $txTo = $this->normalizeAddress((string) ($receipt['to'] ?? ''));
        if ($txTo && $txTo !== $marketplaceAddress) {
            return $this->invalid('transaction_target_mismatch', ['txHash' => $txHash]);
        }

        $event = $this->findPromptPurchasedEvent($receipt, $marketplaceAddress);
        if (!$event) {
            return $this->invalid('prompt_purchased_event_missing', ['txHash' => $txHash]);
        }

        $expectedTokenId = (string) (int) $prompt->contract_id;
        if ($event['tokenId'] !== $expectedTokenId) {
            return $this->invalid('token_id_mismatch', [
                'txHash' => $txHash,
                'tokenId' => $event['tokenId'],
                'expectedTokenId' => $expectedTokenId,
            ]);
        }

        if ($expectedBuyer && $event['buyer'] !== $expectedBuyer) {
            return $this->invalid('buyer_mismatch', [
                'txHash' => $txHash,
                'buyer' => $event['buyer'],
                'expectedBuyer' => $expectedBuyer,
            ]);
        }

        $requiredWei = $this->toWeiString((string) $prompt->price_0g);
        if ($this->compareDecimalStrings($event['priceWei'], $requiredWei) < 0) {
            return $this->invalid('payment_amount_too_low', [
                'txHash' => $txHash,
                'priceWei' => $event['priceWei'],
                'requiredWei' => $requiredWei,
            ]);
        }

        return [
            'valid' => true,
            'txHash' => $txHash,
            'buyer' => $event['buyer'],
            'seller' => $event['seller'],
            'tokenId' => $event['tokenId'],
            'priceWei' => $event['priceWei'],
            'requiredWei' => $requiredWei,
            'promptId' => $prompt->id,
        ];
    }

    public function recordPurchase(Prompt $prompt, array $verification, string $source): array
    {
        if (!($verification['valid'] ?? false)) {
            return $this->invalid($verification['reason'] ?? 'invalid_verification');
        }

        $existing = Transaction::where('tx_id', $verification['txHash'])->first();
        if ($existing) {
            $samePrompt = (string) $existing->prompt_id === (string) $prompt->id;
            $sameBuyer = $this->normalizeAddress((string) $existing->buyer_address) === $verification['buyer'];
            $sameToken = !$existing->contract_token_id || (string) $existing->contract_token_id === (string) $verification['tokenId'];

            if (!$samePrompt || !$sameBuyer || !$sameToken) {
                return $this->invalid('transaction_already_bound_to_different_purchase', [
                    'txHash' => $verification['txHash'],
                ]);
            }

            return ['valid' => true, 'transaction' => $existing, 'reused' => true];
        }

        $transaction = Transaction::create([
            'tx_id' => $verification['txHash'],
            'buyer_address' => $verification['buyer'],
            'prompt_id' => $prompt->id,
            'amount_paid' => $prompt->price_0g,
            'currency' => $prompt->currency ?? '0G',
            'contract_token_id' => $verification['tokenId'],
            'seller_address' => $verification['seller'],
            'amount_paid_wei' => $verification['priceWei'],
            'verified_at' => now(),
            'verification_source' => $source,
        ]);

        $prompt->increment('total_sold');
        $this->notifySeller($prompt, $transaction);

        return ['valid' => true, 'transaction' => $transaction, 'reused' => false];
    }

    private function notifySeller(Prompt $prompt, Transaction $transaction): void
    {
        try {
            $prompt->loadMissing('user');

            $sellerAddress = $this->normalizeAddress((string) ($prompt->user?->wallet_address ?? $transaction->seller_address ?? ''));
            $buyerAddress = $this->normalizeAddress((string) $transaction->buyer_address);

            if (!$sellerAddress || $sellerAddress === $buyerAddress) {
                return;
            }

            $notification = Notification::create([
                'user_address' => $sellerAddress,
                'type' => 'purchase',
                'data' => [
                    'title' => 'New Sale!',
                    'message' => 'Someone purchased "' . $prompt->title . '" for ' . $transaction->amount_paid . ' ' . ($transaction->currency ?? '0G') . '.',
                    'link' => '/dashboard',
                    'prompt_id' => (string) $prompt->id,
                    'prompt_title' => $prompt->title,
                    'buyer_address' => $buyerAddress,
                    'tx_id' => $transaction->tx_id,
                    'amount_paid' => (string) $transaction->amount_paid,
                    'currency' => $transaction->currency ?? '0G',
                ],
            ]);

            broadcast(new NotificationSent($notification));
        } catch (\Throwable $e) {
            Log::warning('Purchase notification failed: ' . $e->getMessage(), [
                'prompt_id' => $prompt->id,
                'tx_id' => $transaction->tx_id,
            ]);
        }
    }

    public function normalizeTxHash(string $txId): ?string
    {
        $txId = trim($txId);
        if (!str_starts_with($txId, '0x')) {
            $txId = '0x' . $txId;
        }

        return preg_match('/^0x[a-fA-F0-9]{64}$/', $txId) ? strtolower($txId) : null;
    }

    public function normalizeAddress(string $address): ?string
    {
        $address = strtolower(trim($address));

        return preg_match('/^0x[a-f0-9]{40}$/', $address) ? $address : null;
    }

    public function toWeiString(string $amount): string
    {
        $normalized = trim($amount);
        if ($normalized === '') {
            return '0';
        }

        if (!str_contains($normalized, '.')) {
            return ltrim($normalized, '0') === '' ? '0' : ltrim($normalized, '0') . '000000000000000000';
        }

        [$int, $dec] = explode('.', $normalized, 2);
        $int = ltrim($int === '' ? '0' : $int, '0');
        $dec = substr(str_pad(preg_replace('/\D/', '', $dec), 18, '0'), 0, 18);
        $wei = ($int === '' ? '0' : $int) . $dec;

        return ltrim($wei, '0') === '' ? '0' : ltrim($wei, '0');
    }

    private function fetchReceipt(string $txHash): ?array
    {
        $response = Http::timeout(15)->post(config('0g.rpc_url'), [
            'jsonrpc' => '2.0',
            'method' => 'eth_getTransactionReceipt',
            'params' => [$txHash],
            'id' => 1,
        ]);

        if (!$response->successful()) {
            return null;
        }

        return $response->json('result');
    }

    private function findPromptPurchasedEvent(array $receipt, string $marketplaceAddress): ?array
    {
        foreach (($receipt['logs'] ?? []) as $log) {
            $logAddress = $this->normalizeAddress((string) ($log['address'] ?? ''));
            $topics = $log['topics'] ?? [];

            if ($logAddress !== $marketplaceAddress || count($topics) < 4) {
                continue;
            }

            if (strtolower((string) $topics[0]) !== self::PROMPT_PURCHASED_TOPIC) {
                continue;
            }

            $buyer = $this->topicToAddress((string) $topics[2]);
            $seller = $this->topicToAddress((string) $topics[3]);
            if (!$buyer || !$seller) {
                continue;
            }

            return [
                'tokenId' => $this->hexToDecimalString((string) $topics[1]),
                'buyer' => $buyer,
                'seller' => $seller,
                'priceWei' => $this->hexToDecimalString((string) ($log['data'] ?? '0x0')),
            ];
        }

        return null;
    }

    private function topicToAddress(string $topic): ?string
    {
        $hex = strtolower(preg_replace('/^0x/', '', trim($topic)));
        if (!preg_match('/^[a-f0-9]{64}$/', $hex)) {
            return null;
        }

        return $this->normalizeAddress('0x' . substr($hex, -40));
    }

    private function hexToDecimalString(string $hex): string
    {
        $hex = strtolower(preg_replace('/^0x/', '', trim($hex)));
        $hex = ltrim($hex, '0');
        if ($hex === '') {
            return '0';
        }

        $decimal = '0';
        foreach (str_split($hex) as $char) {
            $decimal = $this->decimalMultiplySmall($decimal, 16);
            $decimal = $this->decimalAddSmall($decimal, hexdec($char));
        }

        return $decimal;
    }

    private function compareDecimalStrings(string $left, string $right): int
    {
        $left = ltrim($left, '0') ?: '0';
        $right = ltrim($right, '0') ?: '0';

        if (strlen($left) !== strlen($right)) {
            return strlen($left) < strlen($right) ? -1 : 1;
        }

        return $left <=> $right;
    }

    private function decimalMultiplySmall(string $decimal, int $multiplier): string
    {
        $carry = 0;
        $result = '';

        for ($i = strlen($decimal) - 1; $i >= 0; $i--) {
            $product = ((int) $decimal[$i] * $multiplier) + $carry;
            $result = (string) ($product % 10) . $result;
            $carry = intdiv($product, 10);
        }

        while ($carry > 0) {
            $result = (string) ($carry % 10) . $result;
            $carry = intdiv($carry, 10);
        }

        return ltrim($result, '0') ?: '0';
    }

    private function decimalAddSmall(string $decimal, int $addend): string
    {
        $carry = $addend;
        $result = '';

        for ($i = strlen($decimal) - 1; $i >= 0; $i--) {
            $sum = ((int) $decimal[$i]) + $carry;
            $result = (string) ($sum % 10) . $result;
            $carry = intdiv($sum, 10);
        }

        while ($carry > 0) {
            $result = (string) ($carry % 10) . $result;
            $carry = intdiv($carry, 10);
        }

        return ltrim($result, '0') ?: '0';
    }

    private function invalid(string $reason, array $extra = []): array
    {
        return ['valid' => false, 'reason' => $reason] + $extra;
    }
}
