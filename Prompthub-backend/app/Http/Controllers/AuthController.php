<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\HireRequest;
use App\Models\ArtistReview;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'wallet_address' => 'required|string',
        ]);

        $address = strtolower(trim($request->wallet_address));
        $user = User::firstOrCreate(['wallet_address' => $address]);
        
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->enrichProfile($request->user()));
    }

    public function show($address)
    {
        $user = User::where('wallet_address', strtolower(trim($address)))->firstOrFail();
        return response()->json($this->enrichProfile($user));
    }

    private function enrichProfile(User $user)
    {
        // Refresh with counts and sums
        $user = User::where('id', $user->id)
            ->withSum('prompts as sold_count', 'total_sold')
            ->withCount('prompts')
            ->withAvg('reviewsReceived as rating_avg', 'rating')
            ->withCount('reviewsReceived as reviews_count')
            ->first();

        // Calculate completed projects from HireRequest
        $projectsCount = HireRequest::where('artist_address', $user->wallet_address)
            ->where('status', 'COMPLETED')
            ->count();

        // Get Recent Activity
        $activities = [];

        // Latest Prompts
        $prompts = $user->prompts()
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($prompts as $p) {
            $activities[] = [
                'type' => 'prompt',
                'text' => "Published a new prompt: {$p->title}",
                'time' => $p->created_at->diffForHumans(),
                'timestamp' => $p->created_at->timestamp,
                'icon' => '📦'
            ];
        }

        // Latest Reviews
        $reviews = $user->reviewsReceived()
            ->with('reviewer')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($reviews as $r) {
            $activities[] = [
                'type' => 'review',
                'text' => "Received a {$r->rating}-star review from " . ($r->reviewer->name ?? 'a client'),
                'time' => $r->created_at->diffForHumans(),
                'timestamp' => $r->created_at->timestamp,
                'icon' => '⭐'
            ];
        }

        // Sort activity (latest first)
        usort($activities, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);
        $activities = array_slice($activities, 0, 5);

        // Convert to array and handle nested data
        $userData = $user->toArray();
        $userData['specialties'] = $user->getMappedSpecialties();
        $userData['tools'] = $user->getMappedTools();
        
        $userData['stats'] = [
            'rating' => round($user->rating_avg ?? 0, 1),
            'projects' => $projectsCount,
            'reviews' => $user->reviews_count,
            'sold' => (int)($user->sold_count ?? 0),
        ];
        $userData['activities'] = $activities;

        return $userData;
    }

    public function update(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'username' => 'nullable|string|min:3|max:30|unique:users,username,' . $user->id,
            'is_available_for_freelance' => 'boolean',
            'hourly_rate' => 'numeric|min:0.0001|max:1000',
            'hourly_rate_currency' => 'nullable|string|in:0G,0G',
            'specialization_id' => 'nullable|array',
        ]);
        
        $user->update($request->only(['username', 'name', 'bio', 'avatar_url', 'cover_url', 'roles', 'is_available_for_freelance', 'hourly_rate', 'hourly_rate_currency', 'specialization_id']));
        return response()->json($user);
    }
}
