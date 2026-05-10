<?php

namespace App\Http\Controllers;

use App\Models\HireRequest;
use App\Services\OnChainVerificationService;
use Illuminate\Http\Request;

class HireRequestController extends Controller
{
    public function __construct(private OnChainVerificationService $onChainVerifier)
    {
    }

    public function index(Request $request)
    {
        $address = strtolower((string) ($request->user()->wallet_address ?? ''));
        $requests = HireRequest::where('client_address', $address)
            ->orWhere('artist_address', $address)
            ->get();
        return response()->json($requests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'artist_address' => 'required|string',
            'project_brief' => 'required|string',
            'budget_0g' => 'nullable|numeric',
            'tx_id' => 'required|string', // Escrow funding TX ID
            'onchain_job_id' => 'nullable|integer|min:1',
        ]);
        $validated['artist_address'] = strtolower(trim($validated['artist_address']));
        
        $validated['id'] = (string) \Illuminate\Support\Str::uuid();
        $validated['client_address'] = strtolower((string) ($request->user()->wallet_address ?? ''));
        $validated['status'] = 'PENDING_FUNDING'; // Requires 0G block confirmation
        
        $hire = HireRequest::create($validated);
        return response()->json($hire, 201);
    }

    public function verifyEscrow(Request $request, $id)
    {
        $hire = HireRequest::findOrFail($id);
        $request->validate([
            'tx_id' => 'nullable|string',
        ]);

        $txId = $request->tx_id ?? $hire->tx_id;
        if (!$txId) {
            return response()->json(['message' => 'No TX ID provided'], 422);
        }

        $txId = strtolower(trim($txId));
        if (!str_starts_with($txId, '0x')) $txId = '0x' . $txId;

        try {
            $verification = $this->onChainVerifier->verifyEscrowJobCreated(
                $txId,
                $hire->client_address,
                $hire->artist_address,
                $hire->budget_0g
            );

            if (!($verification['valid'] ?? false)) {
                if (($verification['reason'] ?? null) === 'receipt_not_found') {
                    return response()->json(['message' => 'Transaction not mined yet'], 202);
                }

                return response()->json([
                    'message' => 'Escrow verification failed',
                    'error' => $verification['reason'] ?? 'invalid_escrow_event',
                    'details' => $verification,
                ], 422);
            }

            if (empty($verification['jobId'])) {
                return response()->json(['message' => 'Transaction not mined yet'], 202);
            }

            $hire->update([
                'status' => 'IN_PROGRESS',
                'tx_id'  => $txId,
                'onchain_job_id' => (int) $verification['jobId'],
                'escrow_contract_address' => $verification['contractAddress'] ?? config('0g.escrow_contract_address'),
                'escrow_verified_at' => now(),
            ]);

            return response()->json([
                'message'   => 'Escrow verified on-chain. Job in progress.',
                'tx_status' => 'success',
                'hire_id'   => $hire->id,
                'onchain_job_id' => $hire->onchain_job_id,
            ]);
        } catch (\Exception $e) {
            \Log::error("verifyEscrow error: " . $e->getMessage());
            return response()->json(['message' => 'Verification error: ' . $e->getMessage()], 500);
        }
    }

    public function verifyCompletion(Request $request, $id)
    {
        $hire = HireRequest::findOrFail($id);
        $validated = $request->validate([
            'tx_id' => 'required|string',
        ]);

        if (!$hire->onchain_job_id) {
            return response()->json(['message' => 'Hire request has no verified on-chain job id'], 422);
        }

        try {
            $verification = $this->onChainVerifier->verifyJobCompleted(
                $validated['tx_id'],
                $hire->onchain_job_id,
                $hire->artist_address
            );

            if (!($verification['valid'] ?? false)) {
                if (($verification['reason'] ?? null) === 'receipt_not_found') {
                    return response()->json(['message' => 'Transaction not mined yet'], 202);
                }

                return response()->json([
                    'message' => 'Job completion verification failed',
                    'error' => $verification['reason'] ?? 'invalid_completion_event',
                    'details' => $verification,
                ], 422);
            }

            $hire->update([
                'status' => 'COMPLETED',
                'completion_tx_id' => strtolower($validated['tx_id']),
                'completed_onchain_at' => now(),
            ]);

            return response()->json([
                'message' => 'Job completion verified on-chain.',
                'hire_id' => $hire->id,
                'onchain_job_id' => $hire->onchain_job_id,
            ]);
        } catch (\Exception $e) {
            \Log::error('verifyCompletion error: ' . $e->getMessage());
            return response()->json(['message' => 'Verification error: ' . $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $hire = HireRequest::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:PENDING,PENDING_FUNDING,ACCEPTED,IN_PROGRESS,COMPLETED,REJECTED,CANCELLED,DISPUTED',
        ]);

        // Authorization: only client or artist can update
        $userAddress = strtolower((string) ($request->user()->wallet_address ?? ''));
        if ($userAddress !== strtolower($hire->client_address) && $userAddress !== strtolower($hire->artist_address)) {
            return response()->json(['message' => 'Unauthorized: only client or artist can update status'], 403);
        }

        $hire->update(['status' => $validated['status']]);
        return response()->json($hire);
    }
}
