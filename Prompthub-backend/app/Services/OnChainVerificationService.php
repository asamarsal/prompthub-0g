<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OnChainVerificationService
{
    private const JOB_CREATED_TOPIC = '0x8f4ee83cefe0dfb2f73fe6057bfa5b233fc43358bbb5f5606f444cbd4c5c4f8c';
    private const JOB_COMPLETED_TOPIC = '0x4dbba472101e9f148a3a5ecbe793f0ee16a7efe4bf3f8cbfab5330e1642ef955';
    private const CONTEST_FUNDED_TOPIC = '0x8280ff1879c6ac2c53ba231886d678c2ea3004dacf8236df357e456aedbaf47b';
    private const WINNER_DECLARED_TOPIC = '0xddb6d9af7d3cc0b9e91ff116672c006a4a0cc4082a426e8d3c1593b11e22a1d2';

    public function verifyEscrowJobCreated(string $txHash, string $expectedClient, string $expectedArtist, string|float|null $expectedAmount0g): array
    {
        return $this->verifyEvent(
            $txHash,
            config('0g.escrow_contract_address'),
            self::JOB_CREATED_TOPIC,
            function (array $log) use ($expectedClient, $expectedArtist, $expectedAmount0g) {
                $event = [
                    'jobId' => $this->hexToDecimalString($log['topics'][1] ?? '0x0'),
                    'client' => $this->addressFromTopic($log['topics'][2] ?? ''),
                    'artist' => $this->addressFromTopic($log['topics'][3] ?? ''),
                    'amountWei' => $this->dataWordToDecimal($log['data'] ?? '0x', 0),
                ];

                if ($this->normalizeAddress($expectedClient) !== $event['client']) {
                    return ['valid' => false, 'reason' => 'client_mismatch', 'event' => $event];
                }
                if ($this->normalizeAddress($expectedArtist) !== $event['artist']) {
                    return ['valid' => false, 'reason' => 'artist_mismatch', 'event' => $event];
                }

                $expectedWei = $this->decimalToWeiString($expectedAmount0g);
                if ($expectedWei !== null && $this->normalizeDecimalString($expectedWei) !== $this->normalizeDecimalString($event['amountWei'])) {
                    return ['valid' => false, 'reason' => 'amount_mismatch', 'event' => $event, 'expectedAmountWei' => $expectedWei];
                }

                return ['valid' => true, ...$event];
            }
        );
    }

    public function verifyJobCompleted(string $txHash, string|int $expectedJobId, string $expectedArtist): array
    {
        return $this->verifyEvent(
            $txHash,
            config('0g.escrow_contract_address'),
            self::JOB_COMPLETED_TOPIC,
            function (array $log) use ($expectedJobId, $expectedArtist) {
                $event = [
                    'jobId' => $this->hexToDecimalString($log['topics'][1] ?? '0x0'),
                    'artist' => $this->addressFromTopic($log['topics'][2] ?? ''),
                    'payoutWei' => $this->dataWordToDecimal($log['data'] ?? '0x', 0),
                ];

                if ($this->normalizeDecimalString((string) $expectedJobId) !== $this->normalizeDecimalString($event['jobId'])) {
                    return ['valid' => false, 'reason' => 'job_id_mismatch', 'event' => $event];
                }
                if ($this->normalizeAddress($expectedArtist) !== $event['artist']) {
                    return ['valid' => false, 'reason' => 'artist_mismatch', 'event' => $event];
                }

                return ['valid' => true, ...$event];
            }
        );
    }

    public function verifyContestFunded(string $txHash, string $expectedBrand, string|float|null $expectedTotal0g, int $expectedNumTiers): array
    {
        return $this->verifyEvent(
            $txHash,
            config('0g.contests_contract_address'),
            self::CONTEST_FUNDED_TOPIC,
            function (array $log) use ($expectedBrand, $expectedTotal0g, $expectedNumTiers) {
                $event = [
                    'contestId' => $this->hexToDecimalString($log['topics'][1] ?? '0x0'),
                    'brand' => $this->addressFromTopic($log['topics'][2] ?? ''),
                    'totalPoolWei' => $this->dataWordToDecimal($log['data'] ?? '0x', 0),
                    'numTiers' => (int) $this->dataWordToDecimal($log['data'] ?? '0x', 1),
                ];

                if ($this->normalizeAddress($expectedBrand) !== $event['brand']) {
                    return ['valid' => false, 'reason' => 'brand_mismatch', 'event' => $event];
                }

                $expectedWei = $this->decimalToWeiString($expectedTotal0g);
                if ($expectedWei !== null && $this->normalizeDecimalString($expectedWei) !== $this->normalizeDecimalString($event['totalPoolWei'])) {
                    return ['valid' => false, 'reason' => 'total_pool_mismatch', 'event' => $event, 'expectedTotalPoolWei' => $expectedWei];
                }
                if ($expectedNumTiers > 0 && $expectedNumTiers !== $event['numTiers']) {
                    return ['valid' => false, 'reason' => 'tier_count_mismatch', 'event' => $event, 'expectedNumTiers' => $expectedNumTiers];
                }

                return ['valid' => true, ...$event];
            }
        );
    }

    public function verifyWinnerDeclared(string $txHash, string|int $expectedContestId, string $expectedWinner, int $expectedPlace): array
    {
        return $this->verifyEvent(
            $txHash,
            config('0g.contests_contract_address'),
            self::WINNER_DECLARED_TOPIC,
            function (array $log) use ($expectedContestId, $expectedWinner, $expectedPlace) {
                $event = [
                    'contestId' => $this->hexToDecimalString($log['topics'][1] ?? '0x0'),
                    'winner' => $this->addressFromTopic($log['topics'][2] ?? ''),
                    'place' => (int) $this->dataWordToDecimal($log['data'] ?? '0x', 0),
                    'payoutWei' => $this->dataWordToDecimal($log['data'] ?? '0x', 1),
                ];

                if ($this->normalizeDecimalString((string) $expectedContestId) !== $this->normalizeDecimalString($event['contestId'])) {
                    return ['valid' => false, 'reason' => 'contest_id_mismatch', 'event' => $event];
                }
                if ($this->normalizeAddress($expectedWinner) !== $event['winner']) {
                    return ['valid' => false, 'reason' => 'winner_mismatch', 'event' => $event];
                }
                if ($expectedPlace !== $event['place']) {
                    return ['valid' => false, 'reason' => 'place_mismatch', 'event' => $event];
                }

                return ['valid' => true, ...$event];
            }
        );
    }

    private function verifyEvent(string $txHash, ?string $expectedContract, string $topic, callable $decode): array
    {
        $txHash = $this->normalizeTxHash($txHash);
        if (!$txHash) {
            return ['valid' => false, 'reason' => 'invalid_tx_hash'];
        }

        $expectedContract = $this->normalizeAddress((string) $expectedContract);
        if (!$expectedContract) {
            return ['valid' => false, 'reason' => 'contract_not_configured'];
        }

        $receipt = $this->rpc('eth_getTransactionReceipt', [$txHash]);
        if (!$receipt) {
            return ['valid' => false, 'reason' => 'receipt_not_found'];
        }
        if (($receipt['status'] ?? null) !== '0x1') {
            return ['valid' => false, 'reason' => 'tx_failed'];
        }

        $tx = $this->rpc('eth_getTransactionByHash', [$txHash]);
        $txTo = $this->normalizeAddress((string) ($tx['to'] ?? ''));
        if ($txTo !== $expectedContract) {
            return ['valid' => false, 'reason' => 'contract_mismatch', 'to' => $txTo, 'expected' => $expectedContract];
        }

        foreach (($receipt['logs'] ?? []) as $log) {
            $logAddress = $this->normalizeAddress((string) ($log['address'] ?? ''));
            $topics = array_map('strtolower', $log['topics'] ?? []);
            if ($logAddress !== $expectedContract || strtolower($topics[0] ?? '') !== strtolower($topic)) {
                continue;
            }

            $result = $decode($log);
            if ($result['valid'] ?? false) {
                return [
                    ...$result,
                    'txHash' => $txHash,
                    'contractAddress' => $expectedContract,
                ];
            }

            return $result;
        }

        return ['valid' => false, 'reason' => 'event_not_found'];
    }

    private function rpc(string $method, array $params): mixed
    {
        $response = Http::timeout(15)->post(config('0g.rpc_url'), [
            'jsonrpc' => '2.0',
            'method' => $method,
            'params' => $params,
            'id' => 1,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException("RPC request failed for {$method}");
        }

        return $response->json('result');
    }

    private function normalizeTxHash(string $txHash): ?string
    {
        $txHash = strtolower(trim($txHash));
        if (!str_starts_with($txHash, '0x')) {
            $txHash = '0x' . $txHash;
        }

        return preg_match('/^0x[a-f0-9]{64}$/', $txHash) ? $txHash : null;
    }

    private function normalizeAddress(string $address): ?string
    {
        $address = strtolower(trim($address));
        return preg_match('/^0x[a-f0-9]{40}$/', $address) ? $address : null;
    }

    private function addressFromTopic(string $topic): ?string
    {
        $topic = strtolower($this->stripHexPrefix($topic));
        if (strlen($topic) !== 64) {
            return null;
        }

        return '0x' . substr($topic, 24);
    }

    private function dataWordToDecimal(string $data, int $index): string
    {
        $hex = strtolower($this->stripHexPrefix($data));
        $word = substr($hex, $index * 64, 64);
        if (!$word) {
            return '0';
        }

        return $this->hexToDecimalString('0x' . $word);
    }

    private function hexToDecimalString(string $hex): string
    {
        $hex = strtolower($this->stripHexPrefix($hex));
        if ($hex === '' || preg_match('/^0+$/', $hex)) {
            return '0';
        }

        $dec = '0';
        foreach (str_split($hex) as $char) {
            $dec = $this->decimalMultiply($dec, 16);
            $dec = $this->decimalAdd($dec, (string) hexdec($char));
        }

        return $this->normalizeDecimalString($dec);
    }

    private function stripHexPrefix(string $value): string
    {
        return str_starts_with(strtolower($value), '0x') ? substr($value, 2) : $value;
    }

    public function decimalToWeiString(string|float|null $amount): ?string
    {
        if ($amount === null || $amount === '') {
            return null;
        }

        $value = trim((string) $amount);
        if ($value === '') {
            return null;
        }

        if (str_contains(strtolower($value), 'e')) {
            $value = rtrim(rtrim(sprintf('%.18F', (float) $amount), '0'), '.');
        }

        [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');
        $whole = preg_replace('/[^0-9]/', '', $whole) ?: '0';
        $fraction = substr(preg_replace('/[^0-9]/', '', $fraction), 0, 18);
        $fraction = str_pad($fraction, 18, '0');

        return $this->normalizeDecimalString($whole . $fraction);
    }

    private function normalizeDecimalString(string $value): string
    {
        $value = ltrim($value, '0');
        return $value === '' ? '0' : $value;
    }

    private function decimalMultiply(string $number, int $multiplier): string
    {
        $carry = 0;
        $result = '';
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $product = ((int) $number[$i] * $multiplier) + $carry;
            $result = (string) ($product % 10) . $result;
            $carry = intdiv($product, 10);
        }
        while ($carry > 0) {
            $result = (string) ($carry % 10) . $result;
            $carry = intdiv($carry, 10);
        }

        return $this->normalizeDecimalString($result);
    }

    private function decimalAdd(string $number, string $addend): string
    {
        $i = strlen($number) - 1;
        $j = strlen($addend) - 1;
        $carry = 0;
        $result = '';

        while ($i >= 0 || $j >= 0 || $carry > 0) {
            $sum = ($i >= 0 ? (int) $number[$i--] : 0)
                + ($j >= 0 ? (int) $addend[$j--] : 0)
                + $carry;
            $result = (string) ($sum % 10) . $result;
            $carry = intdiv($sum, 10);
        }

        return $this->normalizeDecimalString($result);
    }
}
