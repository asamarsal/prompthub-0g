<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\PromptController;
use App\Http\Controllers\ContestController;
use App\Http\Controllers\HireRequestController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\AiModelController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\StorageController;
use App\Http\Controllers\PromptScoreController;
use App\Http\Controllers\PromptRecommendationController;
use App\Http\Controllers\PlagiarismController;

use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\ArtistReviewController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\DashboardController;

Route::post('/auth/login', [AuthController::class, 'login']);

// Public routes
Route::get('/prompts', [PromptController::class, 'index']);
Route::get('/prompts/{id}', [PromptController::class, 'show'])->whereUuid('id');
Route::get('/contests', [ContestController::class, 'index']);
Route::get('/contests/{id}', [ContestController::class, 'show']);
Route::get('/contests/{id}/submissions', [\App\Http\Controllers\ContestSubmissionController::class, 'index']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/ai-models', [AiModelController::class, 'index']);
Route::get('/artists', [UserController::class, 'artists']);
Route::get('/artists/{id}/reviews', [ArtistReviewController::class, 'index']);
Route::get('/prompts/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/prompts/{id}/transactions', [TransactionController::class, 'promptHistory']);
Route::get('/prompts/{id}/similar', [PromptRecommendationController::class, 'similar']);
Route::post('/prompts/check-plagiarism', [PlagiarismController::class, 'check']);

// Protected routes (requires Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    // Admin
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::post('/admin/password/otp', [AdminAuthController::class, 'requestPasswordOtp']);
    Route::put('/admin/password', [AdminAuthController::class, 'changePassword']);

    // Users
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/users/me', [AuthController::class, 'me']);
    Route::put('/users/me', [AuthController::class, 'update']);
    Route::post('/users/me/sync-agent', [UserController::class, 'syncAgentStatus']);
    Route::post('/users/upload', [\App\Http\Controllers\FileController::class, 'uploadToIpfs']);
    Route::post('/ipfs/metadata', [\App\Http\Controllers\FileController::class, 'uploadMetadata']);
    Route::post('/prompts/upload-assets', [\App\Http\Controllers\FileController::class, 'uploadPromptAsset']);
    Route::post('/storage/upload', [StorageController::class, 'upload']);
    Route::get('/storage/download/{rootHash}', [StorageController::class, 'download']);
    
    // Artist Reviews
    Route::post('/artists/{id}/reviews', [ArtistReviewController::class, 'store']);
    
    // Taxonomy
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    Route::post('/ai-models', [AiModelController::class, 'store']);
    Route::put('/ai-models/{id}', [AiModelController::class, 'update']);
    Route::delete('/ai-models/{id}', [AiModelController::class, 'destroy']);
    
    // Prompts
    Route::post('/prompts', [PromptController::class, 'store']);
    Route::post('/prompts/{id}/reviews', [ReviewController::class, 'store']);
    Route::post('/prompts/{id}/verify-purchase', [PromptController::class, 'verifyPurchase']);
    Route::put('/prompts/{id}/curate', [PromptController::class, 'curate']);
    Route::post('/prompts/{id}/deactivate', [PromptController::class, 'deactivate']);
    Route::post('/prompts/{id}/relist', [PromptController::class, 'relist']);
    Route::put('/prompts/{id}/price', [PromptController::class, 'updatePrice']);
    Route::get('/prompts/{id}/content', [PromptController::class, 'getContent'])->middleware('x402');
    Route::get('/prompts/{id}/storage-refs', [PromptController::class, 'storageRefs'])->middleware('x402');
    Route::post('/prompts/{id}/score', [PromptScoreController::class, 'score']);
    Route::post('/prompts/preview-score', [PromptScoreController::class, 'preview']);

    // Contests
    Route::post('/contests', [ContestController::class, 'store']);
    Route::post('/contests/{id}/verify-fund', [ContestController::class, 'verifyFund']);
    Route::post('/contests/{id}/submissions', [\App\Http\Controllers\ContestSubmissionController::class, 'store']);
    Route::post('/contests/{id}/winner', [ContestController::class, 'selectWinner']);

    // Hire
    Route::get('/hire/my-requests', [HireRequestController::class, 'index']);
    Route::post('/hire', [HireRequestController::class, 'store']);
    Route::post('/hire/{id}/verify-escrow', [HireRequestController::class, 'verifyEscrow']);
    Route::post('/hire/{id}/verify-completion', [HireRequestController::class, 'verifyCompletion']);
    Route::put('/hire/{id}/status', [HireRequestController::class, 'updateStatus']);

    // Messages
    Route::get('/connections', [\App\Http\Controllers\ConnectionController::class, 'index']);
    Route::post('/connections', [\App\Http\Controllers\ConnectionController::class, 'store']);
    Route::put('/connections/{id}/accept', [\App\Http\Controllers\ConnectionController::class, 'accept']);
    Route::delete('/connections/{id}', [\App\Http\Controllers\ConnectionController::class, 'destroy']);

    // Messages
    Route::get('/messages', [MessageController::class, 'index']);
    Route::get('/messages/{address}', [MessageController::class, 'history']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::post('/messages/typing', [MessageController::class, 'typing']);
    Route::put('/messages/read-all', [MessageController::class, 'readAll']);
    Route::put('/messages/{id}/read', [MessageController::class, 'read']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/read', [NotificationController::class, 'markAsRead']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Bookmarks
    Route::get('/users/me/bookmarks', [BookmarkController::class, 'index']);
    Route::get('/users/me/purchased', [PromptController::class, 'purchased']);
    Route::post('/prompts/{id}/bookmark', [BookmarkController::class, 'toggle']);

    // Follow
    Route::post('/users/{address}/follow', [UserController::class, 'toggleFollow']);
});

Route::get('/users/{address}', [AuthController::class, 'show']);
Route::get('/users/{address}/profile', [UserController::class, 'publicProfile']);
