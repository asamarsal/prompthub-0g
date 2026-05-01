"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button className={cn("p-2.5 border-2 rounded-xl bg-muted border-border", className)} aria-label="Toggle theme">
        <div className="w-5 h-5" />
      </button>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "p-2.5 border-2 rounded-xl transition-all relative flex items-center justify-center group shadow-md",
        isDark
          ? "bg-[#111] border-[#2a2a30] hover:border-[#f59e0b] hover:bg-[#1a1a20] text-white/70 hover:text-[#f59e0b]"
          : "bg-white border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-gray-500 hover:text-amber-600",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform group-hover:rotate-45" strokeWidth={2.5} />
      ) : (
        <Moon className="w-5 h-5 transition-transform group-hover:-rotate-12" strokeWidth={2.5} />
      )}
    </button>
  )
}
