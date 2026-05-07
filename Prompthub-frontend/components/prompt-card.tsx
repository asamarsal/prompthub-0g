"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Star, Heart, Loader2 } from "lucide-react"
import { useState } from "react"
import { toggleBookmark } from "@/lib/api"
import type { Prompt } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { use0GPrice } from "@/lib/hooks/use-0g-price"

const categoryIcons: Record<string, string> = {
  "Image Generation": "IMG",
  "Code Generation": "DEV",
  "Text Generation": "TXT",
  "Audio Generation": "WAV",
  "Video Generation": "VID",
}

export function PromptCard({ prompt }: { prompt: Prompt & { isBookmarked?: boolean } }) {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(prompt.isBookmarked || false)
  const [loading, setLoading] = useState(false)
  const { price: ogPrice } = use0GPrice()

  // Use primary color for image generation to match the screenshot, and secondary/accent for others
  const isImageCategory = prompt.category === "Image Generation" || prompt.category === "UI/UX Design"
  const themeColor = isImageCategory
    ? "bg-[#00ffff] text-[#00ffff] border-[#00ffff] shadow-[4px_4px_0_0_#00ffff]"
    : "bg-[#ff2d95] text-[#ff2d95] border-[#ff2d95] shadow-[4px_4px_0_0_#ff2d95]"

  const accentHex = isImageCategory ? "#00ffff" : "#ff2d95"

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    try {
      setLoading(true)
      const res = await toggleBookmark(prompt.id)
      setIsBookmarked(res.is_bookmarked)

      toast.success(res.is_bookmarked ? "Added to Collection" : "Removed from Collection", {
        description: res.is_bookmarked
          ? `${prompt.title} has been added to your saved prompts.`
          : `${prompt.title} has been removed from your saved prompts.`,
        duration: 2000,
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to update collection")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Link href={`/prompt/${prompt.id}`} className="group block h-[480px]">
      <div className={cn(
        "relative bg-card/60 backdrop-blur-xl border border-border transition-all duration-200 h-full flex flex-col cursor-pointer",
        isImageCategory
          ? "group-hover:border-[#00ffff] group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:shadow-[inset_0_0_0_1px_#00ffff,8px_8px_0px_0px_#00ffff]"
          : "group-hover:border-[#ff2d95] group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:shadow-[inset_0_0_0_1px_#ff2d95,8px_8px_0px_0px_#ff2d95]"
      )}>
        {/* Heart Toggle */}
        <button
          onClick={handleBookmark}
          disabled={loading}
          className="absolute top-4 right-4 z-[20] w-9 h-9 rounded-none border border-border bg-card/60 backdrop-blur-md flex items-center justify-center transition-all hover:border-[#ff2d95] group/heart active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 text-[#ff2d95] animate-spin" />
          ) : (
            <Heart className={cn(
              "w-4.5 h-4.5 transition-colors",
              isBookmarked ? "fill-[#ff2d95] text-[#ff2d95]" : "text-white/40 group-hover/heart:text-[#ff2d95]"
            )} />
          )}
        </button>

        {/* Preview area with stark watermark */}
        <div className="relative h-[300px] bg-[#0a001a] flex items-center justify-center border-b border-[#2a2a30] overflow-hidden group-hover:border-[#00ffff]/30 transition-colors">
          {/* Background Image — prefer watermarked version for public preview */}
          {(prompt.watermarkedPreviewUrl || prompt.image) ? (
            <img
              src={prompt.watermarkedPreviewUrl || prompt.image}
              alt={prompt.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('unsplash')) {
                  target.src = 'https://images.unsplash.com/photo-1614729939124-032f0b5609ce?w=800&q=80';
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1c23] to-[#161218]" />
          )}
          {/* Transparent overlay to prevent right-click "Open image in new tab" */}
          <div className="absolute inset-0 z-[1]" onContextMenu={(e) => e.preventDefault()} />


          {prompt.isCurated && (
            <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-[#b4ff39] text-black text-[10px] font-black uppercase tracking-widest leading-none">
              VERIFIED
            </div>
          )}

          {/* Category Badge inside image */}
          <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 flex items-center gap-2 border border-[#00ffff]/40 bg-black/60 backdrop-blur-md">
            <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[#00ffff]">{prompt.category}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col flex-grow relative z-10 bg-transparent">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h3 className="text-[1.1rem] font-display font-black tracking-widest text-white uppercase leading-[1.2] line-clamp-1">
              {prompt.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <Star className="w-4 h-4 text-[#ff2d95] fill-[#ff2d95]" />
              <span className="text-sm font-display font-bold text-white leading-none mt-0.5">{prompt.rating || 0}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border border-[rgba(0,255,255,0.4)] bg-transparent flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#00ffff] rounded-full" />
              </div>
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{prompt.model}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(`/creator/${encodeURIComponent(prompt.creatorName)}`) }}
              className="text-[10px] font-mono font-bold text-[#a78bfa] hover:text-[#ff2d95] transition-colors uppercase tracking-widest truncate max-w-[120px]"
            >
              by {prompt.creatorName}
            </button>
          </div>

          {/* Dynamic Tags */}
          <div className="flex flex-wrap gap-3 mt-4 pt-1">
            {prompt.tags && prompt.tags.length > 0 ? (
              prompt.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-2 py-1 flex items-center justify-center text-[10px] font-display font-bold bg-transparent uppercase border",
                    index % 2 === 0
                      ? "text-[#00ffff] border-[#00ffff]/40"
                      : "text-[#ff2d95] border-[#ff2d95]/40"
                  )}
                >
                  #{tag.toUpperCase()}
                </span>
              ))
            ) : (
              <span className="px-2 py-1 flex items-center justify-center text-[10px] font-display font-bold bg-transparent text-[#00ffff] uppercase border border-[#00ffff]/40">
                #PROMPTHUB
              </span>
            )}
          </div>

          {/* Footer / Action */}
          <div className="flex items-end justify-between mt-6 pt-5 border-t border-white/10 group-hover:border-[#00ffff]/30 transition-colors">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">PRICE</span>
              <div className="flex items-center gap-2">
                <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#ff2d95]">
                  <path d="M6.5 0L0 8H5.5L4.5 16L11.5 7H6L6.5 0Z" fill="currentColor" />
                </svg>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[1.4rem] font-display font-black leading-none tracking-tight text-[#ff2d95]">
                    {typeof prompt.price === 'number' ? prompt.price.toFixed(3) : "0.000"}
                  </span>
                  <span className="text-sm font-display font-bold text-[#ff2d95]">{prompt.currency || "0G"}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground ml-2">
                  ~${((typeof prompt.price === 'number' ? prompt.price : 0) * ogPrice).toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="bg-[#00ffff] text-black px-6 py-2.5 font-display font-black text-sm tracking-widest uppercase transition-all group-hover:shadow-[4px_4px_0px_0px_#fff] group-hover:-translate-x-1 group-hover:-translate-y-1">
              VIEW
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
