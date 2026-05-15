<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZeroGComputeService
{
    public function chatJson(array $messages, float $temperature = 0.2): ?array
    {
        $content = $this->chatContent($messages, $temperature);
        if (!$content) {
            return null;
        }

        $parsed = json_decode(trim($content['content']), true);
        if (!is_array($parsed)) {
            Log::warning('0G Compute returned non-JSON content', ['model' => $content['model']]);
            return null;
        }

        $parsed['_model'] = $content['model'];
        return $parsed;
    }

    public function chatContent(array $messages, float $temperature = 0.2): ?array
    {
        $apiKey = env('ZG_COMPUTE_API_KEY');
        if (!$apiKey) {
            return null;
        }

        $models = array_values(array_unique(array_filter([
            (string) config('0g.compute_model'),
            (string) config('0g.compute_fallback_model'),
        ])));

        foreach ($models as $model) {
            $content = $this->requestModel($model, $messages, $temperature, $apiKey);
            if ($content !== null) {
                return ['content' => $content, 'model' => $model];
            }
        }

        return null;
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
            return null;
        }

        if (!$resp->ok()) {
            Log::warning('0G Compute request failed', ['model' => $model, 'status' => $resp->status()]);
            return null;
        }

        $content = data_get($resp->json(), 'choices.0.message.content');
        return is_string($content) && trim($content) !== '' ? $content : null;
    }
}
