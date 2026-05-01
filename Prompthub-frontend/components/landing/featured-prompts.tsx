"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { prompts } from "@/lib/mock-data"
import { PromptCard } from "@/components/prompt-card"

function DataFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let offsetX = 0
    const SPACING = 60
    const PX_PER_SEC_X = 0.5   // slow left-to-right only
    let lastTime = performance.now()

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      offsetX = (offsetX + PX_PER_SEC_X * dt * 60) % SPACING
      const offsetY = 0   // horizontal lines stay still

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Vertical lines — move right
      ctx.strokeStyle = "rgba(255,255,255,0.07)"
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = -SPACING + offsetX; x < canvas.width + SPACING; x += SPACING) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
      }
      ctx.stroke()

      // Horizontal lines — move down
      ctx.beginPath()
      for (let y = -SPACING + offsetY; y < canvas.height + SPACING; y += SPACING) {
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
      }
      ctx.stroke()

      // Cyan pulse dots at intersections
      ctx.fillStyle = "rgba(0,217,255,0.12)"
      for (let x = -SPACING + offsetX; x < canvas.width + SPACING; x += SPACING) {
        for (let y = -SPACING + offsetY; y < canvas.height + SPACING; y += SPACING) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ willChange: "transform" }}
      aria-hidden="true"
    />
  )
}

export function FeaturedPrompts() {
  const featured = prompts.slice(0, 6)

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Data flow lines — scoped to this section only */}
      <DataFlow />

      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-[#a855f7]/3 blur-[200px] pointer-events-none" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-sm font-bold text-[#b4ff39] uppercase tracking-widest mb-3 font-mono">{"// FEATURED"}</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#e0d4ff] text-balance">
              Featured <span className="gradient-text">Prompts</span>
            </h2>
            <p className="mt-3 text-[#a78bfa] leading-relaxed">
              Discover top-rated prompts from the best creators.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden md:flex items-center gap-2 text-sm font-bold text-[#ff2d95] hover:text-[#00ffff] transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#ff2d95] hover:text-[#00ffff] transition-colors"
          >
            View All Prompts
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
