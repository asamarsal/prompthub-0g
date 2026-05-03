"use client"

import { useState, useMemo, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { PromptCard } from "@/components/prompt-card"
import { categories, models, licenses } from "@/lib/mock-data"
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from "lucide-react"
import { getPrompts } from "@/lib/api"

type SortOption = "newest" | "best-selling" | "price-low" | "price-high" | "rating"

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-card/60 backdrop-blur-md border-2 border-border hover:border-secondary hover:text-foreground hover:shadow-[4px_4px_0_0_var(--secondary)] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all text-sm text-muted-foreground focus:outline-none focus:border-secondary px-4 py-2.5 pr-8 cursor-pointer font-semibold"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#0a001a] text-[#e0d4ff]">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a78bfa] pointer-events-none" />
    </div>
  )
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"curated" | "community">("community")
  const [category, setCategory] = useState("All Categories")
  const [model, setModel] = useState("All Models")
  const [license, setLicense] = useState("All Licenses")
  const [showNsfw, setShowNsfw] = useState(false)
  const [sort, setSort] = useState<SortOption>("newest")
  const [page, setPage] = useState(1)
  const perPage = 6

  const [apiPrompts, setApiPrompts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true)
        // Fetch all prompts to utilize existing client-side filters
        const res = await getPrompts({ per_page: '100', nsfw: 'true' })

        // Map backend snake_case to frontend camelCase
        const mapped = res.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: parseFloat(p.price_0g),
          image: p.preview_image_url || 'https://images.unsplash.com/photo-1614729939124-032f0b5609ce?w=800&q=80',
          model: p.ai_model,
          category: p.category,
          tags: p.tags || [],
          creatorName: p.user?.name || (p.user?.wallet_address ? `${p.user.wallet_address.slice(0, 4)}...${p.user.wallet_address.slice(-4)}` : "Artist"),
          sales: p.total_sold,
          currency: p.currency || "0G",
          rating: 4.5, // Mock rating
          isCurated: p.is_curated,
          isNsfw: p.is_nsfw,
          isBookmarked: !!p.is_bookmarked,
          license: p.license_type,
          createdAt: p.created_at
        }))
        setApiPrompts(mapped)
      } catch (err) {
        console.error("Failed to load prompts", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const filtered = useMemo(() => {
    let result = [...apiPrompts]


    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t: string) => t.toLowerCase().includes(q)) ||
          p.creatorName.toLowerCase().includes(q)
      )
    }

    if (tab === "curated") result = result.filter((p) => p.isCurated)
    if (tab === "community") result = result.filter((p) => !p.isCurated)

    if (category !== "All Categories") result = result.filter((p) => p.category === category)
    if (model !== "All Models") result = result.filter((p) => p.model === model)
    if (license !== "All Licenses") result = result.filter((p) => p.license === license)
    if (!showNsfw) result = result.filter((p) => !p.isNsfw)

    switch (sort) {
      case "best-selling":
        result.sort((a, b) => b.sales - a.sales)
        break
      case "price-low":
        result.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        result.sort((a, b) => b.price - a.price)
        break
      case "rating":
        result.sort((a, b) => b.rating - a.rating)
        break
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [search, tab, category, model, license, sort, showNsfw, apiPrompts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-bold text-[#ff2d95] uppercase tracking-widest mb-2 font-mono">{"// BROWSE"}</p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#e0d4ff] leading-tight">
                  Explore <span className="gradient-text-holographic">Marketplace</span>
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#a78bfa]">
                  Discover {apiPrompts.length.toLocaleString()} prompts from top creators
                </p>
              </div>

              <div className="flex w-full sm:w-auto bg-card/80 backdrop-blur-md border-2 border-border p-1 shadow-[4px_4px_0_0_var(--shadow-neo)]">
                <button
                  onClick={() => { setTab("curated"); setPage(1); }}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold uppercase transition-all ${tab === "curated"
                    ? "bg-[#00ffff] text-black shadow-[2px_2px_0_0_#d1d5db]"
                    : "text-[#a78bfa] hover:text-[#e0d4ff]"
                    }`}
                >
                  Curated
                </button>
                <button
                  onClick={() => { setTab("community"); setPage(1); }}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold uppercase transition-all ${tab === "community"
                    ? "bg-[#b4ff39] text-black shadow-[2px_2px_0_0_#d1d5db]"
                    : "text-[#a78bfa] hover:text-[#e0d4ff]"
                    }`}
                >
                  Community
                </button>
              </div>
            </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a78bfa]" />
            <input
              type="search"
              placeholder="Search prompts, creators, or tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full bg-card/60 backdrop-blur-md border-2 border-border hover:border-primary hover:shadow-[4px_4px_0_0_var(--primary)] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all pl-12 pr-4 py-3.5 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-primary font-medium"
              aria-label="Search prompts"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto mb-1 sm:mb-0">
              <SlidersHorizontal className="w-4 h-4 text-[#ff2d95] shrink-0" />
              <span className="text-xs font-bold text-[#ff2d95] uppercase tracking-wider sm:hidden">Filters</span>
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <FilterSelect label="Category" value={category} options={categories} onChange={(v) => { setCategory(v); setPage(1) }} />
              <FilterSelect label="AI Model" value={model} options={models} onChange={(v) => { setModel(v); setPage(1) }} />
              <FilterSelect label="License" value={license} options={licenses} onChange={(v) => { setLicense(v); setPage(1) }} />
              
              <label className="flex items-center gap-2 cursor-pointer bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] hover:border-[#ff2d95] px-3 sm:px-4 py-2.5 text-[11px] sm:text-sm text-[#a78bfa] hover:text-[#e0d4ff] transition-all font-semibold select-none shadow-[0_0_0_0_transparent] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-0.5 hover:-translate-x-0.5 min-w-0 overflow-hidden whitespace-nowrap">
                <input type="checkbox" className="sr-only" checked={showNsfw} onChange={(e) => { setShowNsfw(e.target.checked); setPage(1); }} />
                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 flex items-center justify-center transition-colors shrink-0 ${showNsfw ? 'bg-[#ff2d95] border-[#ff2d95]' : 'border-[#a78bfa]'}`}>
                  {showNsfw && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white" />}
                </div>
                <span className="truncate">NSFW (18+)</span>
              </label>
            </div>

            <div className="w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0">
              <FilterSelect
                label="Sort by"
                value={sort}
                options={["newest", "best-selling", "price-low", "price-high", "rating"]}
                onChange={(v) => setSort(v as SortOption)}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-[#ff2d95] animate-spin" />
            <h3 className="text-xl font-bold font-display tracking-widest text-[#e0d4ff] uppercase">Loading...</h3>
          </div>
        ) : paginated.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col items-center mt-16 pt-8 border-t border-[#2a2a30]">
                <nav className="flex items-center gap-2" aria-label="Pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center justify-center h-10 px-3 border-2 border-[#2a2a30] bg-[#160f24]/60 text-[#a78bfa] font-bold text-sm transition-all hover:border-[#ff2d95] hover:text-[#e0d4ff] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-0.5 hover:-translate-x-0.5 disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Previous page"
                  >
                    PREV
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 border-2 text-sm font-bold transition-all ${p === page
                        ? "bg-[#ff2d95] border-[#ff2d95] text-white shadow-[4px_4px_0_0_#fff]"
                        : "bg-[#160f24]/60 backdrop-blur-md border-[#2a2a30] text-[#a78bfa] hover:border-[#ff2d95] hover:text-[#e0d4ff] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-0.5 hover:-translate-x-0.5"
                        }`}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center justify-center h-10 px-3 border-2 border-[#2a2a30] bg-[#160f24]/60 text-[#a78bfa] font-bold text-sm transition-all hover:border-[#ff2d95] hover:text-[#e0d4ff] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-0.5 hover:-translate-x-0.5 disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Next page"
                  >
                    NEXT
                  </button>
                </nav>
                <p className="text-[#a78bfa] text-sm mt-4 font-mono uppercase tracking-widest">
                  Showing Page {page} of {totalPages}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-iridescent flex items-center justify-center">
              <Search className="w-7 h-7 text-[#a78bfa]" />
            </div>
            <h3 className="text-lg font-bold text-[#e0d4ff]">No prompts found</h3>
            <p className="text-sm text-[#a78bfa] mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
