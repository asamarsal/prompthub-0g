<?php

namespace App\Http\Controllers;

use App\Services\ZeroGComputeService;
use Illuminate\Http\JsonResponse;

class ComputeHealthController extends Controller
{
    public function __construct(private ZeroGComputeService $compute)
    {
    }

    public function show(): JsonResponse
    {
        $apiKey = env('ZG_COMPUTE_API_KEY');
        $model = (string) config('0g.compute_model');
        $fallbackModel = (string) config('0g.compute_fallback_model');

        if (!$apiKey) {
            return response()->json([
                'configured' => false,
                'base_url' => config('0g.compute_base_url'),
                'model' => $model,
                'fallback_model' => $fallbackModel,
                'live' => false,
                'source' => 'not-configured',
                'reason' => 'ZG_COMPUTE_API_KEY not configured',
            ]);
        }

        $result = $this->compute->chatContent([
            [
                'role' => 'system',
                'content' => 'Return the single word OK.',
            ],
            [
                'role' => 'user',
                'content' => 'healthcheck',
            ],
        ], 0.0);

        if (!$result) {
            return response()->json([
                'configured' => true,
                'base_url' => config('0g.compute_base_url'),
                'model' => $model,
                'fallback_model' => $fallbackModel,
                'live' => false,
                'source' => '0g-compute',
                'reason' => 'unauthorized_or_invalid_key_or_model_unavailable',
            ], 503);
        }

        return response()->json([
            'configured' => true,
            'base_url' => config('0g.compute_base_url'),
            'model' => $model,
            'fallback_model' => $fallbackModel,
            'active_model' => $result['model'],
            'live' => true,
            'source' => '0g-compute',
        ]);
    }
}
