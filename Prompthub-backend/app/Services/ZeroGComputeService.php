<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZeroGComputeService
{
    private ?string $lastFailureReason = null;

    public function chatJson(array $messages, float $temperature = 0.2): ?array
    {
        $this->lastFailureReason = null;
        $content = $this->chatContent($messages, $temperature);
        if (!$content) {
            return null;
        }

        $parsed = $this->parseJsonContent((string) $content['content']);
        if (!is_array($parsed)) {
            Log::warning('0G Compute returned non-JSON content', [
                'model' => $content['model'],
                'preview' => mb_substr((string) $content['content'], 0, 500),
            ]);
            $this->lastFailureReason = 'non_json_model_response';
            return null;
        }

        $parsed['_model'] = $content['model'];
        return $parsed;
    }

    public function chatContent(array $messages, float $temperature = 0.2): ?array
    {
        $this->lastFailureReason = null;
        $apiKey = env('ZG_COMPUTE_API_KEY');
        if (!$apiKey) {
            $this->lastFailureReason = 'ZG_COMPUTE_API_KEY not configured';
            return null;
        }

        $models = array_values(array_unique(array_filter([
            (string) config('0g.compute_model'),
            (string) config('0g.compute_fallback_model'),
        ])));

        foreach ($models as $model) {
            $content = $this->requestModel($model, $messages, $temperature, $apiKey);
            if ($content !== null) {
                $this->lastFailureReason = null;
                return ['content' => $content, 'model' => $model];
            }
        }

        $this->lastFailureReason ??= 'all_configured_models_failed';
        return null;
    }

    public function lastFailureReason(): ?string
    {
        return $this->lastFailureReason;
    }

    private function requestModel(string $model, array $messages, float $temperature, string $apiKey): ?string
    {
        $baseUrl = rtrim((string) config('0g.compute_base_url'), '/');

        try {
            $resp = Http::timeout(25)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($baseUrl . '/chat/completions', [
                    'model' => $model,
                    'temperature' => $temperature,
                    'messages' => $messages,
                ]);
        } catch (\Throwable $e) {
            Log::warning('0G Compute request exception: ' . $e->getMessage(), ['model' => $model]);
            $this->lastFailureReason = 'request_exception';
            return null;
        }

        if (!$resp->ok()) {
            Log::warning('0G Compute request failed', ['model' => $model, 'status' => $resp->status()]);
            $this->lastFailureReason = match ($resp->status()) {
                401, 403 => 'unauthorized_or_invalid_key',
                404 => 'model_unavailable_or_not_found',
                429 => 'rate_limited',
                default => 'http_status_' . $resp->status(),
            };
            return null;
        }

        $content = data_get($resp->json(), 'choices.0.message.content');
        if (!is_string($content) || trim($content) === '') {
            $this->lastFailureReason = 'empty_model_content';
            return null;
        }

        return $content;
    }

    public function parseJsonContent(string $content): ?array
    {
        $content = trim($content);
        if ($content === '') {
            return null;
        }

        $decoded = json_decode($content, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        foreach ($this->jsonCandidates($content) as $candidate) {
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    private function jsonCandidates(string $content): array
    {
        $candidates = [];

        if (preg_match_all('/```(?:json)?\s*(.*?)\s*```/is', $content, $matches)) {
            foreach ($matches[1] as $match) {
                $candidates[] = trim($match);
            }
        }

        foreach (['{' => '}', '[' => ']'] as $open => $close) {
            $candidate = $this->extractBalancedJson($content, $open, $close);
            if ($candidate !== null) {
                $candidates[] = $candidate;
            }
        }

        return array_values(array_unique(array_filter($candidates)));
    }

    private function extractBalancedJson(string $content, string $open, string $close): ?string
    {
        $start = strpos($content, $open);
        if ($start === false) {
            return null;
        }

        $depth = 0;
        $inString = false;
        $escaped = false;
        $length = strlen($content);

        for ($i = $start; $i < $length; $i++) {
            $char = $content[$i];

            if ($escaped) {
                $escaped = false;
                continue;
            }

            if ($char === '\\' && $inString) {
                $escaped = true;
                continue;
            }

            if ($char === '"') {
                $inString = !$inString;
                continue;
            }

            if ($inString) {
                continue;
            }

            if ($char === $open) {
                $depth++;
            } elseif ($char === $close) {
                $depth--;
                if ($depth === 0) {
                    return substr($content, $start, $i - $start + 1);
                }
            }
        }

        return null;
    }
}
