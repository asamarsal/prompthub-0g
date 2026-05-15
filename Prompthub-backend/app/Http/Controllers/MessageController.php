<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        $messages = Message::where('sender_address', $address)
            ->orWhere('receiver_address', $address)
            ->orderBy('created_at', 'desc')
            ->get();
            
        // First get unread count per user
        $unreadCounts = [];
        foreach ($messages as $msg) {
            if ($msg->receiver_address === $address && !$msg->is_read) {
                $unreadCounts[$msg->sender_address] = ($unreadCounts[$msg->sender_address] ?? 0) + 1;
            }
        }
            
        // Group by conversation
        $conversations = [];
        foreach ($messages as $msg) {
            $other = $msg->sender_address === $address ? $msg->receiver_address : $msg->sender_address;
            if (!isset($conversations[$other])) {
                $mArray = $msg->toArray();
                $mArray['unread_count'] = $unreadCounts[$other] ?? 0;
                $conversations[$other] = $mArray;
            }
        }
        
        return response()->json(array_values($conversations));
    }

    public function history(Request $request, $otherAddress)
    {
        $address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        $messages = Message::where(function($q) use ($address, $otherAddress) {
                $q->where('sender_address', $address)->where('receiver_address', $otherAddress);
            })->orWhere(function($q) use ($address, $otherAddress) {
                $q->where('sender_address', $otherAddress)->where('receiver_address', $address);
            })->orderBy('created_at', 'desc')->cursorPaginate(50);
            
        return response()->json($messages);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_address' => 'required|string',
            'hire_request_id' => 'nullable|uuid',
            'content' => 'required|string',
            'attachment_url' => 'nullable|string',
        ]);
        
        $sender_address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        $receiver_address = $validated['receiver_address'];

        // Check connection
        $connectionExists = \App\Models\Connection::where(function($q) use ($sender_address, $receiver_address) {
            $q->where('requester_address', $sender_address)
              ->where('recipient_address', $receiver_address);
        })->orWhere(function($q) use ($sender_address, $receiver_address) {
            $q->where('requester_address', $receiver_address)
              ->where('recipient_address', $sender_address);
        })->where('status', 'accepted')->exists();

        if (!$connectionExists && $sender_address !== $receiver_address) {
            return response()->json(['message' => 'You must be friends to send a message.'], 403);
        }

        $validated['sender_address'] = $sender_address;
        
        $message = Message::create($validated);
        broadcast(new \App\Events\MessageSent($message));

        // Create notification
        $sender = $request->user();
        $senderName = $sender->username ? '@' . $sender->username : ($sender->name ?? 'someone');
        $notification = \App\Models\Notification::create([
            'user_address' => $receiver_address,
            'type' => 'message',
            'data' => [
                'title' => 'New Message',
                'message' => '1 unread message from ' . $senderName,
                'link' => '/messages',
            ],
        ]);
        broadcast(new \App\Events\NotificationSent($notification));

        return response()->json($message, 201);
    }
    
    public function typing(Request $request)
    {
        $request->validate([
            'receiver_address' => 'required|string',
        ]);
        
        $sender_address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        broadcast(new \App\Events\Typing($sender_address, $request->receiver_address));
        
        return response()->json(['status' => 'typing sent']);
    }

    public function readAll(Request $request)
    {
        $request->validate([
            'sender_address' => 'required|string',
        ]);
        
        $receiver_address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        
        Message::where('sender_address', $request->sender_address)
            ->where('receiver_address', $receiver_address)
            ->where('is_read', false)
            ->update(['is_read' => true]);
            
        // We broadcast a signal so the sender knows their messages were read
        broadcast(new \App\Events\MessageRead('all', $request->sender_address, $receiver_address));
        
        return response()->json(['status' => 'marked read']);
    }

    public function read(Request $request, $id)
    {
        $receiver_address = $request->user()->wallet_address ?? '0x0000000000000000000000000000000000000000';
        
        $msg = Message::find($id);
        if ($msg && $msg->receiver_address === $receiver_address && !$msg->is_read) {
            $msg->is_read = true;
            $msg->save();
            broadcast(new \App\Events\MessageRead($msg->id, $msg->sender_address, $receiver_address));
        }

        return response()->json(['status' => 'marked read']);
    }
}
