"use client"

import { useEffect, useRef } from "react"
import { Wallet, Search, Download } from "lucide-react"

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Connect Wallet",
    description: "Connect your 0G Wallet or 0G Wallet wallet to access the marketplace. It only takes a few seconds.",
    color: "#ff2d95",
    glowClass: "glow-pink",
  },
  {
    icon: Search,
    step: "02",
    title: "Browse & Purchase",
    description: "Explore thousands of AI prompts across categories. Purchase instantly with 0G.",
    color: "#a855f7",
    glowClass: "glow-pink",
  },
  {
    icon: Download,
    step: "03",
    title: "Own & Use",
    description: "Download your prompt instantly after purchase. Blockchain-verified ownership is yours forever.",
    color: "#00ffff",
    glowClass: "glow-cyan",
  },
]

export function HowItWorks() {
  const containerRef = useRef<HTMLElement>(null)
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: any

    const initGsap = async () => {
      const gsapModule = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      const gsap = gsapModule.default
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        if (stepsContainerRef.current) {
          const stepElements = Array.from(stepsContainerRef.current.children).filter
            (el => el.classList.contains('step-item'))

          gsap.fromTo(
            stepElements,
            { x: -100, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.2, // Sequences 1, 2, 3
              ease: "power3.out",
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top 80%",
                // Play when scrolling down, reverse when scrolling back up
                toggleActions: "play none none reverse",
              },
            }
          )
        }
      }, containerRef)
    }

    initGsap()
    return () => ctx?.revert()
  }, [])

  return (
    <section ref={containerRef} className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#ff2d95]/3 to-transparent pointer-events-none" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-[#00ffff] uppercase tracking-widest mb-3 font-mono">{"// HOW IT WORKS"}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#e0d4ff] text-balance">
            Three Simple <span className="gradient-text-warm">Steps</span>
          </h2>
          <p className="mt-4 text-[#a78bfa] max-w-xl mx-auto leading-relaxed">
            Start trading AI prompts in minutes.
          </p>
        </div>

        <div ref={stepsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#ff2d95]/30 via-[#a855f7]/30 to-[#00ffff]/30" aria-hidden="true" />
          {/* Pixel connector dots */}
          <div className="hidden md:block absolute top-[78px] left-1/3 w-2 h-2 rotate-45 bg-[#ff2d95]/40" aria-hidden="true" />
          <div className="hidden md:block absolute top-[78px] right-1/3 w-2 h-2 rotate-45 bg-[#00ffff]/40" aria-hidden="true" />

          {steps.map((s) => (
            <div key={s.step} className="step-item text-center relative group opacity-0">
              <div className={`mx-auto w-18 h-18 rounded-2xl glass-iridescent flex items-center justify-center mb-6 relative transition-all group-hover:${s.glowClass}`}>
                <s.icon className="w-8 h-8" style={{ color: s.color }} />
                <span
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center text-[#0a001a] border-2 border-[#0a001a]"
                  style={{ background: s.color }}
                >
                  {s.step.replace("0", "")}
                </span>
                {/* Corner pixel accents */}
                <div className="absolute -top-px -left-px w-2 h-2 border-t border-l rounded-tl" style={{ borderColor: s.color + '40' }} />
                <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r rounded-br" style={{ borderColor: s.color + '40' }} />
              </div>
              <h3 className="text-xl font-bold text-[#e0d4ff] mb-2">{s.title}</h3>
              <p className="text-sm text-[#a78bfa] leading-relaxed max-w-xs mx-auto">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
