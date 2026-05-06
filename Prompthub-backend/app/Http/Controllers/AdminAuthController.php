<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $this->ensureAdminWallet($request);

        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validated['username'] !== config('admin.username')) {
            return response()->json(['message' => 'Invalid admin credentials'], 422);
        }

        if (!$this->passwordMatches($validated['password'])) {
            return response()->json(['message' => 'Invalid admin credentials'], 422);
        }

        $token = Str::random(80);
        $wallet = strtolower((string) $request->user()->wallet_address);
        $ttl = now()->addMinutes((int) config('admin.session_ttl_minutes'));

        Cache::put($this->sessionKey($token), $wallet, $ttl);

        return response()->json([
            'admin_token' => $token,
            'expires_at' => $ttl->toISOString(),
            'wallet' => $wallet,
        ]);
    }

    public function requestPasswordOtp(Request $request)
    {
        $this->ensureAdminWallet($request);
        $this->ensureAdminSession($request);

        $otp = (string) random_int(100000, 999999);
        $ttlMinutes = (int) config('admin.otp_ttl_minutes');
        $email = config('admin.otp_email');

        Cache::put($this->otpKey($request), Hash::make($otp), now()->addMinutes($ttlMinutes));

        Mail::raw(
            "PromptHub admin password change OTP: {$otp}\n\nThis code expires in {$ttlMinutes} minutes.",
            function ($message) use ($email) {
                $message->to($email)->subject('PromptHub Admin OTP');
            }
        );

        return response()->json([
            'message' => 'OTP sent',
            'email' => $email,
            'expires_in_minutes' => $ttlMinutes,
        ]);
    }

    public function changePassword(Request $request)
    {
        $this->ensureAdminWallet($request);
        $this->ensureAdminSession($request);

        $validated = $request->validate([
            'otp' => 'required|string|size:6',
            'new_password' => 'required|string|min:4|max:255|confirmed',
        ]);

        $otpHash = Cache::get($this->otpKey($request));
        if (!$otpHash || !Hash::check($validated['otp'], $otpHash)) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        DB::table('admin_settings')->updateOrInsert(
            ['key' => 'admin_password_hash'],
            [
                'value' => Hash::make($validated['new_password']),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        Cache::forget($this->otpKey($request));

        return response()->json(['message' => 'Admin password updated']);
    }

    private function ensureAdminWallet(Request $request): void
    {
        $wallet = strtolower((string) $request->user()?->wallet_address);

        abort_if(!$wallet || $wallet !== config('admin.wallet'), 403, 'This wallet is not allowed to access admin.');
    }

    public static function validateAdminRequest(Request $request): void
    {
        $wallet = strtolower((string) $request->user()?->wallet_address);
        abort_if(!$wallet || $wallet !== config('admin.wallet'), 403, 'This wallet is not allowed to access admin.');

        $token = (string) $request->header('X-Admin-Token');
        abort_if(!$token, 403, 'Admin login required.');

        $sessionWallet = Cache::get('admin:session:' . hash('sha256', $token));
        abort_if($sessionWallet !== $wallet, 403, 'Admin login required.');
    }

    private function ensureAdminSession(Request $request): void
    {
        self::validateAdminRequest($request);
    }

    private function passwordMatches(string $password): bool
    {
        if (!Schema::hasTable('admin_settings')) {
            return hash_equals((string) config('admin.default_password'), $password);
        }

        $hash = DB::table('admin_settings')->where('key', 'admin_password_hash')->value('value');

        if ($hash) {
            return Hash::check($password, $hash);
        }

        return hash_equals((string) config('admin.default_password'), $password);
    }

    private function sessionKey(string $token): string
    {
        return 'admin:session:' . hash('sha256', $token);
    }

    private function otpKey(Request $request): string
    {
        return 'admin:password-otp:' . strtolower((string) $request->user()->wallet_address);
    }
}
