"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  adminLogin,
  changeAdminPassword,
  createAiModel,
  createCategory,
  curatePrompt,
  deleteAiModel,
  deleteCategory,
  getAiModels,
  getAdminToken,
  getApiToken,
  getCategories,
  getPrompts,
  getSettings,
  updateSettings,
  loginWithWallet,
  requestAdminPasswordOtp,
  updateAiModel,
  updateCategory,
  type ApiAiModel,
  type ApiCategory,
} from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

const ADMIN_WALLET =
  (process.env.NEXT_PUBLIC_PROMPTHUB_ADMIN_WALLET || "0xfeff727205fe524a3a8a16c404fec9cfe4124acd").toLowerCase()

type AdminPrompt = {
  id: string
  title: string
  description: string
  image: string | null
  creator: string
  category: string
  model: string
  price: number
  currency: string
  isCurated: boolean
  isNsfw: boolean
}

type CategoryForm = {
  name: string
  slug: string
  description: string
  type: "CURATED" | "COMMUNITY"
}

type AiModelForm = {
  name: string
  slug: string
  description: string
  category_id: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function formatCreator(prompt: any) {
  const address = prompt.user?.wallet_address
  if (prompt.user?.name) return prompt.user.name
  if (!address) return "Unknown creator"
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function mapPrompt(prompt: any): AdminPrompt {
  return {
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    image: prompt.preview_image_url || prompt.watermarked_preview_url || null,
    creator: formatCreator(prompt),
    category: prompt.category || "Uncategorized",
    model: prompt.ai_model || "Unknown model",
    price: Number.parseFloat(prompt.price_0g ?? "0"),
    currency: prompt.currency || "0G",
    isCurated: Boolean(prompt.is_curated),
    isNsfw: Boolean(prompt.is_nsfw),
  }
}

export default function AdminPage() {
  const { isConnected, address, connect, isConnecting } = useWallet()
  const [prompts, setPrompts] = useState<AdminPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "curated" | "community">("all")
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminUsername, setAdminUsername] = useState("admin")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoginLoading, setAdminLoginLoading] = useState(false)
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [taxonomyCategories, setTaxonomyCategories] = useState<ApiCategory[]>([])
  const [taxonomyModels, setTaxonomyModels] = useState<ApiAiModel[]>([])
  const [taxonomyLoading, setTaxonomyLoading] = useState(false)
  const [taxonomySaving, setTaxonomySaving] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingModelId, setEditingModelId] = useState<number | null>(null)
  const [taxonomyCollapsed, setTaxonomyCollapsed] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: "",
    slug: "",
    description: "",
    type: "CURATED",
  })
  const [modelForm, setModelForm] = useState<AiModelForm>({
    name: "",
    slug: "",
    description: "",
    category_id: "",
  })
  
  const [siteSettings, setSiteSettings] = useState({
    landing_featured_title: "Featured Prompts",
    landing_featured_subtitle: "Discover top-rated prompts from the best creators.",
    landing_featured_prompt_ids: ""
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsCollapsed, setSettingsCollapsed] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const normalizedAddress = address?.toLowerCase() || ""
  const isAllowedWallet = normalizedAddress === ADMIN_WALLET

  const loadPrompts = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await getPrompts({ per_page: "100", nsfw: "true", sort: "newest" })
      setPrompts(res.data.map(mapPrompt))
    } catch (error) {
      console.error("Failed to load admin prompts", error)
      toast.error("Failed to load prompts")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadTaxonomy = async () => {
    try {
      setTaxonomyLoading(true)
      const [categoriesRes, modelsRes] = await Promise.all([getCategories(), getAiModels()])
      setTaxonomyCategories(categoriesRes)
      setTaxonomyModels(modelsRes)
      setModelForm((current) => ({
        ...current,
        category_id: current.category_id || String(categoriesRes[0]?.id ?? ""),
      }))
    } catch (error) {
      console.error("Failed to load category and model data", error)
      toast.error("Failed to load category and model data")
    } finally {
      setTaxonomyLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      setSettingsLoading(true)
      const res = await getSettings()
      setSiteSettings(prev => ({
        landing_featured_title: res.landing_featured_title || prev.landing_featured_title,
        landing_featured_subtitle: res.landing_featured_subtitle || prev.landing_featured_subtitle,
        landing_featured_prompt_ids: res.landing_featured_prompt_ids || "",
      }))
    } catch (error) {
      console.error("Failed to load settings", error)
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    setAdminAuthenticated(Boolean(getAdminToken()))
  }, [])

  useEffect(() => {
    if (adminAuthenticated && isAllowedWallet) {
      loadPrompts()
      loadTaxonomy()
      loadSettings()
    }
  }, [adminAuthenticated, isAllowedWallet])

  const filteredPrompts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return prompts.filter((prompt) => {
      const matchesSearch =
        !query ||
        prompt.title.toLowerCase().includes(query) ||
        prompt.creator.toLowerCase().includes(query) ||
        prompt.category.toLowerCase().includes(query) ||
        prompt.model.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "curated" && prompt.isCurated) ||
        (statusFilter === "community" && !prompt.isCurated)

      return matchesSearch && matchesStatus
    })
  }, [prompts, search, statusFilter])

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const totalFiltered = filteredPrompts.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage))
  const paginatedPrompts = filteredPrompts.slice((currentPage - 1) * perPage, currentPage * perPage)

  const curatedCount = prompts.filter((prompt) => prompt.isCurated).length
  const communityCount = prompts.length - curatedCount

  const ensureApiSession = async () => {
    if (!isConnected || !address) {
      await connect()
      throw new Error("Connect your wallet first, then try again.")
    }

    if (address.toLowerCase() !== ADMIN_WALLET) {
      throw new Error("This wallet is not allowed to access admin.")
    }

    if (!getApiToken()) {
      await loginWithWallet(address)
    }

    if (!getAdminToken()) {
      throw new Error("Admin login required.")
    }
  }

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminLoginLoading(true)

    try {
      if (!isConnected || !address) {
        await connect()
        throw new Error("Wallet connected. Submit admin login again.")
      }

      if (address.toLowerCase() !== ADMIN_WALLET) {
        throw new Error("This wallet is not allowed to access admin.")
      }

      if (!getApiToken()) {
        await loginWithWallet(address)
      }

      await adminLogin({ username: adminUsername.trim(), password: adminPassword })
      setAdminAuthenticated(true)
      setAdminPassword("")
      toast.success("Admin login successful")
    } catch (error) {
      console.error("Admin login failed", error)
      toast.error(error instanceof Error ? error.message : "Admin login failed")
    } finally {
      setAdminLoginLoading(false)
    }
  }

  const handleConnectWallet = async () => {
    try {
      await connect()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect wallet")
    }
  }

  const handleRequestOtp = async () => {
    setOtpLoading(true)
    try {
      await ensureApiSession()
      const res = await requestAdminPasswordOtp()
      toast.success(`OTP sent to ${res.email}`)
    } catch (error) {
      console.error("Failed to request OTP", error)
      toast.error(error instanceof Error ? error.message : "Failed to send OTP")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordLoading(true)

    try {
      await ensureApiSession()
      await changeAdminPassword({
        otp,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      setOtp("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordPanel(false)
      toast.success("Admin password updated")
    } catch (error) {
      console.error("Failed to change admin password", error)
      toast.error(error instanceof Error ? error.message : "Failed to change password")
    } finally {
      setPasswordLoading(false)
    }
  }

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: "", slug: "", description: "", type: "CURATED" })
  }

  const resetModelForm = () => {
    setEditingModelId(null)
    setModelForm({
      name: "",
      slug: "",
      description: "",
      category_id: String(taxonomyCategories[0]?.id ?? ""),
    })
  }

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTaxonomySaving(true)

    try {
      await ensureApiSession()
      const payload = {
        ...categoryForm,
        name: categoryForm.name.trim(),
        slug: (categoryForm.slug.trim() || slugify(categoryForm.name)).trim(),
        description: categoryForm.description.trim(),
      }

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload)
        toast.success("Category updated")
      } else {
        await createCategory(payload)
        toast.success("Category created")
      }

      resetCategoryForm()
      await loadTaxonomy()
    } catch (error) {
      console.error("Failed to save category", error)
      toast.error(error instanceof Error ? error.message : "Failed to save category")
    } finally {
      setTaxonomySaving(false)
    }
  }

  const handleModelSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTaxonomySaving(true)

    try {
      await ensureApiSession()
      const categoryId = Number(modelForm.category_id)
      if (!categoryId) throw new Error("Select a category for this AI model.")

      const payload = {
        name: modelForm.name.trim(),
        slug: (modelForm.slug.trim() || slugify(modelForm.name)).trim(),
        description: modelForm.description.trim(),
        category_id: categoryId,
      }

      if (editingModelId) {
        await updateAiModel(editingModelId, payload)
        toast.success("AI model updated")
      } else {
        await createAiModel(payload)
        toast.success("AI model created")
      }

      resetModelForm()
      await loadTaxonomy()
    } catch (error) {
      console.error("Failed to save AI model", error)
      toast.error(error instanceof Error ? error.message : "Failed to save AI model")
    } finally {
      setTaxonomySaving(false)
    }
  }

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSettingsSaving(true)
    try {
      await ensureApiSession()
      await updateSettings(siteSettings)
      toast.success("Site settings updated")
      await loadSettings()
    } catch (error) {
      console.error("Failed to update settings", error)
      toast.error(error instanceof Error ? error.message : "Failed to update settings")
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleEditCategory = (category: ApiCategory) => {
    setEditingCategoryId(category.id)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      type: category.type,
    })
  }

  const handleEditModel = (model: ApiAiModel) => {
    setEditingModelId(model.id)
    setModelForm({
      name: model.name,
      slug: model.slug,
      description: model.description || "",
      category_id: String(model.category_id || taxonomyCategories[0]?.id || ""),
    })
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm("Delete this category? Categories with AI models will be blocked by the server.")) return

    setTaxonomySaving(true)
    try {
      await ensureApiSession()
      await deleteCategory(categoryId)
      toast.success("Category deleted")
      if (editingCategoryId === categoryId) resetCategoryForm()
      await loadTaxonomy()
    } catch (error) {
      console.error("Failed to delete category", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete category")
    } finally {
      setTaxonomySaving(false)
    }
  }

  const handleDeleteModel = async (modelId: number) => {
    if (!window.confirm("Delete this AI model?")) return

    setTaxonomySaving(true)
    try {
      await ensureApiSession()
      await deleteAiModel(modelId)
      toast.success("AI model deleted")
      if (editingModelId === modelId) resetModelForm()
      await loadTaxonomy()
    } catch (error) {
      console.error("Failed to delete AI model", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete AI model")
    } finally {
      setTaxonomySaving(false)
    }
  }

  const handleCurationChange = async (promptId: string, nextValue: boolean) => {
    const previous = prompts
    setUpdatingId(promptId)

    try {
      await ensureApiSession()
      setPrompts((current) =>
        current.map((prompt) =>
          prompt.id === promptId ? { ...prompt, isCurated: nextValue } : prompt,
        ),
      )
      let updated
      try {
        updated = await curatePrompt(promptId, nextValue)
      } catch (error) {
        if (address && error instanceof Error && error.message.toLowerCase().includes("unauthenticated")) {
          await loginWithWallet(address)
          updated = await curatePrompt(promptId, nextValue)
        } else {
          throw error
        }
      }
      setPrompts((current) =>
        current.map((prompt) =>
          prompt.id === promptId ? mapPrompt(updated) : prompt,
        ),
      )
      toast.success(nextValue ? "Prompt marked as curated" : "Prompt moved to community")
    } catch (error) {
      console.error("Failed to update curation", error)
      setPrompts(previous)
      if (error instanceof Error && error.message.toLowerCase().includes("admin login required")) {
        setAdminAuthenticated(false)
      }
      toast.error(error instanceof Error ? error.message : "Failed to update curation status")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleFeaturedChange = async (promptId: string, nextValue: boolean) => {
    const currentIds = siteSettings.landing_featured_prompt_ids.split(',').map(id => id.trim()).filter(Boolean)
    let newIds: string[]
    
    if (nextValue) {
      if (currentIds.length >= 6) {
        toast.error("You can only feature up to 6 prompts. Unfeature one first.")
        return
      }
      if (!currentIds.includes(promptId)) {
        newIds = [...currentIds, promptId]
      } else {
        newIds = currentIds
      }
    } else {
      newIds = currentIds.filter(id => id !== promptId)
    }
    
    const newSettings = { ...siteSettings, landing_featured_prompt_ids: newIds.join(',') }
    setSiteSettings(newSettings)
    setUpdatingId(promptId)
    
    try {
      await ensureApiSession()
      await updateSettings(newSettings)
      toast.success(nextValue ? "Prompt added to Featured" : "Prompt removed from Featured")
    } catch (error) {
      console.error("Failed to update featured status", error)
      // Revert on error
      setSiteSettings(siteSettings)
      toast.error(error instanceof Error ? error.message : "Failed to update featured status")
    } finally {
      setUpdatingId(null)
    }
  }

  if (!adminAuthenticated || !isAllowedWallet) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center px-4 py-10">
          <div className="w-full border border-[#2a2a30] bg-[#16161a]/70 p-6 shadow-[8px_8px_0_0_#00ffff] sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#00ffff] bg-[#00ffff]/10">
                <ShieldCheck className="h-6 w-6 text-[#00ffff]" />
              </div>
              <div>
                <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-[#00ffff]">
                  {"// ADMIN ACCESS"}
                </p>
                <h1 className="font-display text-3xl font-black uppercase tracking-wider text-[#e0d4ff]">
                  Admin Login
                </h1>
                <p className="mt-2 text-sm text-[#a78bfa]">
                  Only admin wallet can access this panel.
                </p>
              </div>
            </div>

            {!isConnected ? (
              <div className="border border-[#2a2a30] bg-[#0f0f13] p-5">
                <p className="mb-4 text-sm text-[#a78bfa]">
                  Connect the allowed admin wallet before entering username and password.
                </p>
                <Button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="rounded-none bg-[#ff2d95] font-extrabold uppercase tracking-wider text-white hover:bg-[#e32784]"
                >
                  {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            ) : !isAllowedWallet ? (
              <div className="border border-[#ff2d95]/40 bg-[#ff2d95]/10 p-5">
                <p className="font-bold text-[#ff2d95]">Wallet not allowed</p>
                <p className="mt-2 break-all text-sm text-[#a78bfa]">
                  Connected wallet: {normalizedAddress}. Use the configured admin wallet instead.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Username</span>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />
                    <input
                      value={adminUsername}
                      onChange={(event) => setAdminUsername(event.target.value)}
                      className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] py-2 pl-10 pr-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      autoComplete="username"
                    />
                  </div>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Password</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] py-2 pl-10 pr-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      autoComplete="current-password"
                    />
                  </div>
                </label>
                <Button
                  type="submit"
                  disabled={adminLoginLoading}
                  className="mt-2 rounded-none bg-[#00ffff] font-extrabold uppercase tracking-wider text-black hover:bg-[#00d7d7]"
                >
                  {adminLoginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Login Admin
                </Button>
              </form>
            )}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[#00ffff]">
              {"// ADMIN"}
            </p>
            <h1 className="font-display text-3xl font-black uppercase tracking-wider text-[#e0d4ff] sm:text-5xl">
              Curation Control
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#a78bfa]">
              Review marketplace prompts and update curate status in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setShowPasswordPanel((current) => !current)}
              className="rounded-none border-2 border-[#2a2a30] bg-[#16161a] text-white hover:border-[#ff2d95] hover:bg-[#16161a]"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
            <Button
              type="button"
              onClick={() => loadPrompts(true)}
              disabled={refreshing}
              className="rounded-none border-2 border-[#2a2a30] bg-[#16161a] text-white hover:border-[#00ffff] hover:bg-[#16161a]"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={() => connect()}
                className="rounded-none bg-[#ff2d95] font-extrabold uppercase tracking-wider text-white hover:bg-[#e32784]"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {showPasswordPanel && (
          <form
            onSubmit={handleChangePassword}
            className="mb-6 grid gap-4 border border-[#2a2a30] bg-[#16161a]/60 p-5 lg:grid-cols-[1fr_1fr_auto]"
          >
            <div className="lg:col-span-3">
              <p className="text-xs font-black uppercase tracking-widest text-[#ff2d95]">Change Admin Password</p>
              <p className="mt-1 text-sm text-[#a78bfa]">
                Request an OTP first. The OTP will be sent to ujangmental@gmail.com.
              </p>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">OTP</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] py-2 pl-10 pr-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                  placeholder="6-digit code"
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] px-3 py-2 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                autoComplete="new-password"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpLoading}
                className="h-11 w-full rounded-none border-2 border-[#2a2a30] bg-[#0f0f13] text-white hover:border-[#00ffff] hover:bg-[#0f0f13] lg:w-auto"
              >
                {otpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </div>
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Confirm New Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] px-3 py-2 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                autoComplete="new-password"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={passwordLoading}
                className="h-11 w-full rounded-none bg-[#ff2d95] font-extrabold uppercase tracking-wider text-white hover:bg-[#e32784] lg:w-auto"
              >
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update
              </Button>
            </div>
          </form>
        )}

        {/* Site Settings Panel */}
        <div className="mb-6 border border-[#2a2a30] bg-[#16161a]/60 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="cursor-pointer group flex-1"
              onClick={() => setSettingsCollapsed(!settingsCollapsed)}
            >
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00ffff] group-hover:text-[#b4ff39] transition-colors">
                Landing Page Settings
                {settingsCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[#a78bfa] group-hover:text-[#b4ff39]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#a78bfa] group-hover:text-[#b4ff39]" />
                )}
              </p>
              {!settingsCollapsed && (
                <p className="mt-1 text-sm text-[#a78bfa]">
                  Customize the title, subtitle, and explicitly select the 6 prompts that appear on the Featured Prompts section on the landing page.
                </p>
              )}
            </div>
          </div>

          {!settingsCollapsed && (
            <form onSubmit={handleSettingsSubmit} className="grid gap-4 max-w-3xl">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Featured Section Title</span>
                <input
                  value={siteSettings.landing_featured_title}
                  onChange={(event) => setSiteSettings(prev => ({ ...prev, landing_featured_title: event.target.value }))}
                  className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] px-3 py-2 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                  placeholder="Featured Prompts"
                  required
                />
              </label>
              <label className="grid gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Featured Section Subtitle</span>
                <input
                  value={siteSettings.landing_featured_subtitle}
                  onChange={(event) => setSiteSettings(prev => ({ ...prev, landing_featured_subtitle: event.target.value }))}
                  className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] px-3 py-2 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                  placeholder="Discover top-rated prompts from the best creators."
                  required
                />
              </label>
              <div className="flex items-end mt-2">
                <Button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-11 w-full rounded-none bg-[#00ffff] font-extrabold uppercase tracking-wider text-black hover:bg-[#00d7d7] lg:w-auto px-8"
                >
                  {settingsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mb-6 border border-[#2a2a30] bg-[#16161a]/60 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="cursor-pointer group flex-1"
              onClick={() => setTaxonomyCollapsed(!taxonomyCollapsed)}
            >
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00ffff] group-hover:text-[#b4ff39] transition-colors">
                Marketplace Taxonomy
                {taxonomyCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[#a78bfa] group-hover:text-[#b4ff39]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#a78bfa] group-hover:text-[#b4ff39]" />
                )}
              </p>
              {!taxonomyCollapsed && (
                <p className="mt-1 text-sm text-[#a78bfa]">
                  Manage the category and AI model options used by marketplace filters and prompt creation.
                </p>
              )}
            </div>
            {!taxonomyCollapsed && (
              <Button
                type="button"
                onClick={loadTaxonomy}
                disabled={taxonomyLoading}
                className="rounded-none border-2 border-[#2a2a30] bg-[#0f0f13] text-white hover:border-[#00ffff] hover:bg-[#0f0f13]"
              >
                <RefreshCw className={cn("h-4 w-4", taxonomyLoading && "animate-spin")} />
                Sync
              </Button>
            )}
          </div>

          {!taxonomyCollapsed && (
            <div className="grid gap-5 lg:grid-cols-2">
            <section className="border border-[#2a2a30] bg-[#0f0f13] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-black uppercase tracking-wider text-[#e0d4ff]">Categories</h2>
                {editingCategoryId && (
                  <Button
                    type="button"
                    onClick={resetCategoryForm}
                    className="h-9 rounded-none border border-[#2a2a30] bg-transparent px-3 text-xs text-[#a78bfa] hover:border-[#ff2d95] hover:bg-transparent hover:text-white"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
              <form onSubmit={handleCategorySubmit} className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Name</span>
                    <input
                      value={categoryForm.name}
                      onChange={(event) => {
                        const name = event.target.value
                        setCategoryForm((current) => ({
                          ...current,
                          name,
                          slug: !current.slug || current.slug === slugify(current.name) ? slugify(name) : current.slug,
                        }))
                      }}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="Image Generation"
                      required
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Slug</span>
                    <input
                      value={categoryForm.slug}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="image-generation"
                      required
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Description</span>
                    <input
                      value={categoryForm.description}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Type</span>
                    <select
                      value={categoryForm.type}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, type: event.target.value as CategoryForm["type"] }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                    >
                      <option value="CURATED" className="bg-[#0a001a]">CURATED</option>
                      <option value="COMMUNITY" className="bg-[#0a001a]">COMMUNITY</option>
                    </select>
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={taxonomySaving}
                  className="h-10 rounded-none bg-[#00ffff] font-extrabold uppercase tracking-wider text-black hover:bg-[#00d7d7]"
                >
                  {editingCategoryId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingCategoryId ? "Update Category" : "Add Category"}
                </Button>
              </form>

              <div className="mt-5 grid gap-2">
                {taxonomyCategories.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border border-[#2a2a30] bg-[#16161a] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{item.name}</p>
                      <p className="truncate font-mono text-xs text-[#a78bfa]">{item.slug}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEditCategory(item)}
                        className="h-9 w-9 rounded-none border border-[#2a2a30] bg-transparent p-0 text-[#a78bfa] hover:border-[#00ffff] hover:bg-transparent hover:text-white"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDeleteCategory(item.id)}
                        disabled={taxonomySaving}
                        className="h-9 w-9 rounded-none border border-[#2a2a30] bg-transparent p-0 text-[#ff2d95] hover:border-[#ff2d95] hover:bg-transparent hover:text-white"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!taxonomyLoading && taxonomyCategories.length === 0 && (
                  <p className="border border-[#2a2a30] p-4 text-sm text-[#a78bfa]">No categories yet.</p>
                )}
              </div>
            </section>

            <section className="border border-[#2a2a30] bg-[#0f0f13] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-black uppercase tracking-wider text-[#e0d4ff]">AI Models</h2>
                {editingModelId && (
                  <Button
                    type="button"
                    onClick={resetModelForm}
                    className="h-9 rounded-none border border-[#2a2a30] bg-transparent px-3 text-xs text-[#a78bfa] hover:border-[#ff2d95] hover:bg-transparent hover:text-white"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
              <form onSubmit={handleModelSubmit} className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Name</span>
                    <input
                      value={modelForm.name}
                      onChange={(event) => {
                        const name = event.target.value
                        setModelForm((current) => ({
                          ...current,
                          name,
                          slug: !current.slug || current.slug === slugify(current.name) ? slugify(name) : current.slug,
                        }))
                      }}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="Midjourney v6"
                      required
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Slug</span>
                    <input
                      value={modelForm.slug}
                      onChange={(event) => setModelForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="midjourney-v6"
                      required
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Category</span>
                    <select
                      value={modelForm.category_id}
                      onChange={(event) => setModelForm((current) => ({ ...current, category_id: event.target.value }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      required
                    >
                      <option value="" className="bg-[#0a001a]">Select category</option>
                      {taxonomyCategories.map((item) => (
                        <option key={item.id} value={item.id} className="bg-[#0a001a]">{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Description</span>
                    <input
                      value={modelForm.description}
                      onChange={(event) => setModelForm((current) => ({ ...current, description: event.target.value }))}
                      className="h-10 border-2 border-[#2a2a30] bg-[#16161a] px-3 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={taxonomySaving || taxonomyCategories.length === 0}
                  className="h-10 rounded-none bg-[#b4ff39] font-extrabold uppercase tracking-wider text-black hover:bg-[#9de22f]"
                >
                  {editingModelId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingModelId ? "Update AI Model" : "Add AI Model"}
                </Button>
              </form>

              <div className="mt-5 grid gap-2">
                {taxonomyModels.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border border-[#2a2a30] bg-[#16161a] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{item.name}</p>
                      <p className="truncate font-mono text-xs text-[#a78bfa]">
                        {item.category?.name || taxonomyCategories.find((categoryItem) => categoryItem.id === item.category_id)?.name || "No category"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEditModel(item)}
                        className="h-9 w-9 rounded-none border border-[#2a2a30] bg-transparent p-0 text-[#a78bfa] hover:border-[#00ffff] hover:bg-transparent hover:text-white"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDeleteModel(item.id)}
                        disabled={taxonomySaving}
                        className="h-9 w-9 rounded-none border border-[#2a2a30] bg-transparent p-0 text-[#ff2d95] hover:border-[#ff2d95] hover:bg-transparent hover:text-white"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!taxonomyLoading && taxonomyModels.length === 0 && (
                  <p className="border border-[#2a2a30] p-4 text-sm text-[#a78bfa]">No AI models yet.</p>
                )}
              </div>
            </section>
          </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border border-[#2a2a30] bg-[#16161a]/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Total Prompts</span>
              <FileText className="h-5 w-5 text-[#00ffff]" />
            </div>
            <p className="font-display text-3xl font-black text-white">{prompts.length}</p>
          </div>
          <div className="border border-[#2a2a30] bg-[#16161a]/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Curated</span>
              <Sparkles className="h-5 w-5 text-[#b4ff39]" />
            </div>
            <p className="font-display text-3xl font-black text-[#b4ff39]">{curatedCount}</p>
          </div>
          <div className="border border-[#2a2a30] bg-[#16161a]/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Community</span>
              <Users className="h-5 w-5 text-[#ff2d95]" />
            </div>
            <p className="font-display text-3xl font-black text-[#ff2d95]">{communityCount}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 border border-[#2a2a30] bg-[#16161a]/60 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78bfa]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, creator, category, or model"
              className="h-11 w-full border-2 border-[#2a2a30] bg-[#0f0f13] py-2 pl-10 pr-3 text-sm text-white placeholder:text-[#a78bfa]/50 focus:border-[#00ffff] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-auto">
            {(["all", "curated", "community"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "h-11 border-2 px-3 text-xs font-black uppercase tracking-wider transition-all",
                  statusFilter === status
                    ? "border-[#00ffff] bg-[#00ffff] text-black"
                    : "border-[#2a2a30] text-[#a78bfa] hover:border-[#00ffff] hover:text-white",
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden border border-[#2a2a30] bg-[#16161a]/60">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#ff2d95]" />
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center">
              <ShieldCheck className="h-10 w-10 text-[#a78bfa]" />
              <p className="font-display text-lg font-black uppercase tracking-wider text-[#e0d4ff]">
                No prompts found
              </p>
              <p className="max-w-sm text-sm text-[#a78bfa]">
                Try another search query or curation filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-[#2a2a30] bg-[#0f0f13] text-xs uppercase tracking-widest text-[#a78bfa]">
                  <tr>
                    <th className="px-4 py-4 font-bold">Prompt</th>
                    <th className="px-4 py-4 font-bold">Creator</th>
                    <th className="px-4 py-4 font-bold">Category</th>
                    <th className="px-4 py-4 font-bold">Price</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 text-center font-bold">Featured</th>
                    <th className="px-4 py-4 text-right font-bold">Curate</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPrompts.map((prompt) => (
                    <tr key={prompt.id} className="border-b border-[#2a2a30]/70 hover:bg-white/[0.03]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-[#2a2a30] bg-[#0f0f13]">
                            {prompt.image ? (
                              <img src={prompt.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="h-5 w-5 text-[#a78bfa]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/prompt/${prompt.id}`}
                              className="flex items-center gap-2 font-bold text-[#e0d4ff] hover:text-[#00ffff]"
                            >
                              <span className="truncate">{prompt.title}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </Link>
                            <p className="mt-1 max-w-[360px] truncate text-xs text-[#a78bfa]/70">
                              {prompt.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-[#a78bfa]">{prompt.creator}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-white">{prompt.category}</span>
                          <span className="text-xs text-[#a78bfa]/70">{prompt.model}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#00ffff]">
                        {prompt.price.toFixed(3)} {prompt.currency}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={cn(
                              "rounded-none border font-black uppercase",
                              prompt.isCurated
                                ? "border-[#b4ff39]/30 bg-[#b4ff39]/15 text-[#b4ff39]"
                                : "border-[#ff2d95]/30 bg-[#ff2d95]/15 text-[#ff2d95]",
                            )}
                          >
                            {prompt.isCurated ? "Curated" : "Community"}
                          </Badge>
                          {prompt.isNsfw && (
                            <Badge className="rounded-none border border-[#ff6b2b]/30 bg-[#ff6b2b]/15 font-black uppercase text-[#ff6b2b]">
                              NSFW
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <Switch
                            checked={siteSettings.landing_featured_prompt_ids.includes(prompt.id)}
                            disabled={!isConnected || updatingId === prompt.id}
                            onCheckedChange={(checked) => handleFeaturedChange(prompt.id, checked)}
                            aria-label={`Set ${prompt.title} featured status`}
                            className="h-6 w-11 data-[state=checked]:bg-[#00ffff] data-[state=unchecked]:bg-[#2a2a30]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {updatingId === prompt.id && <Loader2 className="h-4 w-4 animate-spin text-[#00ffff]" />}
                          <Switch
                            checked={prompt.isCurated}
                            disabled={!isConnected || updatingId === prompt.id}
                            onCheckedChange={(checked) => handleCurationChange(prompt.id, checked)}
                            aria-label={`Set ${prompt.title} curation status`}
                            className="h-6 w-11 data-[state=checked]:bg-[#b4ff39] data-[state=unchecked]:bg-[#2a2a30]"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && filteredPrompts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#2a2a30] bg-[#0f0f13] p-4 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Show</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 border-2 border-[#2a2a30] bg-[#16161a] px-2 text-sm text-white focus:border-[#00ffff] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Entries</span>
              </div>
              
              <div className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
                Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalFiltered)} of {totalFiltered} entries
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-9 rounded-none border border-[#2a2a30] bg-transparent px-3 text-xs text-[#a78bfa] hover:border-[#00ffff] hover:bg-transparent hover:text-white disabled:opacity-50"
                >
                  Prev
                </Button>
                
                <div className="flex items-center justify-center px-3 text-sm font-bold text-white bg-[#2a2a30]/50 border border-[#2a2a30]">
                  {currentPage} / {totalPages}
                </div>

                <Button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-9 rounded-none border border-[#2a2a30] bg-transparent px-3 text-xs text-[#a78bfa] hover:border-[#00ffff] hover:bg-transparent hover:text-white disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
