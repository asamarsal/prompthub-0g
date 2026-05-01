<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Prompt;
use App\Models\Bookmark;
use Illuminate\Support\Facades\Auth;

class BookmarkController extends Controller
{
    /**
     * Display a listing of the user's bookmarked prompts.
     */
    public function index()
    {
        $user = Auth::user();
        $bookmarks = $user->bookmarkedPrompts()->with('user')->paginate(12);
        
        return response()->json($bookmarks);
    }

    /**
     * Toggle bookmark for a prompt.
     */
    public function toggle(string $promptId)
    {
        $user = Auth::user();
        $prompt = Prompt::findOrFail($promptId);

        $exists = Bookmark::where('user_id', $user->id)
            ->where('prompt_id', $promptId)
            ->first();

        if ($exists) {
            $exists->delete();
            return response()->json([
                'success' => true,
                'is_bookmarked' => false,
                'message' => 'Removed from collection'
            ]);
        }

        Bookmark::create([
            'user_id' => $user->id,
            'prompt_id' => $promptId
        ]);

        return response()->json([
            'success' => true,
            'is_bookmarked' => true,
            'message' => 'Added to collection'
        ]);
    }
}
