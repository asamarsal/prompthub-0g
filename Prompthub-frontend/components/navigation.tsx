"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, Search, LayoutDashboard, Plus, Wallet, Copy, Check, Palette, Trophy, User, Settings, ChevronDown, Bell, MessageSquare, Heart, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWallet, truncateAddress, ROLE_LABELS, ROLE_ICONS, type UserRole } from "@/lib/wallet-context"
import { RoleOnboardingModal } from "@/components/role-onboarding-modal"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { ThemeToggle } from "@/components/theme-toggle"
import { useNotifications } from "@/hooks/use-notifications"
import { toast } from "sonner"

const navLinks = [
  { href: "/marketplace", label: "MARKETPLACE", icon: Search },
  { href: "/hire", label: "HIRE", icon: Palette },
  { href: "/contests", label: "CONTESTS", icon: Trophy },
  { href: "/messages", label: "MESSAGES", icon: MessageSquare },
  { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/create", label: "CREATE", icon: Plus },
]

export function Navigation() {
  const pathname = usePathname()
  const { isConnected, address, balance, disconnect, connect, profile, needsOnboarding, switchRole, saveProfile } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { unreadCount } = useNotifications()

  useEffect(() => setMounted(true), [])

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    toast.success("Wallet address copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSwitchRole = (role: UserRole) => {
    switchRole(role)
    setShowDropdown(false)
  }

  // Show onboarding if needed
  const onboardingOpen = showOnboarding || (isConnected && needsOnboarding)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/50 dark:border-white/5" style={{ background: 'var(--nav-bg)' }} role="navigation" aria-label="Main navigation">
        <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0" aria-label="PromptHub Home">
            <img src="/icon/prompthub-logo.png" alt="PromptHub Logo" className="h-8 max-w-[200px] w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8 h-full">
            {navLinks.filter(l => isConnected || (l.href !== "/dashboard" && l.href !== "/messages")).map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 text-sm font-display font-bold tracking-wider transition-all uppercase h-full px-2",
                    isActive ? "text-[#00ffff]" : "text-muted-foreground hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00ffff] shadow-[0_-5px_20px_rgba(0,255,255,0.6)]" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isConnected ? (
              <div className="flex items-center gap-3">
                {/* Notifications Button */}
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={cn(
                      "p-2.5 border-2 rounded-xl transition-all relative flex items-center justify-center group shadow-md",
                      showNotifications ? "bg-[#1a1a20] border-[#00ffff] text-[#00ffff]" : "bg-[#111] border-[#2a2a30] hover:border-[#00ffff] hover:bg-[#1a1a20] text-white/70 hover:text-[#00ffff]"
                    )}
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 transition-colors" strokeWidth={2.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ff2d95] shadow-[0_0_10px_#ff2d95] border-2 border-background flex items-center justify-center text-[10px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationsDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>

                {/* Profile button */}
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 bg-[#111] border-2 transition-all group rounded-xl shadow-md",
                    showDropdown ? "border-[#a855f7]" : "border-[#2a2a30] hover:border-[#a855f7] hover:bg-[#1a1a20]"
                  )}
                >
                  {/* Avatar bubble */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#00ffff] flex items-center justify-center text-sm font-black text-white shrink-0 overflow-hidden shadow-inner">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : profile.name ? (
                      profile.name[0].toUpperCase()
                    ) : (
                      <User className="w-4 h-4" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex flex-col items-start pr-1">
                    <span className="text-sm font-bold text-white leading-none">
                      {profile.name || truncateAddress(address!)}
                    </span>
                    <span className="text-[10px] text-[#a855f7] font-bold leading-none mt-1 uppercase tracking-wider">
                      {profile.roles.length > 0 ? `${ROLE_ICONS[profile.activeRole]} ${ROLE_LABELS[profile.activeRole]}` : "Set up profile →"}
                    </span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", showDropdown && "rotate-180")} strokeWidth={2.5} />
                </button>

                {/* Profile Dropdown */}
                {showDropdown && (
                  <div className="absolute right-0 top-[calc(100%+12px)] w-64 bg-[#0f0f13] border-2 border-[#2a2a30] rounded-xl shadow-[6px_6px_0_0_#a855f7] z-50 flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b-2 border-[#2a2a30] bg-[#1a1a20] rounded-t-xl">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] text-white/50 font-mono uppercase tracking-widest font-bold">Connected as</span>
                        <button onClick={copyAddress} title="Copy address" className="p-0.5 text-white/30 hover:text-[#00ffff] transition-colors">
                          {copied ? <Check className="w-3.5 h-3.5 text-[#b4ff39]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#e0d4ff] font-mono block">{truncateAddress(address!)}</span>
                    </div>

                    {/* Balances */}
                    <div className="px-4 py-2.5 border-b border-[#2a2a30] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40 uppercase tracking-wider">0G</span>
                        <span className="text-sm font-extrabold font-mono text-[#00ffff]">{balance.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Active Role + Switch */}
                    <div className="px-4 py-2.5 border-b border-[#2a2a30]">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Active Role</p>
                      {profile.roles.length === 0 ? (
                        <button
                          onClick={() => { setShowOnboarding(true); setShowDropdown(false) }}
                          className="w-full text-left text-xs font-bold text-[#a855f7] hover:text-white transition-colors"
                        >
                          ⚡ Set up your profile →
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {(["artist", "brand", "buyer"] as UserRole[]).map(role => {
                            const isActive = profile.activeRole === role
                            const hasRole = profile.roles.includes(role)
                            if (!hasRole) return null
                            return (
                              <button
                                key={role}
                                onClick={() => handleSwitchRole(role)}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 text-xs font-bold transition-all border",
                                  isActive
                                    ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                                    : "border-transparent text-white/40 hover:text-white hover:border-white/20"
                                )}
                              >
                                <span>{ROLE_ICONS[role]}</span>
                                <span className="uppercase tracking-wide">{ROLE_LABELS[role]}</span>
                                {isActive && <span className="ml-auto text-[9px] font-mono">ACTIVE</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {profile.roles.includes("artist") && (
                        <div className="mt-3 pt-3 border-t border-[#2a2a30] flex items-center justify-between group">
                          <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1.5 transition-colors group-hover:text-white/80">
                            Available for hire
                          </span>
                          <button
                            onClick={() => {
                              const newStatus = !profile.isAvailableForFreelance;
                              saveProfile({ ...profile, isAvailableForFreelance: newStatus });
                              if (newStatus) {
                                toast.success("Status updated to Available!");
                              } else {
                                toast("You are now taking a break.");
                              }
                            }}
                            title={profile.isAvailableForFreelance ? "Set status to BUSY" : "Set status to AVAILABLE"}
                            className={cn(
                              "w-9 h-5 rounded-full relative transition-colors shadow-inner",
                              profile.isAvailableForFreelance ? "bg-[#b4ff39]" : "bg-[#2a2a30]"
                            )}
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-md",
                                profile.isAvailableForFreelance ? "translate-x-4" : "translate-x-0.5"
                              )}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="flex flex-col py-1">
                      <Link
                        href={mounted && address ? `/profile/${address}` : "#"}
                        onClick={(e) => {
                          if (!mounted || !address) e.preventDefault()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <User className="w-4 h-4" /> View My Profile
                      </Link>
                      <Link
                        href={mounted && address ? `/profile/${address}?tab=collections` : "#"}
                        onClick={(e) => {
                          if (!mounted || !address) e.preventDefault()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Heart className="w-4 h-4 text-[#ff2d95]" /> Saved Collections
                      </Link>
                      <Link
                        href={mounted && address ? `/profile/${address}?tab=purchased` : "#"}
                        onClick={(e) => {
                          if (!mounted || !address) e.preventDefault()
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#00ffff]" /> Purchased Prompts
                      </Link>
                      <button
                        onClick={() => { setShowOnboarding(true); setShowDropdown(false) }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <Settings className="w-4 h-4" /> Edit Profile / Roles
                      </button>
                      <button
                        onClick={() => { disconnect(); setShowDropdown(false) }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-[#ff2d95] hover:bg-[#ff2d95]/10 transition-colors text-left"
                      >
                        <X className="w-4 h-4" /> Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => connect()}
                className="flex items-center gap-2 px-4 py-2 bg-[#121214] border border-[#222] hover:border-[#a855f7] transition-all text-sm font-bold text-white group"
                aria-label="Connect 0G Wallet"
              >
                <Wallet className="w-4 h-4 text-white/50 group-hover:text-[#a855f7] transition-colors" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-[#00ffff]" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 dark:border-white/5 backdrop-blur-md" style={{ background: 'var(--nav-bg)' }}>
            <div className="flex flex-col p-4 gap-2">
              <div className="flex items-center justify-between px-4 py-2 mb-2">
                <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-widest">Theme</span>
                <ThemeToggle />
              </div>
              {navLinks.filter(l => isConnected || (l.href !== "/dashboard" && l.href !== "/messages")).map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-display font-bold tracking-widest uppercase border-l-2 transition-colors",
                      isActive ? "text-[#00ffff] border-[#00ffff] bg-[#00ffff]/5" : "text-muted-foreground border-transparent hover:text-white hover:border-white/10"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}
              <div className="border-t border-white/5 my-2 mx-4" />
              {isConnected ? (
                <div className="flex flex-col gap-1 px-4 py-3 bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00ffff] flex items-center justify-center text-sm font-extrabold text-white">
                      {profile.name ? profile.name[0].toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{profile.name || truncateAddress(address!)}</p>
                      {profile.roles.length > 0 && <p className="text-[11px] text-[#a855f7]">{ROLE_ICONS[profile.activeRole]} {ROLE_LABELS[profile.activeRole]}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-display text-[#00ffff] font-extrabold">{balance.toFixed(4)} 0G</span>
                  <span className="text-xs font-mono text-muted-foreground">{truncateAddress(address!)}</span>
                  <button onClick={() => { setMobileOpen(false); setShowOnboarding(true) }} className="text-xs text-[#a855f7] hover:text-white text-left py-1 mt-1 transition-colors">⚙ Edit Profile</button>
                  <Link
                    href={mounted && address ? `/profile/${address}?tab=collections` : "#"}
                    onClick={() => setMobileOpen(false)}
                    className="text-xs text-white/60 hover:text-white text-left py-1 transition-colors flex items-center gap-2"
                  >
                    <Heart className="w-3 h-3 text-[#ff2d95]" /> My Collections
                  </Link>
                  <button onClick={() => { disconnect(); setMobileOpen(false) }} className="text-xs font-bold text-[#ff2d95] text-left py-1 uppercase tracking-widest transition-colors">Disconnect</button>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); connect() }} className="flex items-center gap-3 px-4 py-3 text-sm font-display font-bold tracking-widest text-muted-foreground hover:text-white uppercase transition-colors w-full text-left">
                  <Wallet className="w-4 h-4" /> Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Click outside to close dropdown */}
      {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}

      {/* Onboarding modal */}
      <RoleOnboardingModal open={onboardingOpen} onClose={() => setShowOnboarding(false)} />
    </>
  )
}
