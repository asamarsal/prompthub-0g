"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Star, BadgeCheck, Zap, Search, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { fetchArtists } from "@/lib/api"

const specialtyFilters = ["All", "Brand Identity", "Product Photography", "Ad Creative", "Video / Motion", "Character Design", "3D Render", "NFT Collection", "Social Media Pack"]

const toolFilters = ["All", "Midjourney v6", "Stable Diffusion XL", "DALL-E 3", "Sora", "Adobe Firefly", "RunwayML"]

export default function HirePage() {
    const [artists, setArtists] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [specialty, setSpecialty] = useState("All")
    const [tool, setTool] = useState("All")
    const [query, setQuery] = useState("")
    const [onlyAvailable, setOnlyAvailable] = useState(false)

    useEffect(() => {
        fetchArtists()
            .then(data => setArtists(data))
            .catch(err => console.error("Failed to fetch artists:", err))
            .finally(() => setLoading(false))
    }, [])

    const filtered = artists.filter(a => {
        if (onlyAvailable && !a.available) return false
        if (specialty !== "All" && !a.specialties.some((s: string) => s.toLowerCase().includes(specialty.toLowerCase()))) return false
        if (tool !== "All" && !a.tools.some((t: string) => t.toLowerCase().includes(tool.toLowerCase()))) return false
        if (query && !a.name.toLowerCase().includes(query.toLowerCase()) && !a.bio.toLowerCase().includes(query.toLowerCase())) return false
        return true
    })

    return (
        <AppShell>
            <div className="min-h-screen py-12 px-4 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-sm font-bold text-[#ff2d95] uppercase tracking-widest mb-2 font-mono">{"// HIRE"}</p>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white uppercase mb-3">
                        Hire an <span className="gradient-text">AI Artist</span>
                    </h1>
                    <p className="text-[#a78bfa] max-w-xl">Connect with verified AI creators for your brand campaigns, product launches, NFT drops, and more. Powered by 0G escrow.</p>
                </div>

                {/* Filters bar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a78bfa]" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search artists..."
                            className="w-full pl-10 pr-4 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#ff2d95] transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4">
                        {/* Specialty filter */}
                        <select
                            value={specialty}
                            onChange={e => setSpecialty(e.target.value)}
                            className="w-full lg:w-auto bg-[#111] border border-[#2a2a30] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#ff2d95] transition-colors cursor-pointer"
                        >
                            {specialtyFilters.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>

                        {/* Tool filter */}
                        <select
                            value={tool}
                            onChange={e => setTool(e.target.value)}
                            className="w-full lg:w-auto bg-[#111] border border-[#2a2a30] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#ff2d95] transition-colors cursor-pointer"
                        >
                            {toolFilters.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>

                        {/* Available toggle */}
                        <button
                            onClick={() => setOnlyAvailable(v => !v)}
                            className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold uppercase tracking-wider border-2 transition-all ${onlyAvailable ? "border-[#b4ff39] text-[#b4ff39] bg-[#b4ff39]/10" : "border-[#2a2a30] text-white/40 hover:border-white/30"}`}
                        >
                            <Zap className="w-3.5 h-3.5 inline mr-1.5" />
                            Available
                        </button>
                    </div>
                </div>

                {/* Count */}
                <p className="text-xs text-white/30 font-mono mb-6">
                    {loading ? "Loading artists..." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
                </p>

                {/* Artists grid */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#ff2d95]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(artist => (
                            <Link
                                key={artist.id}
                                href={`/hire/${artist.id}`}
                                className="group block bg-[#0d0d0d] border-2 border-[#2a2a30] hover:border-[#ff2d95] transition-all hover:-translate-y-0.5"
                                style={{ boxShadow: "4px 4px 0 0 transparent" }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = "4px 4px 0 0 #ff2d95")}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = "4px 4px 0 0 transparent")}
                            >
                                {/* Portfolio preview */}
                                <div className="relative h-40 overflow-hidden bg-[#111]">
                                    {artist.portfolio[0] && (
                                        <img src={artist.portfolio[0].image} alt={artist.portfolio[0].title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] to-transparent" />
                                    {/* Availability badge */}
                                    <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 border ${artist.available ? "text-[#b4ff39] border-[#b4ff39]/50 bg-[#b4ff39]/10" : "text-white/30 border-white/10 bg-black/50"}`}>
                                        {artist.available ? "● Available" : "● Busy"}
                                    </span>
                                </div>

                                <div className="p-5 flex flex-col gap-3">
                                    {/* Name + verified */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff2d95] to-[#a855f7] flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                                            {artist.avatar ? (
                                                <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                artist.name[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-extrabold text-white text-sm uppercase">{artist.name}</span>
                                                {artist.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#00ffff]" />}
                                            </div>
                                            <span className="text-[11px] font-mono text-[#a78bfa]">@{artist.handle}</span>
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{artist.bio}</p>

                                    {/* Specialties */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {artist.specialties.slice(0, 3).map((s: string) => (
                                            <span key={s} className="text-[10px] font-mono px-2 py-0.5 bg-[#ff2d95]/10 border border-[#ff2d95]/25 text-[#ff2d95] uppercase">{s}</span>
                                        ))}
                                    </div>

                                    {/* Footer row */}
                                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#2a2a30]">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 fill-[#ff2d95] text-[#ff2d95]" />
                                            <span className="text-sm font-bold text-white">{artist.rating}</span>
                                            <span className="text-[11px] text-white/30">({artist.reviews})</span>
                                        </div>
                                        <span className="text-sm font-extrabold font-mono text-[#00ffff]">
                                            {artist.hourlyRate} {artist.currency}<span className="text-xs text-white/30">/hr</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-center py-20 text-white/30">
                        <p className="text-2xl font-bold mb-2">No artists found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
