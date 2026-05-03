"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Hexagon, Database, Globe } from "lucide-react"

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"

function useScramble(target: string, durationMs = 3000, delayMs = 0) {
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>

    const timeout = setTimeout(() => {
      const startTime = Date.now()
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        const revealedCount = Math.floor(progress * target.length)

        setDisplay(
          target
            .split("")
            .map((char, i) => {
              if (i < revealedCount) return char
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
            })
            .join("")
        )

        if (progress >= 1) clearInterval(interval)
      }, 40)
    }, delayMs)

    return () => { clearTimeout(timeout); clearInterval(interval) }
  }, [target, durationMs, delayMs])

  return display
}

export function Hero() {
  const promptText = useScramble("PROMPT", 1000, 0)
  const hubText = useScramble("HUB", 1000, 1000)

  return (
    <section data-hero className="relative min-h-[92vh] flex items-start justify-center overflow-hidden bg-background pt-16">
      {/* Full-cover video background */}
      <video
        src="/video/landingpage-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />
      {/* No overlay — video plays full without color tint */}

      {/* Decorative Structural Accents */}
      <div className="absolute top-32 left-8 w-24 h-24 border-t-2 border-l-2 border-primary/40 hidden xl:block" aria-hidden="true" />
      <div className="absolute top-32 right-8 w-24 h-24 border-t-2 border-r-2 border-secondary/40 hidden xl:block" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-0 lg:py-6 lg:px-8 w-full z-4 flex flex-col items-center">
        {/* System Status Banner */}
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-background/90 backdrop-blur-sm border border-primary/30 shadow-[4px_4px_0_0_rgba(0,217,255,0.15)] mb-8 md:mb-22">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-mono text-xs text-primary uppercase tracking-widest font-bold">System Online</span>
          </div>
          <span className="w-px h-4 bg-primary/30" />
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest bg-primary/10 px-2 py-0.5 text-primary">Build on 0g</span>
        </div>

        {/* Header block */}
        <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between w-full max-w-5xl mb-16 gap-8">
          <div className="flex flex-col">
            <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-display font-extrabold tracking-tighter uppercase leading-[0.85] text-white [text-shadow:_0_2px_20px_rgba(0,0,0,0.8),_0_0_40px_rgba(0,0,0,0.5)]">
              {promptText}<br />
              <span className="text-primary filter drop-shadow-[0_0_20px_rgba(0,217,255,0.6)]">{hubText}</span>
            </h1>
            <div className="flex items-center gap-4 mt-6 md:pl-2">
              <div className="h-0.5 w-12 bg-white/50" />
              <p className="text-sm md:text-base font-display font-bold text-white/80 uppercase tracking-[0.2em] [text-shadow:_0_1px_8px_rgba(0,0,0,0.7)]">
                Marketplace Infrastructure for AI Creators
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-auto mt-8 md:mt-0">
            <Link
              href="/marketplace"
              style={{
                background: "rgba(0, 200, 230, 0.25)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(4px)",
                border: "2px solid rgba(0, 217, 255, 0.8)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15), 0 0 20px rgba(0,217,255,0.2)",
              }}
              className="hero-glass-btn relative inline-flex items-center justify-center px-8 py-3 font-display font-bold text-lg uppercase tracking-wider text-white transition-all duration-200 w-full md:w-auto group hover:bg-[rgba(0,217,255,0.4)]"
            >
              Marketplace
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://github.com/asamarsal/prompthub-0g"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto text-sm group inline-flex items-center justify-center p-4 font-display font-bold uppercase tracking-wider text-[#ffe8f6] border-2 border-[#ff4fd8]/80 bg-[rgba(255,79,216,0.12)] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_14px_rgba(255,79,216,0.45)] transition-all duration-200 hover:bg-[rgba(255,79,216,0.22)] hover:border-[#ff7ae6] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_22px_rgba(255,79,216,0.75)]"
            >
              Read Docs
            </a>
          </div>
        </div>

        {/* Stats / Nodes readout */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 border border-white/20 bg-black/50 backdrop-blur-md shadow-[8px_8px_0_0_rgba(0,0,0,0.15)]">
          {[
            { label: "Active Creators", value: "1,204", icon: Globe, color: "text-primary" },
            { label: "Listed Prompts", value: "8,492", icon: Database, color: "text-secondary" },
            { label: "Total Volume", value: "45.2 0G", icon: Hexagon, color: "text-accent" },
          ].map((stat, i) => (
            <div key={stat.label} className={`p-6 flex items-start gap-4 ${i !== 2 ? 'border-b md:border-b-0 md:border-r border-white/10' : ''} group hover:bg-white/5 transition-colors`}>
              <div className={`p-3 border border-white/10 ${stat.color} group-hover:border-current transition-colors`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-display text-white/60 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
