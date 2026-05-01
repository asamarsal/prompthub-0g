"use client"

import { AppShell } from "@/components/app-shell"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { PromptShowcaseFullscreen } from "@/components/landing/prompt-showcase-fullscreen"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeaturedPrompts } from "@/components/landing/featured-prompts"

export default function HomePage() {
  return (
    <AppShell>
      <Hero />
      <Features />
      <PromptShowcaseFullscreen />
      <HowItWorks />
      <FeaturedPrompts />
    </AppShell>
  )
}
