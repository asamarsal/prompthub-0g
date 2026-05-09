<?php

namespace App\Http\Middleware;

use App\Models\Prompt;
use App\Services\X402PaymentVerifier;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class X402Middleware
{
    public function __construct(private X402PaymentVerifier $verifier)
    {
    }

    /**
     * Handle an incoming request.
     * x402-like payment gating adapted for 0G EVM transactions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $promptId = $request->route('id');
        $prompt = Prompt::with('user')->findOrFail($promptId);
        $user = Auth::user();

        $ownerAddress = $this->normalizeAddress((string) ($prompt->user?->wallet_address ?? ''));
        $marketplaceAddress = $this->normalizeAddress((string) config('0g.marketplace_contract_address'));
        $requiredWei = $this->toWeiString((string) $prompt->price_0g);

        if ($user && $user->id === $prompt->user_id) {
            return $next($request);
        }

        // 1) Fast path: already purchased in local transaction table
        if ($user) {
            $userAddress = $this->normalizeAddress((string) $user->wallet_address);
            $alreadyOwned = \App\Models\Transaction::where('prompt_id', $promptId)
                ->where('buyer_address', $userAddress)
                ->exists();
            if ($alreadyOwned) {
                return $next($request);
            }
        }

        // 2) Optional x402 header verification via EVM receipt
        $txIdHeader = $request->header('X-Payment') ?? $request->header('payment-signature');
        if ($txIdHeader) {
            $txId = $this->normalizeTxHash($txIdHeader);
            if (!$txId) {
                return response()->json(['message' => 'Invalid payment tx hash'], 402);
            }

            $cacheKey = "x402_used_tx:{$txId}";
            if (Cache::has($cacheKey)) {
                return response()->json([
                    'message' => 'Transaction already used.',
                    'error' => 'x402_tx_already_used',
                ], 402);
            }

            try {
                $expectedBuyer = $user ? (string) $user->wallet_address : null;
                $verification = $this->verifier->verifyPromptPurchase($prompt, $txId, $expectedBuyer);
                if ($verification['valid'] ?? false) {
                    $record = $this->verifier->recordPurchase($prompt, $verification, 'x402_middleware');
                    if ($record['valid'] ?? false) {
                        Cache::put($cacheKey, true, now()->addDays(30));

                        return $next($request);
                    }

                    return response()->json([
                        'message' => 'Invalid payment transaction.',
                        'error' => $record['reason'] ?? 'x402_record_failed',
                    ], 402);
                }
            } catch (\Exception $e) {
                \Log::warning('x402: RPC check failed: ' . $e->getMessage());
            }
        }

        // 3) Require payment
        $paymentData = [
            'x402Version' => 2,
            'paymentRequirements' => [
                'amount' => $requiredWei,
                'asset' => '0G',
                'payTo' => $ownerAddress ?: ($marketplaceAddress ?: ''),
                'network' => 'eip155:' . (string) config('0g.chain_id', 16602),
                'promptId' => (string) $prompt->id,
                'contractId' => $prompt->contract_id,
                'marketplace' => $marketplaceAddress ?: '',
            ],
        ];
        $encodedData = base64_encode(json_encode($paymentData));

        return response()->json([
            'message' => 'Payment Required',
            'error' => 'x402_payment_required',
        ], 402, [
            'payment-required' => $encodedData,
            'Access-Control-Expose-Headers' => 'payment-required',
        ]);
    }

    private function normalizeTxHash(string $txId): ?string
    {
        $txId = trim($txId);
        if (!str_starts_with($txId, '0x')) {
            $txId = '0x' . $txId;
        }
        return preg_match('/^0x[a-fA-F0-9]{64}$/', $txId) ? strtolower($txId) : null;
    }

    private function normalizeAddress(string $address): ?string
    {
        $address = strtolower(trim($address));
        return preg_match('/^0x[a-f0-9]{40}$/', $address) ? $address : null;
    }

    private function toWeiString(string $amount): string
    {
        return $this->verifier->toWeiString($amount);
    }
}
