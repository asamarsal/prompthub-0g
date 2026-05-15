<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use App\Services\PromptContentProtectionService;
use App\Services\PromptTeaserService;
use App\Services\X402PaymentVerifier;
use Illuminate\Http\Request;

class PromptController extends Controller
{
    public function __construct(
        private X402PaymentVerifier $x402Verifier,
        private PromptContentProtectionService $contentProtection,
        private PromptTeaserService $teaserService
    )
    {
    }

    public function index(Request $request)
    {
        $query = Prompt::with('user')
            ->withCount(['bookmarkedBy as favorites_count'])
            ->where('is_published', true);

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
        $query = Prompt::with('user')
            ->withCount(['bookmarkedBy as favorites_count']);

        if ($user = auth('sanctum')->user()) {
            $query->withExists(['bookmarkedBy as is_bookmarked' => function($q) use ($user) {
                $q->where('user_id', $user->id);
            }]);
        }

        $prompt = $query->findOrFail($id);
        $prompt->increment('view_count');
        $prompt->refresh()
            ->load('user')
            ->loadCount(['bookmarkedBy as favorites_count']);

        if ($user = auth('sanctum')->user()) {
            $prompt->is_bookmarked = $prompt->bookmarkedBy()
                ->where('user_id', $user->id)
                ->exists();
        }
        $prompt->content_security = $this->contentProtection->contentSecurityPayload($prompt);

        return response()->json($prompt);
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
            'commercial_use_allowed' => 'nullable|boolean',
            'royalty_percentage' => 'nullable|integer|min:0|max:100',
            'contract_id' => 'nullable|integer|min:1',
            'og_tx_id' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'root_hash' => 'nullable|string',
            'storage_manifest' => 'nullable|array',
            'prompt_txt_root_hash' => 'nullable|string',
            'prompt_txt_tx_hash' => 'nullable|string',
            'preview_root_hash' => 'nullable|string',
            'preview_tx_hash' => 'nullable|string',
            'text_package_root_hash' => 'nullable|string',
            'text_package_tx_hash' => 'nullable|string',
            'ipfs_metadata_uri' => 'nullable|string',
            'storage_status' => 'nullable|string|in:pending,uploaded,partial,failed',
            'currency' => 'nullable|string|in:0G,0G',
            'additional_info' => 'nullable|array',
            'original_content' => 'nullable|string',
            'content_encryption' => 'nullable|array',
            'negative_prompt' => 'nullable|string|max:1000',
            'usage_notes' => 'nullable|string|max:1000',
            'reference_images' => 'nullable|array',
            'watermarked_preview_url' => 'nullable|string',
            'preview_teaser' => 'nullable|string|max:500',
        ]);
        
        $validated['id'] = (string) \Illuminate\Support\Str::uuid();
        $validated['user_id'] = $request->user()->id ?? \App\Models\User::first()?->id;
        $validated['is_published'] = true;
        $validated['ipfs_metadata_uri'] = $validated['ipfs_metadata_uri'] ?? $validated['cid_ipfs'];
        $validated['root_hash'] = $validated['root_hash']
            ?? $validated['text_package_root_hash']
            ?? $validated['prompt_txt_root_hash']
            ?? null;
        $validated['storage_status'] = $validated['storage_status'] ?? (
            !empty($validated['text_package_root_hash']) && !empty($validated['preview_root_hash']) ? 'uploaded' : 'pending'
        );

        $plaintextContent = trim((string) ($validated['original_content'] ?? ''));
        if ($plaintextContent !== '') {
            $validated['encrypted_original_content'] = $this->contentProtection->encryptedContent($plaintextContent);
            $validated['original_content'] = null;
        }

        if (!empty($validated['content_encryption'])) {
            $validated['content_encryption_payload'] = $this->contentProtection->protectClientEncryptionPayload($validated['content_encryption']);
            unset($validated['content_encryption']);
        }

        if (empty($validated['preview_teaser']) && $plaintextContent !== '') {
            $teaser = $this->teaserService->generate($validated['title'], $validated['description'], $plaintextContent);
            $validated['preview_teaser'] = $teaser['teaser'];
            $validated['preview_teaser_source'] = $teaser['source'];
            $validated['preview_teaser_model'] = $teaser['model'] ?? null;
            $validated['preview_teaser_generated_at'] = now();
        }
        
        $prompt = Prompt::create($validated);

        return response()->json($prompt, 201);
    }

    public function verifyPurchase(Request $request, $id)
    {
        $request->validate([
            'tx_id' => 'required|string',
        ]);

        $prompt = Prompt::findOrFail($id);
        $user = $request->user();
        $expectedBuyer = $user?->wallet_address;

        try {
            $verification = $this->x402Verifier->verifyPromptPurchase($prompt, $request->tx_id, $expectedBuyer);
            if (!($verification['valid'] ?? false)) {
                $status = ($verification['reason'] ?? null) === 'receipt_not_found' ? 202 : 422;

                return response()->json([
                    'message' => 'Purchase verification failed',
                    'error' => $verification['reason'] ?? 'invalid_payment',
                ], $status);
            }

            $record = $this->x402Verifier->recordPurchase($prompt, $verification, 'verify_purchase_endpoint');
            if (!($record['valid'] ?? false)) {
                return response()->json([
                    'message' => 'Purchase transaction cannot be recorded',
                    'error' => $record['reason'] ?? 'record_failed',
                ], 409);
            }

            return response()->json([
                'message' => 'Purchase verified and recorded',
                'tx_status' => 'success',
                'prompt_id' => $prompt->id,
                'contract_token_id' => $verification['tokenId'],
                'buyer_address' => $verification['buyer'],
                'original_content' => $this->premiumContent($prompt),
                'negative_prompt' => $prompt->negative_prompt,
                'usage_notes' => $prompt->usage_notes,
                'root_hash' => $prompt->root_hash,
                'storage_refs' => $this->storageRefsPayload($prompt),
                'content_hash' => $this->contentHash($prompt),
                'content_security' => $this->contentProtection->contentSecurityPayload($prompt),
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
            'original_content' => $this->premiumContent($prompt),
            'negative_prompt' => $prompt->negative_prompt,
            'usage_notes' => $prompt->usage_notes,
            'root_hash' => $prompt->root_hash,
            'storage_refs' => $this->storageRefsPayload($prompt),
            'content_hash' => $this->contentHash($prompt),
            'content_security' => $this->contentProtection->contentSecurityPayload($prompt),
        ]);
    }

    public function previewTeaser($id)
    {
        $prompt = Prompt::findOrFail($id);

        return response()->json([
            'prompt_id' => $prompt->id,
            'teaser' => $prompt->preview_teaser ?: $this->teaserService->generate($prompt->title, $prompt->description, null)['teaser'],
            'source' => $prompt->preview_teaser_source ?: 'heuristic',
            'model' => $prompt->preview_teaser_model,
            'generated_at' => $prompt->preview_teaser_generated_at,
        ]);
    }

    public function generatePreviewTeaser(Request $request, $id)
    {
        $prompt = Prompt::findOrFail($id);
        if ($request->user()->id !== $prompt->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $teaser = $this->teaserService->generate(
            $prompt->title,
            $prompt->description,
            $this->contentProtection->decryptContent($prompt)
        );

        $prompt->update([
            'preview_teaser' => $teaser['teaser'],
            'preview_teaser_source' => $teaser['source'],
            'preview_teaser_model' => $teaser['model'] ?? null,
            'preview_teaser_generated_at' => now(),
        ]);

        return response()->json([
            'prompt_id' => $prompt->id,
            'teaser' => $prompt->preview_teaser,
            'source' => $prompt->preview_teaser_source,
            'model' => $prompt->preview_teaser_model,
            'generated_at' => $prompt->preview_teaser_generated_at,
        ]);
    }

    public function storageRefs($id)
    {
        $prompt = Prompt::findOrFail($id);
        $user = auth('sanctum')->user();

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

        return response()->json($this->storageRefsPayload($prompt));
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

    public function recordOnChainListing($id, Request $request)
    {
        $prompt = Prompt::findOrFail($id);

        if ($request->user()->id !== $prompt->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'contract_id' => 'required|integer|min:1',
            'og_tx_id' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'root_hash' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'ipfs_metadata_uri' => 'nullable|string|max:255',
        ]);

        $updates = [
            'contract_id' => $validated['contract_id'],
            'is_published' => true,
        ];

        if (!empty($validated['og_tx_id'])) {
            $updates['og_tx_id'] = strtolower($validated['og_tx_id']);
        }

        if (!empty($validated['root_hash']) && empty($prompt->root_hash)) {
            $updates['root_hash'] = strtolower($validated['root_hash']);
        }

        if (!empty($validated['ipfs_metadata_uri']) && empty($prompt->ipfs_metadata_uri)) {
            $updates['ipfs_metadata_uri'] = $validated['ipfs_metadata_uri'];
        }

        if ($prompt->storage_status !== 'uploaded') {
            $updates['storage_status'] = 'uploaded';
        }

        $prompt->update($updates);

        return response()->json([
            'message' => 'On-chain listing recorded successfully.',
            'prompt' => $prompt->fresh(),
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

    private function storageRefsPayload(Prompt $prompt): array
    {
        return [
            'root_hash' => $prompt->root_hash,
            'prompt_txt_root_hash' => $prompt->prompt_txt_root_hash,
            'prompt_txt_tx_hash' => $prompt->prompt_txt_tx_hash,
            'preview_root_hash' => $prompt->preview_root_hash,
            'preview_tx_hash' => $prompt->preview_tx_hash,
            'text_package_root_hash' => $prompt->text_package_root_hash,
            'text_package_tx_hash' => $prompt->text_package_tx_hash,
            'ipfs_metadata_uri' => $prompt->ipfs_metadata_uri ?? $prompt->cid_ipfs,
            'storage_manifest' => $prompt->storage_manifest,
            'storage_status' => $prompt->storage_status,
            'content_security' => $this->contentProtection->contentSecurityPayload($prompt),
        ];
    }

    private function premiumContent(Prompt $prompt): string
    {
        return $this->contentProtection->decryptContent($prompt)
            ?? 'Premium content is unavailable. Please contact support with this prompt ID.';
    }

    private function contentHash(Prompt $prompt): ?string
    {
        $content = $this->contentProtection->decryptContent($prompt);
        return $content ? hash('sha256', $content) : null;
    }
}
