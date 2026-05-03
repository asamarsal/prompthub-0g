"use client"

import { useEffect, useState } from "react"
import { getSimilarPrompts } from "@/lib/api"
import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"

interface SimilarPrompt {
  id: string
  title: string
  category: string
  ai_model: string
  price_0g: number
  currency: string
  preview_image_url?: string
  watermarked_preview_url?: string
  user?: {
    name?: string
    wallet_address?: string
  }
}

export function SimilarPrompts({ promptId }: { promptId: string }) {
  const [prompts, setPrompts] = useState<SimilarPrompt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!promptId) return

    setLoading(true)
    getSimilarPrompts(promptId)
      .then((res) => {
        setPrompts(res.data || [])
      })
      .catch(() => {
        setPrompts([])
      })
      .finally(() => setLoading(false))
  }, [promptId])

  if (loading) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#00ffff]" />
          <h3 className="text-lg font-display font-bold text-white">AI Recommended</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-[#1a1c23] border border-[#2a2a30] animate-pulse rounded-none" />
          ))}
        </div>
      </div>
    )
  }

  if (prompts.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[#00ffff]" />
        <h3 className="text-lg font-display font-bold text-white">Similar Prompts</h3>
        <span className="text-xs text-white/40 ml-2">Powered by 0G Compute</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prompts.slice(0, 6).map((prompt) => (
          <Link
            key={prompt.id}
            href={`/prompt/${prompt.id}`}
            className="group border border-[#2a2a30] bg-[#0f0f12] hover:border-[#00ffff]/40 transition-all duration-300"
          >
            {/* Preview Image */}
            <div className="relative h-32 bg-[#0a001a] overflow-hidden">
              {(prompt.watermarked_preview_url || prompt.preview_image_url) ? (
                <img
                  src={prompt.watermarked_preview_url || prompt.preview_image_url}
                  alt={prompt.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a1c23] to-[#161218] flex items-center justify-center">
                  <span className="text-2xl font-black text-white/5">{prompt.title?.[0] || "P"}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm font-display font-bold text-white truncate group-hover:text-[#00ffff] transition-colors">
                {prompt.title}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-white/50">{prompt.category}</span>
                <span className="text-xs font-bold text-[#b4ff39]">
                  {prompt.price_0g} {prompt.currency || "0G"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-white/30">
                <span>{prompt.user?.name || prompt.user?.wallet_address?.slice(0, 8) || "Creator"}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
