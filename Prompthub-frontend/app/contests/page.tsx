"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trophy, Clock, Users, Plus, Star } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { getApiToken } from "@/lib/api"

const categoryFilters = ["All", "Brand Visual Identity", "Product Launch Campaign", "NFT Collection Design", "Social Media Challenge", "Character Design", "Packaging Design"]
const statusFilters = ["All", "active", "judging", "ended"]

function daysLeft(deadline: string) {
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    return d > 0 ? `${d}d left` : "Ended"
}

const statusColors: Record<string, string> = {
    active: "#b4ff39",
    judging: "#00ffff",
    ended: "#ffffff40",
}

export default function ContestsPage() {
    const [category, setCategory] = useState("All")
    const [status, setStatus] = useState("All")
    const [contests, setContests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchContests() {
            try {
                const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                const res = await fetch(`${url}/api/contests`, {
                    headers: { 'Accept': 'application/json' }
                })
                const data = await res.json()

                // Map backend format to UI format
                const mapped = data.map((c: any, index: number) => ({
                    id: c.id,
                    title: c.title,
                    brand: c.brand_name || "Unknown Brand",
                    description: c.about_brand || "",
                    prizePool: parseFloat(c.total_prize_0g || 0).toString(),
                    currency: "0G",
                    category: c.category || "Uncategorized",
                    deadline: c.deadline,
                    submissionCount: c.submissions_count || 0,
                    status: c.status === "OPEN" ? "active" : c.status === "COMPLETED" ? "ended" : c.status.toLowerCase(),
                    featured: index === 0, // Mock feature logic for now, first item is featured
                    image: `/example/prompt-example-${(index % 4) + 1}.png`,
                    prizes: c.prize_tiers || []
                }))

                setContests(mapped)
            } catch (err) {
                console.error("Failed to fetch contests", err)
            } finally {
                setLoading(false)
            }
        }
        fetchContests()
    }, [])

    const filtered = contests.filter(c => {
        if (category !== "All" && c.category !== category) return false
        if (status !== "All" && c.status !== status) return false
        return true
    })

    return (
        <AppShell>
            <div className="min-h-screen py-12 px-4 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <p className="text-sm font-bold text-[#00ffff] uppercase tracking-widest mb-2 font-mono">{"// CONTESTS"}</p>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white uppercase mb-3">
                            Brand <span className="gradient-text">Contests</span>
                        </h1>
                        <p className="text-[#a78bfa] max-w-xl">Brands post creative briefs. AI Artists compete for 0G prizes. Win and secure on-chain licensing rights.</p>
                    </div>
                    <Link
                        href="/contests/create"
                        className="inline-flex items-center gap-2 px-6 py-3 font-bold uppercase text-sm tracking-wider text-white border-2 border-[#00ffff] bg-[#00ffff]/15 hover:bg-[#00ffff]/25 shadow-[4px_4px_0_0_#00ffff] transition-all hover:-translate-y-0.5 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Create Contest
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-8">
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="bg-[#111] border border-[#2a2a30] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#00ffff] transition-colors cursor-pointer"
                    >
                        {categoryFilters.map(f => <option key={f} value={f}>{f === "All" ? "All Categories" : f}</option>)}
                    </select>

                    <div className="flex gap-2">
                        {statusFilters.map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all ${status === s ? "border-[#00ffff] text-[#00ffff] bg-[#00ffff]/10" : "border-[#2a2a30] text-white/40 hover:border-white/30"}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Featured banner */}
                {filtered.filter(c => c.featured).length > 0 && status === "All" && category === "All" && (
                    <div className="mb-10">
                        <p className="text-xs font-mono text-[#ff2d95] uppercase tracking-widest mb-4">⭐ Featured Contests</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            {filtered.filter(c => c.featured).map(c => (
                                <Link
                                    key={c.id}
                                    href={`/contests/${c.id}`}
                                    className="group relative border-2 border-[#ff2d95]/50 hover:border-[#ff2d95] transition-all overflow-hidden block"
                                    style={{ boxShadow: "5px 5px 0 0 #ff2d9540" }}
                                >
                                    <div className="h-40 relative overflow-hidden">
                                        <img src={c.image} alt={c.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                                        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase px-2 py-0.5 border text-[#ff2d95] border-[#ff2d95]/50 bg-black/50">FEATURED</span>
                                        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 border" style={{ color: statusColors[c.status], borderColor: `${statusColors[c.status]}50`, background: "rgba(0,0,0,0.6)" }}>{c.status}</span>
                                    </div>
                                    <div className="bg-[#0d0d0d] p-5">
                                        <p className="text-xs font-mono text-[#a78bfa] mb-1">{c.brand}</p>
                                        <h3 className="font-extrabold text-white uppercase text-base mb-2 line-clamp-1">{c.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-xs text-white/40">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.submissionCount} entries</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft(c.deadline)}</span>
                                            </div>
                                            <span className="font-extrabold font-mono text-[#ff2d95]">{c.prizePool} {c.currency}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* All contests list */}
                {loading ? (
                    <div className="text-center py-20 text-white/30 text-sm animate-pulse">Loading contests...</div>
                ) : (
                    <>
                        <p className="text-xs text-white/30 font-mono mb-4">{filtered.length} contest{filtered.length !== 1 ? "s" : ""}</p>
                        <div className="flex flex-col gap-4">
                            {filtered.map(c => (
                                <Link
                                    key={c.id}
                                    href={`/contests/${c.id}`}
                                    className="group flex flex-col md:flex-row gap-0 border border-[#2a2a30] hover:border-[#00ffff] transition-all bg-[#0d0d0d] overflow-hidden"
                                >
                                    {/* Thumbnail */}
                                    <div className="md:w-48 h-32 md:h-auto relative shrink-0 overflow-hidden">
                                        <img src={c.image} alt={c.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0d0d0d] hidden md:block" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                                <span className="text-[11px] font-mono text-[#a78bfa]">{c.brand}</span>
                                                <span className="text-[10px] uppercase px-2 py-0.5 border" style={{ color: statusColors[c.status], borderColor: `${statusColors[c.status]}50`, background: `${statusColors[c.status]}12` }}>{c.status}</span>
                                                {c.featured && <span className="text-[10px] uppercase px-2 py-0.5 border text-[#ff2d95] border-[#ff2d95]/40 bg-[#ff2d95]/10">Featured</span>}
                                            </div>
                                            <h3 className="font-extrabold text-white uppercase text-base line-clamp-1 group-hover:text-[#00ffff] transition-colors">{c.title}</h3>
                                            <p className="text-xs text-white/40 line-clamp-2 mt-1">{c.description}</p>
                                        </div>

                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex gap-4 text-xs text-white/40">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.submissionCount} entries</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft(c.deadline)}</span>
                                                <span className="hidden md:block text-[#a78bfa]/60">{c.category}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Trophy className="w-4 h-4 text-[#ff2d95]" />
                                                <span className="font-extrabold font-mono text-[#ff2d95]">{c.prizePool} {c.currency}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {filtered.length === 0 && (
                            <div className="text-center py-20 text-white/30">
                                <p className="text-2xl font-bold mb-2">No contests found</p>
                                <p className="text-sm">Try different filters or <Link href="/contests/create" className="text-[#00ffff] hover:underline">create one</Link></p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    )
}
