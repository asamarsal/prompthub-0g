"use client"

import { use } from "react"
import dynamic from "next/dynamic"
import { AppShell } from "@/components/app-shell"
import { Loader2 } from "lucide-react"

const PromptDetailPageContent = dynamic(
  () => import("./PromptDetailPageContent").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <Loader2 className="w-12 h-12 text-[#ff2d95] animate-spin" />
          <h3 className="text-xl font-bold font-display tracking-widest text-[#e0d4ff] uppercase">
            Now Loading...
          </h3>
        </div>
      </AppShell>
    ),
  }
)

export default function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return <PromptDetailPageContent params={resolvedParams} />
}
