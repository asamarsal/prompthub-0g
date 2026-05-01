<?php

namespace App\Observers;

use App\Models\ArtistReview;

class ArtistReviewObserver
{
    /**
     * Handle the ArtistReview "saved" event.
     */
    public function saved(ArtistReview $artistReview): void
    {
        $this->updateArtistRating($artistReview->artist_id);
    }

    /**
     * Handle the ArtistReview "deleted" event.
     */
    public function deleted(ArtistReview $artistReview): void
    {
        $this->updateArtistRating($artistReview->artist_id);
    }

    /**
     * Recalculate and cache the artist's rating.
     */
    private function updateArtistRating($artistId): void
    {
        $artist = \App\Models\User::find($artistId);
        if ($artist) {
            $stats = \App\Models\ArtistReview::where('artist_id', $artistId)
                ->selectRaw('AVG(rating) as avg, COUNT(*) as count')
                ->first();

            $artist->update([
                'rating_avg' => $stats->avg ?? 0,
                'rating_count' => $stats->count ?? 0,
            ]);
        }
    }
}
