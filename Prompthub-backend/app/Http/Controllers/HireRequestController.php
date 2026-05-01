<?php

namespace App\Http\Controllers;

use App\Models\HireRequest;
use Illuminate\Http\Request;

class HireRequestController extends Controller
{
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
            $rpcUrl = config('0g.rpc_url');
            $receiptRes = \Illuminate\Support\Facades\Http::timeout(15)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'method'  => 'eth_getTransactionReceipt',
                'params'  => [$txId],
                'id'      => 1,
            ]);

            if (!$receiptRes->successful()) {
                return response()->json(['message' => 'RPC request failed'], 502);
            }

            $receipt = $receiptRes->json('result');
            if (!$receipt) {
                return response()->json(['message' => 'Transaction not mined yet'], 202);
            }

            if (($receipt['status'] ?? null) !== '0x1') {
                return response()->json(['message' => 'Transaction failed on-chain'], 400);
            }

            $hire->update([
                'status' => 'IN_PROGRESS',
                'tx_id'  => $txId,
            ]);

            return response()->json([
                'message'   => 'Escrow verified on-chain. Job in progress.',
                'tx_status' => 'success',
                'hire_id'   => $hire->id,
            ]);
        } catch (\Exception $e) {
            \Log::error("verifyEscrow error: " . $e->getMessage());
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
