"use client"

import { useState, use, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/prompt-card"
import {
  BadgeCheck, Calendar, Copy, ExternalLink, Star,
  Users, FileText, TrendingUp, ShoppingCart,
  Globe, CheckCircle, Zap, Loader2
} from "lucide-react"
import { fetchCreatorProfile, toggleFollow, getPrompts, getPromptReviews } from "@/lib/api"
import { getApiToken } from "@/lib/api"
import { toast } from "sonner"
import { CHAIN_CONFIG } from "@/lib/contracts"
import { checkAgentVerified } from "@/lib/evm"

export default function CreatorProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params)
  const creatorAddress = decodeURIComponent(address)

  const [profile, setProfile] = useState<any>(null)
  const [prompts, setPrompts] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"created" | "activity" | "reviews">("created")
  const [copied, setCopied] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Step 1: fetch profile by name or address
        const profileData = await fetchCreatorProfile(creatorAddress)
        setProfile(profileData)
        setFollowed(profileData.is_following ?? false)
        setFollowerCount(profileData.stats?.follower_count ?? 0)

        // Step 2: use the real wallet_address to fetch prompts
        const realAddress = profileData.wallet_address ?? creatorAddress
        const promptsData = await getPrompts({ user_address: realAddress })
        setPrompts(promptsData.data ?? [])
      } catch (e) {
        console.error("Failed to load creator profile", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [creatorAddress])

  const handleFollow = async () => {
    if (!getApiToken()) {
      toast.error("Connect your wallet to follow creators.")
      return
    }
    if (followLoading) return
    try {
      setFollowLoading(true)
      const res = await toggleFollow(creatorAddress)
      setFollowed(res.is_following)
      setFollowerCount(res.follower_count)
      toast.success(res.message)
    } catch (e) {
      toast.error("Failed to update follow status.")
    } finally {
      setFollowLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(creatorAddress).catch(() => { })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Map real API prompt to the shape PromptCard expects
  const mappedPrompts = prompts.map((p: any) => ({
    id: p.id,
    contract_id: p.contract_id,
    title: p.title,
    creator: p.user?.wallet_address ?? creatorAddress,
    creatorName: p.user?.name ?? p.user?.username ?? "Creator",
    creatorAvatar: p.user?.avatar_url ?? "",
    price: parseFloat(p.price_0g ?? 0),
    currency: p.currency ?? "0G",
    rating: p.rating ?? 0,
    reviews: 0,
    sales: p.total_sold ?? 0,
    license: (p.license_type === "FREE" ? "Free" : p.license_type === "EXCLUSIVE" ? "Exclusive" : "Commercial") as any,
    royalty: p.royalty_percentage ?? 0,
    tags: (p.tags ?? []) as string[],
    category: p.category ?? "",
    model: p.ai_model ?? "",
    createdAt: p.created_at ?? "",
    description: p.description ?? "",
    isNsfw: p.is_nsfw ?? false,
    isCurated: p.is_curated ?? false,
    image: p.preview_image_url ?? undefined,
    isBookmarked: p.is_bookmarked ?? false,
  }))

  const displayName = profile?.name ?? profile?.username ?? creatorAddress.slice(0, 8) + "..."
  const initials = displayName.slice(0, 2).toUpperCase()
  const [isVerified, setIsVerified] = useState(profile?.roles?.includes("artist") ?? false)
  const stats = profile?.stats ?? {}

  // Check on-chain verification
  useEffect(() => {
    if (creatorAddress) {
      checkAgentVerified(creatorAddress).then(v => { if (v) setIsVerified(true) })
    }
  }, [creatorAddress])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#00ffff] animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">

        {/* Banner + Avatar wrapper */}
        <div className="relative mb-20">
          <div className="relative h-48 border-2 border-[#2a2a30] shadow-[6px_6px_0_0_#2a2a30] overflow-hidden">
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-[#ff2d95]/15 via-[#a855f7]/10 to-[#00ffff]/15" />
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(rgba(180,120,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(180,120,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} aria-hidden="true" />
              </>
            )}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#ff2d95]/50" aria-hidden="true" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#00ffff]/50" aria-hidden="true" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#b4ff39]/50" aria-hidden="true" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#a855f7]/50" aria-hidden="true" />
          </div>

          {/* Avatar */}
          <div className="absolute -bottom-14 left-6 md:left-10">
            <div className="w-28 h-28 bg-gradient-to-br from-[#ff2d95] to-[#00ffff] p-0.5 shadow-[4px_4px_0_0_#00ffff]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : null}
              <div
                className="w-full h-full bg-[#0a001a] flex items-center justify-center"
                style={{ display: profile?.avatar_url ? 'none' : 'flex' }}
              >
                <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#ff2d95] to-[#00ffff]">
                  {initials}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#e0d4ff] flex items-center gap-2 uppercase tracking-wider">
              {displayName}
              {isVerified && (
                <span className="flex items-center gap-1 text-xs font-extrabold text-[#00ffff] border border-[#00ffff]/30 px-2 py-0.5 bg-[#00ffff]/10">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  VERIFIED
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-[#a78bfa] font-mono hover:text-[#ff2d95] transition-colors border border-[#2a2a30] px-2 py-1 hover:border-[#ff2d95]"
                aria-label="Copy wallet address"
              >
                {creatorAddress.slice(0, 8)}...{creatorAddress.slice(-6)}
                {copied ? <CheckCircle className="w-3 h-3 text-[#b4ff39]" /> : <Copy className="w-3 h-3" />}
              </button>
              {profile?.joined_at && (
                <span className="flex items-center gap-1 text-xs text-[#a78bfa]/60 font-mono border border-[#2a2a30] px-2 py-1">
                  <Calendar className="w-3 h-3" />
                  Joined {profile.joined_at}
                </span>
              )}
              <a
                href={`${CHAIN_CONFIG.explorer}/address/${creatorAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#a78bfa]/60 font-mono hover:text-[#00ffff] transition-colors border border-[#2a2a30] px-2 py-1 hover:border-[#00ffff]"
              >
                <ExternalLink className="w-3 h-3" />
                Explorer
              </a>
              {followerCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#a78bfa]/60 font-mono border border-[#2a2a30] px-2 py-1">
                  <Users className="w-3 h-3" />
                  {followerCount.toLocaleString()} followers
                </span>
              )}
            </div>
            {profile?.bio && (
              <p className="mt-3 text-sm text-[#a78bfa] max-w-2xl leading-relaxed border-l-2 border-[#a855f7]/40 pl-3">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Follow button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`shrink-0 border-2 px-6 py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${followed
              ? "bg-[#b4ff39] border-[#b4ff39] text-black shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
              : "bg-[#ff2d95] border-[#ff2d95] text-white shadow-[4px_4px_0_0_transparent] hover:shadow-[4px_4px_0_0_#fff] hover:-translate-y-0.5"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {followLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : followed ? (
              <><CheckCircle className="w-4 h-4" /> Following</>
            ) : (
              "Follow Creator"
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Prompts Listed", value: stats.prompts_count ?? 0, icon: FileText, color: "text-[#ff2d95]", border: "border-[#ff2d95]/30" },
            { label: "Total Sales", value: (stats.total_sales ?? 0).toLocaleString(), icon: ShoppingCart, color: "text-[#00ffff]", border: "border-[#00ffff]/30" },
            { label: "Revenue (0G)", value: (stats.total_revenue ?? 0).toFixed(4), icon: TrendingUp, color: "text-[#b4ff39]", border: "border-[#b4ff39]/30" },
            { label: "Avg. Rating", value: stats.avg_rating ?? "—", icon: Star, color: "text-[#ff6b2b]", border: "border-[#ff6b2b]/30" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-[#0a001a] border-2 ${stat.border} p-5 text-center shadow-[4px_4px_0_0_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all`}
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className={`text-xl font-extrabold ${stat.color} font-mono`}>{stat.value}</p>
              <p className="text-xs text-[#a78bfa]/60 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-2 border-[#2a2a30] p-1 mb-8" role="tablist">
          {(["created", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm font-extrabold transition-all uppercase tracking-widest ${activeTab === tab
                ? "bg-[#ff2d95] text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]"
                : "text-[#a78bfa] hover:text-[#e0d4ff] hover:bg-[#1a1020]"
                }`}
            >
              {tab === "created"
                ? `Prompts (${mappedPrompts.length})`
                : "Reviews"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div role="tabpanel">

          {/* Created Prompts - Real Data */}
          {activeTab === "created" && (
            <div>
              {mappedPrompts.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-[#2a2a30]">
                  <Zap className="w-10 h-10 mx-auto text-[#2a2a30] mb-4" />
                  <p className="text-[#a78bfa] font-bold">No prompts listed yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mappedPrompts.map((p) => (
                    <PromptCard key={p.id} prompt={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews - Real Data */}
          {activeTab === "reviews" && (
            <ReviewsTab promptIds={prompts.map((p: any) => p.id)} />
          )}
        </div>

      </div>
    </AppShell>
  )
}

// Sub-component to load reviews per-prompt
function ReviewsTab({ promptIds }: { promptIds: string[] }) {
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (promptIds.length === 0) { setLoading(false); return }
    // Fetch reviews for the first prompt (most relevant)
    getPromptReviews(promptIds[0]).then((data) => {
      setAllReviews(Array.isArray(data) ? data : data?.data ?? [])
    }).catch(() => setAllReviews([])).finally(() => setLoading(false))
  }, [promptIds.join(",")])

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#00ffff] animate-spin" /></div>
  }

  if (allReviews.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-[#2a2a30]">
        <Star className="w-10 h-10 mx-auto text-[#2a2a30] mb-4" />
        <p className="text-[#a78bfa] font-bold">No reviews yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {allReviews.map((review: any, i: number) => (
        <div key={i} className="bg-[#0a001a] border-2 border-[#2a2a30] p-5 hover:border-[#a855f7]/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#ff2d95] to-[#00ffff] flex items-center justify-center text-xs font-extrabold text-white">
                {(review.user?.name ?? review.user?.wallet_address ?? "AN").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#e0d4ff]">
                  {review.user?.name ?? review.user?.username ?? review.user?.wallet_address?.slice(0, 8) ?? "Anonymous"}
                </span>
                <p className="text-[10px] text-[#a78bfa]/50 font-mono">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star
                  key={j}
                  className={`w-3.5 h-3.5 ${j < review.rating ? "text-[#ff6b2b] fill-[#ff6b2b]" : "text-[#a78bfa]/20"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-[#a78bfa] border-l-2 border-[#2a2a30] pl-3">{review.comment}</p>
        </div>
      ))}
    </div>
  )
}
