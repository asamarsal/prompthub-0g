<?php

namespace App\Http\Controllers;

use App\Models\Connection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConnectionController extends Controller
{
    /**
     * Get connections and pending requests for the authenticated user.
     */
    public function index(Request $request)
    {
        $address = $request->user()->wallet_address;

        $connections = Connection::where('requester_address', $address)
            ->orWhere('recipient_address', $address)
            ->with(['requester:wallet_address,name,username,avatar_url', 'recipient:wallet_address,name,username,avatar_url'])
            ->get();

        return response()->json($connections);
    }

    /**
     * Send a friend request to another user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'recipient_address' => 'required|string|exists:users,wallet_address'
        ]);

        $requester_address = $request->user()->wallet_address;
        $recipient_address = $request->recipient_address;

        if ($requester_address === $recipient_address) {
            return response()->json(['message' => 'Cannot send request to yourself.'], 400);
        }

        // Check if connection already exists
        $existing = Connection::where(function($q) use ($requester_address, $recipient_address) {
            $q->where('requester_address', $requester_address)
              ->where('recipient_address', $recipient_address);
        })->orWhere(function($q) use ($requester_address, $recipient_address) {
            $q->where('requester_address', $recipient_address)
              ->where('recipient_address', $requester_address);
        })->first();

        if ($existing) {
            return response()->json(['message' => 'Connection already exists.'], 400);
        }

        $connection = Connection::create([
            'requester_address' => $requester_address,
            'recipient_address' => $recipient_address,
            'status' => 'pending'
        ]);

        $notification = \App\Models\Notification::create([
            'user_address' => $recipient_address,
            'type' => 'friend_request',
            'data' => [
                'title' => 'New Friend Request',
                'message' => 'You have a new friend request from ' . ($request->user()->name ?? 'a user') . '.',
                'link' => '/messages',
            ],
        ]);
        
        broadcast(new \App\Events\NotificationSent($notification));

        return response()->json(['message' => 'Friend request sent.', 'connection' => $connection]);
    }

    /**
     * Accept a friend request.
     */
    public function accept(Request $request, $id)
    {
        $connection = Connection::findOrFail($id);

        if ($connection->recipient_address !== $request->user()->wallet_address) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $connection->status = 'accepted';
        $connection->save();

        return response()->json(['message' => 'Friend request accepted.', 'connection' => $connection]);
    }

    /**
     * Reject or remove a friend connection.
     */
    public function destroy(Request $request, $id)
    {
        $connection = Connection::findOrFail($id);

        $address = $request->user()->wallet_address;
        if ($connection->requester_address !== $address && $connection->recipient_address !== $address) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $connection->delete();

        return response()->json(['message' => 'Connection removed.']);
    }
}
