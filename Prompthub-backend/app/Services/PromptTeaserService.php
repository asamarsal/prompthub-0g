<?php

namespace App\Services;

class PromptTeaserService
{
    public function __construct(private ZeroGComputeService $compute)
    {
    }

    public function generate(string $title, string $description, ?string $content): array
    {
        $text = trim((string) $content);
        if ($text === '') {
            return $this->heuristic($title, $description, 'No protected prompt body available.');
        }

        $result = $this->compute->chatJson([
            [
                'role' => 'system',
                'content' => 'Create a buyer-facing teaser for a paid AI prompt. Return JSON only with key teaser. Use 25-35 words. Hide exact style modifiers, parameter values, seed values, negative prompt details, and proprietary workflow steps.',
            ],
            [
                'role' => 'user',
                'content' => "Title: {$title}\nDescription: {$description}\nProtected prompt:\n" . mb_substr($text, 0, 4000),
            ],
        ], 0.2);

        $teaser = trim((string) ($result['teaser'] ?? ''));
        if ($teaser === '') {
            return $this->heuristic($title, $description, '0G Compute teaser unavailable.');
        }

        return [
            'teaser' => mb_substr($teaser, 0, 500),
            'source' => '0g-compute',
            'model' => (string) ($result['_model'] ?? config('0g.compute_model')),
        ];
    }

    private function heuristic(string $title, string $description, string $reason): array
    {
        $base = trim($description) !== '' ? $description : $title;
        $base = preg_replace('/\s+/', ' ', (string) $base);

        return [
            'teaser' => mb_substr($base, 0, 220),
            'source' => 'heuristic',
            'model' => null,
            'reason' => $reason,
        ];
    }
}
