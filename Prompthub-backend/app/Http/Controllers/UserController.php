<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Prompt;
use App\Models\Transaction;
use App\Models\Review;
use App\Services\AgentRegistryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function __construct(private AgentRegistryService $agentRegistry)
    {
    }

    public function search(Request $request)
    {
        $query = $request->input('q');

        if (!$query) {
            return response()->json([]);
        }

        $users = User::where('name', 'like', "%{$query}%")
                     ->orWhere('username', 'like', "%{$query}%")
                     ->orWhere('wallet_address', $query)
                     ->select('id', 'name', 'username', 'wallet_address', 'avatar_url')
                     ->limit(10)
                     ->get();

        return response()->json($users);
    }

    public function artists(Request $request)
    {
        $artists = User::whereJsonContains('roles', 'artist')
            ->select('id', 'name', 'username', 'wallet_address', 'avatar_url', 'cover_url', 'bio', 'is_available_for_freelance', 'hourly_rate', 'hourly_rate_currency', 'roles', 'rating_avg', 'rating_count', 'specialization_id', 'agent_registered', 'agent_verified', 'agent_avg_rating', 'agent_completed_jobs', 'agent_total_reviews')
            ->get()
            ->map(function ($artist) {
                return [
                    'id' => $artist->wallet_address,
                    'name' => $artist->name ?? $artist->username ?? 'Anonymous Artist',
                    'handle' => $artist->username ?? substr($artist->wallet_address, 0, 8),
                    'bio' => $artist->bio ?? 'No bio provided.',
                    'avatar' => $artist->avatar_url,
                    'available' => (bool)$artist->is_available_for_freelance,
                    'verified' => (bool) $artist->agent_verified,
                    'agent_registered' => (bool) $artist->agent_registered,
                    'agent_verified' => (bool) $artist->agent_verified,
                    'specialties' => $artist->getMappedSpecialties(),
                    'tools' => $artist->getMappedTools(),
                    'rating' => $artist->agent_total_reviews ? round(((int) $artist->agent_avg_rating) / 10, 1) : ($artist->rating_avg ? (float)$artist->rating_avg : 0),
                    'reviews' => $artist->agent_total_reviews ? (int)$artist->agent_total_reviews : ($artist->rating_count ? (int)$artist->rating_count : 0),
                    'completed_jobs' => (int) $artist->agent_completed_jobs,
                    'hourlyRate' => $artist->hourly_rate ? (float)$artist->hourly_rate : 0.002,
                    'currency' => $artist->hourly_rate_currency ?: '0G',
                    'portfolio' => [
                        [
                            'image' => $artist->cover_url ?: '/icon/default-coverimage.png',
                            'title' => 'Showcase',
                        ]
                    ]
                ];
            });

        return response()->json($artists);
    }

    /**
     * GET /api/users/{address}/profile
     * Returns a public user profile with aggregated stats and follow status.
     * Supports lookup by wallet_address, username, or name.
     */
    public function publicProfile(Request $request, $address)
    {
        $normalizedAddress = strtolower(trim((string) $address));
        // Try wallet_address first, then username, then name (for URL-based routing)
        $user = User::where('wallet_address', $normalizedAddress)
            ->orWhere('username', $address)
            ->orWhere('name', $address)
            ->firstOrFail();

        $authUser = auth('sanctum')->user();
        if (!$user->agent_synced_at || $user->agent_synced_at->lt(now()->subMinutes(10))) {
            $user = $this->agentRegistry->syncAgentStatus($user);
        }

        $promptIds = Prompt::where('user_id', $user->id)->pluck('id');

        $promptsCount = Prompt::where('user_id', $user->id)->where('is_published', true)->count();
        $totalSales = Transaction::whereIn('prompt_id', $promptIds)->count();
        $totalRevenue = Transaction::whereIn('prompt_id', $promptIds)->sum('amount_paid');
        $avgRating = Review::whereIn('prompt_id', $promptIds)->avg('rating') ?: 0;
        $reviewsCount = Review::whereIn('prompt_id', $promptIds)->count();

        $followerCount = DB::table('follows')
            ->where('following_address', $user->wallet_address)
            ->count();

        $followingCount = DB::table('follows')
            ->where('follower_address', $user->wallet_address)
            ->count();

        $isFollowing = false;
        if ($authUser) {
            $isFollowing = DB::table('follows')
                ->where('follower_address', $authUser->wallet_address)
                ->where('following_address', $user->wallet_address)
                ->exists();
        }

        return response()->json([
            'wallet_address' => $user->wallet_address,
            'name' => $user->name,
            'username' => $user->username,
            'bio' => $user->bio,
            'avatar_url' => $user->avatar_url,
            'cover_url' => $user->cover_url,
            'roles' => $user->roles,
            'joined_at' => $user->created_at?->format('F Y'),
            'stats' => [
                'prompts_count' => $promptsCount,
                'total_sales' => $totalSales,
                'total_revenue' => (float)$totalRevenue,
                'avg_rating' => round($avgRating, 1),
                'reviews_count' => $reviewsCount,
                'follower_count' => $followerCount,
                'following_count' => $followingCount,
            ],
            'agent_registered' => (bool) $user->agent_registered,
            'agent_verified' => (bool) $user->agent_verified,
            'agent_metadata_uri' => $user->agent_metadata_uri,
            'agent_reputation' => [
                'avg_rating' => (int) $user->agent_avg_rating,
                'completed_jobs' => (int) $user->agent_completed_jobs,
                'total_reviews' => (int) $user->agent_total_reviews,
            ],
            'is_following' => $isFollowing,
        ]);
    }

    /**
     * POST /api/users/{address}/follow
     * Toggle follow/unfollow for the given user address.
     */
    private function checkOnChainVerified(string $address): bool
    {
        $registryAddress = config('0g.agent_registry_address');
        $rpcUrl = config('0g.rpc_url');
        if (!$registryAddress || !$rpcUrl) return false;

        try {
            // isVerified(address) selector = 0xb9209e33
            $paddedAddress = str_pad(substr(strtolower($address), 2), 64, '0', STR_PAD_LEFT);
            $data = '0xb9209e33' . $paddedAddress;

            $response = Http::timeout(10)->post($rpcUrl, [
                'jsonrpc' => '2.0',
                'method' => 'eth_call',
                'params' => [
                    ['to' => $registryAddress, 'data' => $data],
                    'latest',
                ],
                'id' => 1,
            ]);

            $result = $response->json('result');
            if (!$result) return false;
            // Result is 0x...0001 if verified, 0x...0000 if not
            return hexdec(substr($result, -1)) === 1;
        } catch (\Exception $e) {
            Log::warning("Agent verification check failed: " . $e->getMessage());
            return false;
        }
    }

    public function syncAgentStatus(Request $request)
    {
        $user = $this->agentRegistry->syncAgentStatus($request->user());

        return response()->json([
            'agent_registered' => (bool) $user->agent_registered,
            'agent_verified' => (bool) $user->agent_verified,
            'agent_metadata_uri' => $user->agent_metadata_uri,
            'agent_reputation' => [
                'avg_rating' => (int) $user->agent_avg_rating,
                'completed_jobs' => (int) $user->agent_completed_jobs,
                'total_reviews' => (int) $user->agent_total_reviews,
            ],
            'agent_synced_at' => $user->agent_synced_at,
        ]);
    }

    public function toggleFollow(Request $request, $address)
    {
        $authUser = $request->user();
        $normalizedAddress = strtolower(trim((string) $address));
        $authAddress = strtolower((string) $authUser->wallet_address);

        if ($authAddress === $normalizedAddress) {
            return response()->json(['message' => 'You cannot follow yourself.'], 400);
        }

        // Verify target user exists
        User::where('wallet_address', $normalizedAddress)->firstOrFail();

        $existing = DB::table('follows')
            ->where('follower_address', $authAddress)
            ->where('following_address', $normalizedAddress)
            ->first();

        if ($existing) {
            DB::table('follows')
                ->where('follower_address', $authAddress)
                ->where('following_address', $normalizedAddress)
                ->delete();

            $followerCount = DB::table('follows')->where('following_address', $normalizedAddress)->count();

            return response()->json([
                'is_following' => false,
                'follower_count' => $followerCount,
                'message' => 'Unfollowed successfully.',
            ]);
        }

        DB::table('follows')->insert([
            'follower_address' => $authAddress,
            'following_address' => $normalizedAddress,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $followerCount = DB::table('follows')->where('following_address', $normalizedAddress)->count();

        return response()->json([
            'is_following' => true,
            'follower_count' => $followerCount,
            'message' => 'Followed successfully.',
        ]);
    }
}
