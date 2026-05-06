<?php

return [
    'wallet' => strtolower(env('PROMPTHUB_ADMIN_WALLET', '0xfeff727205fe524a3a8a16c404fec9cfe4124acd')),
    'username' => env('PROMPTHUB_ADMIN_USERNAME', 'admin'),
    'default_password' => env('PROMPTHUB_ADMIN_PASSWORD', 'admin'),
    'otp_email' => env('PROMPTHUB_ADMIN_OTP_EMAIL', 'ujangmental@gmail.com'),
    'session_ttl_minutes' => (int) env('PROMPTHUB_ADMIN_SESSION_TTL', 480),
    'otp_ttl_minutes' => (int) env('PROMPTHUB_ADMIN_OTP_TTL', 10),
];
