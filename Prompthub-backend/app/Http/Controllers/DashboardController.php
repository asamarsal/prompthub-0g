<?php

namespace App\Http\Controllers;

use App\Models\Prompt;
use App\Models\Transaction;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $promptIds = Prompt::where('user_id', $user->id)->pluck('id');

        // 1. Stats
        $totalEarnings = Transaction::whereIn('prompt_id', $promptIds)->sum('amount_paid');
        $totalSales = Transaction::whereIn('prompt_id', $promptIds)->count();
        $activePromptsCount = Prompt::where('user_id', $user->id)->where('is_published', true)->count();
        
        $avgRating = Review::whereIn('prompt_id', $promptIds)->avg('rating') ?: 0;
        $reviewsCount = Review::whereIn('prompt_id', $promptIds)->count();

        // 2. Earnings History (Last 30 days default)
        $days = $request->query('days', 30);
        $startDate = Carbon::now()->subDays($days);

        $earningsHistory = Transaction::whereIn('prompt_id', $promptIds)
            ->where('created_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(amount_paid) as earnings')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($row) {
                return [
                    'date' => $row->date,
                    'earnings' => (float) $row->earnings,
                ];
            });

        // 3. Recent Sales
        $recentSales = Transaction::with('prompt:id,title')
            ->whereIn('prompt_id', $promptIds)
            ->latest()
            ->limit(5)
            ->get()
            ->map(function($tx) {
                return [
                    'prompt' => $tx->prompt->title ?? 'Deleted Prompt',
                    'buyer' => substr($tx->buyer_address, 0, 6) . '...' . substr($tx->buyer_address, -4),
                    'price' => $tx->amount_paid,
                    'status' => 'completed', // All successful DB trans are completed
                    'date' => $tx->created_at->toDateTimeString(),
                ];
            });

        // 4. User's Prompts
        $myPrompts = Prompt::where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->get()
            ->map(function($p) {
                return [
                    'id' => $p->id,
                    'title' => $p->title,
                    'image' => $p->preview_image_url,
                    'price' => (float)$p->price_0g,
                    'sales' => $p->total_sold,
                    'model' => $p->ai_model,
                    'is_active' => $p->is_published,
                ];
            });

        return response()->json([
            'stats' => [
                'totalEarnings' => (float)$totalEarnings,
                'totalSales' => $totalSales,
                'activePrompts' => $activePromptsCount,
                'averageRating' => round($avgRating, 1),
                'reviewsCount' => $reviewsCount,
            ],
            'earningsHistory' => $earningsHistory,
            'recentSales' => $recentSales,
            'myPrompts' => $myPrompts,
        ]);
    }
}
