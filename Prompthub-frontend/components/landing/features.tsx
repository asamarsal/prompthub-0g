"use client"

import { useEffect, useRef } from "react"
import { Shield, Repeat, BadgeCheck, Zap } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "0G Security",
    description:
      "Every transaction is secured by 0G, the most trusted blockchain. Your prompts are protected by the strongest proof-of-work network.",
    color: "from-[#ff6b2b] to-[#ff2d95]",
    accent: "#ff6b2b",
  },
  {
    icon: Repeat,
    title: "Auto Royalties",
    description:
      "Set your royalty percentage and earn from every resale. Smart contracts automatically distribute payments to original creators.",
    color: "from-[#ff2d95] to-[#a855f7]",
    accent: "#ff2d95",
  },
  {
    icon: BadgeCheck,
    title: "Verified Ownership",
    description:
      "On-chain verification ensures provenance and authenticity. Each prompt purchase is recorded immutably on the 0G blockchain.",
    color: "from-[#00ffff] to-[#a855f7]",
    accent: "#00ffff",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description:
      "0G payments settle in minutes, not days. No intermediaries, no chargebacks. Direct peer-to-peer transactions.",
    color: "from-[#b4ff39] to-[#00ffff]",
    accent: "#b4ff39",
  },
]

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: any

    const initGsap = async () => {
      const gsapModule = await import("gsap")
      const ScrollTriggerModule = await import("gsap/ScrollTrigger")
      const gsap = gsapModule.default
      gsap.registerPlugin(ScrollTriggerModule.ScrollTrigger)

      ctx = gsap.context(() => {
        // Header lines: slide in from LEFT
        if (headingRef.current) {
          const headingChildren = Array.from(headingRef.current.children)
          gsap.fromTo(
            headingChildren,
            { x: -80, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: "power3.out",
              scrollTrigger: {
                trigger: headingRef.current,
                start: "top 80%",
                toggleActions: "play none none reverse",
              },
            }
          )
        }

        // Cards: slide in from RIGHT
        if (cardsRef.current) {
          const cards = Array.from(cardsRef.current.children)
          gsap.fromTo(
            cards,
            { x: 100, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: {
                trigger: cardsRef.current,
                start: "top 82%",
                toggleActions: "play none none reverse",
              },
            }
          )
        }
      }, sectionRef)
    }

    initGsap()
    return () => ctx?.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Heading — slides from LEFT */}
        <div ref={headingRef} className="text-center mb-16 overflow-hidden">
          <p className="text-sm font-bold text-[#ff2d95] uppercase tracking-widest mb-3 font-mono">{"// FEATURES"}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#e0d4ff] text-balance">
            Why choose <span className="gradient-text">PromptHub</span>
          </h2>
          <p className="mt-4 text-[#a78bfa] max-w-xl mx-auto leading-relaxed">
            The most secure and creator-friendly marketplace for AI prompts, powered by 0G.
          </p>
        </div>

        {/* Cards — slide from RIGHT */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card border-2 border-border p-6 transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 cursor-default"
              style={{ boxShadow: `2px 2px 0 0 ${feature.accent}40` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `6px 6px 0 0 ${feature.accent}`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = `2px 2px 0 0 ${feature.accent}40`)}
            >
              <div className={`relative w-14 h-14 bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 border-2 border-white/10`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base font-extrabold text-[#e0d4ff] mb-2 uppercase tracking-wider">{feature.title}</h3>
              <p className="text-sm text-[#a78bfa] leading-relaxed">{feature.description}</p>
              <div className="mt-5 h-0.5 w-10" style={{ background: feature.accent }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
