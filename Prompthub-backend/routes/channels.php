<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{address}', function ($user, $address) {
    return $user->wallet_address === $address;
});

Broadcast::channel('user.{address}', function ($user, $address) {
    return $user->wallet_address === $address;
});
