"use client"

import { useEffect, useRef, useState } from "react"

const steps = [
  {
    icon: "/icon/howitworks/connect-wallet.png",
    step: "1",
    title: "Connect Wallet",
    description: "Connect your 0G Wallet or 0G Wallet wallet to access the marketplace. It only takes a few seconds.",
    color: "#0ea5e9", // Light mode: Sky Blue
    darkColor: "#ff00ff", // Dark mode: Neon Pink/Magenta
    glow: "shadow-[0_0_30px_rgba(255,0,255,0.4)]",
  },
  {
    icon: "/icon/howitworks/browse-purchase.png",
    step: "2",
    title: "Browse & Purchase",
    description: "Explore thousands of AI prompts across categories. Purchase instantly with 0G.",
    color: "#0284c7", // Light mode: Blue
    darkColor: "#a855f7", // Dark mode: Purple
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.4)]",
  },
  {
    icon: "/icon/howitworks/own-use.png",
    step: "3",
    title: "Own & Use",
    description: "Download your prompt instantly after purchase. Blockchain-verified ownership is yours forever.",
    color: "#06b6d4", // Light mode: Cyan Blue
    darkColor: "#00ffff", // Dark mode: Cyan
    glow: "shadow-[0_0_30px_rgba(0,255,255,0.4)]",
  },
]

export function HowItWorks() {
  const containerRef = useRef<HTMLElement>(null)
  const stepsContainerRef = useRef<HTMLDivElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setIsDarkMode(root.classList.contains("dark"))
    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

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
    return () => {
      observer.disconnect()
      ctx?.revert()
    }
  }, [])

  return (
    <section ref={containerRef} className="py-24 relative overflow-hidden bg-white dark:bg-[#050010]">
      {/* Sci-fi Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-300/70 dark:via-primary/50 to-transparent" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-300/70 dark:via-secondary/50 to-transparent" />
      </div>

      {/* Decorative corner brackets */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-black/10 dark:border-white/10 rounded-tl-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-black/10 dark:border-white/10 rounded-br-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-sky-600 dark:text-[#00ffff] font-mono text-sm tracking-[0.3em] font-bold">
              {" // "} HOW IT WORKS {""}
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 italic">
            THREE SIMPLE <span className="text-slate-800 dark:text-white/90">STEPS</span>
          </h2>
          <p className="text-slate-500 dark:text-white/40 text-sm tracking-widest uppercase font-bold">
            Start trading AI prompts in minutes.
          </p>
        </div>

        <div ref={stepsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20 relative">
          {/* Shared Connector and Stepper Container */}
          <div className="hidden md:block absolute top-[85px] left-0 right-0 h-10 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            {/* The Line - perfectly centered in h-10 */}
            <div className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 opacity-80 ${
              isDarkMode
                ? "bg-gradient-to-r from-[#ff00ff] via-[#a855f7] to-[#00ffff]"
                : "bg-gradient-to-r from-[#38bdf8] via-[#0ea5e9] to-[#06b6d4]"
            }`}>
              <div className="absolute inset-0 blur-[2px] bg-inherit opacity-100" />
            </div>

            {/* The Stepper Nodes - also perfectly centered in h-10 */}
            {[33.33, 66.66].map((pos, idx) => {
              const color = isDarkMode
                ? (idx === 0 ? "#ff00ff" : "#00ffff")
                : (idx === 0 ? "#0ea5e9" : "#06b6d4")
              return (
                <div 
                  key={pos}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center z-20"
                  style={{ left: `${pos}%` }}
                >
                  {/* Outer decorative diamond */}
                  <div 
                    className="absolute w-7 h-7 border border-white/20 rotate-45"
                    style={{ borderColor: `${color}40`, boxShadow: `0 0 10px ${color}30` }}
                  />
                  
                  {/* Main Glowing Diamond */}
                  <div 
                    className="absolute w-4.5 h-4.5 bg-white dark:bg-[#050010] border-2 rotate-45 flex items-center justify-center"
                    style={{ 
                      borderColor: color, 
                      boxShadow: `0 0 15px ${color}, 0 0 5px ${color}, inset 0 0 8px ${color}` 
                    }}
                  >
                    {/* Central Core */}
                    <div 
                      className="w-1.5 h-1.5 bg-white rotate-45 shadow-[0_0_10px_#fff,0_0_5px_#fff]" 
                    />
                  </div>

                  {/* Vertical scanline */}
                  <div 
                     className="absolute w-[1px] h-14 opacity-20"
                     style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }}
                  />
                </div>
              )
            })}
          </div>

          {steps.map((s) => {
            const stepColor = isDarkMode ? s.darkColor : s.color
            return (
            <div key={s.step} className="step-item text-center relative group opacity-0 flex flex-col items-center">
              {/* Simplified Icon Container */}
              <div className="relative mb-12">
                <div className="relative z-10 w-24 h-24 flex items-center justify-center">
                  <img
                    src={s.icon}
                    alt={s.title}
                    className={`w-24 h-24 object-contain drop-shadow-[0_0_15px_${stepColor}60] group-hover:scale-110 transition-transform duration-500`}
                  />
                  {/* Step Number - simple circle */}
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-slate-900 dark:text-white text-sm z-20 border-2"
                    style={{ borderColor: stepColor, backgroundColor: 'var(--background)', boxShadow: `0_0_10px_${stepColor}40` }}
                  >
                    {s.step}
                  </div>
                </div>
              </div>

              {/* Text Block */}
              <div className="flex flex-col items-center max-w-xs">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter flex items-center gap-3">
                  <span className="text-sm opacity-50" style={{ color: stepColor }}>{"{ "}</span>
                  {s.title}
                  <span className="text-sm opacity-50" style={{ color: stepColor }}>{" }"}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/50 leading-relaxed font-medium uppercase tracking-wide">
                  {s.description}
                </p>
              </div>
            </div>
          )})}
        </div>
      </div>
    </section>
  )
}
