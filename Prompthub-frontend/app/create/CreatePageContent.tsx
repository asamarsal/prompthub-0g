"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Upload, Check, ChevronRight, ChevronLeft, FileText, Lightbulb, X, Loader2, ExternalLink, AlertTriangle, ImagePlus, ShieldCheck, Eye, DollarSign, ListChecks, Save, Wand2, FileArchive, FileImage, FileCode, Star, Zap } from "lucide-react"
import {
  createPrompt,
  getAiModels,
  getCategories,
  uploadMetadata,
  uploadPromptAsset,
  checkPlagiarism,
  previewPromptScore,
  type ApiAiModel,
  type ApiCategory,
} from "@/lib/api"
import { uploadTo0GStorageNetwork, getStorageTxExplorerUrl } from "@/lib/zero-g-storage"
import { createPromptEncryptionContext, encryptFileFor0G } from "@/lib/prompt-encryption"
import { useWallet } from "@/lib/wallet-context"
import { formatEther, parseEther } from "ethers"
import { ensure0GNetwork, getBrowserProvider, getMarketplaceContract } from "@/lib/evm"
import { CHAIN_CONFIG, CONTRACTS } from "@/lib/contracts"
import { use0GPrice } from "@/lib/hooks/use-0g-price"

const steps = ["Basic Info", "Pricing & License", "Upload Content", "Preview & Confirm"]
const DRAFT_KEY = "prompthub:create-draft:v2"
const PROMPT_VARIABLES = ["{subject}", "{style}", "{color}", "{mood}", "{aspect_ratio}"]
const MAX_REFERENCE_IMAGES = 10
// Removed hardcoded FALLBACK_CATEGORIES and FALLBACK_MODELS to ensure data comes only from the API.

function friendlyDeployError(error: any): string {
  const message = String(
    error?.shortMessage
    || error?.reason
    || error?.info?.error?.message
    || error?.error?.message
    || error?.message
    || error
    || "Unknown error"
  )

  if (message.includes("user rejected") || message.includes("User denied") || error?.code === 4001) {
    return "Wallet transaction was rejected."
  }
  if (message.includes("insufficient funds") || message.includes("exceeds balance")) {
    return "Wallet has insufficient 0G for gas or listing transaction."
  }
  if (message.includes("missing revert data") || message.includes("execution reverted")) {
    return "Marketplace contract rejected the listing transaction. Check contract address, chain, price, and royalty."
  }
  if (message.includes("Marketplace address not configured")) {
    return "Marketplace contract address is not configured in frontend .env."
  }
  if (message.includes("could not coalesce error")) {
    const raw = JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    return `Wallet/RPC returned an unknown error. The transaction was sent with a nonzero price, so check gas, contract address, and chain. Raw: ${raw.slice(0, 700)}`
  }

  if (message.includes("Price must be > 0")) {
    return "The contract rejected the listing because the price is 0. Please set a price greater than 0."
  }

  return message
}

function StepIndicator({ current, onStepClick }: { current: number, onStepClick?: (step: number) => void }) {
  return (
    <div className="flex items-center gap-2 mb-10" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={4}>
      {steps.map((label, i) => (
        <div
          key={label}
          className={`flex items-center gap-2 flex-1 ${onStepClick ? "cursor-pointer group" : ""}`}
          onClick={() => onStepClick?.(i)}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold shrink-0 transition-all ${i < current
              ? "bg-[#b4ff39] text-[#0a001a]"
              : i === current
                ? "bg-transparent border-2 border-[#ff2d95] text-[#ff2d95] shadow-[0_0_10px_rgba(255,45,149,0.3)]"
                : "glass text-[#a78bfa]/50"
              } ${onStepClick && i !== current ? "group-hover:scale-110 group-hover:border-[#b4ff39]/50" : ""}`}
          >
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-xs font-bold hidden sm:block transition-colors ${i === current ? "text-[#e0d4ff]" : "text-[#a78bfa]/50"} ${onStepClick && i !== current ? "group-hover:text-[#b4ff39]" : ""}`}>
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

function DeployingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="w-[min(92vw,420px)] border-2 border-[#00ffff] bg-[#0a001a]/95 p-8 text-center shadow-[10px_10px_0_0_rgba(0,255,255,0.24)]">
        <div className="relative mx-auto mb-6 h-28 w-28">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #00ffff, #00b7ff, #7cf7ff, #0b5cff, #00ffff)",
              boxShadow: "0 0 28px rgba(0,255,255,0.28), inset 0 0 18px rgba(0,183,255,0.18)",
            }}
          />
          <div className="absolute inset-3 rounded-full border-2 border-[#00ffff]/20 bg-[#0a001a]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/icon/0G-Logo-Purple_Hero.png"
              alt="0G"
              className="h-11 w-11 object-contain drop-shadow-[0_0_14px_rgba(0,255,255,0.55)]"
              draggable={false}
            />
          </div>
        </div>
        <p className="font-display text-2xl font-black uppercase tracking-[0.18em] text-[#00ffff]">
          Deploying to Blockchain
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
          Encrypting content, uploading to 0G Storage, and listing on 0G Chain.
        </p>
        <div className="mt-6 h-2 overflow-hidden border border-[#00ffff]/20 bg-[#071322]">
          <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-[#00ffff] via-[#00b7ff] to-[#7cf7ff] shadow-[0_0_14px_rgba(0,255,255,0.65)]" />
        </div>
      </div>
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
  promptMode: "upload" | "write"
  promptText: string
  negativePrompt: string
  usageNotes: string
  commercialUseAllowed: boolean
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
    category: "",
    model: "",
    tags: [],
    price: "0",
    license: "Commercial",
    royalty: 5,
    files: [],
    promptMode: "upload",
    promptText: "",
    negativePrompt: "",
    usageNotes: "",
    commercialUseAllowed: true,
    previewImageUrl: "",
    previewImageFile: null,
    previewMode: "upload",
    contentType: "TEXT",
    isNsfw: false,
    currency: "0G",
    additionalLinks: [],
    referenceImages: [],
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [previewImage])

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null)
  const [plagiarismChecking, setPlagiarismChecking] = useState(false)
  const [qualityScore, setQualityScore] = useState<any>(null)
  const [qualityScoring, setQualityScoring] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [tosModalOpen, setTosModalOpen] = useState(false)
  const [tosAgreed, setTosAgreed] = useState(false)
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const fileIcon = (file: File) => {
    const name = file.name.toLowerCase()
    if (file.type.startsWith("image/")) return <FileImage className="w-4 h-4 text-[#00ffff] shrink-0" />
    if (name.endsWith(".zip")) return <FileArchive className="w-4 h-4 text-[#ff6b2b] shrink-0" />
    return <FileText className="w-4 h-4 text-[#a78bfa] shrink-0" />
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  useEffect(() => {
    let mounted = true

    async function loadTaxonomy() {
      try {
        const [categoriesRes, modelsRes] = await Promise.all([getCategories(), getAiModels()])
        if (!mounted) return
        setTaxonomyCategories(categoriesRes)
        setTaxonomyModels(modelsRes)
        if (categoriesRes.length > 0) {
          setForm((prev) => ({
            ...prev,
            category: prev.category || categoriesRes[0].name,
          }))
        }
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
    return taxonomyCategories.map((item) => item.name)
  }, [taxonomyCategories])

  const modelOptions = useMemo(() => {
    const selectedCategory = taxonomyCategories.find((item) => item.name === form.category)
    const filtered = selectedCategory
      ? taxonomyModels.filter((item) => item.category_id === selectedCategory.id || item.category?.name === selectedCategory.name)
      : taxonomyModels

    return filtered.map((item) => item.name)
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

  useEffect(() => {
    try {
      const rawDraft = globalThis.localStorage.getItem(DRAFT_KEY)
      if (rawDraft) {
        const draft = JSON.parse(rawDraft)
        setForm((prev) => ({
          ...prev,
          ...draft,
          files: [],
          previewImageFile: null,
          referenceImages: [],
        }))
        if (draft.savedAt) setDraftSavedAt(draft.savedAt)
      }
    } catch (error) {
      console.warn("Failed to restore create draft", error)
    } finally {
      setDraftHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!draftHydrated || deployed) return

    const timer = window.setTimeout(() => {
      try {
        const savedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        const { files, previewImageFile, referenceImages, ...serializableForm } = form
        globalThis.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...serializableForm, savedAt }))
        setDraftSavedAt(savedAt)
      } catch (error) {
        console.warn("Failed to save create draft", error)
      }
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [draftHydrated, deployed, form])

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const insertVariable = (variable: string) => {
    const textarea = promptTextareaRef.current
    if (!textarea) {
      update("promptText", `${form.promptText}${variable}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const nextValue = `${form.promptText.slice(0, start)}${variable}${form.promptText.slice(end)}`
    update("promptText", nextValue.slice(0, 1000))
    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = Math.min(start + variable.length, 1000)
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const addPromptFiles = (files: File[]) => {
    const validFiles = files.filter((file) => file.size <= 50 * 1024 * 1024)
    if (validFiles.length !== files.length) {
      alert("Some files were skipped because they are larger than 50MB.")
    }
    update("files", [...form.files, ...validFiles].slice(0, 10))
  }

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !form.tags.includes(trimmed) && form.tags.length < 5) {
      update("tags", [...form.tags, trimmed])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => update("tags", form.tags.filter((t) => t !== tag))

  const getPromptTextForScoring = async () => {
    if (form.promptMode === "write") return form.promptText.trim()
    const firstTxt = form.files.find((file) => file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain")
    if (!firstTxt) return form.description.trim()
    try {
      return (await firstTxt.text()).trim()
    } catch {
      return form.description.trim()
    }
  }

  const handlePreviewScore = async () => {
    setQualityScoring(true)
    try {
      const text = await getPromptTextForScoring()
      if (!text) {
        alert("Add prompt text or a .txt prompt file before scoring.")
        return
      }
      const result = await previewPromptScore(text)
      setQualityScore(result)
    } catch (err: any) {
      setQualityScore({
        overall: 0,
        clarity: 0,
        completeness: 0,
        safety: 0,
        reproducibility: 0,
        innovation: 0,
        source: "heuristic",
        reasoning: `Quality score unavailable: ${err?.message || "unknown error"}`,
      })
    } finally {
      setQualityScoring(false)
    }
  }

  const assertMarketplaceReady = async (price: string, royalty: number) => {
    if (!isConnected || !address) {
      throw new Error("Connect your wallet before deploying a prompt.")
    }
    if (!CONTRACTS.marketplace) {
      throw new Error("Marketplace address not configured. Check NEXT_PUBLIC_MARKETPLACE_ADDRESS and restart Next.js.")
    }

    const provider = await getBrowserProvider()
    await ensure0GNetwork(provider)

    const code = await provider.getCode(CONTRACTS.marketplace)
    if (!code || code === "0x") {
      throw new Error(`Marketplace contract not found on ${CHAIN_CONFIG.chainName}. Address: ${CONTRACTS.marketplace}`)
    }

    const balance = await provider.getBalance(address)
    if (balance <= BigInt(0)) {
      throw new Error("Connected wallet has 0G balance 0. Add testnet 0G for listing gas.")
    }

    const marketplace = await getMarketplaceContract()
    const priceWei = parseEther(String(price || "0"))
    const royaltyPerMille = Math.max(0, Math.min(200, Math.round(royalty * 10)))

    try {
      await marketplace.listPrompt.estimateGas(
        "ipfs://prompthub-preflight",
        priceWei,
        royaltyPerMille,
        "0xpreflight"
      )
    } catch (estimateError: any) {
      console.error("[Deploy preflight] Marketplace listPrompt estimate failed:", estimateError)
      throw estimateError
    }

    console.log("[Deploy preflight] Marketplace ready", {
      chainId: CHAIN_CONFIG.chainId,
      marketplace: CONTRACTS.marketplace,
      wallet: address,
      balance0G: formatEther(balance),
    })
  }

  const handleDeploy = async () => {
    if (form.promptMode === "upload" && form.files.length === 0) {
      alert("Please upload at least one prompt file first.")
      return
    }
    if (form.promptMode === "write" && form.promptText.trim().length === 0) {
      alert("Please write your prompt content first.")
      return
    }
    if (form.previewMode !== "upload" || !form.previewImageFile) {
      alert("Please upload the first preview image file so it can be stored in 0G Storage.")
      return
    }
    if (Number(form.price) <= 0) {
      alert("Price must be greater than 0 0G to list on the marketplace.")
      return
    }

    try {
      setDeploying(true)
      const groupId = crypto.randomUUID().split("-")[0] // Short unique ID
      const safeTitle = form.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "prompt"
      const promptFiles = form.promptMode === "write"
        ? [new File([form.promptText], `${safeTitle}.txt`, { type: "text/plain" })]
        : form.files
      const firstTxtFile = form.promptMode === "write"
        ? promptFiles[0]
        : promptFiles.find((file) => file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain")
      if (!firstTxtFile) {
        alert("Please include at least one .txt prompt file. Only the first .txt prompt file is uploaded to 0G Storage.")
        setDeploying(false)
        return
      }

      // Stop before paid 0G Storage uploads if wallet/contract listing cannot work.
      await assertMarketplaceReady(form.price, form.royalty)

      // 0. Upload Preview Image to backend (local cache for fast display)
      let finalPreviewUrl = form.previewImageUrl
      let watermarkedPreviewUrl = ""
      if (form.previewMode === "upload" && form.previewImageFile) {
        console.log("Uploading preview image to backend cache...")
        const previewRes = await uploadPromptAsset(form.previewImageFile, groupId)
        finalPreviewUrl = previewRes.url
        watermarkedPreviewUrl = (previewRes as any).watermarked_url || ""
      }

      // 1. Read prompt files locally. Raw prompt content is never uploaded to backend cache.
      console.log("Preparing prompt files for encrypted 0G upload...")
      const uploadedFiles: { name: string, url?: string, size: number, type: string, root_hash?: string, encrypted?: boolean }[] = []
      let combinedContent = ""

      for (let i = 0; i < promptFiles.length; i++) {
        const f = promptFiles[i]
        uploadedFiles.push({
          name: f.name,
          size: f.size,
          type: f.type,
          encrypted: true,
        })

        // Extract text locally for encrypted-at-rest backend unlock and AI checks.
        if ((form.contentType === "TEXT" || form.contentType === "CODE") && combinedContent.length < 200000) {
          try {
            const text = await f.text()
            combinedContent += `--- FILE: ${f.name} ---\n${text}\n\n`
          } catch (e) {
            console.error("Failed to read file text", e)
          }
        }
      }

      if (!combinedContent.trim() && firstTxtFile) {
        try {
          combinedContent = await firstTxtFile.text()
        } catch (e) {
          console.warn("Failed to read primary .txt content", e)
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
      const encryptionContext = await createPromptEncryptionContext()
      let storageRootHash = ""
      let storageTxHash = ""
      let encryptedPromptTxt: Awaited<ReturnType<typeof encryptFileFor0G>> | null = null
      console.log("Encrypting and uploading prompt .txt to 0G Storage Network via SDK...")
      try {
        encryptedPromptTxt = await encryptFileFor0G(firstTxtFile, encryptionContext)
        const zgResult = await uploadTo0GStorageNetwork(encryptedPromptTxt.file)
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

      if (!storageRootHash) {
        throw new Error("0G Storage upload failed for prompt_txt")
      }

      const textPackagePayload = {
        version: 1,
        title: form.title,
        prompt_text: form.promptMode === "write" ? form.promptText : combinedContent,
        negative_prompt: form.negativePrompt,
        usage_notes: form.usageNotes,
        commercial_use_allowed: form.commercialUseAllowed,
        created_at: new Date().toISOString(),
      }
      const textPackageFile = new File(
        [JSON.stringify(textPackagePayload, null, 2)],
        `${safeTitle}-text-package.json`,
        { type: "application/json" }
      )
      const uploadRequired0G = async (file: File, role: "preview_image" | "text_package") => {
        const result = await uploadTo0GStorageNetwork(file)
        if (!result.success || !result.rootHash) {
          throw new Error(`0G Storage upload failed for ${role}: ${result.error || "missing root hash"}`)
        }
        return {
          role,
          name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
          root_hash: result.rootHash,
          tx_hash: result.txHash || "",
        }
      }
      const uploadEncryptedRequired0G = async (file: File, role: "text_package") => {
        const encrypted = await encryptFileFor0G(file, encryptionContext)
        const result = await uploadTo0GStorageNetwork(encrypted.file)
        if (!result.success || !result.rootHash) {
          throw new Error(`0G Storage upload failed for encrypted ${role}: ${result.error || "missing root hash"}`)
        }
        return {
          role,
          name: file.name,
          encrypted_name: encrypted.file.name,
          mime_type: file.type || "application/octet-stream",
          stored_mime_type: encrypted.file.type,
          size: encrypted.file.size,
          plaintext_size: file.size,
          root_hash: result.rootHash,
          tx_hash: result.txHash || "",
          encrypted: true,
          encryption: {
            scheme: encryptionContext.scheme,
            key_id: encryptionContext.keyId,
            iv_b64: encrypted.ivB64,
            plaintext_sha256: encrypted.plaintextSha256,
            ciphertext_sha256: encrypted.ciphertextSha256,
          },
        }
      }

      const promptTxtRef = {
        role: "prompt_txt",
        name: firstTxtFile.name,
        encrypted_name: encryptedPromptTxt?.file.name || `${firstTxtFile.name}.enc`,
        mime_type: firstTxtFile.type || "text/plain",
        stored_mime_type: encryptedPromptTxt?.file.type || "application/octet-stream",
        size: encryptedPromptTxt?.file.size || firstTxtFile.size,
        plaintext_size: firstTxtFile.size,
        root_hash: storageRootHash,
        tx_hash: storageTxHash || "",
        encrypted: true,
        encryption: {
          scheme: encryptionContext.scheme,
          key_id: encryptionContext.keyId,
          iv_b64: encryptedPromptTxt?.ivB64 || "",
          plaintext_sha256: encryptedPromptTxt?.plaintextSha256 || "",
          ciphertext_sha256: encryptedPromptTxt?.ciphertextSha256 || "",
        },
      }
      const previewImageRef = await uploadRequired0G(form.previewImageFile, "preview_image")
      const textPackageRef = await uploadEncryptedRequired0G(textPackageFile, "text_package")
      const zeroGFiles = [promptTxtRef, previewImageRef, textPackageRef]
      const finalStorageHash = textPackageRef.root_hash || promptTxtRef.root_hash
      const finalStorageTxHash = textPackageRef.tx_hash || promptTxtRef.tx_hash
      const storageManifest = {
        version: 1,
        title: form.title,
        description: form.description,
        creator: address || "",
        created_at: new Date().toISOString(),
        pinata_policy: "text_metadata_only",
        encryption: {
          scheme: encryptionContext.scheme,
          key_id: encryptionContext.keyId,
          encrypted_roles: ["prompt_txt", "text_package"],
          key_custody: "backend-laravel-crypt",
        },
        zero_g_files: zeroGFiles,
        negative_prompt: form.negativePrompt,
        usage_notes: form.usageNotes,
        commercial_use_allowed: form.commercialUseAllowed,
      }

      // 3. Upload NFT Metadata to IPFS (Pinata)
      const metadataRes = await uploadMetadata({
        name: form.title,
        description: form.description,
        image: finalPreviewUrl,
        properties: {
          category: form.category,
          model: form.model,
          content_type: form.contentType,
          files: uploadedFiles,
          license: form.license,
          royalty: form.royalty,
          negative_prompt: form.negativePrompt,
          usage_notes: form.usageNotes,
          commercial_use_allowed: form.commercialUseAllowed,
          additional_info: form.additionalLinks.filter(l => l.url.trim() !== ""),
          creator_name: profile.name || profile.username || "Anonymous",
          creator_address: address || "",
          storage_root_hash: finalStorageHash,
          storage_manifest: storageManifest,
          encryption: storageManifest.encryption,
          pinata_policy: "text_metadata_only",
          zero_g_files: zeroGFiles,
          prompt_txt_root_hash: promptTxtRef.root_hash,
          prompt_txt_tx_hash: promptTxtRef.tx_hash,
          preview_root_hash: previewImageRef.root_hash,
          preview_tx_hash: previewImageRef.tx_hash,
          text_package_root_hash: textPackageRef.root_hash,
          text_package_tx_hash: textPackageRef.tx_hash,
          reference_images: refImageUrls,
        }
      })
      const metadataCID = metadataRes.ipfs_uri
      console.log("Metadata uploaded, CID:", metadataCID)

      // 4. Call Smart Contract (listPrompt)
      const marketplace = await getMarketplaceContract()
      const royaltyPerMille = Math.max(0, Math.min(200, Math.round(form.royalty * 10)))
      const priceWei = parseEther(String(form.price || "0"))
      if (priceWei <= BigInt(0)) {
        throw new Error("Price must be > 0")
      }
      const estimatedGas = await marketplace.listPrompt.estimateGas(
        metadataCID,
        priceWei,
        royaltyPerMille,
        finalStorageHash
      )
      const gasLimit = (estimatedGas * BigInt(125)) / BigInt(100)
      console.log("[Marketplace listPrompt] Prepared tx", {
        priceInput: form.price,
        priceWei: priceWei.toString(),
        royaltyPerMille,
        estimatedGas: estimatedGas.toString(),
        gasLimit: gasLimit.toString(),
      })
      const tx = await marketplace.listPrompt(
        metadataCID,
        priceWei,
        royaltyPerMille,
        finalStorageHash,
        { gasLimit }
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
      if (!tokenId) {
        throw new Error("Marketplace transaction succeeded, but token ID could not be read from the 0G contract receipt.")
      }

      // 5. Save to Backend DB
      await createPrompt({
        title: form.title,
        description: form.description,
        price_0g: Number.parseFloat(form.price),
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
        prompt_txt_root_hash: promptTxtRef.root_hash,
        prompt_txt_tx_hash: promptTxtRef.tx_hash,
        preview_root_hash: previewImageRef.root_hash,
        preview_tx_hash: previewImageRef.tx_hash,
        text_package_root_hash: textPackageRef.root_hash,
        text_package_tx_hash: textPackageRef.tx_hash,
        ipfs_metadata_uri: metadataCID,
        storage_manifest: storageManifest,
        storage_status: "uploaded",
        content_encryption: {
          scheme: encryptionContext.scheme,
          key_id: encryptionContext.keyId,
          key_b64: encryptionContext.keyB64,
          encrypted_roles: ["prompt_txt", "text_package"],
        },
        reference_images: refImageUrls,
        negative_prompt: form.negativePrompt.trim() || null,
        usage_notes: form.usageNotes.trim() || null,
        commercial_use_allowed: form.commercialUseAllowed,
        additional_info: {
          links: form.additionalLinks.filter(l => l.url.trim() !== ""),
          files: uploadedFiles,
          storage_root_hash: finalStorageHash,
          storage_manifest: storageManifest,
        },
        original_content: combinedContent
      })
      setDeployedTxId(tx.hash)
      setDeployedMetadataCID(metadataCID)
      setDeployedStorageHash(finalStorageHash || null)
      setDeployedStorageTxHash(finalStorageTxHash || null)
      setDeployed(true)
      globalThis.localStorage.removeItem(DRAFT_KEY)
      setDraftSavedAt(null)
      setDeploying(false)

    } catch (error) {
      console.error("Failed to deploy prompt:", error)
      alert(`Failed to deploy prompt: ${friendlyDeployError(error)}`)
      setDeploying(false)
    }
  }

  const feePercentage = isVerified ? 0.025 : 0.10
  const platformFee = Number(form.price) * feePercentage
  const platformFeeUsd = platformFee * ogPrice
  const totalEarnings = Number(form.price) - platformFee
  const totalEarningsUsd = totalEarnings * ogPrice
  const hasPromptContent = form.promptMode === "write" ? form.promptText.trim().length > 0 : form.files.length > 0
  const previewImageSrc = previewUrl || form.previewImageUrl
  const checklist = [
    { label: "Title added", done: form.title.trim().length > 0 },
    { label: "Prompt included", done: hasPromptContent },
    { label: `Preview images (${form.referenceImages.length}/${MAX_REFERENCE_IMAGES})`, done: form.referenceImages.length > 0 },
    { label: form.promptMode === "write" ? "Written prompt ready" : `Files attached (${form.files.length}/10)`, done: hasPromptContent },
  ]
  const readyToPublish = checklist.every((item) => item.done) && Number(form.price) > 0 && (
    form.previewMode === "url" ? form.previewImageUrl.length > 0 : form.previewImageFile !== null
  )

  const canProceed = [
    form.title.length > 0 &&
    form.description.length > 0 &&
    (form.previewMode === "url" ? form.previewImageUrl.length > 0 : form.previewImageFile !== null),
    Number(form.price) > 0,
    hasPromptContent,
    true,
  ]

  return (
    <>
      {deploying && <DeployingOverlay />}
      <AppShell>
        <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-12">
          <p className="text-sm font-bold text-[#b4ff39] uppercase tracking-widest mb-2 font-mono">{"// CREATE"}</p>
          <h1 className="text-3xl font-extrabold text-[#e0d4ff] mb-2">
            Create <span className="gradient-text">Prompt</span>
          </h1>
          <p className="text-[#a78bfa] mb-8">List your AI prompt on the marketplace.</p>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <div className="xl:col-span-8">
              <StepIndicator current={step} onStepClick={!deploying && !deployed ? setStep : undefined} />

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
                            {categoryOptions.length === 0 ? (
                              <option value="" disabled>Loading categories...</option>
                            ) : (
                              <>
                                {!form.category && <option value="" disabled>Select Category</option>}
                                {categoryOptions.map((c) => (
                                  <option key={c} value={c} className="bg-[#0a001a]">{c}</option>
                                ))}
                              </>
                            )}
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
                            {taxonomyModels.length === 0 ? (
                              <option value="" disabled>Loading models...</option>
                            ) : (
                              <>
                                {!form.model && <option value="" disabled>Select Model</option>}
                                {modelOptions.map((m) => (
                                  <option key={m} value={m} className="bg-[#0a001a]">{m}</option>
                                ))}
                              </>
                            )}
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
                      <div className="bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
                          <div>
                            <h3 className="text-sm font-bold text-[#e0d4ff] flex items-center gap-2">
                              <Wand2 className="w-4 h-4 text-[#00ffff]" />
                              Prompt Content
                            </h3>
                            <p className="text-[11px] text-[#a78bfa]/60 mt-1">Write directly or upload a complete prompt package.</p>
                          </div>
                          <div className="flex bg-[#0a001a] border border-[#2a2a30] p-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => update("promptMode", "upload")}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${form.promptMode === "upload" ? "bg-[#00ffff] text-black" : "text-[#a78bfa] hover:text-[#e0d4ff]"}`}
                            >
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={() => update("promptMode", "write")}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${form.promptMode === "write" ? "bg-[#b4ff39] text-black" : "text-[#a78bfa] hover:text-[#e0d4ff]"}`}
                            >
                              Write Prompt
                            </button>
                          </div>
                        </div>

                        {form.promptMode === "write" ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">Editor View</label>
                              <div className="flex items-center gap-4">
                                {PROMPT_VARIABLES.map((variable) => (
                                  <button
                                    key={variable}
                                    type="button"
                                    onClick={() => insertVariable(variable)}
                                    className="px-2 py-0.5 border border-[#00ffff]/30 bg-[#00ffff]/5 text-[9px] font-bold text-[#00ffff] hover:bg-[#00ffff]/20 transition-colors rounded"
                                  >
                                    +{variable}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-[44px_1fr] bg-[#0a001a] border-2 border-[#2a2a30] focus-within:border-[#00ffff] transition-colors min-h-[300px] rounded-lg overflow-hidden shadow-inner">
                              <div className="py-3 text-right pr-3 border-r border-[#2a2a30] text-[11px] leading-6 font-mono text-[#a78bfa]/30 select-none bg-black/40">
                                {Array.from({ length: Math.max(10, form.promptText.split("\n").length) }).map((_, idx) => (
                                  <div key={idx}>{idx + 1}</div>
                                ))}
                              </div>
                              <textarea
                                ref={promptTextareaRef}
                                value={form.promptText}
                                maxLength={1000}
                                onChange={(e) => update("promptText", e.target.value)}
                                placeholder="/imagine prompt: {subject}, cinematic lighting, detailed composition, 8k resolution, photorealistic..."
                                className="min-h-[300px] resize-none bg-transparent px-5 py-3 text-sm leading-6 text-[#e0d4ff] placeholder-[#a78bfa]/20 focus:outline-none font-mono"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono mt-1">
                              <div className="flex items-center gap-2 text-[#a78bfa]/40">
                                <FileCode className="w-3 h-3" />
                                <span>Markdown/JSON supported</span>
                              </div>
                              <span className={form.promptText.length > 900 ? "text-[#ff2d95]" : "text-[#a78bfa]/50"}>{form.promptText.length}/1000</span>
                            </div>
                          </div>
                        ) : (
                          <>
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
                                accept=".txt,.json,.md,.code,.pdf,.zip,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf,application/zip"
                                className="hidden"
                                onChange={(e) => {
                                  const newFiles = Array.from(e.target.files || [])
                                  if (newFiles.length > 0) addPromptFiles(newFiles)
                                  e.target.value = ""
                                }}
                              />
                              <div>
                                <div className="w-14 h-14 mx-auto mb-3 rounded-xl glass flex items-center justify-center">
                                  <Upload className="w-7 h-7 text-[#ff2d95]" />
                                </div>
                                <p className="text-sm font-bold text-[#e0d4ff]">Click to upload your prompt files</p>
                                <p className="text-xs text-[#a78bfa]/50 mt-1 font-mono">TXT, JSON, MD, CODE, PDF, ZIP, PNG, JPG, WEBP (Max 50MB per file)</p>
                              </div>
                            </div>

                            {form.files.length > 0 && (
                              <div className="flex flex-col gap-3 mt-4">
                                <h4 className="text-xs font-bold text-[#b4ff39] uppercase tracking-widest">Uploaded Files ({form.files.length}/10)</h4>
                                <div className="flex flex-col gap-2">
                                  {form.files.map((f, idx) => (
                                    <div key={`${f.name}-${idx}`} className="bg-[#160f24]/80 border border-[#2a2a30] p-3 flex items-center justify-between group">
                                      <div className="flex items-center gap-3 min-w-0">
                                        {fileIcon(f)}
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-[#e0d4ff] truncate">{f.name}</p>
                                          <p className="text-[10px] text-[#a78bfa]/60 font-mono">{formatSize(f.size)}</p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
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
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-[#e0d4ff]">Negative Prompt</label>
                            <span className={form.negativePrompt.length > 900 ? "text-[10px] text-[#ff2d95] font-mono" : "text-[10px] text-[#a78bfa]/50 font-mono"}>{form.negativePrompt.length}/1000</span>
                          </div>
                          <textarea
                            value={form.negativePrompt}
                            maxLength={1000}
                            rows={5}
                            onChange={(e) => update("negativePrompt", e.target.value)}
                            placeholder="blurry, low quality, deformed, bad anatomy, overexposed..."
                            className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] font-medium transition-colors resize-y"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-[#e0d4ff]">Usage Notes</label>
                            <span className={form.usageNotes.length > 900 ? "text-[10px] text-[#ff2d95] font-mono" : "text-[10px] text-[#a78bfa]/50 font-mono"}>{form.usageNotes.length}/1000</span>
                          </div>
                          <textarea
                            value={form.usageNotes}
                            maxLength={1000}
                            rows={5}
                            onChange={(e) => update("usageNotes", e.target.value)}
                            placeholder="Best results with clear subject references and high-quality input images."
                            className="w-full bg-[#160f24]/60 backdrop-blur-md border-2 border-[#2a2a30] px-4 py-3 text-sm text-[#e0d4ff] placeholder-[#a78bfa]/30 focus:outline-none focus:border-[#00ffff] font-medium transition-colors resize-y"
                          />
                        </div>
                      </div>



                      {/* Reference Images Section */}
                      <div className="mt-4">
                        <h4 className="text-xs font-bold text-[#00ffff] uppercase tracking-widest mb-3 flex items-center gap-2">
                          <ImagePlus className="w-4 h-4" />
                          Reference Images (Optional)
                        </h4>
                        <p className="text-xs text-[#a78bfa]/50 mb-3">Add up to {MAX_REFERENCE_IMAGES} reference images to show buyers what your prompt can generate.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {form.referenceImages.map((f, idx) => (
                            <div key={idx} className="relative aspect-square bg-[#160f24]/80 border border-[#2a2a30] overflow-hidden group">
                              <img
                                src={URL.createObjectURL(f)}
                                alt={`Reference ${idx + 1}`}
                                className="w-full h-full object-cover cursor-zoom-in"
                                onClick={() => setPreviewImage(URL.createObjectURL(f))}
                              />
                              <button
                                onClick={() => update("referenceImages", form.referenceImages.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-[#ff2d95]/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                          {form.referenceImages.length < MAX_REFERENCE_IMAGES && (
                            <label className="aspect-square bg-[#160f24]/60 border-2 border-dashed border-[#2a2a30] hover:border-[#00ffff] flex flex-col items-center justify-center cursor-pointer transition-all">
                              <ImagePlus className="w-6 h-6 text-[#a78bfa]/40 mb-1" />
                              <span className="text-[10px] text-[#a78bfa]/40">Add Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file && form.referenceImages.length < MAX_REFERENCE_IMAGES) update("referenceImages", [...form.referenceImages, file])
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
                                  content: form.promptMode === "write" ? form.promptText : (form.files.length > 0 ? form.files[0].name : undefined),
                                })
                                setPlagiarismResult(result)
                              } catch (err: any) {
                                setPlagiarismResult({ is_plagiarized: false, similarity_score: 0, reasoning: `Check unavailable (${err.message || "Unknown error"}) — proceed with caution.`, similar_prompts: [] })
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
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h3 className="text-sm font-bold text-[#e0d4ff]">Quality Score</h3>
                          <button
                            type="button"
                            onClick={handlePreviewScore}
                            disabled={qualityScoring}
                            className="px-3 py-1.5 text-xs font-bold bg-[#b4ff39]/10 border border-[#b4ff39]/30 text-[#b4ff39] hover:bg-[#b4ff39]/20 transition-colors disabled:opacity-50"
                          >
                            {qualityScoring ? (
                              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Scoring...</span>
                            ) : "Run Score"}
                          </button>
                        </div>
                        {qualityScore ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#a78bfa]/70 uppercase">Overall</span>
                              <span className="text-lg font-extrabold text-[#b4ff39]">{qualityScore.overall}/10</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#a78bfa]/70">
                              {["clarity", "completeness", "safety", "reproducibility", "innovation"].map((key) => (
                                <div key={key} className="flex items-center justify-between gap-2 border border-[#2a2a30] px-2 py-1">
                                  <span className="capitalize">{key}</span>
                                  <span className="font-mono text-[#e0d4ff]">{qualityScore[key] ?? 0}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-[#a78bfa]/50 leading-relaxed">{qualityScore.reasoning}</p>
                            <p className="text-[9px] text-[#00ffff]/70 uppercase tracking-widest">
                              {qualityScore.source === "heuristic" ? "Heuristic fallback" : "0G Compute"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-[#a78bfa]/40">Run quality scoring before deploy to preview prompt readiness.</p>
                        )}
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
                        <input
                          type="checkbox"
                          className="accent-[#ff2d95] w-4 h-4"
                          checked={tosAgreed}
                          onChange={(e) => setTosAgreed(e.target.checked)}
                        />
                        <span className="text-sm text-[#a78bfa]">
                          I agree to the <button type="button" onClick={() => setTosModalOpen(true)} className="text-[#00ffff] hover:underline font-bold">PromptHub Terms of Service and Marketplace Rules</button>
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
                        onClick={() => {
                          if (!tosAgreed) setTosModalOpen(true);
                          else handleDeploy();
                        }}
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

            {/* Sidebar preview */}
            <div className="hidden xl:block xl:col-span-4">
              <div className="sticky top-24 flex flex-col gap-4">
                <div className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#00ffff]" />
                      <h3 className="text-sm font-bold text-[#e0d4ff]">Live Preview</h3>
                    </div>
                    <span className={`px-2 py-1 text-[9px] font-black uppercase border ${readyToPublish ? "border-[#b4ff39] bg-[#b4ff39]/10 text-[#b4ff39]" : "border-[#a78bfa]/30 text-[#a78bfa]/60"}`}>
                      {readyToPublish ? "Ready" : "Draft"}
                    </span>
                  </div>
                  <div
                    className={`border-2 border-[#2a2a30] bg-[#0a001a] overflow-hidden rounded-xl shadow-2xl ${previewImageSrc ? "cursor-zoom-in" : ""}`}
                    onClick={() => previewImageSrc && setPreviewImage(previewImageSrc)}
                  >
                    <div className="aspect-[4/3] bg-[#160f24] relative">
                      {previewImageSrc ? (
                        <img src={previewImageSrc} alt="Listing preview" className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <ImagePlus className="w-10 h-10 text-[#a78bfa]/20 animate-pulse" />
                            <span className="text-[10px] text-[#a78bfa]/40 font-bold uppercase tracking-widest">Image Preview</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white uppercase rounded">
                          {form.category || "Category"}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-black text-[#e0d4ff] leading-tight line-clamp-2">{form.title || "Your Prompt Title"}</p>
                        <div className="flex items-center gap-1 bg-[#00ffff]/10 px-1.5 py-0.5 rounded border border-[#00ffff]/20">
                          <span className="text-[9px] font-bold text-[#00ffff]">NEW</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#a78bfa]/50 line-clamp-2 mb-4 leading-relaxed italic">{form.description || "Describe your prompt's magic here..."}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {form.tags.length > 0 ? form.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[8px] font-bold text-[#a78bfa]/40 bg-[#2a2a30]/50 px-1.5 py-0.5 border border-[#2a2a30]">#{t.toUpperCase()}</span>
                        )) : (
                          <span className="text-[8px] font-bold text-[#a78bfa]/20 bg-[#2a2a30]/30 px-1.5 py-0.5 border border-[#2a2a30]">#TAGS</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#2a2a30] gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-[#00ffff] to-[#a855f7] flex items-center justify-center text-[8px] font-black text-black">
                            {isConnected && address ? address.slice(2, 4).toUpperCase() : "AI"}
                          </div>
                          <span className="text-[10px] font-bold text-[#e0d4ff]/60 truncate">{form.model || "Select Model"}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-[#b4ff39] whitespace-nowrap">
                            {form.price && Number(form.price) > 0 ? `${form.price} ${form.currency}` : `0 ${form.currency}`}
                          </p>
                          <p className="text-[9px] text-[#a78bfa]/40 font-mono whitespace-nowrap">
                            ~${(Number(form.price || 0) * ogPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#2a2a30] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ListChecks className="w-4 h-4 text-[#b4ff39]" />
                    <h3 className="text-sm font-bold text-[#e0d4ff]">Checklist</h3>
                  </div>
                  <ul className="flex flex-col gap-3 text-xs">
                    {checklist.map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-[#a78bfa]">
                        <span className={`w-4 h-4 border flex items-center justify-center shrink-0 ${item.done ? "bg-[#b4ff39] border-[#b4ff39]" : "border-[#a78bfa]/30"}`}>
                          {item.done && <Check className="w-3 h-3 text-black" />}
                        </span>
                        {item.label}
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-[#a78bfa]/30 shrink-0" />
                      <a href="/guidelines" className="text-[#00ffff] hover:text-[#b4ff39] transition-colors">Review guidelines</a>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#16161a]/60 backdrop-blur-xl border-2 border-[#b4ff39]/20 p-5 rounded-xl group hover:border-[#b4ff39]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] text-[#a78bfa]/60 font-mono uppercase tracking-widest flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        You receive
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-3xl font-black text-[#b4ff39]">{totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</p>
                        <span className="text-sm font-bold text-[#b4ff39]/60">{form.currency}</span>
                      </div>
                      <p className="text-[11px] text-[#a78bfa]/50 mt-1 leading-tight">
                        After <span className="text-[#e0d4ff] font-bold">{(feePercentage * 100).toFixed(1)}%</span> fee, approx <span className="text-[#b4ff39] font-bold">${(totalEarningsUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>.
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[#b4ff39]/10 rounded-full flex items-center justify-center border border-[#b4ff39]/20 group-hover:rotate-12 transition-transform">
                      <img src="/icon/0G-Logo-White.png" alt="0G" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(180,255,57,0.5)]" />
                    </div>
                  </div>
                </div>

                {draftSavedAt && (
                  <div className="bg-[#b4ff39]/10 border border-[#b4ff39]/30 p-3 flex items-center gap-2 text-xs font-bold text-[#b4ff39]">
                    <Save className="w-4 h-4" />
                    Draft autosaved at {draftSavedAt}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </AppShell>

      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="fixed top-6 right-6 p-2.5 bg-[#ff2d95] hover:bg-[#ff2d95]/80 rounded-full text-white transition-all shadow-[0_0_20px_rgba(255,45,149,0.4)] z-[100000] group border border-white/20"
            title="Close Preview"
            onClick={(e) => {
              e.stopPropagation()
              setPreviewImage(null)
            }}
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg"
            />
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">Click anywhere to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {tosModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300"
          onClick={() => setTosModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#160f24] border-2 border-[#00ffff] shadow-[8px_8px_0_0_#00ffff] flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a30]">
              <h2 className="text-lg font-bold text-[#e0d4ff] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00ffff]" />
                Terms of Service & Marketplace Rules
              </h2>
              <button
                className="p-1 text-[#a78bfa] hover:text-[#ff2d95] transition-colors"
                onClick={() => setTosModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-sm text-[#a78bfa]/80 space-y-4">
              <h3 className="font-bold text-[#e0d4ff]">1. Acceptance of Terms</h3>
              <p>By deploying a prompt to the PromptHub marketplace on the 0G blockchain, you agree to these Terms of Service. All deployments are recorded immutably on the blockchain.</p>

              <h3 className="font-bold text-[#e0d4ff]">2. Content Originality</h3>
              <p>You warrant that all submitted prompts, images, and associated content are your original creation or you possess the necessary rights and licenses. Plagiarism will result in immediate delisting and potential loss of Agent verification status.</p>

              <h3 className="font-bold text-[#e0d4ff]">3. Prohibited Content</h3>
              <p>You agree NOT to deploy prompts that generate illegal, non-consensual sexually explicit, extreme violence, or harmful content. PromptHub reserves the right to hide flagged content from the frontend interface.</p>

              <h3 className="font-bold text-[#e0d4ff]">4. Platform Fees and Royalties</h3>
              <p>PromptHub collects a 2.5% platform fee on all primary sales and secondary market trades. Creators earn royalties on secondary sales as specified during the creation process. All fees and royalties are enforced trustlessly via smart contracts.</p>

              <h3 className="font-bold text-[#e0d4ff]">5. Decentralized Storage</h3>
              <p>Your prompt text and critical assets will be uploaded to the 0G Storage Network. While access is gated to NFT owners via the x402 protocol, you understand that interacting with decentralized storage networks carries inherent finality.</p>
            </div>

            {/* Footer Action */}
            <div className="p-5 border-t border-[#2a2a30] flex items-center justify-end gap-3 bg-[#16161a]/80">
              <button
                onClick={() => setTosModalOpen(false)}
                className="px-5 py-2 text-sm font-bold text-[#a78bfa] hover:text-[#e0d4ff] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTosAgreed(true);
                  setTosModalOpen(false);
                  handleDeploy();
                }}
                className="bg-[#b4ff39] text-black px-6 py-2 text-sm font-extrabold uppercase hover:bg-[#c2ff59] transition-colors flex items-center gap-2 shadow-[4px_4px_0_0_#00ffff]"
              >
                I Accept & Deploy
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
