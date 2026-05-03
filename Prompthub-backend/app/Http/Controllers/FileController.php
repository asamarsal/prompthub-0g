<?php

namespace App\Http\Controllers;

use App\Services\WatermarkService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FileController extends Controller
{
    public function uploadToIpfs(Request $request) 
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $request->file('file');
        $jwt = config('services.pinata.jwt');

        if (!$jwt) {
            return response()->json(['error' => 'Pinata JWT not configured'], 500);
        }

        try {
            $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.pinata.jwt'),
        ])->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
          ->post('https://api.pinata.cloud/pinning/pinFileToIPFS', [
              'pinataMetadata' => json_encode(['name' => $file->getClientOriginalName()]),
              'pinataOptions' => json_encode([
                  'groupId' => config('services.pinata.group_id'),
              ])
          ]);

            if (!$response->successful()) {
                throw new \Exception('Pinata upload failed: ' . $response->body());
            }

            $data = $response->json();
            $cid = $data['IpfsHash'];
            $gateway = config('services.pinata.gateway', 'https://gateway.pinata.cloud/ipfs/');
            
            return response()->json([
                'cid' => $cid,
                'url' => $gateway . $cid,
                'ipfs_uri' => 'ipfs://' . $cid
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'IPFS upload error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadMetadata(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'description' => 'required|string',
            'image' => 'required|string', // URL of the preview image
            'properties' => 'nullable|array',
        ]);

        $jwt = config('services.pinata.jwt');
        if (!$jwt) {
            return response()->json(['error' => 'Pinata JWT not configured'], 500);
        }

        $metadata = [
            'pinataContent' => [
                'name' => $request->name,
                'description' => $request->description,
                'image' => $request->image,
                'properties' => $request->properties ?? [],
            ],
            'pinataMetadata' => [
                'name' => 'PromptHub NFT Metadata: ' . $request->name
            ]
        ];

        try {
            $response = Http::withToken($jwt)
                ->post('https://api.pinata.cloud/pinning/pinJSONToIPFS', $metadata);

            if (!$response->successful()) {
                throw new \Exception('Pinata JSON upload failed: ' . $response->body());
            }

            $data = $response->json();
            $cid = $data['IpfsHash'];
            $gateway = config('services.pinata.gateway', 'https://gateway.pinata.cloud/ipfs/');

            return response()->json([
                'cid' => $cid,
                'url' => $gateway . $cid,
                'ipfs_uri' => 'ipfs://' . $cid
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Metadata upload error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadLocal(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:10240', // 10MB max
            'type' => 'required|string|in:avatar,cover',
        ]);

        $user = $request->user();
        $type = $request->input('type');
        $file = $request->file('file');

        // 1. Prepare Paths: profile > uuid > avatars/covers
        $folder = ($type === 'avatar') ? 'avatars' : 'covers';
        $userUuid = $user->id;
        $extension = $file->getClientOriginalExtension();
        $fileName = time() . '.' . $extension;
        $path = "profile/{$userUuid}/{$folder}";

        // 2. Cleanup Old File in the same sub-folder
        $oldUrl = ($type === 'avatar') ? $user->avatar_url : $user->cover_url;
        if ($oldUrl && str_contains($oldUrl, '/storage/profile/')) {
            $oldPath = str_replace(url('/storage/'), '', $oldUrl);
            \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
        }

        try {
            // 3. Store New File
            $storedPath = $file->storeAs($path, $fileName, 'public');
            $url = asset('storage/' . $storedPath);

            // 4. Persist to Database
            if ($type === 'avatar') {
                $user->update(['avatar_url' => $url]);
            } else {
                $user->update(['cover_url' => $url]);
            }

            return response()->json([
                'url' => $url,
                'user' => $user->fresh()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Local upload error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadPromptAsset(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'group_id' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $groupId = $request->input('group_id');
        
        try {
            // 1. Store locally as cache for fast serving
            // (0G Storage upload is handled by frontend using official 0G TS SDK)
            $path = "prompt";
            if ($groupId) {
                $path .= "/" . $groupId;
            }
            
            $extension = $file->getClientOriginalExtension();
            $fileName = time() . '_' . uniqid() . '.' . $extension;
            
            $storedPath = $file->storeAs($path, $fileName, 'public');
            $localUrl = asset('storage/' . $storedPath);

            // 2. Apply watermark to image files for public preview
            $watermarkedUrl = null;
            $watermarkService = new WatermarkService();
            $mimeType = $file->getMimeType() ?? '';

            if ($watermarkService->isImageFile($mimeType)) {
                $originalFullPath = storage_path('app/public/' . $storedPath);
                $watermarkedFileName = 'wm_' . $fileName;
                $watermarkedStoredPath = $path . '/' . $watermarkedFileName;
                $watermarkedFullPath = storage_path('app/public/' . $watermarkedStoredPath);

                if ($watermarkService->apply($originalFullPath, $watermarkedFullPath)) {
                    $watermarkedUrl = asset('storage/' . $watermarkedStoredPath);
                }
            }

            return response()->json([
                'url' => $localUrl,
                'watermarked_url' => $watermarkedUrl,
                'path' => $storedPath,
                'name' => $file->getClientOriginalName(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Prompt asset upload error',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
