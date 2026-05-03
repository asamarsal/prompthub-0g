"use client"

import { useEffect, useRef } from "react"

const features = [
  {
    icon: "/icon/features/0g-security.png",
    title: "0G Security",
    description:
      "Every transaction is secured by 0G, the most trusted blockchain. Your prompts are protected by the strongest proof-of-work network.",
  },
  {
    icon: "/icon/features/auto-royalties.png",
    title: "Auto Royalties",
    description:
      "Set your royalty percentage and earn from every resale. Smart contracts automatically distribute payments to original creators.",
  },
  {
    icon: "/icon/features/verified-ownership.png",
    title: "Verified Ownership",
    description:
      "On-chain verification ensures provenance and authenticity. Each prompt purchase is recorded immutably on the 0G blockchain.",
  },
  {
    icon: "/icon/features/instant-settlement.png",
    title: "Instant Settlement",
    description:
      "0G payments settle in minutes, not days. No intermediaries, no chargebacks. Direct peer-to-peer transactions.",
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
            >
              <div className="mb-6">
                <img src={feature.icon} alt={feature.title} className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-base font-extrabold text-[#e0d4ff] mb-2 uppercase tracking-wider">{feature.title}</h3>
              <p className="text-sm text-[#a78bfa] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
