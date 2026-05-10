<?php

namespace App\Http\Controllers;

use App\Models\Contest;
use App\Services\OnChainVerificationService;
use Illuminate\Http\Request;

class ContestController extends Controller
{
    public function __construct(private OnChainVerificationService $onChainVerifier)
    {
    }

    public function index()
    {
        return response()->json(Contest::withCount('submissions')->whereIn('status', ['OPEN', 'PENDING_FUNDING', 'JUDGING'])->orderBy('created_at', 'desc')->get());
    }

    public function show($id)
    {
        return response()->json(Contest::with('submissions')->findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'brand_name' => 'required|string|max:255',
            'category' => 'required|string',
            'about_brand' => 'required|string',
            'brief' => 'required|string',
            'tags' => 'nullable|array',
            'require_prompt_submission' => 'boolean',
            'prize_tiers' => 'required|array|min:1',
            'prize_tiers.*.place' => 'required|integer|min:1',
            'prize_tiers.*.prize_0g' => 'required|numeric|min:0',
            'total_prize_0g' => 'required|numeric|min:0',
            'deadline' => 'required|date|after:today',
            'tx_id' => 'required|string', // Blockchain TX ID for escrow funding
            'onchain_contest_id' => 'nullable|integer|min:1',
        ]);
        
        $validated['id'] = (string) \Illuminate\Support\Str::uuid();
        $validated['brand_address'] = strtolower((string) ($request->user()->wallet_address ?? ''));
        $validated['status'] = 'PENDING_FUNDING';
        
        $contest = Contest::create($validated);
        return response()->json($contest, 201);
    }

    public function verifyFund(Request $request, $id)
    {
        $contest = Contest::findOrFail($id);
        $request->validate([
            'tx_id' => 'nullable|string',
        ]);

        $txId = $request->tx_id ?? $contest->tx_id;
        if (!$txId) {
            return response()->json(['message' => 'No TX ID provided'], 422);
        }

        $txId = strtolower(trim($txId));
        if (!str_starts_with($txId, '0x')) $txId = '0x' . $txId;

        try {
            $verification = $this->onChainVerifier->verifyContestFunded(
                $txId,
                $contest->brand_address,
                $contest->total_prize_0g,
                count($contest->prize_tiers ?? [])
            );

            if (!($verification['valid'] ?? false)) {
                if (($verification['reason'] ?? null) === 'receipt_not_found') {
                    return response()->json(['message' => 'Transaction not mined yet'], 202);
                }

                return response()->json([
                    'message' => 'Contest funding verification failed',
                    'error' => $verification['reason'] ?? 'invalid_funding_event',
                    'details' => $verification,
                ], 422);
            }

            if (empty($verification['contestId'])) {
                return response()->json(['message' => 'Transaction not mined yet'], 202);
            }

            $contest->update([
                'status' => 'OPEN',
                'tx_id'  => $txId,
                'onchain_contest_id' => (int) $verification['contestId'],
                'contest_contract_address' => $verification['contractAddress'] ?? config('0g.contests_contract_address'),
                'funding_verified_at' => now(),
            ]);

            return response()->json([
                'message'    => 'Contest funding verified on-chain. Contest is now OPEN.',
                'tx_status'  => 'success',
                'contest_id' => $contest->id,
                'onchain_contest_id' => $contest->onchain_contest_id,
            ]);
        } catch (\Exception $e) {
            \Log::error("verifyFund error: " . $e->getMessage());
            return response()->json(['message' => 'Verification error: ' . $e->getMessage()], 500);
        }
    }

    public function submit(Request $request, $id)
    {
        $contest = Contest::findOrFail($id);
        
        // Mock Artist submission
        // $request->validate([...])
        return response()->json(['message' => 'Submission received via IPFS']);
    }

    public function selectWinner(Request $request, $id)
    {
        $request->validate([
            'submission_id' => 'required|uuid|exists:contest_submissions,id',
            'tx_id' => 'required|string',
            'place' => 'nullable|integer|min:1',
        ]);

        $contest = Contest::findOrFail($id);
        $submission = \App\Models\ContestSubmission::findOrFail($request->submission_id);
        if ($submission->contest_id !== $contest->id) {
            return response()->json(['message' => 'Submission does not belong to this contest'], 422);
        }

        if (!$contest->onchain_contest_id) {
            return response()->json(['message' => 'Contest has no verified on-chain contest id'], 422);
        }

        $place = (int) ($request->input('place') ?: 1);

        try {
            $verification = $this->onChainVerifier->verifyWinnerDeclared(
                $request->input('tx_id'),
                $contest->onchain_contest_id,
                $submission->artist_address,
                $place
            );

            if (!($verification['valid'] ?? false)) {
                if (($verification['reason'] ?? null) === 'receipt_not_found') {
                    return response()->json(['message' => 'Transaction not mined yet'], 202);
                }

                return response()->json([
                    'message' => 'Winner declaration verification failed',
                    'error' => $verification['reason'] ?? 'invalid_winner_event',
                    'details' => $verification,
                ], 422);
            }
        } catch (\Exception $e) {
            \Log::error("selectWinner verification error: " . $e->getMessage());
            return response()->json(['message' => 'Verification error: ' . $e->getMessage()], 500);
        }

        // Update submission as winner
        $submission->update(['is_winner' => true]);

        // Update contest status and winner reference
        $contest->update([
            'status' => 'COMPLETED',
            'winner_submission_id' => $submission->id,
            'winner_tx_id' => strtolower($request->input('tx_id')),
            'winner_verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Winner selected and contest completed',
            'contest' => $contest,
            'submission' => $submission
        ]);
    }
}
