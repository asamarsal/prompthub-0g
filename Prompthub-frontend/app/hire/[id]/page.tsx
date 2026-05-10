"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { Star, BadgeCheck, ArrowLeft, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { fetchUserByAddress, ApiUser, getPrompts, getArtistReviews, createHireRequest, verifyHireEscrow, verifyHireCompletion, fetchMyHireRequests } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { parseEther } from "ethers"
import { getEscrowContract, checkAgentVerified } from "@/lib/evm"

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { isConnected } = useWallet()
    const [user, setUser] = useState<ApiUser | null>(null)
    const [portfolio, setPortfolio] = useState<any[]>([])
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [fundingEscrow, setFundingEscrow] = useState(false)
    const [completingJob, setCompletingJob] = useState(false)
    const [onChainJobId, setOnChainJobId] = useState<number | null>(null)
    const [currentHireId, setCurrentHireId] = useState<string | null>(null)
    const [activeHire, setActiveHire] = useState<any>(null)
    const [agentVerified, setAgentVerified] = useState(false)

    useEffect(() => {
        Promise.all([
            fetchUserByAddress(id),
            getPrompts({ user_address: id })
        ])
            .then(async ([userData, promptsData]) => {
                setUser(userData)
                setPortfolio(promptsData?.data || [])
                if (userData?.id) {
                    getArtistReviews(userData.id).then(r => setReviews(r?.data || []))
                }
                if (userData?.wallet_address) {
                    checkAgentVerified(userData.wallet_address).then(setAgentVerified)
                    fetchMyHireRequests()
                        .then((requests) => {
                            const match = requests.find((h: any) => {
                                const sameArtist = String(h.artist_address || "").toLowerCase() === String(userData.wallet_address).toLowerCase()
                                return sameArtist && ["PENDING_FUNDING", "IN_PROGRESS", "ACCEPTED"].includes(String(h.status || ""))
                            })
                            if (match) {
                                setActiveHire(match)
                                setCurrentHireId(match.id)
                                if (match.onchain_job_id) setOnChainJobId(Number(match.onchain_job_id))
                            }
                        })
                        .catch(() => null)
                }
            })
            .catch(err => console.error("Missing artist record:", err))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white/30 text-xl">
                <Loader2 className="w-8 h-8 animate-spin text-[#ff2d95]" />
            </div>
        )
    }

    if (!user) return (
        <div className="min-h-screen flex flex-col gap-4 items-center justify-center text-white/30">
            <span className="text-xl font-mono">Artist not found</span>
            <Link href="/hire" className="text-sm text-[#ff2d95] uppercase font-bold tracking-widest hover:underline">Return to Marketplace</Link>
        </div>
    )

    const accent = "#ff2d95"

    const artist = {
        name: user.name || user.username || "Anonymous Artist",
        handle: user.username || user.wallet_address.substring(0, 8),
        bio: user.bio || "No bio provided.",
        available: user.is_available_for_freelance ?? true,
        rating: user.stats?.rating || 5.0,
        reviews: user.stats?.reviews || 0,
        completedProjects: user.stats?.projects || 0,
        hourlyRate: user.hourly_rate || 0.002,
        currency: user.hourly_rate_currency || "0G",
        tools: user.tools && user.tools.length > 0 ? user.tools : ['Midjourney v6', 'DALL-E 3'],
        specialties: user.specialties && user.specialties.length > 0 ? user.specialties : ['AI Artist'],
        isVerified: agentVerified,
    }

    const handleFundEscrow = async () => {
        if (!isConnected) {
            alert("Connect wallet first")
            return
        }
        if (!user?.wallet_address) {
            alert("Artist wallet address not found")
            return
        }

        const projectBrief = window.prompt("Project brief for this hire request:")
        if (!projectBrief || !projectBrief.trim()) return
        const budgetInput = window.prompt("Budget in 0G (example: 0.01):", String(artist.hourlyRate || 0.002))
        const budget = Number(budgetInput || 0)
        if (!Number.isFinite(budget) || budget <= 0) {
            alert("Invalid budget")
            return
        }

        setFundingEscrow(true)
        try {
            const escrow = await getEscrowContract()
            const tx = await escrow.createJob(user.wallet_address, {
                value: parseEther(String(budget))
            })
            const receipt = await tx.wait()
            let parsedJobId: number | undefined
            for (const log of receipt?.logs || []) {
                try {
                    const iface = escrow.interface
                    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data })
                    if (parsed?.name === "JobCreated" && parsed?.args?.[0]) {
                        parsedJobId = Number(parsed.args[0])
                        setOnChainJobId(parsedJobId)
                        break
                    }
                } catch {}
            }

            const created = await createHireRequest({
                artist_address: user.wallet_address,
                project_brief: projectBrief.trim(),
                budget_0g: budget,
                tx_id: tx.hash,
                onchain_job_id: parsedJobId,
            })
            if (created?.id) {
                setCurrentHireId(created.id)
                const verified = await verifyHireEscrow(created.id, tx.hash)
                setActiveHire({ ...created, status: "IN_PROGRESS", onchain_job_id: verified?.onchain_job_id || parsedJobId })
            }
            alert("Escrow funded and hire request created!")
        } catch (err: any) {
            console.error(err)
            alert(err?.shortMessage || err?.message || "Failed to fund escrow")
        } finally {
            setFundingEscrow(false)
        }
    }

    const handleCompleteJob = async () => {
        const jobId = onChainJobId || Number(activeHire?.onchain_job_id)
        const hireId = currentHireId || activeHire?.id
        if (!jobId || !hireId) {
            alert("No verified active hire found for this artist. Fund escrow or refresh your hire request list first.")
            return
        }

        setCompletingJob(true)
        try {
            const escrow = await getEscrowContract()
            const tx = await escrow.completeJob(jobId)
            await tx.wait()
            await verifyHireCompletion(hireId, tx.hash)
            setActiveHire((prev: any) => prev ? { ...prev, status: "COMPLETED", completion_tx_id: tx.hash } : prev)
            alert("Job completed! Funds released to artist.")
        } catch (err: any) {
            console.error(err)
            alert(err?.shortMessage || err?.message || "Failed to complete job")
        } finally {
            setCompletingJob(false)
        }
    }

    return (
        <AppShell>
            <div className="min-h-screen py-12 px-4 lg:px-8 max-w-6xl mx-auto">
                <Link href="/hire" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Artists
                </Link>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Left: Artist card */}
                    <div className="md:col-span-1">
                        <div className="bg-[#0d0d0d] border-2 border-[#2a2a30] p-6 flex flex-col gap-4" style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
                            {/* Avatar */}
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff2d95] to-[#a855f7] flex items-center justify-center text-xl font-black text-white shrink-0 overflow-hidden">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                                    ) : (
                                        artist.name[0]?.toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-white uppercase">{artist.name}</span>
                                        {artist.isVerified && <BadgeCheck className="w-4 h-4 text-[#00ffff]" />}
                                    </div>
                                    <span className="text-xs font-mono text-[#a78bfa]">@{artist.handle}</span>
                                </div>
                            </div>

                            {/* Status */}
                            <span className={`text-[11px] font-bold uppercase px-3 py-1 border w-fit ${artist.available ? "text-[#b4ff39] border-[#b4ff39]/50 bg-[#b4ff39]/10" : "text-white/30 border-white/10"}`}>
                                {artist.available ? "● Available for hire" : "● Currently busy"}
                            </span>

                            {/* Bio */}
                            <p className="text-sm text-white/60 leading-relaxed">{artist.bio}</p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-[#2a2a30]">
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-[#ff2d95]">{artist.rating}</div>
                                    <div className="text-[10px] text-white/30 uppercase">Rating</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-[#00ffff]">{artist.reviews}</div>
                                    <div className="text-[10px] text-white/30 uppercase">Reviews</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-[#b4ff39]">{artist.completedProjects}</div>
                                    <div className="text-[10px] text-white/30 uppercase">Projects</div>
                                </div>
                            </div>

                            {/* Rate */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/40 uppercase tracking-wider">Hourly Rate</span>
                                <span className="text-lg font-extrabold font-mono text-[#00ffff]">{artist.hourlyRate} {artist.currency}</span>
                            </div>

                            {/* Tools */}
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Tools</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {artist.tools.map(t => (
                                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-[#00ffff]/10 border border-[#00ffff]/25 text-[#00ffff] uppercase">{t}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Specialties */}
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Specialties</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {artist.specialties.map(s => (
                                        <span key={s} className="text-[10px] font-mono px-2 py-0.5 bg-[#ff2d95]/10 border border-[#ff2d95]/25 text-[#ff2d95] uppercase">{s}</span>
                                    ))}
                                </div>
                            </div>

                            {/* CTA */}
                            {artist.available ? (
                                <div className="flex flex-col gap-2 mt-2">
                                    <button
                                        onClick={handleFundEscrow}
                                        disabled={fundingEscrow}
                                        className="w-full py-3 font-extrabold uppercase tracking-wider text-sm border-2 transition-all text-center hover:opacity-90 disabled:opacity-50"
                                        style={{ borderColor: accent, background: `${accent}22`, color: "white", boxShadow: `4px 4px 0 0 ${accent}` }}
                                    >
                                        {fundingEscrow ? "Funding Escrow..." : "Fund Escrow & Create Hire"}
                                    </button>
                                    <button
                                        onClick={handleCompleteJob}
                                        disabled={completingJob}
                                        className="w-full py-2.5 font-extrabold uppercase tracking-wider text-xs border-2 border-[#b4ff39] bg-[#b4ff39]/10 text-[#b4ff39] hover:bg-[#b4ff39]/20 transition-all disabled:opacity-50"
                                    >
                                        {completingJob ? "Releasing Funds..." : "Complete Job & Release Escrow"}
                                    </button>
                                    <Link
                                        href={`/messages?to=${artist.handle}`}
                                        className="w-full py-2.5 font-bold uppercase tracking-wider text-xs border border-[#2a2a30] text-white/70 hover:text-white hover:border-[#a78bfa] transition-all block text-center"
                                    >
                                        Chat First
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    disabled
                                    className="w-full mt-2 py-3 font-extrabold uppercase tracking-wider text-sm border-2 transition-all opacity-30 cursor-not-allowed"
                                    style={{ borderColor: accent, background: `${accent}22`, color: "white" }}
                                >
                                    Currently Unavailable
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Portfolio */}
                    <div className="md:col-span-2 flex flex-col gap-6">
                        <h2 className="text-2xl font-extrabold text-white uppercase">Portfolio</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {portfolio.length === 0 && (
                                <div className="col-span-2 text-white/30 text-sm py-8 border border-dashed border-white/10 flex items-center justify-center">
                                    No marketplace prompts listed yet
                                </div>
                            )}
                            {portfolio.map((item, i) => (
                                <Link href={`/prompts/${item.id}`} key={i} className="group relative border border-[#2a2a30] overflow-hidden bg-[#0d0d0d] hover:border-[#ff2d95] transition-all block">
                                    <div className="relative h-52 overflow-hidden">
                                        <img src={item.preview_image_url || "https://images.unsplash.com/photo-1620061546252-78d12ee9ae89?q=80&w=2564&auto=format&fit=crop"} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-[#1a1a1e]" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                        <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2 py-0.5 bg-[#ff2d95]/20 border border-[#ff2d95]/40 text-[#ff2d95] uppercase">{item.category || "AI Prompt"}</span>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-bold text-white uppercase truncate">{item.title}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Client Reviews */}
                        <div className="bg-[#0d0d0d] border border-[#2a2a30] p-6 mt-8">
                            <h3 className="text-lg font-extrabold text-white uppercase mb-4 flex items-center gap-2">
                                <Star className="w-4 h-4 fill-[#ff2d95] text-[#ff2d95]" />
                                Client Reviews
                            </h3>
                            {reviews.length === 0 ? (
                                <p className="text-xs text-white/30 italic">No reviews yet. Hire this artist to be the first!</p>
                            ) : (
                                reviews.map((r, i) => (
                                    <div key={i} className="py-4 border-b border-[#2a2a30] last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-bold text-white max-w-[200px] truncate">{r.reviewer?.name || "Client"}</span>
                                            <div className="flex shrink-0">
                                                {Array.from({ length: r.rating }).map((_, j) => (
                                                    <Star key={j} className="w-3 h-3 fill-[#ff2d95] text-[#ff2d95]" />
                                                ))}
                                                {Array.from({ length: 5 - r.rating }).map((_, j) => (
                                                    <Star key={j + 10} className="w-3 h-3 text-white/10" />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-white/60 leading-relaxed">{r.comment}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
