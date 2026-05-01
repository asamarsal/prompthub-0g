"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, Star, BadgeCheck, ShoppingCart } from "lucide-react"
import { prompts } from "@/lib/mock-data"
import Link from "next/link"

const items = prompts.slice(0, 4)

const exampleImages = [
    "/example/prompt-example-1.png",
    "/example/prompt-example-2.jpg",
    "/example/prompt-example-3.jpg",
    "/example/prompt-example-4.png",
]

const categoryGradients: Record<string, string> = {
    "Image Generation": "from-[#ff2d95]/30 via-[#a855f7]/20 to-[#0a001a]",
    "Code Generation": "from-[#00ffff]/25 via-[#0080ff]/15 to-[#0a001a]",
    "UI/UX Design": "from-[#a855f7]/30 via-[#ff2d95]/15 to-[#0a001a]",
    "Text/Copywriting": "from-[#b4ff39]/25 via-[#00ffff]/15 to-[#0a001a]",
    "Video Generation": "from-[#ff6b2b]/30 via-[#ff2d95]/20 to-[#0a001a]",
}
const categoryAccents: Record<string, string> = {
    "Image Generation": "#ff2d95",
    "Code Generation": "#00ffff",
    "UI/UX Design": "#a855f7",
    "Text/Copywriting": "#b4ff39",
    "Video Generation": "#ff6b2b",
}
const categoryLetters: Record<string, string> = {
    "Image Generation": "IMG",
    "Code Generation": "DEV",
    "UI/UX Design": "UX",
    "Text/Copywriting": "TXT",
    "Video Generation": "VID",
}

export function PromptShowcaseCarousel() {
    const [current, setCurrent] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [direction, setDirection] = useState<"left" | "right">("right")
    const [displayed, setDisplayed] = useState(0)
    const total = items.length

    const goTo = useCallback((idx: number, dir: "left" | "right") => {
        if (isAnimating || idx === current) return
        setIsAnimating(true)
        setDirection(dir)
        setTimeout(() => {
            setDisplayed(idx)
            setCurrent(idx)
            setIsAnimating(false)
        }, 420)
        setCurrent(idx)
    }, [isAnimating, current])

    const prev = () => goTo((current - 1 + total) % total, "left")
    const next = () => goTo((current + 1) % total, "right")

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prev()
            if (e.key === "ArrowRight") next()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [current, isAnimating])

    // Auto-advance
    useEffect(() => {
        const t = setInterval(() => next(), 5000)
        return () => clearInterval(t)
    }, [current, isAnimating])

    const prompt = items[displayed]
    const accent = categoryAccents[prompt.category] ?? "#a78bfa"
    const gradient = categoryGradients[prompt.category] ?? "from-[#a855f7]/20 to-[#0a001a]"
    const letters = categoryLetters[prompt.category] ?? "AI"

    const slideClass = isAnimating
        ? direction === "right"
            ? "opacity-0 translate-x-16"
            : "opacity-0 -translate-x-16"
        : "opacity-100 translate-x-0"

    return (
        <section className="relative w-full overflow-hidden border-t border-b border-[rgba(180,120,255,0.12)]">
            {/* Full-width slide */}
            <div
                className={`relative w-full min-h-[660px] md:min-h-[680px] flex items-center transition-all duration-[420ms] ease-out ${slideClass} bg-[#07000f]`}
            >
                {/* Background gradient matching category */}
                <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} aria-hidden="true" />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                    aria-hidden="true"
                />

                {/* Giant letter watermark */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.04] select-none pointer-events-none" aria-hidden="true">
                    <span className="text-[22vw] font-black font-mono leading-none" style={{ color: accent }}>
                        {letters}
                    </span>
                </div>

                {/* Corner brackets */}
                <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2" style={{ borderColor: `${accent}60` }} aria-hidden="true" />
                <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2" style={{ borderColor: `${accent}60` }} aria-hidden="true" />
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2" style={{ borderColor: `${accent}60` }} aria-hidden="true" />
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2" style={{ borderColor: `${accent}60` }} aria-hidden="true" />

                {/* Content */}
                <div className="relative z-10 mx-auto max-w-7xl w-full px-12 lg:px-20 py-16 flex flex-col md:flex-row items-center gap-12">
                    {/* Left: text info */}
                    <div className="flex-1 flex flex-col gap-5 text-center md:text-left">
                        {/* Badge row */}
                        <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                            <span
                                className="text-[11px] font-mono font-bold uppercase tracking-widest px-3 py-1 border"
                                style={{ color: accent, borderColor: `${accent}60`, background: `${accent}15` }}
                            >
                                {prompt.category}
                            </span>
                            {prompt.isCurated && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-[#00ffff] uppercase tracking-widest">
                                    <BadgeCheck className="w-3.5 h-3.5" /> Curated Pick
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight uppercase tracking-tight">
                            {prompt.title}
                        </h2>

                        {/* Description */}
                        <p className="text-[#a78bfa] text-base leading-relaxed max-w-xl line-clamp-3">
                            {prompt.description}
                        </p>

                        {/* Creator + rating */}
                        <div className="flex items-center gap-5 justify-center md:justify-start">
                            <Link
                                href={`/creator/${encodeURIComponent(prompt.creatorName)}`}
                                className="text-sm font-bold text-[#a78bfa] hover:text-white transition-colors"
                            >
                                by <span className="underline underline-offset-2">{prompt.creatorName}</span>
                            </Link>
                            <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-[#ff2d95] text-[#ff2d95]" />
                                <span className="text-sm font-bold" style={{ color: accent }}>{prompt.rating}</span>
                                <span className="text-xs text-[#a78bfa]/50">({prompt.reviews} reviews)</span>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                            {prompt.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="text-[11px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 text-[#a78bfa] uppercase tracking-wider">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        {/* CTA row */}
                        <div className="flex items-center gap-4 justify-center md:justify-start mt-2">
                            <span className="text-3xl font-extrabold font-mono" style={{ color: accent }}>
                                {prompt.price} <span className="text-lg">{prompt.currency}</span>
                            </span>
                            <Link
                                href={`/prompt/${prompt.id}`}
                                className="inline-flex items-center gap-2 px-6 py-2.5 border-2 font-bold uppercase text-sm tracking-wider text-white transition-all hover:-translate-y-0.5"
                                style={{
                                    borderColor: accent,
                                    background: `${accent}22`,
                                    boxShadow: `4px 4px 0 0 ${accent}`,
                                }}
                            >
                                <ShoppingCart className="w-4 h-4" /> Buy Prompt
                            </Link>
                            <Link href="/marketplace" className="text-sm text-[#a78bfa] hover:text-white underline underline-offset-2 transition-colors">
                                View all
                            </Link>
                        </div>
                    </div>

                    {/* Right: actual image */}
                    <div
                        className="shrink-0 w-full md:w-[420px] lg:w-[480px] h-64 md:h-[380px] border-2 relative overflow-hidden"
                        style={{ borderColor: `${accent}50`, boxShadow: `8px 8px 0 0 ${accent}40` }}
                    >
                        <img
                            src={exampleImages[displayed]}
                            alt={prompt.title}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Overlay tint */}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${accent}30 0%, transparent 60%)` }} />
                        {/* Model tag */}
                        <span
                            className="absolute bottom-3 right-3 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 border backdrop-blur-sm"
                            style={{ color: accent, borderColor: `${accent}50`, background: "rgba(7,0,15,0.85)" }}
                        >
                            {prompt.model}
                        </span>
                    </div>
                </div>
            </div>

            {/* Prev / Next buttons */}
            <button
                onClick={prev}
                aria-label="Previous prompt"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#07000f]/80 border-2 border-[#2a2a30] text-[#a78bfa] hover:border-[#ff2d95] hover:text-[#ff2d95] transition-all shadow-[3px_3px_0_0_#2a2a30] hover:shadow-[3px_3px_0_0_#ff2d95] backdrop-blur-sm"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={next}
                aria-label="Next prompt"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-[#07000f]/80 border-2 border-[#2a2a30] text-[#a78bfa] hover:border-[#ff2d95] hover:text-[#ff2d95] transition-all shadow-[3px_3px_0_0_#2a2a30] hover:shadow-[3px_3px_0_0_#ff2d95] backdrop-blur-sm"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide counter top-right */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 font-mono text-xs text-[#a78bfa]/60 tracking-widest">
                {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2 items-center">
                {items.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i, i > current ? "right" : "left")}
                        aria-label={`Slide ${i + 1}`}
                    >
                        <span
                            className="block transition-all duration-300"
                            style={{
                                width: current === i ? "32px" : "8px",
                                height: "4px",
                                background: current === i ? accent : "#2a2a30",
                                boxShadow: current === i ? `0 0 8px ${accent}` : "none",
                            }}
                        />
                    </button>
                ))}
            </div>
        </section>
    )
}
