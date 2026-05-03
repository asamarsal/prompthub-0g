<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PromptRecommendationController extends Controller
{
    /**
     * GET /api/prompts/{id}/similar
     * Returns up to 6 similar prompts based on category, tags, and AI model.
     * Optionally uses 0G Compute for smarter matching when available.
     */
    public function similar(string $id): JsonResponse
    {
        $prompt = Prompt::with('user')->findOrFail($id);

        // Strategy 1: Database-level matching (fast, always works)
        $similar = $this->findSimilarByMetadata($prompt);

        // Strategy 2: If we have fewer than 3 results, try AI-enhanced matching
        if ($similar->count() < 3) {
            $aiSuggested = $this->findSimilarByAI($prompt, $similar->pluck('id')->toArray());
            if ($aiSuggested->isNotEmpty()) {
                $similar = $similar->merge($aiSuggested)->unique('id')->take(6);
            }
        }

        return response()->json([
            'data' => $similar->values(),
            'source_prompt_id' => $id,
            'count' => $similar->count(),
        ]);
    }

    /**
     * Find similar prompts using database metadata (category, tags, model).
     */
    private function findSimilarByMetadata(Prompt $prompt)
    {
        $tags = $prompt->tags ?? [];

        $query = Prompt::with('user')
            ->where('id', '!=', $prompt->id)
            ->where('is_published', true);

        // Build a relevance score using conditional ordering
        // Priority: same category > same model > overlapping tags
        $query->where(function ($q) use ($prompt, $tags) {
            $q->where('category', $prompt->category)
              ->orWhere('ai_model', $prompt->ai_model);

            // Match any overlapping tags via LIKE (works across DB engines)
            foreach (array_slice($tags, 0, 5) as $tag) {
                $q->orWhere('tags', 'LIKE', '%' . addcslashes($tag, '%_') . '%');
            }
        });

        // Order by: same category first, then same model, then by sales
        $query->orderByRaw("CASE WHEN category = ? THEN 0 ELSE 1 END", [$prompt->category ?? ''])
              ->orderByRaw("CASE WHEN ai_model = ? THEN 0 ELSE 1 END", [$prompt->ai_model ?? ''])
              ->orderBy('total_sold', 'desc')
              ->orderBy('created_at', 'desc');

        return $query->limit(6)->get();
    }

    /**
     * Use 0G Compute (LLM) to find semantically similar prompts.
     * This is a best-effort enhancement — failures are silently handled.
     */
    private function findSimilarByAI(Prompt $prompt, array $excludeIds)
    {
        $apiKey = env('ZG_COMPUTE_API_KEY');
        if (!$apiKey) {
            return collect();
        }

        try {
            $baseUrl = rtrim(env('ZG_COMPUTE_BASE_URL', 'https://router-api.0g.ai/v1'), '/');
            $model = env('ZG_COMPUTE_MODEL', 'meta-llama/Llama-3.1-8B-Instruct');

            // Get a sample of existing prompts to compare against
            $candidates = Prompt::where('id', '!=', $prompt->id)
                ->where('is_published', true)
                ->whereNotIn('id', $excludeIds)
                ->select('id', 'title', 'description', 'category', 'tags')
                ->limit(20)
                ->get();

            if ($candidates->isEmpty()) {
                return collect();
            }

            $candidateList = $candidates->map(function ($c, $i) {
                return ($i + 1) . ". [{$c->id}] {$c->title} — {$c->category}";
            })->implode("\n");

            $payload = [
                'model' => $model,
                'temperature' => 0.1,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a prompt similarity matcher. Given a source prompt and a list of candidates, return ONLY a JSON array of the top 3 most similar candidate IDs. Example: ["id1","id2","id3"]. No explanation.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Source: \"{$prompt->title}\" — {$prompt->category} — {$prompt->description}\n\nCandidates:\n{$candidateList}",
                    ],
                ],
            ];

            $resp = Http::timeout(15)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($baseUrl . '/chat/completions', $payload);

            if (!$resp->ok()) {
                return collect();
            }

            $content = data_get($resp->json(), 'choices.0.message.content', '');
            $ids = json_decode(trim($content), true);

            if (!is_array($ids) || empty($ids)) {
                return collect();
            }

            // Sanitize: only keep valid UUIDs that exist in our candidates
            $validIds = $candidates->pluck('id')->toArray();
            $matchedIds = array_filter($ids, fn($id) => in_array($id, $validIds));

            if (empty($matchedIds)) {
                return collect();
            }

            return Prompt::with('user')
                ->whereIn('id', array_slice($matchedIds, 0, 3))
                ->where('is_published', true)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('PromptRecommendation AI matching failed: ' . $e->getMessage());
            return collect();
        }
    }
}
