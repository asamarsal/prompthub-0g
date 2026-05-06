<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PromptController extends Controller
{
    public function index(Request $request)
    {
        $query = Prompt::with('user')->where('is_published', true);

        if ($user = auth('sanctum')->user()) {
            $query->withExists(['bookmarkedBy as is_bookmarked' => function($q) use ($user) {
                $q->where('user_id', $user->id);
            }]);
        }

        // Filter by user address (for Portfolio)
        if ($request->has('user_address')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('wallet_address', $request->user_address);
            });
        }

        // Filter by category
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Filter by AI model
        if ($request->has('model')) {
            $query->where('ai_model', $request->model);
        }

        // Filter by Content Type
        if ($request->has('type')) {
            $query->where('content_type', strtoupper($request->type));
        }

        // Filter NSFW: If not explicitly requesting NSFW, only show non-NSFW content.
        // If nsfw=true is passed, we show everything (NSFW and non-NSFW).
        $isNsfwRequested = filter_var($request->query('nsfw', false), FILTER_VALIDATE_BOOLEAN);
        if (!$isNsfwRequested) {
            $query->where('is_nsfw', false);
        }

        // Filter License Type
        if ($request->has('license')) {
            $query->where('license_type', strtoupper($request->license));
        }

        // Global Search (Title, Description, Tags)
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                // ILIKE in Postgres, LIKE in MySQL/SQLite. Laravel handles LIKE gracefully.
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  // JSON unquoted search if database supports it. Simple LIKE works for tags string fallback
                  ->orWhere('tags', 'LIKE', "%{$search}%");
                
                // Note: To search by creator name, we need to join the users table 
                // $q->orWhereHas('user', function($userQuery) use ($search) { return $userQuery->where('name', 'LIKE', "%{$search}%"); });
            });
        }

        // Sorting
        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'popular':
                $query->orderBy('total_sold', 'desc');
                break;
            case 'price_asc':
                $query->orderBy('price_0g', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price_0g', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        return response()->json($query->paginate($perPage));
    }

    public function show($id)
    {
        $query = Prompt::with('user');

        if ($user = auth('sanctum')->user()) {
            $query->withExists(['bookmarkedBy as is_bookmarked' => function($q) use ($user) {
                $q->where('user_id', $user->id);
            }]);
        }

        return response()->json($query->findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'price_0g' => 'required|numeric|min:0',
            'preview_image_url' => 'nullable|string',
            'cid_ipfs' => 'required|string',
            'ai_model' => 'nullable|string',
            'category' => 'nullable|string',
            'tags' => 'nullable|array',
            'content_type' => 'required|string|in:TEXT,IMAGE,VIDEO,AUDIO,CODE',
            'is_nsfw' => 'boolean',
            'license_type' => 'required|string|in:FREE,COMMERCIAL,EXCLUSIVE',
            'royalty_percentage' => 'nullable|integer|min:0|max:100',
            'og_tx_id' => 'nullable|string',
            'root_hash' => 'nullable|string',
            'currency' => 'nullable|string|in:0G,0G',
            'additional_info' => 'nullable|array',
            'original_content' => 'nullable|string',
            'reference_images' => 'nullable|array',
            'watermarked_preview_url' => 'nullable|string',
        ]);
        
        $validated['id'] = (string) \Illuminate\Support\Str::uuid();
        $validated['user_id'] = $request->user()->id ?? \App\Models\User::first()?->id;
        $validated['is_published'] = true;
        
        $prompt = Prompt::create($validated);

        // Note: contract_id is set by frontend after on-chain listPrompt tx

        return response()->json($prompt, 201);
    }

    public function verifyPurchase(Request $request, $id)
    {
        $request->validate([
            'tx_id' => 'required|string',
        ]);

        $prompt = Prompt::findOrFail($id);
        $txId = $this->normalizeTxHash($request->tx_id);
        if (!$txId) {
            return response()->json(['message' => 'Invalid tx hash'], 422);
        }

        try {
            $rpcUrl = config('0g.rpc_url');
            $receiptRes = Http::timeout(15)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'method' => 'eth_getTransactionReceipt',
                'params' => [$txId],
                'id' => 1,
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

            $marketplaceAddress = strtolower((string) config('0g.marketplace_contract_address'));
            $txTo = strtolower((string) ($receipt['to'] ?? ''));
            if ($marketplaceAddress && $marketplaceAddress !== '0x' && $txTo && $txTo !== $marketplaceAddress) {
                return response()->json(['message' => 'Transaction target mismatch'], 422);
            }

            $buyerAddress = $this->normalizeAddress((string) ($receipt['from'] ?? ''));
            if (!$buyerAddress) {
                return response()->json(['message' => 'Unable to read buyer address from tx'], 422);
            }

            \App\Models\Transaction::updateOrCreate(
                ['tx_id' => $txId],
                [
                    'buyer_address' => $buyerAddress,
                    'prompt_id' => $prompt->id,
                    'amount_paid' => $prompt->price_0g,
                    'currency' => $prompt->currency ?? '0G',
                ]
            );

            return response()->json([
                'message' => 'Purchase verified and recorded',
                'tx_status' => 'success',
                'prompt_id' => $prompt->id,
                'original_content' => $prompt->original_content ?? 'Sample prompt content for demonstration.',
                'root_hash' => $prompt->root_hash,
                'content_hash' => $prompt->original_content ? hash('sha256', $prompt->original_content) : null,
            ]);
        } catch (\Exception $e) {
            \Log::error("Exception in verifyPurchase: " . $e->getMessage());
            return response()->json(['message' => 'Internal verification error: ' . $e->getMessage()], 500);
        }
    }

    public function curate($id, Request $request)
    {
        AdminAuthController::validateAdminRequest($request);

        $validated = $request->validate([
            'is_curated' => 'required|boolean'
        ]);

        $prompt = Prompt::findOrFail($id);
        $prompt->update(['is_curated' => $validated['is_curated']]);
        
        return response()->json($prompt);
    }

    public function purchased(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $purchasedPromptIds = \App\Models\Transaction::where('buyer_address', $this->normalizeAddress((string) $user->wallet_address))
            ->pluck('prompt_id');

        $prompts = Prompt::with('user')
            ->whereIn('id', $purchasedPromptIds)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($prompts);
    }

    public function getContent($id)
    {
        $prompt = Prompt::findOrFail($id);
        $user = auth('sanctum')->user();

        // Check ownership or purchase
        $isOwner = $user && $user->id === $prompt->user_id;
        $hasPurchased = false;
        if ($user && !$isOwner) {
            $hasPurchased = \App\Models\Transaction::where('prompt_id', $prompt->id)
                ->where('buyer_address', $this->normalizeAddress((string) $user->wallet_address))
                ->exists();
        }

        if (!$isOwner && !$hasPurchased) {
            return response()->json(['message' => 'Payment Required', 'x402' => true], 402);
        }

        return response()->json([
            'id' => $prompt->id,
            'original_content' => $prompt->original_content ?? 'This is the premium prompt content protected by purchase verification.',
            'root_hash' => $prompt->root_hash,
            'content_hash' => $prompt->original_content ? hash('sha256', $prompt->original_content) : null,
        ]);
    }

    public function deactivate($id, Request $request)
    {
        $prompt = Prompt::findOrFail($id);
        
        if ($request->user()->id !== $prompt->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $prompt->update(['is_published' => false]);
        
        return response()->json(['message' => 'Prompt delisted successfully.']);
    }

    public function updatePrice($id, Request $request)
    {
        $prompt = Prompt::findOrFail($id);
        
        if ($request->user()->id !== $prompt->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'price_0g' => 'required|numeric|min:0',
            'currency' => 'required|string|max:10'
        ]);

        $prompt->update([
            'price_0g' => $validated['price_0g'],
            'currency' => $validated['currency']
        ]);
        
        return response()->json([
            'message' => 'Price updated successfully.',
            'prompt' => $prompt
        ]);
    }

    public function relist($id, Request $request)
    {
        $prompt = Prompt::findOrFail($id);

        if ($request->user()->id !== $prompt->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'price_0g' => 'required|numeric|min:0',
            'currency' => 'required|string|max:10'
        ]);

        $prompt->update([
            'is_published' => true,
            'price_0g' => $validated['price_0g'],
            'currency' => $validated['currency']
        ]);

        return response()->json([
            'message' => 'Prompt relisted successfully.',
            'prompt' => $prompt
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
}
