import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { ArrowLeft, CheckCircle2, FileArchive, ImagePlus, ShieldCheck, Sparkles } from "lucide-react"

const sections = [
  {
    title: "Prompt Quality",
    icon: Sparkles,
    items: [
      "Use a specific title that names the output style, target model, and core use case.",
      "Include the exact main prompt, expected variables, model settings, and reproducible parameters.",
      "Add negative prompts when they materially improve output quality or safety.",
    ],
  },
  {
    title: "Preview Assets",
    icon: ImagePlus,
    items: [
      "Upload a clear preview image that represents the buyer's expected result.",
      "Use reference images to show variations, edge cases, and before-after examples.",
      "Avoid misleading previews that require undisclosed manual editing.",
    ],
  },
  {
    title: "Prompt Package",
    icon: FileArchive,
    items: [
      "Attach supporting files such as TXT, JSON, MD, PDF, ZIP, PNG, JPG, or WEBP.",
      "Keep files named clearly, for example prompt.txt, guide.pdf, and examples.zip.",
      "Use the usage notes field for setup steps, variable explanations, and best model settings.",
    ],
  },
  {
    title: "Marketplace Safety",
    icon: ShieldCheck,
    items: [
      "Mark adult or explicit content as NSFW before publishing.",
      "Do not upload private data, leaked prompts, malware, or copyrighted packages you cannot resell.",
      "Choose the commercial use checkbox only when buyers may use generated output commercially.",
    ],
  },
]

export default function GuidelinesPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <Link href="/create" className="inline-flex items-center gap-2 text-sm font-bold text-[#a78bfa] hover:text-[#00ffff] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Create
        </Link>

        <div className="mb-10">
          <p className="text-sm font-bold text-[#b4ff39] uppercase tracking-widest mb-2 font-mono">{"// MARKETPLACE RULES"}</p>
          <h1 className="text-3xl font-extrabold text-[#e0d4ff] mb-3">
            Review <span className="gradient-text">Guidelines</span>
          </h1>
          <p className="text-[#a78bfa] max-w-2xl">
            Publish prompts that buyers can reproduce, evaluate quickly, and safely use inside their own workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <section key={section.title} className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#00ffff]/10 border border-[#00ffff]/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#00ffff]" />
                  </div>
                  <h2 className="text-lg font-extrabold text-[#e0d4ff]">{section.title}</h2>
                </div>
                <ul className="flex flex-col gap-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a78bfa]">
                      <CheckCircle2 className="w-4 h-4 text-[#b4ff39] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </AppShell>
  )
}
