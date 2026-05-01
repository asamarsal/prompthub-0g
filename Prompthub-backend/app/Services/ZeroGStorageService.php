<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ZeroGStorageService
{
    /**
     * Upload file to 0G Storage network with local fallback.
     * Uses 0G Storage node API for decentralized persistence.
     */
    public function upload(UploadedFile $file, string $type = 'attachment'): array
    {
        // 1. Always store locally first (fast, reliable)
        $disk = Storage::disk('local');
        $dir = 'og-storage/' . trim($type);
        $storedPath = $file->store($dir, 'local');
        $fullPath = $disk->path($storedPath);
        $localHash = hash_file('sha256', $fullPath);

        $result = [
            'rootHash' => '0x' . $localHash,
            'txHash' => null,
            'path' => $storedPath,
            'size' => $file->getSize(),
            'mimeType' => $file->getMimeType(),
            'filename' => $file->getClientOriginalName(),
            'storage' => 'local', // Track where data actually lives
        ];

        // 2. Attempt 0G Storage network upload
        $nodeUrl = config('0g.storage_node_url');
        $indexerUrl = config('0g.storage_indexer_url');

        if ($nodeUrl && $indexerUrl) {
            try {
                $fileContent = file_get_contents($fullPath);
                $encoded = base64_encode($fileContent);

                // Upload data segment to 0G Storage node
                $response = Http::timeout(30)
                    ->post(rtrim($nodeUrl, '/') . '/api/v1/file', [
                        'data' => $encoded,
                        'filename' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(),
                    ]);

                if ($response->successful()) {
                    $body = $response->json();
                    $result['rootHash'] = $body['root_hash'] ?? $body['rootHash'] ?? $result['rootHash'];
                    $result['txHash'] = $body['tx_hash'] ?? $body['txHash'] ?? null;
                    $result['storage'] = '0g-network';
                    Log::info("0G Storage upload success", [
                        'rootHash' => $result['rootHash'],
                        'file' => $file->getClientOriginalName(),
                    ]);
                } else {
                    Log::warning("0G Storage upload failed, using local fallback", [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning("0G Storage upload exception, using local fallback: " . $e->getMessage());
            }
        } else {
            Log::info("0G Storage node not configured, using local storage only");
        }

        return $result;
    }

    /**
     * Resolve file content by rootHash.
     * Tries 0G Storage indexer first, falls back to local scan.
     */
    public function resolvePathFromRootHash(string $rootHash): ?string
    {
        $normalized = strtolower(ltrim($rootHash, '0x'));

        // 1. Try 0G Storage indexer
        $indexerUrl = config('0g.storage_indexer_url');
        if ($indexerUrl) {
            try {
                $response = Http::timeout(15)
                    ->get(rtrim($indexerUrl, '/') . '/api/v1/file/' . $rootHash);

                if ($response->successful()) {
                    $body = $response->json();
                    if (!empty($body['data'])) {
                        // Cache to local disk for fast subsequent access
                        $tempPath = 'og-storage/cache/' . $normalized;
                        Storage::disk('local')->put($tempPath, base64_decode($body['data']));
                        return $tempPath;
                    }
                }
            } catch (\Exception $e) {
                Log::warning("0G Storage indexer lookup failed: " . $e->getMessage());
            }
        }

        // 2. Fallback: scan local files
        $disk = Storage::disk('local');
        $files = $disk->allFiles('og-storage');
        foreach ($files as $path) {
            $full = $disk->path($path);
            if (!is_file($full)) continue;
            if (hash_file('sha256', $full) === $normalized) {
                return $path;
            }
        }

        return null;
    }
}
