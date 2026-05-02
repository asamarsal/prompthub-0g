"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/prompt-card"
import { PurchaseModal } from "@/components/purchase-modal"
import { prompts as mockPrompts } from "@/lib/mock-data"
import { ChevronRight, Check, Copy, Heart, Share2, Star, ExternalLink, Zap, Lock, BadgeCheck, Clock, Unlock, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getPrompt, toggleBookmark, fetchPremiumContent, deactivatePrompt, relistPrompt, updatePromptPrice, submitReview, scorePrompt } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { use0GPrice } from "@/lib/hooks/use-0g-price"
import { getMarketplaceContract } from "@/lib/evm"
import { CHAIN_CONFIG } from "@/lib/contracts"
import { parseEther } from "ethers"

const mockReviews = [
    { id: 1, user: "0xab12...cd34", userName: "CryptoCreator", rating: 5, comment: "Incredible results! The prompts generated stunning portraits every time.", date: "2026-02-25", verified: true },
    { id: 2, user: "0xef56...gh78", userName: "AIEnthusiast", rating: 4, comment: "Very good quality, slight tweaking needed for specific styles but overall excellent.", date: "2026-02-22", verified: true },
    { id: 3, user: "0xij90...kl12", userName: "DesignPro", rating: 5, comment: "Best purchase I've made on the platform. Worth every 0G.", date: "2026-02-20", verified: true },
]

const mockTxHistory = [
    { buyer: "0xab12...cd34", price: 0.005, date: "2026-02-28 14:32" },
    { buyer: "0xef56...gh78", price: 0.005, date: "2026-02-27 09:15" },
    { buyer: "0xij90...kl12", price: 0.005, date: "2026-02-25 18:42" },
    { buyer: "0xmn34...op56", price: 0.005, date: "2026-02-24 11:03" },
]

export default function PromptDetailPageContent({ params }: { params: { id: string } }) {
    const { id } = params
    const [prompt, setPrompt] = useState<any>(null)
    const [pageLoading, setPageLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const { isConnected, address } = useWallet()

    const [purchaseOpen, setPurchaseOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"description" | "reviews" | "history" | any>("description")
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [reviews, setReviews] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const { price: ogPrice } = use0GPrice()
    const [bookmarkLoading, setBookmarkLoading] = useState(false)
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [txLoading, setTxLoading] = useState(false)

    const [premiumContent, setPremiumContent] = useState<string | null>(null)
    const [unlockLoading, setUnlockLoading] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [newReviewRating, setNewReviewRating] = useState(0)
    const [newReviewComment, setNewReviewComment] = useState("")
    const [submittingReview, setSubmittingReview] = useState(false)
    const [qualityScore, setQualityScore] = useState<any>(null)
    const [scoreLoading, setScoreLoading] = useState(false)

    const handleScorePrompt = async () => {
        if (!prompt?.id) return
        setScoreLoading(true)
        try {
            const result = await scorePrompt(prompt.id)
            setQualityScore(result)
        } catch (e) {
            console.error("Scoring failed:", e)
            toast.error("Failed to score prompt via 0G Compute")
        } finally {
            setScoreLoading(false)
        }
    }

    const isOwner = isConnected
        && !!address
        && typeof prompt?.creator === "string"
        && address.toLowerCase() === prompt.creator.toLowerCase()

    useEffect(() => {
        async function fetchDetails() {
            try {
                setPageLoading(true)
                const res = await getPrompt(id)

                // Map backend to frontend structure
                setPrompt({
                    id: res.id,
                    title: res.title,
                    description: res.description,
                    price: parseFloat(res.price_0g),
                    model: res.ai_model,
                    category: res.category,
                    sales: res.total_sold,
                    reviewsCount: 0, // Will be updated by separate fetch
                    rating: 4.5,
                    license: res.license_type,
                    royalty: res.royalty || 5, // Default royalty if null
                    tags: res.tags || [],
                    additional_info: res.additional_info || [],
                    creatorName: res.user?.name || "Artist",
                    creator: res.user?.wallet_address || "0xUNKNOWN",
                    createdAt: new Date(res.created_at).toISOString().split('T')[0],
                    isCurated: res.is_curated,
                    contract_id: res.contract_id,
                    isListed: !!res.is_published,
                    image: res.preview_image_url,
                    txId: res.og_tx_id,
                    cid: res.cid_ipfs,
                    rootHash: res.root_hash || res.additional_info?.storage_root_hash || null,
                    creatorVerified: res.user?.is_verified ?? false,
                })
                setIsBookmarked(!!res.is_bookmarked)
            } catch (err) {
                console.error("Failed to fetch prompt", err)
            } finally {
                setPageLoading(false)
            }
        }
        fetchDetails()
    }, [id])

    useEffect(() => {
        if (activeTab === "reviews" && id) {
            setReviewsLoading(true)
            import("@/lib/api").then(api => api.getPromptReviews(id))
                .then(res => {
                    setReviews(res.data || [])
                    if (prompt) {
                        setPrompt((prev: any) => ({ ...prev, reviewsCount: res.total || res.data?.length || 0 }))
                    }
                })
                .catch(err => console.error("Failed to fetch reviews", err))
                .finally(() => setReviewsLoading(false))
        }
        if (activeTab === "history" && id) {
            setTxLoading(true)
            import("@/lib/api").then(api => api.getPromptTransactions(id))
                .then(res => setTransactions(res.data || []))
                .catch(err => console.error("Failed to fetch transactions", err))
                .finally(() => setTxLoading(false))
        }
    }, [activeTab, id])

    // Automatic check for purchased content on mount
    useEffect(() => {
        if (mounted && isConnected && address && prompt && !premiumContent && !unlockLoading) {
            const checkPurchase = async () => {
                try {
                    // Try to fetch premium content optimistically
                    // We generate a dummy account object for the x402-0g adapter
                    // if it fails with 402, it means not purchased, so we just stop quietly.
                    const account = {
                        address: address,
                        signTransaction: async () => { throw new Error("Automatic check - skip wallet") }
                    }
                    const res = await fetchPremiumContent(prompt.id, account)
                    if (res && res.original_content) {
                        setPremiumContent(res.original_content)
                    }
                } catch (err) {
                    // Silent fail for automatic check
                    console.log("Auto-unlock check: Content is still locked/not purchased.")
                }
            }
            checkPurchase()
        }
    }, [mounted, isConnected, address, prompt?.id])

    const handleToggleBookmark = async () => {
        if (bookmarkLoading || !prompt) return
        try {
            setBookmarkLoading(true)
            const res = await toggleBookmark(prompt.id)
            setIsBookmarked(res.is_bookmarked)

            toast.success(res.is_bookmarked ? "Added to Collection" : "Removed from Collection", {
                description: res.is_bookmarked
                    ? `${prompt.title} has been added to your saved prompts.`
                    : `${prompt.title} has been removed from your saved prompts.`,
                duration: 3000,
            })
        } catch (err) {
            console.error(err)
            toast.error("Failed to update collection", {
                description: "Please check your connection and try again.",
            })
        } finally {
            setBookmarkLoading(false)
        }
    }

    const handleAddReview = async () => {
        if (!prompt || newReviewRating === 0) return
        setSubmittingReview(true)
        try {
            await submitReview(String(prompt.id), newReviewRating, newReviewComment)
            toast.success("Review submitted!")
            setNewReviewRating(0)
            setNewReviewComment("")
            // Refresh reviews
            const res = await import("@/lib/api").then(api => api.getPromptReviews(id))
            setReviews(res.data || [])
            setPrompt((prev: any) => ({ ...prev, reviewsCount: res.total || res.data?.length || 0 }))
        } catch (err) {
            console.error("Failed to submit review:", err)
            toast.error("Failed to submit review")
        } finally {
            setSubmittingReview(false)
        }
    }

    const handleUnlock = async () => {
        if (!prompt || !isConnected || !address) return

        setUnlockLoading(true)
        try {
            const res = await fetchPremiumContent(prompt.id, { address })
            setPremiumContent(res.original_content)
            toast.success("Content Unlocked!", {
                description: "Your premium prompt content has been decrypted.",
                duration: 4000,
            })
        } catch (err: any) {
            console.error("Unlock failed:", err)
            toast.error("Unlock Failed", {
                description: err.message?.includes('402')
                    ? "Please purchase this prompt first."
                    : "An unexpected error occurred. Please try again.",
                duration: 6000,
            })
        } finally {
            setUnlockLoading(false)
        }
    }

    if (pageLoading) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <Loader2 className="w-12 h-12 text-[#ff2d95] animate-spin" />
                    <h3 className="text-xl font-bold font-display tracking-widest text-[#e0d4ff] uppercase">Loading...</h3>
                </div>
            </AppShell>
        )
    }

    if (!prompt) {
        return (
            <AppShell>
                <div className="mx-auto max-w-7xl px-4 py-40 text-center">
                    <h1 className="text-4xl font-extrabold text-[#e0d4ff] mb-4 uppercase tracking-widest font-display">Prompt Not Found</h1>
                    <p className="text-[#a78bfa] font-mono mb-8 max-w-md mx-auto">The requested prompt could not be located in the neural network or has been removed by the creator.</p>
                    <Link href="/marketplace" className="bg-[#ff2d95] text-white px-8 py-3 text-sm border-2 border-[#ff2d95] inline-block font-extrabold uppercase hover:bg-transparent hover:text-[#ff2d95] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-1 hover:-translate-x-1 transition-all">
                        Back to Marketplace
                    </Link>
                </div>
            </AppShell>
        )
    }

    const related = mockPrompts.filter((p) => p.category === prompt.category && p.id !== prompt.id).slice(0, 3)

    return (
        <AppShell>
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm text-[#a78bfa] mb-8 font-mono" aria-label="Breadcrumb">
                    <Link href="/" className="hover:text-[#ff2d95] transition-colors">Home</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link href="/marketplace" className="hover:text-[#ff2d95] transition-colors">Marketplace</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-[#00ffff] truncate max-w-[200px]">{prompt.title}</span>
                </nav>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left: Preview */}
                    <div className="lg:col-span-3">
                        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden glass-iridescent bg-[#0a001a]">
                            {prompt.image && (
                                <img
                                    src={prompt.image}
                                    alt={prompt.title}
                                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.opacity = '0';
                                    }}
                                />
                            )}
                            {/* Diagonal Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center -rotate-[15deg] pointer-events-none opacity-10 z-10 select-none">
                                <span className="text-[6rem] md:text-[8rem] font-display font-black tracking-tighter uppercase leading-none text-white whitespace-nowrap">
                                    PREVIEW
                                </span>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-br from-[#ff2d95]/15 via-[#a855f7]/10 to-[#00ffff]/15 flex items-center justify-center">
                                <div className="text-center relative z-10">
                                    {premiumContent ? (
                                        <>
                                            <Unlock className="w-12 h-12 text-[#b4ff39] mx-auto mb-3" />
                                            <p className="text-sm text-[#b4ff39] font-bold uppercase tracking-widest">Purchased - Content Unlocked</p>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-12 h-12 text-[#a78bfa] mx-auto mb-3" />
                                            <p className="text-sm text-[#a78bfa] font-bold">Preview - Purchase to unlock</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="absolute inset-0 y2k-grid-bg opacity-30" aria-hidden="true" />
                            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(180,120,255,0.02) 3px, rgba(180,120,255,0.02) 6px)' }} aria-hidden="true" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-5" aria-hidden="true">
                                <p className="text-6xl font-extrabold text-white rotate-[-20deg] select-none">PromptHub</p>
                            </div>
                            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#ff2d95]/30 rounded-tl z-20" />
                            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#00ffff]/30 rounded-tr z-20" />
                            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#b4ff39]/30 rounded-bl z-20" />
                            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#a855f7]/30 rounded-br z-20" />
                        </div>

                        <div className="mt-8">
                            <div className="flex gap-1 p-1 bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30]" role="tablist">
                                {(["description", "reviews", "history"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        role="tab"
                                        aria-selected={activeTab === tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 px-4 py-2.5 text-sm font-bold transition-all border-2 border-transparent ${activeTab === tab
                                            ? "bg-[#ff2d95] text-white border-[#ff2d95] shadow-[4px_4px_0_0_#fff] -translate-y-0.5 -translate-x-0.5"
                                            : "text-[#a78bfa] hover:text-[#e0d4ff] hover:bg-[#16161a]"
                                            }`}
                                    >
                                        {tab === "description" ? "Description" : tab === "reviews" ? `Reviews (${prompt.reviewsCount || 0})` : "Tx History"}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6" role="tabpanel">
                                {activeTab === "description" && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div>
                                            <h3 className="text-xs font-mono font-bold text-[#a78bfa]/50 uppercase tracking-[0.2em] mb-3">Model Description</h3>
                                            <p className="text-[#e0d4ff]/90 leading-relaxed text-lg">{prompt.description}</p>
                                        </div>

                                        {prompt.additional_info && prompt.additional_info.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-mono font-bold text-[#a78bfa]/50 uppercase tracking-[0.2em] mb-3">Additional Resources</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {prompt.additional_info.map((link: any, i: number) => (
                                                        <a
                                                            key={i}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-between p-4 bg-[#160f24]/60 border-2 border-[#2a2a30] hover:border-[#b4ff39]/50 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <ExternalLink className="w-4 h-4 text-[#a78bfa] group-hover:text-[#b4ff39]" />
                                                                <span className="text-sm font-bold text-[#e0d4ff]">{link.label || "External Link"}</span>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-[#a78bfa]/30" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative group border-2 border-[#2a2a30] bg-[#160f24]/40 p-8 overflow-hidden transition-all hover:border-[#ff2d95]/30">
                                            {!premiumContent ? (
                                                <div className="text-center relative z-10">
                                                    <div className="w-16 h-16 bg-[#ff2d95]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ff2d95]/20 group-hover:scale-110 transition-transform">
                                                        <Lock className="w-8 h-8 text-[#ff2d95]" />
                                                    </div>
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2">
                                                        {premiumContent ? "Prompt Logic Unlocked" : "Premium Prompt Content"}
                                                    </h4>
                                                    <p className="text-sm text-[#a78bfa]/70 mb-8 max-w-sm mx-auto leading-relaxed">
                                                        {premiumContent
                                                            ? "You have full access to the precise prompt string, seed values, and parameters."
                                                            : "Unlock the precise prompt string, seed values, and negative parameters using the x402 protocol."}
                                                    </p>
                                                    {!premiumContent && (
                                                        <button
                                                            onClick={handleUnlock}
                                                            disabled={unlockLoading || !isConnected}
                                                            className="bg-transparent border-2 border-[#ff2d95] text-[#ff2d95] px-8 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-[#ff2d95] hover:text-white hover:shadow-[0_0_20px_0_rgba(255,45,149,0.3)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#ff2d95] disabled:hover:shadow-none"
                                                        >
                                                            {unlockLoading ? (
                                                                <span className="flex items-center gap-2">
                                                                    <Zap className="w-4 h-4 animate-spin" /> Verifying Payment...
                                                                </span>
                                                            ) : isConnected ? (
                                                                `Unlock for ${prompt.price} 0G (x402)`
                                                            ) : (
                                                                "Connect Wallet to Access"
                                                            )}
                                                        </button>
                                                    )}
                                                    <p className="mt-4 text-[10px] text-[#a78bfa]/40 font-mono uppercase tracking-widest">Powered by x402-0g</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-[#b4ff39] flex items-center gap-2 uppercase tracking-tighter">
                                                                <Unlock className="w-5 h-5" /> Content Unlocked
                                                            </h3>
                                                            <p className="text-[10px] text-[#a78bfa]/60 uppercase tracking-widest mt-1">Access granted via 0G Transaction</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const blob = new Blob([premiumContent ?? ""], { type: "text/plain" })
                                                                    const url = URL.createObjectURL(blob)
                                                                    const a = document.createElement("a")
                                                                    a.href = url
                                                                    a.download = `prompt-${prompt.id}.txt`
                                                                    a.click()
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#b4ff39]/10 border border-[#b4ff39]/30 text-[#b4ff39] text-[10px] font-bold uppercase tracking-widest hover:bg-[#b4ff39]/20 transition-all"
                                                            >
                                                                <Zap className="w-3 h-3" /> Download All
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Files List if available */}
                                                    {(prompt.additional_info?.files || []).length > 0 && (
                                                        <div className="flex flex-col gap-3">
                                                            <h4 className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-[0.2em] mb-1">PROMPT PACKAGE FILES</h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {prompt.additional_info.files.map((file: any, idx: number) => (
                                                                    <div key={idx} className="bg-black/40 border border-[#2a2a30] p-4 flex items-center justify-between group hover:border-[#b4ff39]/30 transition-all">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="p-2 bg-[#a78bfa]/10 rounded-lg">
                                                                                <FileText className="w-4 h-4 text-[#a78bfa]" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-bold text-[#e0d4ff] truncate">{file.name}</p>
                                                                                <p className="text-[10px] text-[#a78bfa]/40 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                                                                            </div>
                                                                        </div>
                                                                        <a
                                                                            href={file.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-2 hover:bg-[#b4ff39]/20 rounded-full text-[#a78bfa] hover:text-[#b4ff39] transition-all"
                                                                        >
                                                                            <ExternalLink className="w-4 h-4" />
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-[0.2em]">RAW CONTENT / PREVIEW</h4>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(premiumContent ?? "")
                                                                    toast.success("Prompt copied to clipboard!")
                                                                }}
                                                                className="text-[10px] font-bold text-[#b4ff39] hover:underline flex items-center gap-1"
                                                            >
                                                                <Copy className="w-3 h-3" /> Copy
                                                            </button>
                                                        </div>
                                                        <div className="p-6 bg-black/60 border border-[#b4ff39]/30 rounded font-mono text-sm text-[#b4ff39] break-all leading-relaxed shadow-inner whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar">
                                                            {premiumContent}
                                                        </div>
                                                    </div>

                                                    {/* Additional Links section */}
                                                    {((prompt.additional_info?.links || prompt.additional_info || []).length > 0) && (
                                                        <div className="mt-4 pt-6 border-t border-[#2a2a30]">
                                                            <h4 className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-[0.2em] mb-4">RESOURCES & EXTERNAL LINKS</h4>
                                                            <div className="flex flex-wrap gap-3">
                                                                {(Array.isArray(prompt.additional_info) ? prompt.additional_info : prompt.additional_info?.links || []).map((link: any, idx: number) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#160f24] border border-[#2a2a30] rounded-lg text-xs font-bold text-[#e0d4ff] hover:border-[#ff2d95] transition-all group shadow-sm hover:shadow-[#ff2d95]/20"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3 text-[#ff2d95] group-hover:scale-110 transition-transform" />
                                                                        {link.label || "Link"}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>)}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "reviews" && (
                                    <div className="flex flex-col gap-4">
                                        {premiumContent && (
                                            <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#ff2d95]/50 p-4 mb-2">
                                                <h4 className="text-sm font-bold text-[#e0d4ff] uppercase tracking-widest mb-3">Leave a Review</h4>
                                                <div className="flex gap-2 mb-3">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <button key={s} onClick={() => setNewReviewRating(s)}>
                                                            <Star className={`w-5 h-5 ${s <= newReviewRating ? "fill-[#ff2d95] text-[#ff2d95]" : "text-[#2a2a30]"}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    className="w-full bg-black/50 border border-[#2a2a30] text-sm p-3 mb-3 focus:border-[#ff2d95] outline-none text-[#e0d4ff] placeholder:text-[#a78bfa]/30"
                                                    placeholder="Share your experience..."
                                                    rows={3}
                                                    value={newReviewComment}
                                                    onChange={(e) => setNewReviewComment(e.target.value)}
                                                />
                                                <button
                                                    disabled={newReviewRating === 0 || submittingReview}
                                                    onClick={handleAddReview}
                                                    className="w-full bg-[#ff2d95] py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#ff2d95]/80 disabled:opacity-30 transition-colors"
                                                >
                                                    {submittingReview ? "Submitting..." : "Submit Review"}
                                                </button>
                                            </div>
                                        )}
                                        {reviewsLoading ? (
                                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#ff2d95]" /></div>
                                        ) : reviews.length > 0 ? (
                                            reviews.map((review) => (
                                                <div key={review.id} className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff2d95] to-[#a855f7]" overflow-hidden>
                                                                {review.reviewer?.avatar_url && <img src={review.reviewer.avatar_url} className="w-full h-full object-cover" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-[#e0d4ff] flex items-center gap-1">
                                                                    {review.reviewer?.name || (review.reviewer_address ? `${review.reviewer_address.slice(0, 6)}...${review.reviewer_address.slice(-4)}` : "User")}
                                                                     {review.reviewer?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-[#00ffff]" />}
                                                                </p>
                                                                <p className="text-xs text-[#a78bfa]/50 font-mono">{new Date(review.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-0.5">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`w-3.5 h-3.5 ${i < review.rating ? "text-[#ff6b2b] fill-[#ff6b2b]" : "text-[#a78bfa]/30"}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-[#a78bfa]">{review.comment}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-10 text-[#a78bfa] border-2 border-dashed border-[#2a2a30]">No reviews yet.</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "history" && (
                                    <div className="overflow-x-auto">
                                        {txLoading ? (
                                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#ff2d95]" /></div>
                                        ) : transactions.length > 0 ? (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-[#a78bfa]/50 text-left text-xs font-mono uppercase">
                                                        <th className="pb-3 font-semibold">Buyer</th>
                                                        <th className="pb-3 font-semibold">Price</th>
                                                        <th className="pb-3 font-semibold">Date</th>
                                                        <th className="pb-3 font-semibold text-right">TxID</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactions.map((tx, i) => (
                                                        <tr key={i} className="border-t border-[rgba(180,120,255,0.08)]">
                                                            <td className="py-3 font-mono text-[#a78bfa]">
                                                                {tx.buyer?.name || `${tx.buyer_address.slice(0, 6)}...${tx.buyer_address.slice(-4)}`}
                                                            </td>
                                                            <td className="py-3 text-[#00ffff] font-bold">{tx.amount_paid} {tx.currency || "0G"}</td>
                                                            <td className="py-3 text-[#a78bfa]/50 flex items-center gap-1 font-mono">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(tx.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                {tx.tx_id && (
                                                                    <a
                                                                        href={`${CHAIN_CONFIG.explorer}/tx/${tx.tx_id}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-[#ff2d95] hover:text-[#00ffff] transition-colors"
                                                                        title="View on 0G Explorer"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                                                                    </a>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-center py-10 text-[#a78bfa] border-2 border-dashed border-[#2a2a30]">No transaction history found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="sticky top-24">
                            <Link
                                href={`/creator/${encodeURIComponent(prompt.creatorName)}`}
                                className="block bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-5 mb-4 group cursor-pointer hover:border-[#ff2d95] transition-all hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff2d95] to-[#a855f7]" />
                                    <div>
                                        <p className="text-sm font-bold text-[#e0d4ff] flex items-center gap-1">
                                            {prompt.creatorName}
                                            {prompt.creatorVerified && <BadgeCheck className="w-4 h-4 text-[#00ffff]" />}
                                        </p>
                                        <p className="text-xs text-[#a78bfa]/50 font-mono">{prompt.creator}</p>
                                    </div>
                                </div>
                            </Link>

                            <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-6">
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-[#a78bfa] font-mono uppercase">Current Price</p>
                                        {(!prompt.contract_id || prompt.contract_id === 0 || !prompt.isListed) && (
                                            <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 font-black uppercase tracking-widest">Unlisted on 0G</span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline">
                                        <p className="text-4xl font-extrabold text-[#00ffff]">{typeof prompt.price === 'number' ? prompt.price : '0.000'}</p>
                                        <span className="text-xl font-display font-bold text-white uppercase ml-2">{prompt.currency || "0G"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-[#a78bfa] font-mono text-sm leading-none mt-1">
                                        ~${((typeof prompt.price === 'number' ? prompt.price : 0) * ogPrice).toFixed(2)} USD
                                    </p>
                                    <a
                                        href="https://coinmarketcap.com/id/currencies/0g/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-display font-black text-[#00ffff] hover:underline uppercase tracking-widest flex items-center gap-1"
                                    >
                                        See Price
                                        <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </div>
                                <div className="flex flex-col gap-2 mb-6 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#a78bfa]">License</span>
                                        <span className={`font-bold ${prompt.license === "Exclusive" ? "text-[#ff2d95]" : "text-[#00ffff]"}`}>{prompt.license}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#a78bfa]">Royalty</span>
                                        <span className="text-[#e0d4ff] font-bold">{prompt.royalty}%</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setPurchaseOpen(true)}
                                    disabled={!!premiumContent || !prompt.contract_id || prompt.contract_id === 0 || !prompt.isListed}
                                    className={cn(
                                        "w-full py-4 text-base font-extrabold uppercase mb-4 transition-all border-2",
                                        premiumContent
                                            ? "bg-[#b4ff39]/10 border-[#b4ff39] text-[#b4ff39] cursor-default"
                                            : (!prompt.contract_id || prompt.contract_id === 0 || !prompt.isListed)
                                                ? "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-50"
                                                : "bg-[#00ffff] border-[#00ffff] text-black hover:bg-transparent hover:text-[#00ffff]"
                                    )}
                                >
                                    {premiumContent ? "Already Purchased" : (!prompt.contract_id || prompt.contract_id === 0 || !prompt.isListed) ? "Not Listed On-Chain" : "Buy Now"}
                                </button>

                                {/* Explorer link for the purchase */}
                                {premiumContent && (
                                    <div className="mb-4 text-center">
                                        {transactions.find(t => t.buyer_address === address) ? (
                                            <a
                                                href={`${CHAIN_CONFIG.explorer}/tx/${transactions.find(t => t.buyer_address === address)?.tx_id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-bold text-[#b4ff39] hover:text-[#00ffff] uppercase tracking-widest flex items-center justify-center gap-1 transition-all"
                                            >
                                                View Proof of Purchase <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold text-[#a78bfa]/40 uppercase tracking-widest">Ownership Verified via API</span>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleToggleBookmark}
                                    disabled={bookmarkLoading}
                                    className="w-full bg-[#160f24]/80 border-2 border-[#2a2a30] py-3 text-sm font-bold text-[#e0d4ff] flex items-center justify-center gap-2 transition-all hover:border-[#ff2d95]"
                                >
                                    <Heart className={cn("w-4 h-4", isBookmarked && "fill-[#ff2d95] text-[#ff2d95]")} />
                                    {isBookmarked ? "Saved" : "Save"}
                                </button>

                                {isOwner && (
                                    <div className="mt-4 pt-4 border-t border-[#2a2a30]">
                                        <p className="text-[10px] font-display font-black text-[#ff2d95] uppercase tracking-widest mb-3">Creator Management</p>
                                        {prompt.contract_id && prompt.contract_id !== 0 ? (
                                            prompt.isListed ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const newPrice = prompt?.price + 0.001 // Simple increment for test
                                                            if (!confirm(`Update price to ${newPrice} 0G?`)) return

                                                            setIsActionLoading(true)
                                                            try {
                                                                const marketplace = await getMarketplaceContract()
                                                                const tx = await marketplace.updatePrice(prompt.contract_id, parseEther(String(newPrice)))
                                                                await tx.wait()
                                                                await updatePromptPrice(prompt.id, { price_0g: newPrice, currency: prompt.currency || "0G" })
                                                                toast.success("Price update broadcasted!")
                                                                setPrompt((prev: any) => ({ ...prev, price: newPrice }))
                                                            } catch (e) {
                                                                console.error(e)
                                                                toast.error("Failed to update price")
                                                            } finally {
                                                                setIsActionLoading(false)
                                                            }
                                                        }}
                                                        disabled={isActionLoading}
                                                        className="bg-[#160f24] border border-[#2a2a30] py-2 text-[10px] font-bold text-[#e0d4ff] hover:border-[#00ffff] transition-all uppercase"
                                                    >
                                                        Update Price
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure you want to delist this prompt? This will return the NFT to your wallet.")) return

                                                            setIsActionLoading(true)
                                                            try {
                                                                const marketplace = await getMarketplaceContract()
                                                                const tx = await marketplace.delistPrompt(prompt.contract_id)
                                                                await tx.wait()
                                                                await deactivatePrompt(prompt.id)
                                                                toast.success("Delist broadcasted!")
                                                                setPrompt((prev: any) => ({ ...prev, isListed: false }))
                                                            } catch (e) {
                                                                console.error(e)
                                                                toast.error("Failed to delist")
                                                            } finally {
                                                                setIsActionLoading(false)
                                                            }
                                                        }}
                                                        disabled={isActionLoading}
                                                        className="bg-[#160f24] border border-[#2a2a30] py-2 text-[10px] font-bold text-[#e0d4ff] hover:border-red-500 transition-all uppercase"
                                                    >
                                                        Delist
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const newHash = window.prompt("Enter new 0G Storage root hash for updated content:")
                                                            if (!newHash || !newHash.trim()) return
                                                            const newUri = window.prompt("Enter new metadata URI (or press Enter to keep current):", prompt.cid || "")
                                                            
                                                            setIsActionLoading(true)
                                                            try {
                                                                const marketplace = await getMarketplaceContract()
                                                                const tx = await marketplace.createPromptVersion(
                                                                    prompt.contract_id,
                                                                    newUri || prompt.cid || "",
                                                                    newHash.trim()
                                                                )
                                                                await tx.wait()
                                                                toast.success("New version created on-chain!")
                                                            } catch (e: any) {
                                                                console.error(e)
                                                                toast.error(e?.shortMessage || "Failed to create version")
                                                            } finally {
                                                                setIsActionLoading(false)
                                                            }
                                                        }}
                                                        disabled={isActionLoading}
                                                        className="col-span-2 mt-2 bg-[#160f24] border border-[#2a2a30] py-2 text-[10px] font-bold text-[#b4ff39] hover:border-[#b4ff39] transition-all uppercase"
                                                    >
                                                        Create New Version
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        const newPrice = prompt?.price > 0 ? prompt.price : 0.001
                                                        if (!confirm(`Relist prompt with price ${newPrice} 0G?`)) return

                                                        setIsActionLoading(true)
                                                        try {
                                                            const marketplace = await getMarketplaceContract()
                                                            const tx = await marketplace.relistPrompt(prompt.contract_id, parseEther(String(newPrice)))
                                                            await tx.wait()
                                                            await relistPrompt(prompt.id, { price_0g: newPrice, currency: prompt.currency || "0G" })
                                                            toast.success("Relist broadcasted!")
                                                            setPrompt((prev: any) => ({ ...prev, isListed: true, price: newPrice }))
                                                        } catch (e) {
                                                            console.error(e)
                                                            toast.error("Failed to relist")
                                                        } finally {
                                                            setIsActionLoading(false)
                                                        }
                                                    }}
                                                    disabled={isActionLoading}
                                                    className="w-full bg-[#160f24] border border-[#2a2a30] py-2 text-[10px] font-bold text-[#e0d4ff] hover:border-[#b4ff39] transition-all uppercase"
                                                >
                                                    Relist On-Chain
                                                </button>
                                            )
                                        ) : (
                                            <p className="text-[10px] text-[#a78bfa]/70 uppercase tracking-widest">No contract token id found.</p>
                                        )}
                                    </div>
                                )}

                                {/* On-chain identifiers */}
                                {(prompt.contract_id || prompt.rootHash) && (
                                    <div className="mt-6 pt-6 border-t border-[#2a2a30]">
                                        <p className="text-[10px] font-display font-black text-[#a78bfa] uppercase tracking-widest mb-3">On-Chain Info</p>
                                        <div className="flex flex-col gap-2">
                                            {prompt.contract_id != null && prompt.contract_id !== 0 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-[#a78bfa]/60 uppercase">Token ID</span>
                                                    <span className="text-[11px] font-mono font-bold text-[#00ffff]">#{prompt.contract_id}</span>
                                                </div>
                                            )}
                                            {prompt.rootHash && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-[#a78bfa]/60 uppercase">Root Hash</span>
                                                    <span className="text-[10px] font-mono text-[#b4ff39] truncate max-w-[140px]" title={prompt.rootHash}>{prompt.rootHash.slice(0, 10)}...{prompt.rootHash.slice(-6)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 0G Compute Quality Score */}
                                <div className="mt-4 pt-4 border-t border-[#2a2a30]">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-display font-black text-[#a78bfa] uppercase tracking-widest">AI Quality Score</p>
                                        {!qualityScore && (
                                            <button
                                                onClick={handleScorePrompt}
                                                disabled={scoreLoading}
                                                className="text-[10px] font-bold text-[#00ffff] hover:text-[#b4ff39] uppercase tracking-widest transition-colors disabled:opacity-50"
                                            >
                                                {scoreLoading ? "Scoring..." : "Run 0G Compute"}
                                            </button>
                                        )}
                                    </div>
                                    {qualityScore ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-[#a78bfa]/60 uppercase">Overall</span>
                                                <span className="text-lg font-extrabold text-[#b4ff39]">{qualityScore.overall}/10</span>
                                            </div>
                                            {["clarity", "completeness", "safety", "reproducibility", "innovation"].map((key: string) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-[10px] text-[#a78bfa]/50 capitalize">{key}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-[#2a2a30] overflow-hidden">
                                                            <div className="h-full bg-[#00ffff]" style={{ width: `${(qualityScore[key] / 10) * 100}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-[#e0d4ff]">{qualityScore[key]}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {qualityScore.reasoning && (
                                                <p className="text-[10px] text-[#a78bfa]/40 mt-1 italic leading-relaxed">{qualityScore.reasoning.substring(0, 150)}</p>
                                            )}
                                            <p className="text-[8px] text-[#a78bfa]/30 uppercase tracking-widest mt-1">Powered by 0G Compute (Llama 3.1)</p>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-[#a78bfa]/40">Click "Run 0G Compute" to analyze prompt quality via AI inference.</p>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#2a2a30] flex flex-col gap-3">
                                    {prompt.txId && (
                                        <a
                                            href={`${CHAIN_CONFIG.explorer}/tx/${prompt.txId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between text-[10px] font-bold text-[#a78bfa] hover:text-[#00ffff] uppercase tracking-widest transition-colors group"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3" />
                                                0G Explorer
                                            </span>
                                            <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                                        </a>
                                    )}
                                    {prompt.cid && (
                                        <a
                                            href={`https://gateway.pinata.cloud/ipfs/${prompt.cid.replace('ipfs://', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between text-[10px] font-bold text-[#a78bfa] hover:text-[#ff2d95] uppercase tracking-widest transition-colors group"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3" />
                                                Pinata IPFS
                                            </span>
                                            <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {related.length > 0 && (
                    <section className="mt-16">
                        <h2 className="text-2xl font-extrabold text-[#e0d4ff] mb-6">Related Prompts</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {related.map((p) => (
                                <PromptCard key={p.id} prompt={p} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <PurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} prompt={prompt} />
        </AppShell>
    )
}
