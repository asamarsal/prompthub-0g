/**
 * PromptHub API Client
 * Handles all communication with the Laravel backend.
 * Base URL is read from NEXT_PUBLIC_API_URL env var (default: http://localhost:8000).
 */

import axios from "axios"
import type { AxiosInstance } from "axios"
import { getMarketplaceContract } from "@/lib/evm"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const TOKEN_KEY = "prompthub_api_token"
const ADMIN_TOKEN_KEY = "prompthub_admin_token"
const COINGECKO_COIN_ID = process.env.NEXT_PUBLIC_COINGECKO_COIN_ID ?? "zero-gravity"
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(COINGECKO_COIN_ID)}&vs_currencies=usd`

/**
 * Fetches the current 0G price in USD from CoinGecko.
 * Returns a fallback of 0.50 if the request fails (0G is currently below $1).
 */
export async function fetch0GPrice(): Promise<number> {
    const FALLBACK_PRICE = 0.5 // Realistic fallback — 0G is currently below $1
    try {
        const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY
        const url = apiKey
            ? `${COINGECKO_URL}&x_cg_demo_api_key=${apiKey}`
            : COINGECKO_URL

        const res = await fetch(url, { next: { revalidate: 300 } }) // Cache 5 min
        if (!res.ok) {
            console.warn(`CoinGecko returned HTTP ${res.status}, using fallback price.`)
            return FALLBACK_PRICE
        }

        const data = await res.json()
        const coin = data?.[COINGECKO_COIN_ID]
        if (coin && typeof coin.usd === "number" && coin.usd > 0) {
            return coin.usd
        }

        console.warn(`CoinGecko response missing ${COINGECKO_COIN_ID}.usd, using fallback.`)
        return FALLBACK_PRICE
    } catch {
        // Suppress console.error so it doesn't trigger the Next.js dev error overlay
        console.warn("CoinGecko API blocked or offline. Using fallback 0G price.")
        return FALLBACK_PRICE
    }
}

// Standard Axios instance for x402 protected routes
const x402Api = axios.create({
    baseURL: BASE_URL,
    headers: {
        Accept: "application/json",
    },
})

function wrapAxiosWithPayment(api: AxiosInstance, account: any) {
    if (!account?.enableX402Payment) {
        return api
    }

    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const response = error?.response
            const originalRequest = error?.config
            if (response?.status !== 402 || originalRequest?._x402Retry) {
                throw error
            }

            const encoded = response.headers?.["payment-required"]
            if (!encoded) {
                throw error
            }

            let requirements: any = null
            try {
                const decoded = atob(encoded)
                requirements = JSON.parse(decoded)?.paymentRequirements
            } catch {
                throw error
            }

            const contractId = requirements?.contractId
            const amount = requirements?.amount
            if (!contractId || !amount) {
                throw error
            }

            const marketplace = await getMarketplaceContract()
            const tx = await marketplace.buyPrompt(contractId, { value: BigInt(amount) })
            await tx.wait()

            originalRequest._x402Retry = true
            originalRequest.headers = {
                ...originalRequest.headers,
                "X-Payment": tx.hash,
            }

            return api.request(originalRequest)
        },
    )

    return api
}

// Add Auth Token to Axios
x402Api.interceptors.request.use((config) => {
    const token = getApiToken()
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

/**
 * Creates or returns a wrapped Axios instance for x402 payments.
 * @param account The 0G Account object (must have address and signTransaction)
 */
export function getX402Client(account: any) {
    // Create a fresh instance to avoid duplicate wrapping or interceptor conflicts
    const api = axios.create({
        baseURL: BASE_URL,
        headers: {
            Accept: "application/json",
        },
    })

    // Add auth token
    const token = getApiToken()
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`
    }

    return wrapAxiosWithPayment(api, account)
}

export function getApiToken(): string | null {
    if (typeof globalThis.window === "undefined") return null
    return localStorage.getItem(TOKEN_KEY)
}

export function setApiToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
}

export function clearApiToken(): void {
    localStorage.removeItem(TOKEN_KEY)
}

export function getAdminToken(): string | null {
    if (typeof globalThis.window === "undefined") return null
    return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
}

async function request<T>(
    path: string,
    options: RequestInit = {},
    skipContentType = false,
): Promise<T> {
    const token = getApiToken()

    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.headers as Record<string, string> ?? {}),
    }

    // Auto-set JSON content type if not skipping and not a FormData body
    if (!skipContentType && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json"
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(error?.message ?? "API error")
    }

    return res.json() as Promise<T>
}

// ─── Media ────────────────────────────────────────────────────────────────

export interface UploadResponse {
    cid: string
    url: string
    path: string
    ipfs_uri: string
    user?: any // The updated user model from backend
}

/**
 * POST /api/users/upload
 * Uploads a file to IPFS via the backend Pinata bridge.
 */
export async function uploadFile(file: File, type: "avatar" | "cover" | "prompt"): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)

    return request<UploadResponse>("/api/users/upload", {
        method: "POST",
        body: formData,
    }, true)
}

/**
 * POST /api/prompts/upload-assets
 * Uploads a file to local backend storage.
 */
export async function uploadPromptAsset(file: File, groupId?: string): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)
    if (groupId) {
        formData.append("group_id", groupId)
    }

    return request<UploadResponse>("/api/prompts/upload-assets", {
        method: "POST",
        body: formData,
    }, true)
}

/**
 * POST /api/storage/upload
 * Upload content/attachment through backend 0G storage bridge.
 */
export async function uploadTo0GStorage(
    file: File,
    type: "content" | "attachment",
    strict = false
): Promise<{ rootHash: string; txHash: string | null; path: string; storage?: string }> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)
    if (strict) {
        formData.append("strict", "1")
    }

    return request<{ rootHash: string; txHash: string | null; path: string; storage?: string }>(
        "/api/storage/upload",
        { method: "POST", body: formData },
        true
    )
}

/**
 * GET /api/storage/download/{rootHash}
 */
export async function downloadFrom0GStorage(rootHash: string): Promise<Blob> {
    const token = getApiToken()
    const res = await fetch(`/api/storage-download?rootHash=${encodeURIComponent(rootHash)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
        throw new Error("Failed to download from 0G storage")
    }
    return res.blob()
}

/**
 * POST /api/ipfs/metadata
 * Uploads JSON metadata to IPFS via the backend.
 */
export async function uploadMetadata(data: {
    name: string
    description: string
    image: string
    properties?: any
}): Promise<UploadResponse> {
    return request<UploadResponse>("/api/ipfs/metadata", {
        method: "POST",
        body: JSON.stringify(data),
    })
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export interface ProfileStats {
    rating: number;
    projects: number;
    reviews: number;
    sold: number;
}

export interface UserActivity {
    type: 'prompt' | 'review' | 'contest';
    text: string;
    time: string;
    timestamp: number;
    icon: string;
}

export interface ApiUser {
    id?: number
    wallet_address: string
    username: string | null
    name: string | null
    bio: string | null
    avatar_url: string | null
    cover_url: string | null
    roles: string[] | null
    is_available_for_freelance?: boolean
    hourly_rate?: number
    hourly_rate_currency?: string
    specialization_id?: number[]
    specialties?: string[]
    tools?: string[]
    stats?: ProfileStats
    activities?: UserActivity[]
}

export interface LoginResponse {
    token: string
    user: ApiUser
}

/**
 * POST /api/auth/login
 * Called after wallet is connected. Creates user if not exists.
 */
export async function loginWithWallet(walletAddress: string): Promise<LoginResponse> {
    const res = await request<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ wallet_address: walletAddress }),
    })
    setApiToken(res.token)
    return res
}

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile.
 */
export async function fetchMe(): Promise<ApiUser> {
    return request<ApiUser>("/api/users/me")
}

/**
 * GET /api/users/{address}
 * Returns a public profile for any user by address.
 */
export async function fetchUserByAddress(address: string): Promise<ApiUser> {
    return request<ApiUser>(`/api/users/${address}`)
}

/**
 * GET /api/artists
 * Returns all users with the artist role.
 */
export async function fetchArtists(): Promise<any[]> {
    return request<any[]>("/api/artists")
}

/**
 * GET /api/artists/{id}/reviews
 * Returns reviews left by clients on a specific artist's database record.
 */
export async function getArtistReviews(artistId: number): Promise<any> {
    return request<any>(`/api/artists/${artistId}/reviews`)
}

/**
 * PUT /api/users/me
 * Updates the user's profile (name, bio, avatar_url, roles).
 */
export async function updateProfile(data: {
    username?: string
    name?: string
    bio?: string
    avatar_url?: string
    cover_url?: string
    roles?: string[]
    is_available_for_freelance?: boolean
    hourly_rate?: number
    hourly_rate_currency?: string
    specialization_id?: number[]
}): Promise<ApiUser> {
    return request<ApiUser>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
    })
}

// ─── Bookmarks ────────────────────────────────────────────────────────────

export interface BookmarkToggleResponse {
    success: boolean
    is_bookmarked: boolean
    message: string
}

/**
 * POST /api/prompts/{id}/bookmark
 * Toggles bookmark status for a prompt.
 */
export async function toggleBookmark(promptId: string | number): Promise<BookmarkToggleResponse> {
    return request<BookmarkToggleResponse>(`/api/prompts/${promptId}/bookmark`, {
        method: "POST",
    })
}

/**
 * GET /api/users/me/bookmarks
 * Returns the current user's collections.
 */
export async function fetchBookmarks(): Promise<any> {
    return request<any>("/api/users/me/bookmarks")
}

/**
 * GET /api/prompts/{id}/content
 * Returns the premium content of a prompt. Protected by x402.
 */
export async function fetchPremiumContent(promptId: string | number, account: any): Promise<{
    original_content: string
    negative_prompt?: string | null
    usage_notes?: string | null
    root_hash?: string | null
    storage_refs?: any
}> {
    const client = getX402Client(account)
    const res = await client.get(`/api/prompts/${promptId}/content`)
    return res.data
}

// ─── Prompts ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface ApiCategory {
    id: number
    name: string
    slug: string
    description: string | null
    type: "CURATED" | "COMMUNITY"
}

export interface ApiAiModel {
    id: number
    name: string
    slug: string
    description: string | null
    category_id: number | null
    category?: ApiCategory | null
}

export async function getCategories(): Promise<ApiCategory[]> {
    return request<ApiCategory[]>("/api/categories")
}

export async function getAiModels(): Promise<ApiAiModel[]> {
    return request<ApiAiModel[]>("/api/ai-models")
}

export async function createCategory(data: {
    name: string
    slug: string
    description?: string
    type: "CURATED" | "COMMUNITY"
}): Promise<ApiCategory> {
    const adminToken = getAdminToken()
    return request<ApiCategory>("/api/categories", {
        method: "POST",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify(data),
    })
}

export async function updateCategory(id: number, data: Partial<{
    name: string
    slug: string
    description: string
    type: "CURATED" | "COMMUNITY"
}>): Promise<ApiCategory> {
    const adminToken = getAdminToken()
    return request<ApiCategory>(`/api/categories/${id}`, {
        method: "PUT",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify(data),
    })
}

export async function deleteCategory(id: number): Promise<{ message: string }> {
    const adminToken = getAdminToken()
    return request<{ message: string }>(`/api/categories/${id}`, {
        method: "DELETE",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
    })
}

export async function createAiModel(data: {
    name: string
    slug: string
    description?: string
    category_id: number
}): Promise<ApiAiModel> {
    const adminToken = getAdminToken()
    return request<ApiAiModel>("/api/ai-models", {
        method: "POST",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify(data),
    })
}

export async function updateAiModel(id: number, data: Partial<{
    name: string
    slug: string
    description: string
    category_id: number
}>): Promise<ApiAiModel> {
    const adminToken = getAdminToken()
    return request<ApiAiModel>(`/api/ai-models/${id}`, {
        method: "PUT",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify(data),
    })
}

export async function deleteAiModel(id: number): Promise<{ message: string }> {
    const adminToken = getAdminToken()
    return request<{ message: string }>(`/api/ai-models/${id}`, {
        method: "DELETE",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
    })
}

/**
 * GET /api/prompts
 * Fetches a paginated list of prompts with optional filters.
 */
export async function getPrompts(params?: Record<string, string>): Promise<PaginatedResponse<any>> {
    const qs = params ? new URLSearchParams(params).toString() : '';
    const url = qs ? `/api/prompts?${qs}` : "/api/prompts";
    return request<PaginatedResponse<any>>(url);
}

/**
 * GET /api/dashboard
 * Returns creator dashboard statistics.
 */
export async function getDashboardData(days: number = 30): Promise<any> {
    return request<any>(`/api/dashboard?days=${days}`)
}

/**
 * GET /api/prompts/{id}
 * Fetches details of a single prompt by its ID.
 */
export async function getPrompt(id: string): Promise<any> {
    return request<any>(`/api/prompts/${id}`);
}

/**
 * GET /api/prompts/{id}/reviews
 * Fetches reviews for a specific prompt.
 */
export async function getPromptReviews(id: string): Promise<any> {
    return request<any>(`/api/prompts/${id}/reviews`);
}

/**
 * POST /api/prompts/{id}/reviews
 */
export async function submitReview(promptId: string, rating: number, comment: string): Promise<any> {
    return request<any>(`/api/prompts/${promptId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
    });
}

/**
 * POST /api/prompts/{id}/verify-purchase
 */
export async function recordTransaction(promptId: string, txId: string): Promise<any> {
    return request<any>(`/api/prompts/${promptId}/verify-purchase`, {
        method: "POST",
        body: JSON.stringify({ tx_id: txId }),
    });
}

/**
 * GET /api/prompts/{id}/transactions
 * Fetches transaction history for a specific prompt.
 */
export async function getPromptTransactions(id: string): Promise<any> {
    return request<any>(`/api/prompts/${id}/transactions`);
}

export async function scorePrompt(id: string, promptText?: string): Promise<{
    overall: number
    clarity: number
    completeness: number
    safety: number
    reproducibility: number
    innovation: number
    reasoning: string
    source?: "0g-compute" | "heuristic"
}> {
    return request(`/api/prompts/${id}/score`, {
        method: "POST",
        body: JSON.stringify(promptText ? { prompt_text: promptText } : {}),
    })
}

export async function previewPromptScore(promptText: string): Promise<{
    overall: number
    clarity: number
    completeness: number
    safety: number
    reproducibility: number
    innovation: number
    reasoning: string
    source?: "0g-compute" | "heuristic"
}> {
    return request("/api/prompts/preview-score", {
        method: "POST",
        body: JSON.stringify({ prompt_text: promptText }),
    })
}

/**
 * GET /api/users/me/purchased
 * Fetches prompts purchased by the current user.
 */
export async function fetchPurchasedPrompts(): Promise<any> {
    return request<any>("/api/users/me/purchased");
}

export async function createPrompt(data: any): Promise<any> {
    return request<any>("/api/prompts", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * PUT /api/prompts/{id}/curate
 * Updates a prompt's curation status.
 */
export async function curatePrompt(id: string | number, isCurated: boolean): Promise<any> {
    const adminToken = getAdminToken()

    return request<any>(`/api/prompts/${id}/curate`, {
        method: "PUT",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify({ is_curated: isCurated }),
    });
}

export async function adminLogin(data: { username: string; password: string }): Promise<{
    admin_token: string
    expires_at: string
    wallet: string
}> {
    const res = await request<{ admin_token: string; expires_at: string; wallet: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(data),
    })
    setAdminToken(res.admin_token)
    return res
}

export async function requestAdminPasswordOtp(): Promise<{
    message: string
    email: string
    expires_in_minutes: number
}> {
    const adminToken = getAdminToken()
    return request<{ message: string; email: string; expires_in_minutes: number }>("/api/admin/password/otp", {
        method: "POST",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
    })
}

export async function changeAdminPassword(data: {
    otp: string
    new_password: string
    new_password_confirmation: string
}): Promise<{ message: string }> {
    const adminToken = getAdminToken()
    return request<{ message: string }>("/api/admin/password", {
        method: "PUT",
        headers: adminToken ? { "X-Admin-Token": adminToken } : {},
        body: JSON.stringify(data),
    })
}

// ─── AI Recommendations ───────────────────────────────────────────────────

/**
 * GET /api/prompts/{id}/similar
 * Returns similar/recommended prompts based on AI analysis.
 */
export async function getSimilarPrompts(id: string): Promise<{ data: any[]; count: number }> {
    return request<{ data: any[]; count: number }>(`/api/prompts/${id}/similar`)
}

// ─── Plagiarism Detection ─────────────────────────────────────────────────

export interface PlagiarismResult {
    is_plagiarized: boolean
    similarity_score: number
    reasoning: string
    similar_prompts: {
        id: string
        title: string
        category: string
        creator: string
        match_type: "keyword" | "semantic"
    }[]
}

/**
 * POST /api/prompts/check-plagiarism
 * Checks if a prompt is too similar to existing prompts.
 */
export async function checkPlagiarism(data: {
    title: string
    description: string
    content?: string
}): Promise<PlagiarismResult> {
    return request<PlagiarismResult>("/api/prompts/check-plagiarism", {
        method: "POST",
        body: JSON.stringify(data),
    })
}

/**
 * POST /api/prompts/{id}/deactivate
 */
export async function deactivatePrompt(id: string | number): Promise<any> {
    return request<any>(`/api/prompts/${id}/deactivate`, {
        method: "POST"
    });
}

/**
 * PUT /api/prompts/{id}/price
 */
export async function updatePromptPrice(id: string | number, data: { price_0g: number, currency: string }): Promise<any> {
    return request<any>(`/api/prompts/${id}/price`, {
        method: "PUT",
        body: JSON.stringify(data)
    });
}

/**
 * POST /api/prompts/{id}/relist
 */
export async function relistPrompt(id: string | number, data: { price_0g: number, currency: string }): Promise<any> {
    return request<any>(`/api/prompts/${id}/relist`, {
        method: "POST",
        body: JSON.stringify(data)
    });
}

// ─── Messages & Notifications ─────────────────────────────────────────────

export async function searchUsers(query: string): Promise<ApiUser[]> {
    return request<ApiUser[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
}

export async function fetchConversations(): Promise<any[]> {
    return request<any[]>("/api/messages");
}

export async function fetchMessages(address: string, cursor?: string): Promise<any> {
    const url = cursor ? `/api/messages/${address}?cursor=${cursor}` : `/api/messages/${address}`;
    return request<any>(url);
}

export async function sendMessage(data: { receiver_address: string, content: string, attachment_url?: string }): Promise<any> {
    return request<any>("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function sendTypingIndicator(receiverAddress: string): Promise<any> {
    return request<any>("/api/messages/typing", {
        method: "POST",
        body: JSON.stringify({ receiver_address: receiverAddress }),
    });
}

export async function markAllMessagesRead(senderAddress: string): Promise<any> {
    return request<any>("/api/messages/read-all", {
        method: "PUT",
        body: JSON.stringify({ sender_address: senderAddress }),
    });
}

export async function markMessageRead(messageId: number): Promise<any> {
    return request<any>(`/api/messages/${messageId}/read`, {
        method: "PUT",
    });
}

export async function fetchNotifications(): Promise<any[]> {
    return request<any[]>("/api/notifications");
}

export async function markNotificationsRead(): Promise<any> {
    return request<any>("/api/notifications/read", { method: "PUT" });
}

// ─── Connections (Friends) ────────────────────────────────────────────────

export async function fetchConnections(): Promise<any[]> {
    return request<any[]>("/api/connections");
}

export async function sendFriendRequest(recipientAddress: string): Promise<any> {
    return request<any>("/api/connections", {
        method: "POST",
        body: JSON.stringify({ recipient_address: recipientAddress }),
    });
}

export async function acceptFriendRequest(connectionId: number): Promise<any> {
    return request<any>(`/api/connections/${connectionId}/accept`, { method: "PUT" });
}

export async function removeFriendConnection(connectionId: number): Promise<any> {
    return request<any>(`/api/connections/${connectionId}`, { method: "DELETE" });
}
// ─── Contests ─────────────────────────────────────────────────────────────

/**
 * GET /api/contests/{id}
 */
export async function getContest(id: string): Promise<any> {
    return request<any>(`/api/contests/${id}`);
}

/**
 * GET /api/contests/{id}/submissions
 */
export async function getContestSubmissions(id: string): Promise<any[]> {
    return request<any[]>(`/api/contests/${id}/submissions`);
}

/**
 * POST /api/contests
 */
export async function createContest(data: {
    title: string;
    brand_name: string;
    category: string;
    about_brand: string;
    brief: string;
    tags?: string[];
    require_prompt_submission?: boolean;
    prize_tiers: { place: number; prize_0g: number }[];
    total_prize_0g: number;
    deadline: string;
    tx_id: string;
    onchain_contest_id?: number;
}): Promise<any> {
    return request<any>("/api/contests", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * POST /api/contests/{id}/verify-fund
 */
export async function verifyContestFund(id: string, txId?: string): Promise<any> {
    return request<any>(`/api/contests/${id}/verify-fund`, {
        method: "POST",
        body: JSON.stringify(txId ? { tx_id: txId } : {}),
    });
}

/**
 * POST /api/contests/{id}/submissions
 */
export async function submitContestEntry(id: string, data: {
    artist_address: string;
    cid_ipfs?: string;
    preview_image_url: string;
    prompt_used?: string;
    tool?: string;
    storage_root_hash?: string;
    storage_tx_hash?: string | null;
    ipfs_metadata_uri?: string;
    onchain_entry_id?: string;
}): Promise<any> {
    return request<any>(`/api/contests/${id}/submissions`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * POST /api/contests/{id}/winner
 */
export async function declareContestWinner(id: string, submissionId: string, txId: string, place = 1): Promise<any> {
    return request<any>(`/api/contests/${id}/winner`, {
        method: "POST",
        body: JSON.stringify({ submission_id: submissionId, tx_id: txId, place }),
    });
}

/**
 * POST /api/hire
 */
export async function createHireRequest(data: {
    artist_address: string;
    project_brief: string;
    budget_0g?: number;
    tx_id: string;
    onchain_job_id?: number;
}): Promise<any> {
    return request<any>("/api/hire", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

/**
 * POST /api/hire/{id}/verify-escrow
 */
export async function verifyHireEscrow(id: string, txId?: string): Promise<any> {
    return request<any>(`/api/hire/${id}/verify-escrow`, {
        method: "POST",
        body: JSON.stringify(txId ? { tx_id: txId } : {}),
    });
}

export async function verifyHireCompletion(id: string, txId: string): Promise<any> {
    return request<any>(`/api/hire/${id}/verify-completion`, {
        method: "POST",
        body: JSON.stringify({ tx_id: txId }),
    });
}

export async function fetchMyHireRequests(): Promise<any[]> {
    return request<any[]>("/api/hire/my-requests");
}

export async function syncAgentStatus(): Promise<any> {
    return request<any>("/api/users/me/sync-agent", {
        method: "POST",
    })
}

// ─── Creator Profiles & Follow ─────────────────────────────────────────────

/**
 * GET /api/users/{address}/profile
 * Returns a public user profile with aggregated stats and follow status.
 */
export async function fetchCreatorProfile(address: string): Promise<any> {
    return request<any>(`/api/users/${encodeURIComponent(address)}/profile`);
}

/**
 * POST /api/users/{address}/follow
 * Toggle follow/unfollow for the given user address.
 */
export async function toggleFollow(address: string): Promise<{ is_following: boolean; follower_count: number; message: string }> {
    return request<any>(`/api/users/${encodeURIComponent(address)}/follow`, {
        method: "POST",
    });
}
