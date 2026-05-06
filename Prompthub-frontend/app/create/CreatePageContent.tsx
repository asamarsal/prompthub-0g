"use client"

import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Upload, Check, ChevronRight, ChevronLeft, FileText, Lightbulb, X, Loader2, ExternalLink, AlertTriangle, ImagePlus, ShieldCheck } from "lucide-react"
import {
  createPrompt,
  getAiModels,
  getCategories,
  uploadMetadata,
  uploadPromptAsset,
  checkPlagiarism,
  type ApiAiModel,
  type ApiCategory,
} from "@/lib/api"
import { uploadTo0GStorageNetwork, getStorageTxExplorerUrl } from "@/lib/zero-g-storage"
import { useWallet } from "@/lib/wallet-context"
import { parseEther } from "ethers"
import { getMarketplaceContract } from "@/lib/evm"
import { CHAIN_CONFIG } from "@/lib/contracts"
import { use0GPrice } from "@/lib/hooks/use-0g-price"

const steps = ["Basic Info", "Pricing & License", "Upload Content", "Preview & Confirm"]
const FALLBACK_CATEGORIES = ["Image Generation", "Text Generation", "Code Generation", "Audio Generation", "Video Generation"]
const FALLBACK_MODELS = ["Midjourney v6", "Stable Diffusion XL", "GPT-5", "DALL-E 4", "Claude Opus"]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-10" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={4}>
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold shrink-0 transition-all ${i < current
              ? "bg-[#b4ff39] text-[#0a001a]"
              : i === current
                ? "bg-gradient-to-r from-[#ff2d95] to-[#a855f7] text-white glow-pink"
                : "glass text-[#a78bfa]/50"
              }`}
          >
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs font-bold hidden sm:block ${i === current ? "text-[#e0d4ff]" : "text-[#a78bfa]/50"}`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px ${i < current ? "bg-[#b4ff39]" : "bg-[rgba(180,120,255,0.1)]"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

interface FormData {
  title: string
  description: string
  category: string
  model: string
  tags: string[]
  price: string
  license: "Free" | "Commercial" | "Exclusive"
  royalty: number
  files: File[]
  previewImageUrl: string
  previewImageFile: File | null
  previewMode: "url" | "upload"
  contentType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "CODE"
  isNsfw: boolean
  currency: "0G"
  additionalLinks: { label: string, url: string }[]
  referenceImages: File[]
}

export default function CreatePageContent() {
  const { isConnected, address, profile } = useWallet()
  const [step, setStep] = useState(0)
  const [tagInput, setTagInput] = useState("")
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [deployedTxId, setDeployedTxId] = useState<string | null>(null)
  const [deployedMetadataCID, setDeployedMetadataCID] = useState<string | null>(null)
  const [deployedStorageHash, setDeployedStorageHash] = useState<string | null>(null)
  const [deployedStorageTxHash, setDeployedStorageTxHash] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(true) // Mock state to demonstrate different roles
  const [taxonomyCategories, setTaxonomyCategories] = useState<ApiCategory[]>([])
  const [taxonomyModels, setTaxonomyModels] = useState<ApiAiModel[]>([])
  const { price: ogPrice } = use0GPrice()
  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    category: FALLBACK_CATEGORIES[0],
    model: FALLBACK_MODELS[0],
    tags: [],
    price: "0.005",
    license: "Commercial",
    royalty: 5,
    files: [],
    previewImageUrl: "",
    previewImageFile: null,
    previewMode: "upload",
    contentType: "TEXT",
    isNsfw: false,
    currency: "0G",
    additionalLinks: [],
    referenceImages: [],
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null)
  const [plagiarismChecking, setPlagiarismChecking] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadTaxonomy() {
      try {
        const [categoriesRes, modelsRes] = await Promise.all([getCategories(), getAiModels()])
        if (!mounted) return
        setTaxonomyCategories(categoriesRes)
        setTaxonomyModels(modelsRes)
      } catch (error) {
        console.error("Failed to load category and model options", error)
      }
    }

    loadTaxonomy()
    return () => {
      mounted = false
    }
  }, [])

  const categoryOptions = useMemo(() => {
    return taxonomyCategories.length > 0
      ? taxonomyCategories.map((item) => item.name)
      : FALLBACK_CATEGORIES
  }, [taxonomyCategories])

  const modelOptions = useMemo(() => {
    if (taxonomyModels.length === 0) return FALLBACK_MODELS

    const selectedCategory = taxonomyCategories.find((item) => item.name === form.category)
    const filtered = selectedCategory
      ? taxonomyModels.filter((item) => item.category_id === selectedCategory.id || item.category?.name === selectedCategory.name)
      : taxonomyModels

    return (filtered.length > 0 ? filtered : taxonomyModels).map((item) => item.name)
  }, [form.category, taxonomyCategories, taxonomyModels])

  useEffect(() => {
    if (categoryOptions.length > 0 && !categoryOptions.includes(form.category)) {
      setForm((prev) => ({ ...prev, category: categoryOptions[0] }))
    }
  }, [categoryOptions, form.category])

  useEffect(() => {
    if (modelOptions.length > 0 && !modelOptions.includes(form.model)) {
      setForm((prev) => ({ ...prev, model: modelOptions[0] }))
    }
  }, [modelOptions, form.model])

  useEffect(() => {
    if (form.previewImageFile) {
      const url = URL.createObjectURL(form.previewImageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [form.previewImageFile])

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !form.tags.includes(trimmed) && form.tags.length < 5) {
      update("tags", [...form.tags, trimmed])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => update("tags", form.tags.filter((t) => t !== tag))

  const handleDeploy = async () => {
    if (form.files.length === 0) {
      alert("Please upload at least one prompt file first.")
      return
    }

    try {
      setDeploying(true)
      const groupId = crypto.randomUUID().split("-")[0] // Short unique ID

      // 0. Upload Preview Image to backend (local cache for fast display)
      let finalPreviewUrl = form.previewImageUrl
      let watermarkedPreviewUrl = ""
      if (form.previewMode === "upload" && form.previewImageFile) {
        console.log("Uploading preview image to backend cache...")
        const previewRes = await uploadPromptAsset(form.previewImageFile, groupId)
        finalPreviewUrl = previewRes.url
        watermarkedPreviewUrl = (previewRes as any).watermarked_url || ""
      }

      // 1. Upload prompt files to backend (local cache) + extract text
      console.log("Uploading prompt files to backend cache...")
      const uploadedFiles: { name: string, url: string, size: number, type: string, root_hash?: string }[] = []
      let combinedContent = ""

      for (let i = 0; i < form.files.length; i++) {
        const f = form.files[i]
        const uploadRes = await uploadPromptAsset(f, groupId)
        uploadedFiles.push({
          name: f.name,
          url: uploadRes.url,
          size: f.size,
          type: f.type,
        })

        // Extract text for text-based files to store in DB
        if ((form.contentType === "TEXT" || form.contentType === "CODE") && combinedContent.length < 5000) {
          try {
            const text = await f.text()
            combinedContent += `--- FILE: ${f.name} ---\n${text}\n\n`
          } catch (e) {
            console.error("Failed to read file text", e)
          }
        }
      }

      // Upload reference images to backend cache
      const refImageUrls: string[] = []
      for (const refImg of form.referenceImages) {
        try {
          const refRes = await uploadPromptAsset(refImg, groupId)
          refImageUrls.push(refRes.url)
        } catch (err) {
          console.warn("Reference image upload failed, skipping...", err)
        }
      }

      // 2. Upload FIRST prompt file to 0G Storage Network (decentralized)
      // Uses official 0G TypeScript SDK — creates on-chain tx to Flow contract
      let storageRootHash = ""
      let storageTxHash = ""
      console.log("Uploading to 0G Storage Network via SDK...")
      try {
        const zgResult = await uploadTo0GStorageNetwork(form.files[0])
        if (zgResult.success && zgResult.rootHash) {
          storageRootHash = zgResult.rootHash
          storageTxHash = zgResult.txHash
          if (uploadedFiles.length > 0) {
            uploadedFiles[0].root_hash = zgResult.rootHash
          }
          console.log("0G Storage SUCCESS! rootHash:", zgResult.rootHash, "txHash:", zgResult.txHash)
        } else {
          console.warn("0G Storage upload failed:", zgResult.error, "— will use metadata CID as fallback")
        }
      } catch (zgErr) {
        console.warn("0G Storage SDK error, continuing without decentralized storage:", zgErr)
      }

      const promptUrl = uploadedFiles.length > 0 ? uploadedFiles[0].url : ""

      // 3. Upload NFT Metadata to IPFS (Pinata)
      const metadataRes = await uploadMetadata({
        name: form.title,
        description: form.description,
        image: finalPreviewUrl,
        properties: {
          category: form.category,
          model: form.model,
          content_type: form.contentType,
          prompt_url: promptUrl,
          files: uploadedFiles,
          license: form.license,
          royalty: form.royalty,
          additional_info: form.additionalLinks.filter(l => l.url.trim() !== ""),
          creator_name: profile.name || profile.username || "Anonymous",
          creator_address: address || "",
          storage_root_hash: storageRootHash,
          reference_images: refImageUrls,
        }
      })
      const metadataCID = metadataRes.ipfs_uri
      console.log("Metadata uploaded, CID:", metadataCID)

      // 4. Call Smart Contract (listPrompt)
      const marketplace = await getMarketplaceContract()
      const royaltyPerMille = Math.max(0, Math.min(200, Math.round(form.royalty * 10)))
      const priceWei = parseEther(String(form.price || "0"))
      const finalStorageHash = storageRootHash || metadataCID

      const tx = await marketplace.listPrompt(
        metadataCID,
        priceWei,
        royaltyPerMille,
        finalStorageHash
      )
      const receipt = await tx.wait()
      console.log("Marketplace tx receipt:", receipt?.hash, "logs:", receipt?.logs?.length)
      
      let tokenId: any = null
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = marketplace.interface.parseLog({ topics: log.topics as string[], data: log.data })
            if (parsed?.name === "PromptListed") {
              tokenId = parsed.args?.tokenId ?? parsed.args?.[0]
              console.log("Found PromptListed event, tokenId:", tokenId?.toString())
              break
            }
          } catch {
            // Not a marketplace event, skip
          }
        }
      }
      if (!tokenId) {
        // Fallback: try to get totalPrompts from contract
        try {
          const totalPrompts = await marketplace.totalPrompts?.()
          if (totalPrompts) {
            tokenId = totalPrompts
            console.log("Fallback tokenId from totalPrompts:", tokenId?.toString())
          }
        } catch { /* ignore */ }
      }

      // 5. Save to Backend DB
      await createPrompt({
        title: form.title,
        description: form.description,
        price_0g: parseFloat(form.price),
        preview_image_url: finalPreviewUrl,
        watermarked_preview_url: watermarkedPreviewUrl || null,
        cid_ipfs: metadataCID,
        ai_model: form.model,
        category: form.category,
        tags: form.tags,
        content_type: form.contentType,
        is_nsfw: form.isNsfw,
        license_type: form.license.toUpperCase(),
        royalty_percentage: form.royalty,
        og_tx_id: tx.hash,
        contract_id: tokenId ? Number(tokenId) : null,
        currency: form.currency,
        root_hash: finalStorageHash,
        reference_images: refImageUrls,
        additional_info: {
          links: form.additionalLinks.filter(l => l.url.trim() !== ""),
          files: uploadedFiles,
          storage_root_hash: finalStorageHash,
        },
        original_content: combinedContent
      })
      setDeployedTxId(tx.hash)
      setDeployedMetadataCID(metadataCID)
      setDeployedStorageHash(storageRootHash || null)
      setDeployedStorageTxHash(storageTxHash || null)
      setDeployed(true)

    } catch (error) {
      console.error("Failed to deploy prompt:", error)
      alert("Failed to deploy prompt. Please check your connection and try again.")
      setDeploying(false)
    }
  }

  const feePercentage = isVerified ? 0.025 : 0.10
  const platformFee = Number(form.price) * feePercentage
  const platformFeeUsd = platformFee * ogPrice
  const totalEarnings = Number(form.price) - platformFee
  const totalEarningsUsd = totalEarnings * ogPrice

  const canProceed = [
    form.title.length > 0 &&
    form.description.length > 0 &&
    (form.previewMode === "url" ? form.previewImageUrl.length > 0 : form.previewImageFile !== null),
    Number(form.price) >= 0,
    form.files.length > 0,
    true,
  ]

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <p className="text-sm font-bold text-[#b4ff39] uppercase tracking-widest mb-2 font-mono">{"// CREATE"}</p>
        <h1 className="text-3xl font-extrabold text-[#e0d4ff] mb-2">
          Create <span className="gradient-text">Prompt</span>
        </h1>
        <p className="text-[#a78bfa] mb-8">List your AI prompt on the marketplace.</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <StepIndicator current={step} />

            {deployed ? (
              <div className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#b4ff39]/15 flex items-center justify-center glow-green">
                  <Check className="w-8 h-8 text-[#b4ff39]" />
                </div>
                <h2 className="text-2xl font-extrabold gradient-text-holographic mb-2">Prompt Deployed!</h2>
                <p className="text-[#a78bfa] mb-4">Your prompt is now live on the marketplace.</p>

                {/* Storage Info */}
                {deployedStorageHash && (
                  <div className="bg-[#0a001a] border border-[#2a2a30] p-3 mb-6 mx-auto max-w-lg text-left">
                    <p className="text-[10px] text-[#a78bfa]/50 font-mono uppercase tracking-wider mb-1">0G Storage Root Hash (Merkle Root)</p>
                    <p className="text-xs text-[#b4ff39] font-mono break-all select-all mb-2">{deployedStorageHash}</p>
                    <p className="text-[10px] text-[#a78bfa]/40">
                      This hash is the file&apos;s Merkle root on 0G Storage network. Use it to download/verify the file anytime via the 0G SDK.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                  <a href="/marketplace" className="btn-gradient px-6 py-3 rounded-xl text-sm font-extrabold text-white">
                    View in Marketplace
                  </a>

                  {deployedTxId && (
                    <a
                      href={`${CHAIN_CONFIG.explorer}/tx/${deployedTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 border-2 border-[#2a2a30] bg-[#16161a] hover:border-[#00ffff] rounded-xl text-xs font-bold text-[#a78bfa] hover:text-[#00ffff] transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      0G Chain Explorer
                    </a>
                  )}

                  {deployedStorageTxHash && (
                    <a
                      href={getStorageTxExplorerUrl(deployedStorageTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 border-2 border-[#2a2a30] bg-[#16161a] hover:border-[#b4ff39] rounded-xl text-xs font-bold text-[#a78bfa] hover:text-[#b4ff39] transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      0G Storage Tx
                    </a>
                  )}

                  {deployedMetadataCID && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${deployedMetadataCID.replace('ipfs://', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 border-2 border-[#2a2a30] bg-[#16161a] hover:border-[#ff2d95] rounded-xl text-xs font-bold text-[#a78bfa] hover:text-[#ff2d95] transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      IPFS Metadata
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-6 md:p-8">
                {/* Step 0: Basic Info */}
                {step === 0 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <label htmlFor="title" className="block text-sm font-bold text-[#e0d4ff] mb-2">Title</label>
                      <input
                        id="title"
                        type="text"
                        value={form.title}
                        onChange={(e) => update("title", e.target.value)}
                        placeholder="e.g., Photorealistic Portrait Generator"
                        className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] font-medium transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-bold text-[#e0d4ff] mb-2">Description</label>
                      <textarea
                        id="description"
                        value={form.description}
                        onChange={(e) => update("description", e.target.value)}
                        placeholder="Describe what your prompt does..."
                        rows={4}
                        className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] resize-none font-medium transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="category" className="block text-sm font-bold text-[#e0d4ff] mb-2">Category</label>
                        <select
                          id="category"
                          value={form.category}
                          onChange={(e) => update("category", e.target.value)}
                          className="w-full bg-[#160f24] border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] focus:outline-none focus:border-[#00ffff] font-medium transition-colors appearance-none"
                        >
                          {categoryOptions.map((c) => (
                            <option key={c} value={c} className="bg-[#0a001a]">{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="model" className="block text-sm font-bold text-[#e0d4ff] mb-2">AI Model</label>
                        <select
                          id="model"
                          value={form.model}
                          onChange={(e) => update("model", e.target.value)}
                          className="w-full bg-[#160f24] border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] focus:outline-none focus:border-[#00ffff] font-medium transition-colors appearance-none"
                        >
                          {modelOptions.map((m) => (
                            <option key={m} value={m} className="bg-[#0a001a]">{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label htmlFor="contentType" className="block text-sm font-bold text-[#e0d4ff] mb-2">Content Type</label>
                        <select
                          id="contentType"
                          value={form.contentType}
                          onChange={(e) => update("contentType", e.target.value as any)}
                          className="w-full bg-[#160f24] border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] focus:outline-none focus:border-[#00ffff] font-medium transition-colors appearance-none"
                        >
                          {["TEXT", "IMAGE", "VIDEO", "AUDIO", "CODE"].map((t) => (
                            <option key={t} value={t} className="bg-[#0a001a]">{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 p-5 rounded-xl bg-[#b4ff39]/5 border border-[#b4ff39]/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[#b4ff39] flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Additional Resources (Optional)
                          </h3>
                          <p className="text-[11px] text-[#a78bfa] mt-1">Add links to Google Drive, GitHub, or source images.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => update("additionalLinks", [...form.additionalLinks, { label: "", url: "" }])}
                          className="px-3 py-1.5 bg-[#b4ff39]/20 hover:bg-[#b4ff39]/30 rounded-lg text-[10px] font-bold text-[#b4ff39] transition-colors border border-[#b4ff39]/20"
                        >
                          + ADD LINK
                        </button>
                      </div>

                      {form.additionalLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                          <input
                            type="text"
                            placeholder="Label (e.g., GitHub Repo)"
                            value={link.label}
                            onChange={(e) => {
                              const newLinks = [...form.additionalLinks]
                              newLinks[idx].label = e.target.value
                              update("additionalLinks", newLinks)
                            }}
                            className="w-full sm:w-1/3 bg-[#0a001a] border border-[#2a2a30] px-3 py-2 text-xs text-[#e0d4ff] focus:border-[#b4ff39] outline-none"
                          />
                          <input
                            type="text"
                            placeholder="URL (https://...)"
                            value={link.url}
                            onChange={(e) => {
                              const newLinks = [...form.additionalLinks]
                              newLinks[idx].url = e.target.value
                              update("additionalLinks", newLinks)
                            }}
                            className="flex-1 bg-[#0a001a] border border-[#2a2a30] px-3 py-2 text-xs text-[#e0d4ff] focus:border-[#b4ff39] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => update("additionalLinks", form.additionalLinks.filter((_, i) => i !== idx))}
                            className="p-2 hover:bg-[#ff2d95]/10 rounded-lg transition-colors group self-center sm:self-auto"
                          >
                            <X className="w-4 h-4 text-[#a78bfa] group-hover:text-[#ff2d95]" />
                          </button>
                        </div>
                      ))}

                      {form.additionalLinks.length === 0 && (
                        <p className="text-[10px] text-[#a78bfa]/40 italic text-center py-2">No additional links added yet.</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-[#e0d4ff]">Preview Image</label>
                        <div className="flex bg-[#160f24] border border-[#2a2a30] p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => update("previewMode", "upload")}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${form.previewMode === "upload" ? "bg-[#b4ff39] text-black shadow-sm" : "text-[#a78bfa] hover:text-[#e0d4ff]"}`}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => update("previewMode", "url")}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${form.previewMode === "url" ? "bg-[#00ffff] text-black shadow-sm" : "text-[#a78bfa] hover:text-[#e0d4ff]"}`}
                          >
                            Link
                          </button>
                        </div>
                      </div>

                      {form.previewMode === "url" ? (
                        <input
                          id="previewImageUrl"
                          type="url"
                          value={form.previewImageUrl}
                          onChange={(e) => update("previewImageUrl", e.target.value)}
                          placeholder="https://example.com/image.png"
                          className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] font-medium transition-colors"
                        />
                      ) : (
                        <div
                          className={`relative backdrop-blur-md bg-[#160f24]/60 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${form.previewImageFile ? "border-[#b4ff39] bg-[#b4ff39]/5" : "border-[#2a2a30] hover:border-[#00ffff]"}`}
                          onClick={() => document.getElementById("preview-upload")?.click()}
                        >
                          <input
                            id="preview-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) update("previewImageFile", f)
                            }}
                          />
                          {form.previewImageFile ? (
                            <div className="flex items-center gap-4 text-left">
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#b4ff39]/30 shrink-0 bg-[#0a001a]">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-[#b4ff39]" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#e0d4ff] truncate">{form.previewImageFile.name}</p>
                                <p className="text-[10px] text-[#b4ff39] uppercase font-bold tracking-wider">Ready to upload</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); update("previewImageFile", null); }}
                                className="p-2 hover:bg-[#ff2d95]/10 rounded-full transition-colors"
                              >
                                <X className="w-4 h-4 text-[#ff2d95]" />
                              </button>
                            </div>
                          ) : (
                            <div className="py-2">
                              <p className="text-xs text-[#a78bfa] font-bold uppercase tracking-wider">Click to upload preview image</p>
                              <p className="text-[10px] text-[#a78bfa]/40 mt-1 italic">JPG, PNG, WEBP (Max 5MB)</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#e0d4ff] mb-2">Tags (up to 5)</label>
                      <div className="flex gap-2">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                          placeholder="Add a tag..."
                          className="flex-1 bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] font-medium transition-colors"
                        />
                        <button onClick={addTag} className="bg-[#00ffff] border-2 border-[#00ffff] px-4 py-3 text-sm text-black font-extrabold uppercase hover:bg-transparent hover:text-[#00ffff] transition-colors shadow-[4px_4px_0_0_#d1d5db] active:translate-x-1 active:translate-y-1 active:shadow-none">
                          Add
                        </button>
                      </div>
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {form.tags.map((tag) => (
                            <span key={tag} className="flex items-center gap-1 px-3 py-1 border border-[#00ffff]/40 bg-transparent text-xs text-[#00ffff] font-mono font-bold">
                              {tag}
                              <button onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                                <X className="w-3 h-3 text-[#ff2d95]" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* NSFW Toggle */}
                    <div className="mt-2 text-left">
                      <label className="flex items-center gap-3 cursor-pointer bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] hover:border-[#ff2d95] px-4 py-3 text-sm text-[#a78bfa] hover:text-[#e0d4ff] transition-all font-semibold select-none shadow-[0_0_0_0_transparent] hover:shadow-[4px_4px_0_0_#ff2d95]">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.isNsfw}
                          onChange={(e) => update("isNsfw", e.target.checked)}
                        />
                        <div className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center transition-colors ${form.isNsfw ? 'bg-[#ff2d95] border-[#ff2d95]' : 'border-[#a78bfa]'}`}>
                          {form.isNsfw && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[#e0d4ff] font-bold">Contains Adult Content (18+)</span>
                          <span className="text-xs text-[#a78bfa]/60 font-medium font-mono tracking-tighter">Check this if your prompt generates NSFW or explicit imagery.</span>
                        </div>
                      </label>
                    </div>

                  </div>
                )}

                {/* Step 1: Pricing */}
                {step === 1 && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="price" className="block text-sm font-bold text-[#e0d4ff]">Price</label>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 text-[10px] font-extrabold border-2 bg-[#00ffff] border-[#00ffff] text-black shadow-[2px_2px_0_0_#fff]">
                            0G
                          </span>
                          <span className="text-[10px] text-[#a78bfa]/50 font-mono">
                            1 0G = ${ogPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          id="price"
                          type="number"
                          step="0.0001"
                          min="0"
                          value={form.price}
                          onChange={(e) => update("price", e.target.value)}
                          className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] focus:outline-none focus:border-[#00ffff] font-medium transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#a78bfa]/50 font-mono">
                          ~${(Number(form.price) * ogPrice).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#e0d4ff] mb-3">License Type</p>
                      <div className="grid grid-cols-3 gap-3">
                        {(["Free", "Commercial", "Exclusive"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => update("license", type)}
                            className={`p-4 border-2 transition-all backdrop-blur-md ${form.license === type
                              ? "bg-[#ff2d95]/20 border-[#ff2d95] text-[#e0d4ff] shadow-[4px_4px_0_0_#ff2d95]"
                              : "bg-[#160f24]/60 border-[#2a2a30] text-[#a78bfa] hover:border-[#00ffff]/50"
                              }`}
                          >
                            <p className="text-sm font-extrabold">{type}</p>
                            <p className="text-xs mt-1 text-[#a78bfa]/50">
                              {type === "Free" ? "No cost" : type === "Commercial" ? "Business use" : "One buyer only"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="royalty" className="text-sm font-bold text-[#e0d4ff]">Royalty Percentage</label>
                        <span className="text-sm font-extrabold text-[#00ffff]">{form.royalty}%</span>
                      </div>
                      <input
                        id="royalty"
                        type="range"
                        min="0"
                        max="15"
                        value={form.royalty}
                        onChange={(e) => update("royalty", Number(e.target.value))}
                        className="w-full accent-[#ff2d95]"
                      />
                      <div className="flex justify-between text-xs text-[#a78bfa]/50 mt-1 font-mono">
                        <span>0%</span>
                        <span>15%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Upload */}
                {step === 2 && (
                  <div className="flex flex-col gap-6">
                    <div
                      className={`backdrop-blur-md bg-[#160f24]/60 border-2 border-dashed p-12 text-center cursor-pointer transition-all ${form.files.length > 0 ? "border-[#b4ff39] bg-[#b4ff39]/10 shadow-[8px_8px_0_0_#b4ff39]" : "border-[#2a2a30] hover:border-[#00ffff] hover:shadow-[4px_4px_0_0_#00ffff]"
                        }`}
                      onClick={() => document.getElementById("prompt-upload")?.click()}
                      role="button"
                      tabIndex={0}
                      aria-label="Upload file area"
                      onKeyDown={(e) => e.key === "Enter" && document.getElementById("prompt-upload")?.click()}
                    >
                      <input
                        id="prompt-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || [])
                          if (newFiles.length > 0) update("files", [...form.files, ...newFiles])
                        }}
                      />
                      <div>
                        <div className="w-14 h-14 mx-auto mb-3 rounded-xl glass flex items-center justify-center">
                          <Upload className="w-7 h-7 text-[#ff2d95]" />
                        </div>
                        <p className="text-sm font-bold text-[#e0d4ff]">Click to upload your prompt files</p>
                        <p className="text-xs text-[#a78bfa]/50 mt-1 font-mono">Supports TXT, JSON, MD, CODE (Max 10MB per file)</p>
                      </div>
                    </div>

                    {form.files.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-[#b4ff39] uppercase tracking-widest">Uploaded Files ({form.files.length})</h4>
                        <div className="flex flex-col gap-2">
                          {form.files.map((f, idx) => (
                            <div key={idx} className="bg-[#160f24]/80 border border-[#2a2a30] p-3 flex items-center justify-between group">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-4 h-4 text-[#a78bfa] shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#e0d4ff] truncate">{f.name}</p>
                                  <p className="text-[10px] text-[#a78bfa]/60 font-mono">{(f.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); update("files", form.files.filter((_, i) => i !== idx)); }}
                                className="p-1 hover:bg-[#ff2d95]/10 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-[#ff2d95]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.files.length > 0 && (
                      <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[#a78bfa] font-mono">Encryption</span>
                          <span className="text-xs text-[#b4ff39] flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" />
                            Encrypted
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#a78bfa] font-mono">IPFS Upload</span>
                          <span className="text-xs text-[#b4ff39] flex items-center gap-1 font-bold">
                            <Check className="w-3 h-3" />
                            Ready
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reference Images Section */}
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-[#00ffff] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ImagePlus className="w-4 h-4" />
                        Reference Images (Optional)
                      </h4>
                      <p className="text-xs text-[#a78bfa]/50 mb-3">Add up to 4 reference images to show buyers what your prompt can generate.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {form.referenceImages.map((f, idx) => (
                          <div key={idx} className="relative aspect-square bg-[#160f24]/80 border border-[#2a2a30] overflow-hidden group">
                            <img
                              src={URL.createObjectURL(f)}
                              alt={`Reference ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => update("referenceImages", form.referenceImages.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-[#ff2d95]/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                        {form.referenceImages.length < 4 && (
                          <label className="aspect-square bg-[#160f24]/60 border-2 border-dashed border-[#2a2a30] hover:border-[#00ffff] flex flex-col items-center justify-center cursor-pointer transition-all">
                            <ImagePlus className="w-6 h-6 text-[#a78bfa]/40 mb-1" />
                            <span className="text-[10px] text-[#a78bfa]/40">Add Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) update("referenceImages", [...form.referenceImages, file])
                                e.target.value = ""
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Preview */}
                {step === 3 && (
                  <div className="flex flex-col gap-6">
                    {/* Plagiarism Check Banner */}
                    <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-[#00ffff] uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Originality Check
                        </h4>
                        <button
                          onClick={async () => {
                            setPlagiarismChecking(true)
                            setPlagiarismResult(null)
                            try {
                              const result = await checkPlagiarism({
                                title: form.title,
                                description: form.description,
                                content: form.files.length > 0 ? form.files[0].name : undefined,
                              })
                              setPlagiarismResult(result)
                            } catch {
                              setPlagiarismResult({ is_plagiarized: false, similarity_score: 0, reasoning: "Check unavailable — proceed with caution.", similar_prompts: [] })
                            } finally {
                              setPlagiarismChecking(false)
                            }
                          }}
                          disabled={plagiarismChecking}
                          className="px-3 py-1.5 text-xs font-bold bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 transition-colors disabled:opacity-50"
                        >
                          {plagiarismChecking ? (
                            <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
                          ) : "Run Check"}
                        </button>
                      </div>
                      {plagiarismResult && (
                        <div className={`mt-3 p-3 border ${plagiarismResult.is_plagiarized ? "border-[#ff2d95] bg-[#ff2d95]/10" : "border-[#b4ff39] bg-[#b4ff39]/10"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {plagiarismResult.is_plagiarized ? (
                              <AlertTriangle className="w-4 h-4 text-[#ff2d95]" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-[#b4ff39]" />
                            )}
                            <span className={`text-xs font-bold ${plagiarismResult.is_plagiarized ? "text-[#ff2d95]" : "text-[#b4ff39]"}`}>
                              {plagiarismResult.is_plagiarized ? `Potential Match Found (${Math.round(plagiarismResult.similarity_score * 100)}% similar)` : "Original Content"}
                            </span>
                          </div>
                          <p className="text-xs text-[#a78bfa]/70">{plagiarismResult.reasoning}</p>
                          {plagiarismResult.similar_prompts?.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                              {plagiarismResult.similar_prompts.map((sp: any) => (
                                <span key={sp.id} className="text-[10px] text-[#a78bfa]/50">• {sp.title} by {sp.creator} ({sp.match_type})</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!plagiarismResult && !plagiarismChecking && (
                        <p className="text-xs text-[#a78bfa]/40">Click &quot;Run Check&quot; to verify your prompt is original before deploying.</p>
                      )}
                    </div>

                    <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#00ffff] shadow-[6px_6px_0_0_#00ffff] p-5">
                      <h3 className="text-lg font-bold text-[#e0d4ff] mb-4">Listing <span className="gradient-text">Preview</span></h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {[
                          { label: "Title", value: form.title || "Untitled" },
                          { label: "Category", value: form.category },
                          { label: "AI Model", value: form.model },
                          { label: "Content Type", value: form.contentType },
                          { label: "License", value: form.license },
                          { label: "Price", value: `${form.price} ${form.currency}`, isPrice: true },
                          { label: "Royalty", value: `${form.royalty}%` },
                          { label: "Preview", value: form.previewImageUrl, isUrl: true },
                        ].map((item) => (
                          <div key={item.label} className={item.isUrl ? "col-span-2" : ""}>
                            <p className="text-[#a78bfa]/50 font-mono uppercase text-xs">{item.label}</p>
                            <p className={`font-bold truncate ${item.isPrice ? 'text-[#00ffff]' : 'text-[#e0d4ff]'}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-5">
                      <h3 className="text-sm font-bold text-[#e0d4ff] mb-3">Fee Breakdown</h3>
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[#a78bfa]">Listing Price</span>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[#e0d4ff] font-mono leading-none">{form.price} {form.currency}</span>
                            <span className="text-[10px] text-[#a78bfa]/50 font-mono mt-1">~${(Number(form.price) * ogPrice).toFixed(2)} USD</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[#a78bfa] flex items-center gap-2">
                            Platform Fee ({feePercentage * 100}%)
                            {isVerified && <span className="bg-[#b4ff39]/20 text-[#b4ff39] px-2 py-0.5 text-[10px] font-bold uppercase border border-[#b4ff39]/50">Verified Rate</span>}
                            {!isVerified && <span className="bg-[#a78bfa]/20 text-[#a78bfa] px-2 py-0.5 text-[10px] font-bold uppercase border border-[#a78bfa]/50">Standard Rate</span>}
                          </span>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[#e0d4ff] font-mono leading-none">-{platformFee.toFixed(6)} {form.currency}</span>
                            <span className="text-[10px] text-[#ff2d95]/50 font-mono mt-1">~${platformFeeUsd.toFixed(2)} USD</span>
                          </div>
                        </div>
                        <div className="border-t border-[rgba(180,120,255,0.1)] pt-3 mt-1 flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#e0d4ff]">You Receive</span>

                            {/* Toggle for demonstration purposes */}
                            <button onClick={() => setIsVerified(!isVerified)} className="text-[10px] text-[#ff2d95] underline mt-1 text-left font-mono">
                              Toggle Role (Dev)
                            </button>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="font-extrabold text-[#b4ff39] text-lg leading-none">{(Number(form.price) - platformFee).toFixed(6)} {form.currency}</span>
                            <span className="text-xs text-[#b4ff39]/50 font-mono mt-1">~${totalEarningsUsd.toFixed(2)} USD</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="accent-[#ff2d95] w-4 h-4" />
                      <span className="text-sm text-[#a78bfa]">
                        I agree to the PromptHub Terms of Service and Marketplace Rules
                      </span>
                    </label>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(180,120,255,0.08)]">
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-2 text-sm text-[#a78bfa] hover:text-[#e0d4ff] transition-colors font-bold"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={!canProceed[step]}
                      className="bg-[#00ffff] text-black border-2 border-[#00ffff] px-6 py-2.5 text-sm font-extrabold uppercase disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-[4px_4px_0_0_#d1d5db] active:translate-x-1 active:translate-y-1 active:shadow-none hover:bg-transparent hover:text-[#00ffff]"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleDeploy}
                      disabled={deploying}
                      className="bg-[#00ffff] text-black border-2 border-[#00ffff] px-6 py-2.5 text-sm font-extrabold uppercase disabled:opacity-60 flex items-center gap-2 transition-all shadow-[4px_4px_0_0_#d1d5db]"
                    >
                      {deploying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        "Deploy to Blockchain"
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar tips */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-5 hover-neo-orange">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-[#ff6b2b]" />
                <h3 className="text-sm font-bold text-[#e0d4ff]">Tips</h3>
              </div>
              <ul className="flex flex-col gap-3 text-xs text-[#a78bfa] leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-[#ff2d95] font-extrabold shrink-0">01</span>
                  Write a clear, descriptive title that highlights the unique value of your prompt.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00ffff] font-extrabold shrink-0">02</span>
                  Set competitive pricing by researching similar prompts in the marketplace.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#b4ff39] font-extrabold shrink-0">03</span>
                  Add relevant tags to help buyers discover your prompt.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#a855f7] font-extrabold shrink-0">04</span>
                  Exclusive licenses command premium prices but limit to one buyer.
                </li>
              </ul>
              {/* Pixel accent */}
              <div className="mt-4 h-1 w-16 y2k-pixel-border" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
