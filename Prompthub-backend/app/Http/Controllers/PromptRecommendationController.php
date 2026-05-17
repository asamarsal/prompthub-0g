<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use App\Services\ZeroGComputeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PromptRecommendationController extends Controller
{
    public function __construct(private ZeroGComputeService $compute)
    {
    }

    public function similar(string $id): JsonResponse
    {
        $prompt = Prompt::with('user')->findOrFail($id);
        $similar = $this->findSimilarByMetadata($prompt);

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
            'source' => $similar->contains(fn ($item) => ($item->match_source ?? null) === '0g-compute') ? '0g-compute' : 'metadata',
        ]);
    }

    private function findSimilarByMetadata(Prompt $prompt)
    {
        $tags = $prompt->tags ?? [];

        $query = Prompt::with('user')
            ->where('id', '!=', $prompt->id)
            ->where('is_published', true);

        $query->where(function ($q) use ($prompt, $tags) {
            $q->where('category', $prompt->category)
                ->orWhere('ai_model', $prompt->ai_model);

            foreach (array_slice($tags, 0, 5) as $tag) {
                $q->orWhere('tags', 'LIKE', '%' . addcslashes($tag, '%_') . '%');
            }
        });

        return $query->orderByRaw("CASE WHEN category = ? THEN 0 ELSE 1 END", [$prompt->category ?? ''])
            ->orderByRaw("CASE WHEN ai_model = ? THEN 0 ELSE 1 END", [$prompt->ai_model ?? ''])
            ->orderBy('total_sold', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(6)
            ->get();
    }

    private function findSimilarByAI(Prompt $prompt, array $excludeIds)
    {
        if (!config('0g.compute_api_key')) {
            return collect();
        }

        try {
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
                return ($i + 1) . ". [{$c->id}] {$c->title} - {$c->category}";
            })->implode("\n");

            $parsed = $this->compute->chatJson([
                [
                    'role' => 'system',
                    'content' => 'You are a prompt similarity matcher. Given a source prompt and a list of candidates, return ONLY JSON with key ids as an array of the top 3 most similar candidate IDs. Example: {"ids":["id1","id2","id3"]}.',
                ],
                [
                    'role' => 'user',
                    'content' => "Source: \"{$prompt->title}\" - {$prompt->category} - {$prompt->description}\n\nCandidates:\n{$candidateList}",
                ],
            ], 0.1);

            $ids = $parsed['ids'] ?? null;
            if (!is_array($ids) || empty($ids)) {
                return collect();
            }

            $validIds = $candidates->pluck('id')->toArray();
            $matchedIds = array_filter($ids, fn ($id) => in_array($id, $validIds));
            if (empty($matchedIds)) {
                return collect();
            }

            return Prompt::with('user')
                ->whereIn('id', array_slice($matchedIds, 0, 3))
                ->where('is_published', true)
                ->get()
                ->each(function ($item) {
                    $item->match_source = '0g-compute';
                });
        } catch (\Throwable $e) {
            Log::warning('PromptRecommendation AI matching failed: ' . $e->getMessage());
            return collect();
        }
    }
}
