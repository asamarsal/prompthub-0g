<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SystemStatusController extends Controller
{
    public function index(): JsonResponse
    {
        $status = [
            'api' => 'up', // If this route is reached, the API is running
            'database' => $this->checkDatabase(),
            '0g_storage' => $this->check0GStorage(),
            'blockchain_rpc' => $this->checkBlockchainRpc(),
            'websocket' => $this->checkWebSocket(),
        ];

        // Overall status is 'operational' if critical systems are up
        $isOperational = $status['api'] === 'up' && $status['database'] === 'up' && $status['blockchain_rpc'] === 'up';
        $overall = $isOperational ? 'operational' : 'degraded';

        return response()->json([
            'status' => $overall,
            'components' => $status,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function stats(): JsonResponse
    {
        try {
            $activeCreators = \App\Models\Prompt::where('is_published', true)->distinct('user_id')->count('user_id');
            $listedPrompts = \App\Models\Prompt::where('is_published', true)->count();
            $totalVolume = \App\Models\Prompt::where('is_published', true)->sum('price_0g');

            return response()->json([
                'active_creators' => $activeCreators,
                'listed_prompts' => $listedPrompts,
                'total_volume' => (float) $totalVolume,
            ]);
        } catch (\Exception $e) {
            Log::error('Stats API Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch marketplace stats',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();
            return 'up';
        } catch (\Exception $e) {
            Log::error('Status Check - DB Error: ' . $e->getMessage());
            return 'down';
        }
    }

    private function check0GStorage(): string
    {
        try {
            $url = config('0g.storage_node_url', 'https://storagenode-galileo.0g.ai');
            // Timeout of 5 seconds to prevent hanging
            $response = Http::timeout(5)->get($url);
            // Even a 404 means the service is reachable
            return ($response->successful() || $response->status() === 404 || $response->status() === 400) ? 'up' : 'degraded';
        } catch (\Exception $e) {
            Log::error('Status Check - 0G Storage Error: ' . $e->getMessage());
            return 'down';
        }
    }

    private function checkBlockchainRpc(): string
    {
        try {
            $url = config('0g.rpc_url', 'https://evmrpc-testnet.0g.ai');
            $response = Http::timeout(5)->post($url, [
                'jsonrpc' => '2.0',
                'method' => 'eth_blockNumber',
                'params' => [],
                'id' => 1,
            ]);
            return ($response->successful() && isset($response->json()['result'])) ? 'up' : 'down';
        } catch (\Exception $e) {
            Log::error('Status Check - Blockchain RPC Error: ' . $e->getMessage());
            return 'down';
        }
    }

    private function checkWebSocket(): string
    {
        try {
            $host = config('broadcasting.connections.reverb.options.host', '127.0.0.1');
            $port = config('broadcasting.connections.reverb.options.port', 8080);
            
            // Remove any surrounding quotes from the host string
            $host = trim((string)$host, "\"' ");
            
            // 1. Try the configured host first
            $connection = @fsockopen($host, $port, $errno, $errstr, 2);
            if (is_resource($connection)) {
                fclose($connection);
                return 'up';
            }
            
            // 2. Try IPv4 loopback (127.0.0.1) as a robust fallback
            if ($host !== '127.0.0.1') {
                $connection = @fsockopen('127.0.0.1', $port, $errno, $errstr, 2);
                if (is_resource($connection)) {
                    fclose($connection);
                    return 'up';
                }
            }
            
            // 3. Try "localhost" (which may resolve to IPv6 ::1 on Windows)
            if ($host !== 'localhost') {
                $connection = @fsockopen('localhost', $port, $errno, $errstr, 2);
                if (is_resource($connection)) {
                    fclose($connection);
                    return 'up';
                }
            }
            
            return 'down';
        } catch (\Exception $e) {
            Log::error('Status Check - WebSocket Error: ' . $e->getMessage());
            return 'down';
        }
    }
}
