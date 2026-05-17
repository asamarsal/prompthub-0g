<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use App\Services\ZeroGComputeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PlagiarismController extends Controller
{
    public function __construct(private ZeroGComputeService $compute)
    {
    }

    /**
     * POST /api/prompts/check-plagiarism
     * Checks if a new prompt's content is too similar to existing prompts.
     * Uses a two-phase approach:
     *   Phase 1: Fast keyword/title matching via database
     *   Phase 2: AI-powered semantic similarity via 0G Compute
     */
    public function check(Request $request): JsonResponse
    {
        Log::info('Plagiarism check request received', $request->all());
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'content' => 'nullable|string',
        ]);

        $title = $validated['title'];
        $description = $validated['description'];
        $content = $validated['content'] ?? '';

        // Phase 1: Database-level duplicate detection (fast)
        $dbMatches = $this->findDatabaseMatches($title, $description);

        // Phase 2: AI-powered semantic check (if 0G Compute is available)
        $aiResult = $this->checkWithAI($title, $description, $content, $dbMatches);

        // Combine results
        $similarPrompts = $dbMatches->map(function ($prompt) {
            return [
                'id' => $prompt->id,
                'title' => $prompt->title,
                'category' => $prompt->category,
                'creator' => $prompt->user?->name ?? $prompt->user?->wallet_address ?? 'Unknown',
                'match_type' => 'keyword',
            ];
        })->values()->toArray();

        $isPlagiarized = false;
        $similarityScore = 0.0;
        $reasoning = '';

        if ($aiResult) {
            $isPlagiarized = $aiResult['is_plagiarized'] ?? false;
            $similarityScore = $aiResult['similarity_score'] ?? 0.0;
            $reasoning = $aiResult['reasoning'] ?? '';

            // Merge AI-identified similar prompts
            if (!empty($aiResult['similar_ids'])) {
                $aiPrompts = Prompt::with('user')
                    ->whereIn('id', $aiResult['similar_ids'])
                    ->where('is_published', true)
                    ->get();

                foreach ($aiPrompts as $p) {
                    $alreadyListed = collect($similarPrompts)->contains('id', $p->id);
                    if (!$alreadyListed) {
                        $similarPrompts[] = [
                            'id' => $p->id,
                            'title' => $p->title,
                            'category' => $p->category,
                            'creator' => $p->user?->name ?? $p->user?->wallet_address ?? 'Unknown',
                            'match_type' => 'semantic',
                        ];
                    }
                }
            }
        } else {
            // Fallback: if AI is unavailable, flag based on DB matches
            $isPlagiarized = $dbMatches->count() >= 2;
            $similarityScore = $dbMatches->count() > 0 ? min(0.9, $dbMatches->count() * 0.3) : 0.0;
            $reasoning = $dbMatches->count() > 0
                ? 'Found ' . $dbMatches->count() . ' prompt(s) with similar title/description keywords.'
                : 'No similar prompts found.';
        }

        return response()->json([
            'is_plagiarized' => $isPlagiarized,
            'similarity_score' => round($similarityScore, 2),
            'reasoning' => $reasoning,
            'similar_prompts' => array_slice($similarPrompts, 0, 5),
            'source' => $aiResult ? '0g-compute' : 'database-fallback',
            'model' => $aiResult['model'] ?? null,
        ]);
    }

    /**
     * Phase 1: Find prompts with similar titles or descriptions via SQL.
     */
    private function findDatabaseMatches(string $title, string $description)
    {
        // Extract significant words from title (3+ chars, skip common words)
        $stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'are', 'was', 'has', 'have', 'will', 'can', 'not'];
        $titleWords = array_filter(
            explode(' ', strtolower(preg_replace('/[^a-zA-Z0-9\s]/', '', $title))),
            fn($w) => strlen($w) >= 3 && !in_array($w, $stopWords)
        );

        if (empty($titleWords)) {
            return collect();
        }

        $query = Prompt::with('user')
            ->where('is_published', true)
            ->where(function ($q) use ($titleWords, $title) {
                // Exact title match (case-insensitive)
                $q->whereRaw('LOWER(title) = ?', [strtolower($title)]);

                // Partial keyword matches
                foreach (array_slice($titleWords, 0, 5) as $word) {
                    $q->orWhere('title', 'LIKE', '%' . $word . '%');
                }
            });

        return $query->limit(10)->get();
    }

    /**
     * Phase 2: Use 0G Compute (LLM) for semantic plagiarism detection.
     */
    private function checkWithAI(string $title, string $description, string $content, $dbMatches): ?array
    {
        $apiKey = config('0g.compute_api_key');
        if (!$apiKey) {
            return null;
        }

        try {
            // Get existing prompts to compare against
            $existingPrompts = Prompt::where('is_published', true)
                ->select('id', 'title', 'description')
                ->orderBy('created_at', 'desc')
                ->limit(15)
                ->get();

            if ($existingPrompts->isEmpty()) {
                return [
                    'is_plagiarized' => false,
                    'similarity_score' => 0.0,
                    'reasoning' => 'No existing prompts to compare against.',
                    'similar_ids' => [],
                ];
            }

            $existingList = $existingPrompts->map(function ($p, $i) {
                $desc = \Illuminate\Support\Str::limit($p->description, 100);
                return ($i + 1) . ". [{$p->id}] \"{$p->title}\" — {$desc}";
            })->implode("\n");

            $newPromptText = "Title: \"{$title}\"\nDescription: \"{$description}\"";
            if ($content) {
                $newPromptText .= "\nContent: \"" . \Illuminate\Support\Str::limit($content, 300) . "\"";
            }

            $parsed = $this->compute->chatJson([
                    [
                        'role' => 'system',
                        'content' => 'You are a plagiarism detector for an AI prompt marketplace. Compare a NEW prompt against EXISTING prompts. Return ONLY valid JSON with these keys: is_plagiarized (bool), similarity_score (float 0.0-1.0), reasoning (string, 1-2 sentences), similar_ids (array of matching prompt IDs from the list, empty if none). A prompt is plagiarized if it is substantially the same idea with minor rewording (score >= 0.7).',
                    ],
                    [
                        'role' => 'user',
                        'content' => "NEW PROMPT:\n{$newPromptText}\n\nEXISTING PROMPTS:\n{$existingList}",
                    ],
            ], 0.1);

            if (!is_array($parsed)) {
                Log::warning('Plagiarism AI returned invalid JSON.');
                return null;
            }

            return [
                'is_plagiarized' => (bool) ($parsed['is_plagiarized'] ?? false),
                'similarity_score' => (float) min(1.0, max(0.0, $parsed['similarity_score'] ?? 0.0)),
                'reasoning' => (string) ($parsed['reasoning'] ?? ''),
                'similar_ids' => is_array($parsed['similar_ids'] ?? null) ? $parsed['similar_ids'] : [],
                'model' => (string) ($parsed['_model'] ?? config('0g.compute_model')),
            ];
        } catch (\Throwable $e) {
            Log::warning('Plagiarism AI check exception: ' . $e->getMessage());
            return null;
        }
    }
}
