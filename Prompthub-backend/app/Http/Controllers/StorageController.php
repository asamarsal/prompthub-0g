<?php

namespace App\Http\Controllers;

use App\Services\ZeroGStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StorageController extends Controller
{
    public function __construct(private readonly ZeroGStorageService $zeroGStorage)
    {
    }

    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:51200',
            'type' => 'nullable|string|in:content,attachment',
            'strict' => 'nullable|boolean',
        ]);

        $result = ($validated['strict'] ?? false)
            ? $this->zeroGStorage->uploadStrict($validated['file'], $validated['type'] ?? 'attachment')
            : $this->zeroGStorage->uploadBestEffort($validated['file'], $validated['type'] ?? 'attachment');

        return response()->json($result);
    }

    public function download(string $rootHash): StreamedResponse|JsonResponse
    {
        $path = $this->zeroGStorage->resolvePathFromRootHash($rootHash);
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found for root hash'], 404);
        }

        return Storage::disk('local')->download($path);
    }
}
