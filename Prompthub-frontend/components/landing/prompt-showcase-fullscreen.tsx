"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Star, BadgeCheck, ShoppingCart } from "lucide-react"
import { prompts } from "@/lib/mock-data"
import Link from "next/link"

const slides = [
    { prompt: prompts[0], image: "/example/prompt-example-1.png" },
    { prompt: prompts[1], image: "/example/prompt-example-2.jpg" },
    { prompt: prompts[2], image: "/example/prompt-example-3.jpg" },
    { prompt: prompts[3], image: "/example/prompt-example-4.png" },
]

const categoryAccents: Record<string, string> = {
    "Image Generation": "#ff2d95",
    "Code Generation": "#00ffff",
    "UI/UX Design": "#a855f7",
    "Text/Copywriting": "#b4ff39",
    "Video Generation": "#ff6b2b",
}

export function PromptShowcaseFullscreen() {
    const [current, setCurrent] = useState(0)
    const [transitioning, setTransitioning] = useState(false)
    const total = slides.length

    const goTo = useCallback((idx: number) => {
        if (transitioning || idx === current) return
        setTransitioning(true)
        setTimeout(() => {
            setCurrent(idx)
            setTransitioning(false)
        }, 500)
    }, [transitioning, current])

    const prev = () => goTo((current - 1 + total) % total)
    const next = () => goTo((current + 1) % total)

    // Auto-advance
    useEffect(() => {
        const t = setInterval(next, 6000)
        return () => clearInterval(t)
    }, [current, transitioning])

    // Keyboard
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prev()
            if (e.key === "ArrowRight") next()
        }
        window.addEventListener("keydown", h)
        return () => window.removeEventListener("keydown", h)
    }, [current, transitioning])

    const { prompt, image } = slides[current]
    const accent = categoryAccents[prompt.category] ?? "#a78bfa"

    return (
        <section className="relative w-full h-[90vh] min-h-[600px] max-h-[900px] overflow-hidden">

            {/* Background image — crossfade on change */}
            {slides.map((s, i) => (
                <div
                    key={i}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === current && !transitioning ? 1 : 0, zIndex: 0 }}
                >
                    <img
                        src={s.image}
                        alt=""
                        className="w-full h-full object-cover"
                        aria-hidden="true"
                    />
                </div>
            ))}

            {/* Multi-layer overlay: dark + gradient from bottom */}
            <div className="absolute inset-0 bg-[#080808]/50 z-10" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent z-10" aria-hidden="true" />
            <div
                className="absolute inset-0 z-10 opacity-30"
                style={{ background: `radial-gradient(ellipse 80% 60% at 20% 110%, ${accent}55, transparent 70%)` }}
                aria-hidden="true"
            />

            {/* Scanline texture */}
            <div
                className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 4px)",
                }}
                aria-hidden="true"
            />

            {/* Corner brackets */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 z-20" style={{ borderColor: `${accent}80` }} aria-hidden="true" />
            <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 z-20" style={{ borderColor: `${accent}80` }} aria-hidden="true" />
            <div className="absolute bottom-16 left-6 w-12 h-12 border-b-2 border-l-2 z-20" style={{ borderColor: `${accent}80` }} aria-hidden="true" />
            <div className="absolute bottom-16 right-6 w-12 h-12 border-b-2 border-r-2 z-20" style={{ borderColor: `${accent}80` }} aria-hidden="true" />

            {/* Thumbnail — top right, 1/4 of section width, responsive */}
            <div
                className="absolute top-10 right-10 z-30 w-[40%] aspect-video border-2 overflow-hidden transition-all duration-500 hidden md:block"
                style={{
                    borderColor: accent,
                    boxShadow: `8px 8px 0 0 ${accent}`,
                }}
            >
                <img
                    src={image}
                    alt={prompt.title}
                    className="w-full h-full object-cover"
                />
                {/* Gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                {/* Label */}
                <span
                    className="absolute bottom-1.5 left-1.5 text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 backdrop-blur-sm"
                    style={{ color: accent, background: "rgba(7,0,15,0.85)", border: `1px solid ${accent}50` }}
                >
                    PREVIEW
                </span>
            </div>


            {/* Main content — bottom-left overlay */}
            <div className="absolute bottom-20 left-0 right-0 z-20 px-8 md:px-16 lg:px-24">
                <div className="max-w-3xl">
                    {/* Category badge */}
                    <div className="flex items-center gap-3 mb-4">
                        <span
                            className="text-[11px] font-mono font-bold uppercase tracking-widest px-3 py-1 border"
                            style={{ color: accent, borderColor: `${accent}70`, background: `${accent}18` }}
                        >
                            {prompt.category}
                        </span>
                        {prompt.isCurated && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#00ffff] uppercase tracking-widest">
                                <BadgeCheck className="w-3.5 h-3.5" /> Curated
                            </span>
                        )}
                        <span className="font-mono text-xs text-white/40 uppercase tracking-widest ml-auto hidden md:block">
                            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white uppercase tracking-tight leading-tight mb-4 drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]">
                        {prompt.title}
                    </h2>

                    {/* Description */}
                    <p className="text-[#c4b5fd] text-base leading-relaxed mb-5 max-w-2xl line-clamp-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                        {prompt.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-5 mb-6">
                        <Link
                            href={`/creator/${encodeURIComponent(prompt.creatorName)}`}
                            className="text-sm font-bold text-white/70 hover:text-white transition-colors"
                        >
                            by <span className="underline underline-offset-2">{prompt.creatorName}</span>
                        </Link>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-[#ff2d95] text-[#ff2d95]" />
                            <span className="text-sm font-bold text-white">{prompt.rating}</span>
                            <span className="text-xs text-white/40">({prompt.reviews})</span>
                        </div>
                        <span className="font-mono text-xs text-white/40 uppercase">{prompt.model}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap mb-7">
                        {prompt.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-[11px] font-mono px-2 py-0.5 bg-white/8 border border-white/15 text-white/60 uppercase tracking-wider backdrop-blur-sm">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                        <span className="text-2xl sm:text-4xl font-extrabold font-mono" style={{ color: accent }}>
                            {prompt.price} <span className="text-lg sm:text-2xl text-white/60">{prompt.currency}</span>
                        </span>
                        <Link
                            href={`/prompt/${prompt.id}`}
                            className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 font-bold uppercase text-sm sm:text-base tracking-wider text-white border-2 transition-all hover:-translate-y-0.5"
                            style={{
                                borderColor: accent,
                                background: `${accent}28`,
                                boxShadow: `4px 4px 0 0 ${accent}`,
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> Buy Prompt
                        </Link>
                        <Link
                            href="/marketplace"
                            className="text-sm text-white/50 hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Browse all →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Prev / Next */}
            <button
                onClick={prev}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center border-2 border-white/20 text-white/60 hover:border-white hover:text-white transition-all backdrop-blur-sm bg-black/30"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={next}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center border-2 border-white/20 text-white/60 hover:border-white hover:text-white transition-all backdrop-blur-sm bg-black/30"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30 flex gap-2 items-center">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        aria-label={`Slide ${i + 1}`}
                    >
                        <span
                            className="block transition-all duration-400"
                            style={{
                                width: current === i ? "36px" : "8px",
                                height: "4px",
                                background: current === i ? accent : "rgba(255,255,255,0.25)",
                                boxShadow: current === i ? `0 0 10px ${accent}` : "none",
                            }}
                        />
                    </button>
                ))}
            </div>
        </section>
    )
}
