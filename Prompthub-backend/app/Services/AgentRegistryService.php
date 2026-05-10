<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AgentRegistryService
{
    private const IS_REGISTERED_SELECTOR = '0xc3c5a547';
    private const IS_VERIFIED_SELECTOR = '0xb9209e33';
    private const GET_REPUTATION_SELECTOR = '0x9c89a0e2';
    private const GET_METADATA_URI_SELECTOR = '0x5f8ab9df';

    public function getAgentStatus(?string $address): array
    {
        $address = $this->normalizeAddress((string) $address);
        if (!$address) {
            return $this->emptyStatus(false);
        }

        try {
            $registered = $this->callBool(self::IS_REGISTERED_SELECTOR, $address);
            $verified = $this->callBool(self::IS_VERIFIED_SELECTOR, $address);
            $reputation = $this->callReputation($address);
            $metadataUri = $registered ? $this->callString(self::GET_METADATA_URI_SELECTOR, $address) : null;

            return [
                'registered' => $registered,
                'verified' => $verified || ($reputation['verified'] ?? false),
                'metadata_uri' => $metadataUri,
                'avg_rating' => (int) ($reputation['avg_rating'] ?? 0),
                'completed_jobs' => (int) ($reputation['completed_jobs'] ?? 0),
                'total_reviews' => (int) ($reputation['total_reviews'] ?? 0),
                'synced' => true,
            ];
        } catch (\Throwable $e) {
            Log::warning('AgentRegistry sync failed: ' . $e->getMessage(), ['address' => $address]);
            return $this->emptyStatus(false);
        }
    }

    public function syncAgentStatus(User $user): User
    {
        $status = $this->getAgentStatus($user->wallet_address);
        if (!($status['synced'] ?? false)) {
            return $user->refresh();
        }

        $user->forceFill([
            'agent_registered' => $status['registered'],
            'agent_verified' => $status['verified'],
            'agent_metadata_uri' => $status['metadata_uri'],
            'agent_avg_rating' => $status['avg_rating'],
            'agent_completed_jobs' => $status['completed_jobs'],
            'agent_total_reviews' => $status['total_reviews'],
            'agent_synced_at' => now(),
        ])->save();

        return $user->refresh();
    }

    private function emptyStatus(bool $synced = true): array
    {
        return [
            'registered' => false,
            'verified' => false,
            'metadata_uri' => null,
            'avg_rating' => 0,
            'completed_jobs' => 0,
            'total_reviews' => 0,
            'synced' => $synced,
        ];
    }

    private function callBool(string $selector, string $address): bool
    {
        $result = $this->ethCall($selector . $this->paddedAddress($address));
        return str_ends_with(strtolower((string) $result), '1');
    }

    private function callReputation(string $address): array
    {
        $result = strtolower(ltrim((string) $this->ethCall(self::GET_REPUTATION_SELECTOR . $this->paddedAddress($address)), '0x'));
        $words = str_split(str_pad($result, 64 * 4, '0', STR_PAD_LEFT), 64);

        return [
            'verified' => str_ends_with($words[0] ?? '', '1'),
            'avg_rating' => (int) $this->smallHexToDecimal($words[1] ?? '0'),
            'completed_jobs' => (int) $this->smallHexToDecimal($words[2] ?? '0'),
            'total_reviews' => (int) $this->smallHexToDecimal($words[3] ?? '0'),
        ];
    }

    private function callString(string $selector, string $address): ?string
    {
        $result = strtolower(ltrim((string) $this->ethCall($selector . $this->paddedAddress($address)), '0x'));
        if ($result === '' || strlen($result) < 128) {
            return null;
        }

        $lengthHex = substr($result, 64, 64);
        $length = (int) $this->smallHexToDecimal($lengthHex);
        if ($length <= 0) {
            return null;
        }

        $dataHex = substr($result, 128, $length * 2);
        $decoded = hex2bin($dataHex);

        return $decoded === false ? null : $decoded;
    }

    private function ethCall(string $data): ?string
    {
        $registry = $this->normalizeAddress((string) config('0g.agent_registry_address'));
        $rpcUrl = config('0g.rpc_url');
        if (!$registry || !$rpcUrl) {
            throw new \RuntimeException('AgentRegistry contract or RPC URL is not configured.');
        }

        $response = Http::timeout(10)->post($rpcUrl, [
            'jsonrpc' => '2.0',
            'method' => 'eth_call',
            'params' => [
                ['to' => $registry, 'data' => $data],
                'latest',
            ],
            'id' => 1,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('eth_call failed with status ' . $response->status());
        }

        return $response->json('result');
    }

    private function paddedAddress(string $address): string
    {
        return str_pad(substr($address, 2), 64, '0', STR_PAD_LEFT);
    }

    private function normalizeAddress(string $address): ?string
    {
        $address = strtolower(trim($address));
        return preg_match('/^0x[a-f0-9]{40}$/', $address) ? $address : null;
    }

    private function smallHexToDecimal(string $hex): string
    {
        return (string) hexdec(substr($hex, -12));
    }
}
