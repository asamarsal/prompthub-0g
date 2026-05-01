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

        $apiKey = env('ZG_COMPUTE_API_KEY');
        if (!$apiKey) {
            return response()->json(['message' => 'ZG_COMPUTE_API_KEY not configured'], 500);
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

        $resp = Http::timeout(20)
            ->withToken($apiKey)
            ->acceptJson()
            ->post($baseUrl . '/chat/completions', $payload);

        if (!$resp->ok()) {
            return response()->json([
                'message' => '0G Compute request failed',
                'status' => $resp->status(),
                'body' => $resp->json(),
            ], 502);
        }

        $content = data_get($resp->json(), 'choices.0.message.content', '');
        $parsed = json_decode((string) $content, true);
        if (!is_array($parsed)) {
            return response()->json([
                'message' => 'Invalid scorer response format',
                'raw' => $content,
            ], 502);
        }

        $normalized = $this->normalizeScore($parsed);
        return response()->json($normalized);
    }

    private function normalizeScore(array $raw): array
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
        ];
    }

    private function clamp(int $v, int $min, int $max): int
    {
        return max($min, min($max, $v));
    }
}

