<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PromptScoreController extends Controller
{
    public function score(Request $request, string $id): JsonResponse
    {
        $prompt = Prompt::findOrFail($id);
        $input = trim((string) ($request->input('prompt_text') ?: $prompt->original_content ?: $prompt->description));

        if ($input === '') {
            return response()->json(['message' => 'No prompt content available for scoring'], 422);
        }

        $normalized = $this->scoreInput($input);
        $prompt->update([
            'ai_quality_score' => $normalized,
            'ai_quality_score_updated_at' => now(),
        ]);

        return response()->json($normalized);
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt_text' => 'required|string|min:1',
        ]);

        return response()->json($this->scoreInput(trim($validated['prompt_text'])));
    }

    private function scoreInput(string $input): array
    {
        $apiKey = env('ZG_COMPUTE_API_KEY');
        if (!$apiKey) {
            return $this->heuristicScore($input, 'ZG_COMPUTE_API_KEY not configured');
        }

        $baseUrl = rtrim(env('ZG_COMPUTE_BASE_URL', 'https://router-api.0g.ai/v1'), '/');
        $model = env('ZG_COMPUTE_MODEL', 'meta-llama/Llama-3.1-8B-Instruct');

        $payload = [
            'model' => $model,
            'temperature' => 0.2,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Score prompt quality in JSON only with keys: clarity, completeness, safety, reproducibility, innovation, reasoning. Scores are integers 0..10.',
                ],
                [
                    'role' => 'user',
                    'content' => $input,
                ],
            ],
        ];

        try {
            $resp = Http::timeout(20)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($baseUrl . '/chat/completions', $payload);
        } catch (\Throwable $e) {
            return $this->heuristicScore($input, '0G Compute request exception: ' . $e->getMessage());
        }

        if (!$resp->ok()) {
            return $this->heuristicScore($input, '0G Compute request failed with status ' . $resp->status());
        }

        $content = data_get($resp->json(), 'choices.0.message.content', '');
        $parsed = json_decode((string) $content, true);
        if (!is_array($parsed)) {
            return $this->heuristicScore($input, 'Invalid 0G Compute scorer response');
        }

        return $this->normalizeScore($parsed, '0g-compute');
    }

    private function normalizeScore(array $raw, string $source): array
    {
        $clarity = $this->clamp((int) ($raw['clarity'] ?? 0), 0, 10);
        $completeness = $this->clamp((int) ($raw['completeness'] ?? 0), 0, 10);
        $safety = $this->clamp((int) ($raw['safety'] ?? 0), 0, 10);
        $reproducibility = $this->clamp((int) ($raw['reproducibility'] ?? 0), 0, 10);
        $innovation = $this->clamp((int) ($raw['innovation'] ?? 0), 0, 10);

        $overall = round(
            ($clarity * 0.25) +
            ($completeness * 0.25) +
            ($safety * 0.20) +
            ($reproducibility * 0.20) +
            ($innovation * 0.10),
            2
        );

        return [
            'overall' => $overall,
            'clarity' => $clarity,
            'completeness' => $completeness,
            'safety' => $safety,
            'reproducibility' => $reproducibility,
            'innovation' => $innovation,
            'reasoning' => (string) ($raw['reasoning'] ?? ''),
            'source' => $source,
        ];
    }

    private function heuristicScore(string $input, string $reason): array
    {
        $length = mb_strlen($input);
        $hasStructure = preg_match('/[\n:;#*-]/', $input) ? 1 : 0;
        $hasVariables = preg_match('/\{[^}]+\}|\[[^\]]+\]/', $input) ? 1 : 0;
        $hasSafety = preg_match('/negative|avoid|exclude|safe|no\s+/i', $input) ? 1 : 0;
        $clarity = $this->clamp((int) round(min(10, max(3, $length / 80))), 0, 10);
        $completeness = $this->clamp(4 + ($hasStructure * 2) + ($hasVariables * 2) + ($length > 400 ? 2 : 0), 0, 10);
        $safety = $this->clamp(6 + ($hasSafety * 2), 0, 10);
        $reproducibility = $this->clamp(4 + ($hasStructure * 2) + ($hasVariables * 2), 0, 10);
        $innovation = $this->clamp(5 + ($length > 250 ? 1 : 0), 0, 10);

        return $this->normalizeScore([
            'clarity' => $clarity,
            'completeness' => $completeness,
            'safety' => $safety,
            'reproducibility' => $reproducibility,
            'innovation' => $innovation,
            'reasoning' => 'Heuristic fallback used. ' . $reason,
        ], 'heuristic');
    }

    private function clamp(int $v, int $min, int $max): int
    {
        return max($min, min($max, $v));
    }
}
