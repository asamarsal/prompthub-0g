<?php

namespace App\Http\Controllers;

use App\Models\ArtistReview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ArtistReviewController extends Controller
{
    /**
     * Display a listing of reviews for a specific artist.
     */
    public function index($artistId)
    {
        $reviews = ArtistReview::with('reviewer:id,name,username,wallet_address,avatar_url')
            ->where('artist_id', $artistId)
            ->latest()
            ->paginate(10);

        return response()->json($reviews);
    }

    /**
     * Store a newly created review in storage.
     */
    public function store(Request $request, $artistId)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $reviewerId = Auth::id();

        if ($reviewerId === $artistId) {
            return response()->json(['message' => 'You cannot review yourself.'], 403);
        }

        $artist = User::findOrFail($artistId);

        $review = ArtistReview::updateOrCreate(
            ['artist_id' => $artistId, 'reviewer_id' => $reviewerId],
            ['rating' => $request->rating, 'comment' => $request->comment]
        );

        return response()->json([
            'message' => 'Review submitted successfully.',
            'review' => $review
        ]);
    }
}
