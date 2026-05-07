# PromptHub Backend

> **Decentralized AI Prompt Marketplace** — A Laravel 12 REST API powering the PromptHub platform, built on the **0G Network** (EVM-compatible blockchain) with decentralized storage, on-chain escrow, and AI-powered prompt scoring.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Users & Profiles](#users--profiles)
  - [Prompts](#prompts)
  - [Prompt Content (x402 Payment Gate)](#prompt-content-x402-payment-gate)
  - [Prompt Scoring & AI](#prompt-scoring--ai)
  - [Reviews](#reviews)
  - [Bookmarks](#bookmarks)
  - [Contests](#contests)
  - [Hire Requests (Freelance)](#hire-requests-freelance)
  - [Messaging](#messaging)
  - [Connections (Friend Requests)](#connections-friend-requests)
  - [Notifications](#notifications)
  - [Dashboard](#dashboard)
  - [Categories & AI Models (Taxonomy)](#categories--ai-models-taxonomy)
  - [File Upload & Storage](#file-upload--storage)
  - [Admin](#admin)
  - [Follow System](#follow-system)
- [WebSocket Events](#websocket-events)
- [Services](#services)
- [Middleware](#middleware)
- [Database Seeders](#database-seeders)
- [Running Tests](#running-tests)

---

## Overview

PromptHub is a decentralized marketplace where creators can sell AI prompts (for image, text, code, audio, and video generation) using the **0G token**. Key features:

- **Wallet-based authentication** (no email/password) via Sanctum tokens
- **On-chain verification** of purchases, escrow funding, and contest prizes
- **0G Decentralized Storage** for prompt content with root hash tracking
- **IPFS/Pinata** integration for preview images and metadata
- **AI-powered prompt scoring** via 0G Compute (Llama 3.1)
- **AI-powered plagiarism detection** with semantic analysis
- **AI-powered similar prompt recommendations**
- **x402 payment protocol** middleware for content gating
- **Real-time messaging** via Laravel Reverb (WebSockets)
- **Contest system** with on-chain escrow and prize tiers
- **Freelance hire system** with escrow-backed project requests
- **Watermark service** for preview image protection

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Laravel 12 (PHP 8.2+) |
| Database | PostgreSQL |
| Auth | Laravel Sanctum (wallet-based) |
| Real-time | Laravel Reverb (WebSockets) |
| Blockchain | 0G Network (EVM, Chain ID 16602) |
| Storage | 0G Decentralized Storage (Galileo testnet) |
| IPFS | Pinata |
| AI Inference | 0G Compute (Llama 3.1-8B-Instruct) |
| Queue | Database driver |
| Cache | Database driver |
| Image Processing | PHP GD (watermarking) |

---

## Architecture

```
app/
├── Console/              # Artisan commands
├── Events/               # WebSocket broadcast events
│   ├── MessageSent.php
│   ├── MessageRead.php
│   ├── NotificationSent.php
│   └── Typing.php
├── Http/
│   ├── Controllers/      # 22 API controllers
│   └── Middleware/
│       └── X402Middleware.php   # Payment-gated content
├── Models/               # 15 Eloquent models
├── Observers/
│   └── ArtistReviewObserver.php  # Auto-recalculates artist ratings
├── Providers/
└── Services/
    ├── WatermarkService.php       # Image watermarking via GD
    └── ZeroGStorageService.php    # 0G decentralized storage client
```

---

## Getting Started

### Prerequisites

- PHP 8.2+
- Composer
- PostgreSQL
- Node.js & npm
- PHP GD extension (for watermarking)
- PHP bcmath extension (for wei conversion)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Prompthub-backend

# Install dependencies (also runs key:generate, migrate, npm build)
composer setup

# Or manually:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build

# Seed the database
php artisan db:seed

# Start development servers (API + Queue + Vite)
composer dev
```

This starts:
- **API server** at `http://localhost:8000`
- **Queue worker** for background jobs
- **Vite** dev server for assets

### WebSocket Server (Reverb)

```bash
php artisan reverb:start
```

Runs on port `8080` by default.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `DB_CONNECTION` | `pgsql` |
| `DB_DATABASE` | PostgreSQL database name |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials |
| **0G Blockchain** | |
| `OG_NETWORK` | `testnet` |
| `OG_CHAIN_ID` | `16602` |
| `OG_RPC_URL` | `https://evmrpc-testnet.0g.ai` |
| `MARKETPLACE_CONTRACT_ADDRESS` | Marketplace smart contract |
| `ESCROW_CONTRACT_ADDRESS` | Escrow smart contract |
| `CONTESTS_CONTRACT_ADDRESS` | Contests smart contract |
| `TREASURY_CONTRACT_ADDRESS` | Treasury smart contract |
| `AGENT_REGISTRY_ADDRESS` | Agent registry for verification |
| **0G Storage** | |
| `OG_STORAGE_NODE_URL` | `https://storagenode-galileo.0g.ai` |
| `OG_STORAGE_INDEXER_URL` | `https://indexer-galileo.0g.ai` |
| **IPFS / Pinata** | |
| `PINATA_JWT` | Pinata API JWT token |
| `PINATA_GATEWAY` | `https://gateway.pinata.cloud/ipfs/` |
| `PINATA_GROUP_ID` | Pinata group for organizing pins |
| **0G Compute (AI)** | |
| `ZG_COMPUTE_API_KEY` | 0G Compute API key |
| `ZG_COMPUTE_BASE_URL` | `https://router-api.0g.ai/v1` |
| `ZG_COMPUTE_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` |
| **WebSocket (Reverb)** | |
| `BROADCAST_CONNECTION` | `reverb` |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | Reverb credentials |
| `REVERB_HOST` / `REVERB_PORT` | WebSocket server config |

---

## Database Schema

### Entity Relationship Diagram

```
users ──────────┬──── prompts ──────── reviews
  │             │       │               │
  │             │       ├── bookmarks   │
  │             │       │               │
  │             │       └── transactions│
  │             │                       │
  ├── artist_reviews                    │
  ├── connections                       │
  ├── follows                           │
  ├── messages                          │
  ├── notifications                     │
  ├── hire_requests                     │
  └── contests ──── contest_submissions │
                                        │
categories ──── ai_models               │
specializations                         │
admin_settings                          │
```

### Tables

| Table | Description |
|-------|-------------|
| `users` | Wallet-based users with UUID PK, `wallet_address` (unique), profile info, freelance settings, skills, specializations, rating cache |
| `prompts` | AI prompts with UUID PK, pricing in 0G, IPFS CID, on-chain `contract_id`, `root_hash` (0G Storage), watermarked preview, reference images |
| `transactions` | Purchase records with `tx_id` (on-chain), buyer, prompt, amount |
| `reviews` | Prompt reviews (1 per user per prompt) |
| `artist_reviews` | Artist/creator reviews (1 per user per artist) |
| `bookmarks` | User prompt bookmarks |
| `contests` | Brand contests with escrow, prize tiers (JSON), deadline, status workflow |
| `contest_submissions` | Artist submissions to contests |
| `hire_requests` | Freelance hire requests with escrow budget |
| `messages` | Direct messages between connected users |
| `connections` | Friend/connection requests (pending → accepted/rejected) |
| `follows` | Follow relationships between users |
| `notifications` | In-app notifications with type and data |
| `categories` | Prompt categories (Image, Text, Code, Audio, Video) |
| `ai_models` | AI models grouped by category (GPT-4, Midjourney, etc.) |
| `specializations` | Artist specializations (Brand Identity, 3D Render, etc.) |
| `admin_settings` | Key-value admin configuration store |
| `personal_access_tokens` | Sanctum API tokens |

---

## API Reference

**Base URL:** `http://localhost:8000/api`

**Authentication:** Include `Authorization: Bearer <token>` header for protected routes.

---

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | No | Login/register with wallet address. Returns Sanctum token. |

**Request Body:**
```json
{
  "wallet_address": "0x1234...abcd"
}
```

**Response:**
```json
{
  "token": "1|abc123...",
  "user": { "id": "uuid", "wallet_address": "0x...", "name": "..." }
}
```

---

### Users & Profiles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/me` | Yes | Get authenticated user profile with stats |
| `PUT` | `/users/me` | Yes | Update profile (name, bio, avatar, skills, etc.) |
| `GET` | `/users/search?q=` | Yes | Search users by name/username/wallet |
| `GET` | `/users/{address}` | No | Get user by wallet address |
| `GET` | `/users/{address}/profile` | No | Detailed public profile with stats |
| `GET` | `/artists` | No | List all artists with specialties & tools |

**Profile Stats include:** total prompts, total sales, total revenue, average rating, followers/following count, on-chain verification status.

---

### Prompts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/prompts` | No | List prompts (paginated, filterable) |
| `GET` | `/prompts/{id}` | No | Get single prompt details |
| `POST` | `/prompts` | Yes | Create new prompt |
| `POST` | `/prompts/{id}/verify-purchase` | Yes | Verify on-chain purchase transaction |
| `PUT` | `/prompts/{id}/curate` | Yes | Toggle curation status (admin) |
| `POST` | `/prompts/{id}/deactivate` | Yes | Deactivate prompt (owner) |
| `POST` | `/prompts/{id}/relist` | Yes | Relist deactivated prompt (owner) |
| `PUT` | `/prompts/{id}/price` | Yes | Update prompt price (owner) |
| `GET` | `/users/me/purchased` | Yes | List purchased prompts |

**Query Parameters for `GET /prompts`:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number |
| `per_page` | int | Items per page (default 12) |
| `user_address` | string | Filter by creator wallet |
| `category` | string | Filter by category name |
| `model` | string | Filter by AI model name |
| `type` | string | Filter by content type |
| `nsfw` | bool | Include NSFW content |
| `license` | string | Filter by license type |
| `search` | string | Search title/description/tags |
| `sort` | string | `newest`, `price_asc`, `price_desc`, `popular` |

**Create Prompt Body:**
```json
{
  "title": "Cyberpunk Cityscape",
  "description": "A hyper-realistic...",
  "price_0g": "10.5",
  "preview_image_url": "https://...",
  "watermarked_preview_url": "https://...",
  "cid_ipfs": "Qm...",
  "ai_model": "Midjourney v6",
  "category": "Image Generation",
  "tags": ["cyberpunk", "city"],
  "content_type": "IMAGE",
  "is_nsfw": false,
  "license_type": "COMMERCIAL",
  "original_content": "The actual prompt text...",
  "contract_id": 1,
  "og_tx_id": "0x...",
  "root_hash": "0x...",
  "additional_info": {},
  "reference_images": ["url1", "url2"]
}
```

---

### Prompt Content (x402 Payment Gate)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/prompts/{id}/content` | Yes | Get original prompt content (payment required) |

This endpoint uses the **x402 middleware**:
1. If user is the **owner** → returns content immediately
2. If user has **already purchased** (recorded in transactions) → returns content
3. If `X-Payment` header contains a valid **on-chain tx hash** → verifies receipt, records transaction, returns content
4. Otherwise → returns **402 Payment Required** with payment details:

```json
{
  "error": "Payment Required",
  "payment_required": {
    "amount": "10500000000000000000",
    "asset": "0G (native)",
    "payTo": "0x...",
    "network": "0G Testnet (16602)"
  }
}
```

---

### Prompt Scoring & AI

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/prompts/{id}/score` | Yes | AI-score a prompt (clarity, completeness, safety, etc.) |
| `GET` | `/prompts/{id}/similar` | No | Get AI-recommended similar prompts |
| `POST` | `/prompts/check-plagiarism` | Yes | Check prompt for plagiarism |

**Score Response:**
```json
{
  "scores": {
    "clarity": 8,
    "completeness": 7,
    "safety": 9,
    "reproducibility": 8,
    "innovation": 6
  },
  "overall": 7.7,
  "feedback": "The prompt is well-structured..."
}
```

**Plagiarism Check Body:**
```json
{
  "content": "The prompt text to check...",
  "category": "Image Generation"
}
```

---

### Reviews

#### Prompt Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/prompts/{id}/reviews` | No | List reviews for a prompt (paginated) |
| `POST` | `/prompts/{id}/reviews` | Yes | Create/update review (requires purchase) |

#### Artist Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/artists/{id}/reviews` | No | List reviews for an artist (paginated) |
| `POST` | `/artists/{id}/reviews` | Yes | Create/update artist review |

**Review Body:**
```json
{
  "rating": 5,
  "comment": "Excellent prompt!"
}
```

---

### Bookmarks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/users/me/bookmarks` | Yes | List bookmarked prompts |
| `POST` | `/prompts/{id}/bookmark` | Yes | Toggle bookmark on/off |

---

### Contests

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/contests` | No | List contests (open/pending/judging) |
| `GET` | `/contests/{id}` | No | Get contest details with submissions |
| `POST` | `/contests` | Yes | Create contest with escrow |
| `POST` | `/contests/{id}/verify-fund` | Yes | Verify on-chain contest funding |
| `POST` | `/contests/{id}/submissions` | Yes | Submit to contest |
| `GET` | `/contests/{id}/submissions` | No | List contest submissions |
| `POST` | `/contests/{id}/winner` | Yes | Select winner (brand only) |

**Contest Status Flow:** `PENDING_FUNDING` → `OPEN` → `JUDGING` → `COMPLETED`

**Create Contest Body:**
```json
{
  "title": "Brand Visual Identity",
  "brand_name": "NeonX Labs",
  "category": "Image Generation",
  "about_brand": "...",
  "brief": "Create a...",
  "tags": ["branding"],
  "require_prompt_submission": true,
  "prize_tiers": [
    { "place": 1, "prize_0g": "0.25", "label": "1st Place" },
    { "place": 2, "prize_0g": "0.15", "label": "2nd Place" }
  ],
  "total_prize_0g": "0.5",
  "deadline": "2026-06-01T00:00:00Z",
  "tx_id": "0x..."
}
```

---

### Hire Requests (Freelance)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/hire/my-requests` | Yes | List hire requests (as client or artist) |
| `POST` | `/hire` | Yes | Create hire request |
| `POST` | `/hire/{id}/verify-escrow` | Yes | Verify escrow funding on-chain |
| `PUT` | `/hire/{id}/status` | Yes | Update status |

**Hire Status Flow:** `PENDING` → `ACCEPTED` / `REJECTED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`

**Create Hire Request Body:**
```json
{
  "artist_address": "0x...",
  "project_brief": "I need a...",
  "budget_0g": "5.0",
  "tx_id": "0x..."
}
```

---

### Messaging

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/messages` | Yes | List conversations with unread counts |
| `GET` | `/messages/{address}` | Yes | Message history with a user (cursor-paginated) |
| `POST` | `/messages` | Yes | Send message (requires accepted connection) |
| `POST` | `/messages/typing` | Yes | Broadcast typing indicator |
| `PUT` | `/messages/read-all` | Yes | Mark all messages from a user as read |
| `PUT` | `/messages/{id}/read` | Yes | Mark single message as read |

**Send Message Body:**
```json
{
  "receiver_address": "0x...",
  "content": "Hello!",
  "attachment_url": "https://..."
}
```

---

### Connections (Friend Requests)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/connections` | Yes | List all connections with user details |
| `POST` | `/connections` | Yes | Send connection request |
| `PUT` | `/connections/{id}/accept` | Yes | Accept connection request |
| `DELETE` | `/connections/{id}` | Yes | Remove connection |

**Connection Status Flow:** `pending` → `accepted` / `rejected`

---

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications` | Yes | List notifications |
| `PUT` | `/notifications/read` | Yes | Mark all as read |

---

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/dashboard` | Yes | Creator dashboard stats |

**Response includes:**
- `stats`: total earnings, total sales, active prompts, average rating
- `earnings_history`: monthly earnings breakdown
- `recent_sales`: latest transactions
- `prompts`: user's prompts

---

### Categories & AI Models (Taxonomy)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/categories` | No | List all categories |
| `POST` | `/categories` | Yes | Create category (admin) |
| `PUT` | `/categories/{id}` | Yes | Update category (admin) |
| `DELETE` | `/categories/{id}` | Yes | Delete category (admin) |
| `GET` | `/ai-models` | No | List all AI models with categories |
| `POST` | `/ai-models` | Yes | Create AI model (admin) |
| `PUT` | `/ai-models/{id}` | Yes | Update AI model (admin) |
| `DELETE` | `/ai-models/{id}` | Yes | Delete AI model (admin) |

---

### File Upload & Storage

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/users/upload` | Yes | Upload file to IPFS (Pinata) |
| `POST` | `/ipfs/metadata` | Yes | Upload JSON metadata to IPFS |
| `POST` | `/prompts/upload-assets` | Yes | Upload prompt asset + generate watermarked preview |
| `POST` | `/storage/upload` | Yes | Upload file to 0G Decentralized Storage |
| `GET` | `/storage/download/{rootHash}` | Yes | Download file from 0G Storage by root hash |

---

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/login` | Yes | Admin login (requires admin wallet + password) |
| `POST` | `/admin/password/otp` | Yes | Request password change OTP |
| `PUT` | `/admin/password` | Yes | Change admin password with OTP |

---

### Follow System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/users/{address}/follow` | Yes | Toggle follow/unfollow a user |

---

### Transaction History

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/prompts/{id}/transactions` | No | Paginated purchase history for a prompt |

---

## WebSocket Events

Real-time events broadcast via **Laravel Reverb**:

| Event | Channel | Payload | Trigger |
|-------|---------|---------|---------|
| `MessageSent` | `private-chat.{receiver_address}` | Message model | New message sent |
| `MessageRead` | `private-chat.{sender_address}` | `message_id`, addresses | Message marked as read |
| `Typing` | `private-chat.{receiver_address}` | `sender_address` | User is typing |
| `NotificationSent` | `private-user.{user_address}` | Notification model | New notification |

**Channel Authorization:** Users can only subscribe to channels matching their `wallet_address`.

---

## Services

### WatermarkService
Applies diagonal tiled "PromptHub" text watermark to preview images using PHP GD. Supports JPEG, PNG, GIF, and WebP formats.

### ZeroGStorageService
Client for 0G Decentralized Storage network:
- **Upload:** Stores file locally, then uploads to 0G Storage node (tries multiple API endpoints). Falls back to local storage with SHA-256 hash if network unavailable.
- **Download:** Resolves file path from root hash via 0G Indexer, falls back to local hash matching.

---

## Middleware

### X402Middleware
Implements the **x402 payment protocol** for content gating:
1. Checks if user already purchased (local DB lookup)
2. Validates `X-Payment` header containing on-chain transaction hash
3. Verifies transaction receipt via 0G RPC (`eth_getTransactionReceipt`)
4. Records transaction and grants access
5. Returns 402 with payment requirements if unpaid

---

## Database Seeders

```bash
# Run all seeders
php artisan db:seed

# Run specific seeder
php artisan db:seed --class=CategorySeeder
```

| Seeder | Description |
|--------|-------------|
| `DatabaseSeeder` | Master seeder — runs all others in order |
| `CategorySeeder` | 5 categories: Image, Text, Code, Audio, Video Generation |
| `AiModelSeeder` | 26 AI models across all categories |
| `PromptSeeder` | 7 demo prompts with various types and pricing |
| `ContestSeeder` | 3 demo contests with prize tiers |
| `SpecializationSeeder` | 8 artist specializations |
| `PromptContractIdSeeder` | Assigns sequential contract IDs to prompts |

---

## Running Tests

```bash
# Run all tests
composer test

# Or directly
php artisan test
```

Tests use SQLite in-memory database (configured in `phpunit.xml`).

---

## License

This project is built with the [Laravel framework](https://laravel.com), which is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
