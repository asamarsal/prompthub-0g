<?php

namespace App\Http\Controllers;

use App\Models\ContestSubmission;
use Illuminate\Http\Request;

class ContestSubmissionController extends Controller
{
    /**
     * Display a listing of submissions for a specific contest.
     */
    public function index($contestId)
    {
        return response()->json(
            ContestSubmission::where('contest_id', $contestId)
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    /**
     * Store a newly created submission.
     */
    public function store(Request $request, $contestId)
    {
        $validated = $request->validate([
            'artist_address' => 'required|string',
            'cid_ipfs' => 'nullable|string',
            'preview_image_url' => 'required|url',
        ]);
        $validated['artist_address'] = strtolower(trim($validated['artist_address']));

        $validated['id'] = (string) \Illuminate\Support\Str::uuid();
        $validated['contest_id'] = $contestId;
        $validated['is_winner'] = false;

        $submission = ContestSubmission::create($validated);

        return response()->json($submission, 201);
    }

    /**
     * Display the specified submission.
     */
    public function show($id)
    {
        return response()->json(ContestSubmission::findOrFail($id));
    }
}
