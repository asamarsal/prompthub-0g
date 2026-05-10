<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ZeroGStorageService
{
    public function upload(UploadedFile $file, string $type = 'attachment'): array
    {
        return $this->uploadBestEffort($file, $type);
    }

    /**
     * Upload file to 0G Storage network with local fallback for non-critical files.
     */
    public function uploadBestEffort(UploadedFile $file, string $type = 'attachment'): array
    {
        // 1. Always store locally first (fast, reliable)
        [$storedPath, $fullPath, $localHash] = $this->storeLocal($file, $type);

        $result = [
            'rootHash' => '0x' . $localHash,
            'txHash' => null,
            'path' => $storedPath,
            'size' => $file->getSize(),
            'mimeType' => $file->getMimeType(),
            'filename' => $file->getClientOriginalName(),
            'storage' => 'local', // Track where data actually lives
        ];

        try {
            $network = $this->uploadToNetwork($file, $fullPath);
            $result['rootHash'] = $network['rootHash'];
            $result['txHash'] = $network['txHash'];
            $result['storage'] = '0g-network';
        } catch (\Throwable $e) {
            $result['storage'] = 'local-with-hash';
            Log::warning('0G Storage best-effort fallback used: ' . $e->getMessage(), [
                'file' => $file->getClientOriginalName(),
                'rootHash' => $result['rootHash'],
            ]);
        }

        return $result;
    }

    /**
     * Upload critical marketplace artifacts. Never returns a local SHA hash as a 0G root.
     */
    public function uploadStrict(UploadedFile $file, string $type = 'content'): array
    {
        [$storedPath, $fullPath] = $this->storeLocal($file, $type);
        $network = $this->uploadToNetwork($file, $fullPath);

        return [
            'rootHash' => $network['rootHash'],
            'txHash' => $network['txHash'],
            'path' => $storedPath,
            'size' => $file->getSize(),
            'mimeType' => $file->getMimeType(),
            'filename' => $file->getClientOriginalName(),
            'storage' => '0g-network',
        ];
    }

    private function storeLocal(UploadedFile $file, string $type): array
    {
        $disk = Storage::disk('local');
        $dir = 'og-storage/' . trim($type);
        $storedPath = $file->store($dir, 'local');
        $fullPath = $disk->path($storedPath);

        return [$storedPath, $fullPath, hash_file('sha256', $fullPath)];
    }

    private function uploadToNetwork(UploadedFile $file, string $fullPath): array
    {
        $nodeUrl = config('0g.storage_node_url');
        $indexerUrl = config('0g.storage_indexer_url');
        if (!$nodeUrl || !$indexerUrl) {
            throw new \RuntimeException('0G Storage node/indexer is not configured.');
        }

        $encoded = base64_encode((string) file_get_contents($fullPath));
        $endpoints = ['/api/v1/file', '/file', '/upload'];
        $lastStatus = null;

        foreach ($endpoints as $endpoint) {
            try {
                $response = Http::timeout(30)
                    ->post(rtrim($nodeUrl, '/') . $endpoint, [
                        'data' => $encoded,
                        'filename' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(),
                        'size' => $file->getSize(),
                    ]);

                $lastStatus = $response->status();
                if (!$response->successful()) {
                    continue;
                }

                $body = $response->json() ?: [];
                $rootHash = $body['root_hash'] ?? $body['rootHash'] ?? $body['hash'] ?? null;
                if (!$rootHash) {
                    continue;
                }

                $result = [
                    'rootHash' => $rootHash,
                    'txHash' => $body['tx_hash'] ?? $body['txHash'] ?? $body['tx'] ?? null,
                ];

                Log::info("0G Storage upload success via {$endpoint}", [
                    'rootHash' => $result['rootHash'],
                    'file' => $file->getClientOriginalName(),
                ]);

                return $result;
            } catch (\Throwable $endpointErr) {
                $lastStatus = $endpointErr->getMessage();
            }
        }

        throw new \RuntimeException('0G Storage upload failed on all endpoints. Last status: ' . (string) $lastStatus);
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
