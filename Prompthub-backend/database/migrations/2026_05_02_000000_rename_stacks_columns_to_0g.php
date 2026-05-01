<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration: Rename all Stacks/sBTC column names to 0G-compatible names.
 *
 * stx_address  → wallet_address  (users table + all FK references)
 * price_sbtc   → price_0g        (prompts table)
 * budget_sbtc  → budget_0g       (hire_requests table)
 * total_prize_sbtc → total_prize_0g (contests table)
 *
 * Note: prize_tiers JSON column in contests contains "prize_sbtc" keys
 *       which are handled via a raw UPDATE after the schema changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Drop all foreign keys that reference users.stx_address ──

        Schema::table('contests', function (Blueprint $table) {
            $table->dropForeign(['brand_address']);
        });
        Schema::table('hire_requests', function (Blueprint $table) {
            $table->dropForeign(['client_address']);
            $table->dropForeign(['artist_address']);
        });
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['sender_address']);
            $table->dropForeign(['receiver_address']);
        });
        Schema::table('contest_submissions', function (Blueprint $table) {
            $table->dropForeign(['artist_address']);
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['buyer_address']);
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['user_address']);
        });
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['reviewer_address']);
        });
        Schema::table('connections', function (Blueprint $table) {
            $table->dropForeign(['requester_address']);
            $table->dropForeign(['recipient_address']);
        });
        Schema::table('follows', function (Blueprint $table) {
            $table->dropForeign(['follower_address']);
            $table->dropForeign(['following_address']);
        });

        // ── 2. Rename the primary column in users ──

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('stx_address', 'wallet_address');
        });

        // ── 3. Rename pricing / budget columns ──

        Schema::table('prompts', function (Blueprint $table) {
            $table->renameColumn('price_sbtc', 'price_0g');
        });

        Schema::table('hire_requests', function (Blueprint $table) {
            $table->renameColumn('budget_sbtc', 'budget_0g');
        });

        Schema::table('contests', function (Blueprint $table) {
            $table->renameColumn('total_prize_sbtc', 'total_prize_0g');
        });

        // ── 4. Re-create all foreign keys pointing to users.wallet_address ──

        Schema::table('contests', function (Blueprint $table) {
            $table->foreign('brand_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('hire_requests', function (Blueprint $table) {
            $table->foreign('client_address')->references('wallet_address')->on('users')->onDelete('cascade');
            $table->foreign('artist_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('messages', function (Blueprint $table) {
            $table->foreign('sender_address')->references('wallet_address')->on('users')->onDelete('cascade');
            $table->foreign('receiver_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('contest_submissions', function (Blueprint $table) {
            $table->foreign('artist_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign('buyer_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreign('user_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreign('reviewer_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('connections', function (Blueprint $table) {
            $table->foreign('requester_address')->references('wallet_address')->on('users')->onDelete('cascade');
            $table->foreign('recipient_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });
        Schema::table('follows', function (Blueprint $table) {
            $table->foreign('follower_address')->references('wallet_address')->on('users')->onDelete('cascade');
            $table->foreign('following_address')->references('wallet_address')->on('users')->onDelete('cascade');
        });

        // ── 5. Update JSON prize_tiers: rename "prize_sbtc" → "prize_0g" ──

        DB::table('contests')->get()->each(function ($contest) {
            if ($contest->prize_tiers) {
                $updated = str_replace('"prize_sbtc"', '"prize_0g"', $contest->prize_tiers);
                DB::table('contests')->where('id', $contest->id)->update(['prize_tiers' => $updated]);
            }
        });
    }

    public function down(): void
    {
        // ── Drop FKs ──
        Schema::table('contests', fn (Blueprint $t) => $t->dropForeign(['brand_address']));
        Schema::table('hire_requests', function (Blueprint $t) {
            $t->dropForeign(['client_address']);
            $t->dropForeign(['artist_address']);
        });
        Schema::table('messages', function (Blueprint $t) {
            $t->dropForeign(['sender_address']);
            $t->dropForeign(['receiver_address']);
        });
        Schema::table('contest_submissions', fn (Blueprint $t) => $t->dropForeign(['artist_address']));
        Schema::table('transactions', fn (Blueprint $t) => $t->dropForeign(['buyer_address']));
        Schema::table('notifications', fn (Blueprint $t) => $t->dropForeign(['user_address']));
        Schema::table('reviews', fn (Blueprint $t) => $t->dropForeign(['reviewer_address']));
        Schema::table('connections', function (Blueprint $t) {
            $t->dropForeign(['requester_address']);
            $t->dropForeign(['recipient_address']);
        });
        Schema::table('follows', function (Blueprint $t) {
            $t->dropForeign(['follower_address']);
            $t->dropForeign(['following_address']);
        });

        // ── Reverse renames ──
        Schema::table('users', fn (Blueprint $t) => $t->renameColumn('wallet_address', 'stx_address'));
        Schema::table('prompts', fn (Blueprint $t) => $t->renameColumn('price_0g', 'price_sbtc'));
        Schema::table('hire_requests', fn (Blueprint $t) => $t->renameColumn('budget_0g', 'budget_sbtc'));
        Schema::table('contests', fn (Blueprint $t) => $t->renameColumn('total_prize_0g', 'total_prize_sbtc'));

        // ── Re-create FKs pointing back to stx_address ──
        Schema::table('contests', fn (Blueprint $t) => $t->foreign('brand_address')->references('stx_address')->on('users')->onDelete('cascade'));
        Schema::table('hire_requests', function (Blueprint $t) {
            $t->foreign('client_address')->references('stx_address')->on('users')->onDelete('cascade');
            $t->foreign('artist_address')->references('stx_address')->on('users')->onDelete('cascade');
        });
        Schema::table('messages', function (Blueprint $t) {
            $t->foreign('sender_address')->references('stx_address')->on('users')->onDelete('cascade');
            $t->foreign('receiver_address')->references('stx_address')->on('users')->onDelete('cascade');
        });
        Schema::table('contest_submissions', fn (Blueprint $t) => $t->foreign('artist_address')->references('stx_address')->on('users')->onDelete('cascade'));
        Schema::table('transactions', fn (Blueprint $t) => $t->foreign('buyer_address')->references('stx_address')->on('users')->onDelete('cascade'));
        Schema::table('notifications', fn (Blueprint $t) => $t->foreign('user_address')->references('stx_address')->on('users')->onDelete('cascade'));
        Schema::table('reviews', fn (Blueprint $t) => $t->foreign('reviewer_address')->references('stx_address')->on('users')->onDelete('cascade'));
        Schema::table('connections', function (Blueprint $t) {
            $t->foreign('requester_address')->references('stx_address')->on('users')->onDelete('cascade');
            $t->foreign('recipient_address')->references('stx_address')->on('users')->onDelete('cascade');
        });
        Schema::table('follows', function (Blueprint $t) {
            $t->foreign('follower_address')->references('stx_address')->on('users')->onDelete('cascade');
            $t->foreign('following_address')->references('stx_address')->on('users')->onDelete('cascade');
        });

        // ── Reverse JSON ──
        DB::table('contests')->get()->each(function ($contest) {
            if ($contest->prize_tiers) {
                $updated = str_replace('"prize_0g"', '"prize_sbtc"', $contest->prize_tiers);
                DB::table('contests')->where('id', $contest->id)->update(['prize_tiers' => $updated]);
            }
        });
    }
};
