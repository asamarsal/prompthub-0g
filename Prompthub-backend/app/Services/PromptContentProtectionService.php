<?php

namespace App\Services;

use App\Models\Prompt;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class PromptContentProtectionService
{
    public function encryptedContent(string $plaintext): string
    {
        return Crypt::encryptString($plaintext);
    }

    public function decryptContent(Prompt $prompt): ?string
    {
        if ($prompt->encrypted_original_content) {
            try {
                return Crypt::decryptString((string) $prompt->encrypted_original_content);
            } catch (\Throwable) {
                return null;
            }
        }

        return $prompt->original_content ?: null;
    }

    public function protectClientEncryptionPayload(?array $payload): ?array
    {
        if (!$payload || empty($payload['key_b64'])) {
            return null;
        }

        $key = (string) $payload['key_b64'];
        if (!preg_match('/^[A-Za-z0-9+\/=_-]{32,256}$/', $key)) {
            throw new \InvalidArgumentException('Invalid content encryption key format.');
        }

        return [
            'version' => 1,
            'scheme' => (string) ($payload['scheme'] ?? 'AES-256-GCM'),
            'key_ciphertext' => Crypt::encryptString($key),
            'key_id' => (string) ($payload['key_id'] ?? Str::uuid()),
            'encrypted_roles' => array_values(array_filter((array) ($payload['encrypted_roles'] ?? []))),
            'key_custody' => 'backend-laravel-crypt',
            'created_at' => now()->toISOString(),
        ];
    }

    public function contentSecurityPayload(Prompt $prompt): array
    {
        $payload = $prompt->content_encryption_payload ?: [];

        return [
            'encrypted_at_rest' => (bool) $prompt->encrypted_original_content,
            'storage_encrypted' => !empty($payload['key_ciphertext']),
            'scheme' => $payload['scheme'] ?? null,
            'key_custody' => $payload['key_custody'] ?? null,
            'encrypted_roles' => $payload['encrypted_roles'] ?? [],
        ];
    }
}
