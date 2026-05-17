"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

const links = {
  Product: [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/create", label: "Create" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  Community: [
    { href: "https://discordapp.com/users/475303864317247488", label: "Discord" },
    { href: "https://x.com/exluminated", label: "Twitter" },
    { href: "https://github.com/asamarsal/prompthub-0g", label: "GitHub" },
  ],
  Resources: [
    { href: "https://github.com/asamarsal/prompthub-0g/blob/main/README.md", label: "Documentation" },
    { href: "https://prompthubdapps.biz.id/", label: "API" },
    { href: "/status", label: "Status" },
  ],
}

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)
  const topGridRef = useRef<HTMLDivElement>(null)
  const bottomBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: any

    const initGsap = async () => {
      const gsapModule = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      const gsap = gsapModule.default
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        // Top grid columns: brand + 3 link groups → slide from left to right (stagger)
        if (topGridRef.current) {
          const cols = Array.from(topGridRef.current.children)
          gsap.fromTo(
            cols,
            { x: -60, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: {
                trigger: topGridRef.current,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }
          )
        }

        // Bottom bar: copyright + badges → slide from bottom to top
        if (bottomBarRef.current) {
          const items = Array.from(bottomBarRef.current.children)
          gsap.fromTo(
            items,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: bottomBarRef.current,
                start: "top 95%",
                toggleActions: "play none none reverse",
              },
            }
          )
        }
      }, footerRef)
    }

    initGsap()
    return () => ctx?.revert()
  }, [])

  return (
    <footer ref={footerRef} className="relative z-10 border-t border-[rgba(180,120,255,0.12)]" role="contentinfo">
      {/* Top glow line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#ff2d95]/40 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Top grid — animates left → right */}
        <div ref={topGridRef} className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="https://0g.ai/" target="_blank" rel="noopener noreferrer" className="flex items-center" aria-label="0G Network">
              <img
                src="/icon/0G-Logo-Purple_Hero.png"
                alt="0G Network"
                className="h-8 w-auto object-contain"
              />
            </a>
            <p className="mt-3 text-sm text-white/90 leading-relaxed max-w-xs">
              The 0G Marketplace Infrastructure for AI Creators to Monetize Every Prompt & Experiment. Powered by 0G and the 0G network.
            </p>
            {/* Pixel accent */}
            <div className="mt-4 h-1 w-24 y2k-pixel-border" aria-hidden="true" />
          </div>

          {/* Link groups */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-sm font-bold text-[#00ffff] uppercase tracking-wider">{group}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {items.map((item) => {
                  const isExternal = item.href.startsWith("http");
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="text-sm text-white/90 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar — animates bottom → up */}
        <div ref={bottomBarRef} className="mt-10 pt-6 border-t border-[rgba(180,120,255,0.1)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <p className="text-xs text-white/90">
              © 2026 PromptHub <span className="mx-4"> |</span>
            </p>
            <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white/90 uppercase tracking-widest font-extrabold">Powered by</span>
              <img src="/icon/0g-white-logo.png" alt="0G" className="h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#a78bfa]/50">
            <span className="text-[#ff2d95]/90">0G Network</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffff]" />
            <span className="text-[#00ffff]/90">0G Payments</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffff]" />
            <span className="text-[#b4ff39]/90">Decentralized</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
