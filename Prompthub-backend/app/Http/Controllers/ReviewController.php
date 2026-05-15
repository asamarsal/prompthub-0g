<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Prompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function index($promptId)
    {
        $reviews = Review::with('reviewer:wallet_address,name,username,avatar_url')
            ->where('prompt_id', $promptId)
            ->latest()
            ->paginate(10);

        return response()->json($reviews);
    }

    public function store(Request $request, $promptId)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $prompt = Prompt::findOrFail($promptId);

        // Verification logic: Check if user purchased the prompt OR is the creator
        $isCreator = $user->id === $prompt->user_id;
        $hasPurchased = \App\Models\Transaction::where('prompt_id', $promptId)
            ->where('buyer_address', $user->wallet_address)
            ->exists();

        if (!$isCreator && !$hasPurchased) {
            return response()->json(['message' => 'You must purchase this prompt before leaving a review.'], 403);
        }

        $review = Review::updateOrCreate(
            ['prompt_id' => $promptId, 'reviewer_address' => $user->wallet_address],
            ['rating' => $request->rating, 'comment' => $request->comment]
        );

        // Recalculate prompt average rating if needed
        
        return response()->json([
            'message' => 'Review submitted successfully.',
            'review' => $review
        ]);
    }
}
