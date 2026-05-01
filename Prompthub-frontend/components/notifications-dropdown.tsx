"use client"

import { useEffect, useRef } from "react"
import { useNotifications } from "@/hooks/use-notifications"
import { ShoppingCart, Star, Bell, TrendingDown } from "lucide-react"

const iconMap: Record<string, any> = {
  purchase: ShoppingCart,
  review: Star,
  system: Bell,
  "price-drop": TrendingDown,
}

const colorMap: Record<string, string> = {
  purchase: "text-[#00ffff]",
  review: "text-[#ff6b2b]",
  system: "text-[#a855f7]",
  "price-drop": "text-[#b4ff39]",
}

export function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, markAsRead } = useNotifications()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  useEffect(() => {
    // Mark as read when opened
    markAsRead();
  }, [])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+12px)] w-80 bg-[#0f0f13] border-2 border-[#2a2a30] rounded-xl shadow-[6px_6px_0_0_#00ffff] z-50 flex flex-col"
      role="menu"
      aria-label="Notifications"
    >
      <div className="px-4 py-3 border-b-2 border-[#2a2a30] bg-[#1a1a20]">
        <h3 className="text-sm font-black text-[#00ffff] uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-4 h-4" strokeWidth={3} /> Notifications
        </h3>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white/40 uppercase tracking-wider">No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = iconMap[n.type] || Bell
            const color = colorMap[n.type] || "text-[#a855f7]"

            // Extract title and message from data obj if exist
            const title = n.data?.title || 'Notification'
            const message = n.data?.message || ''
            const timestamp = new Date(n.created_at).toLocaleString()

            return (
              <button
                key={n.id}
                className="w-full flex items-start gap-4 p-4 hover:bg-[#1a1a20] transition-colors text-left border-b border-[#2a2a30]/50 last:border-0"
                role="menuitem"
              >
                <div className={`mt-0.5 p-2 rounded-full bg-[#1a1a20] border border-[#2a2a30] ${color}`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white flex items-center justify-between gap-2">
                    <span className="truncate">{title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#ff2d95] shadow-[0_0_8px_#ff2d95] animate-pulse shrink-0" />}
                  </p>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">{message}</p>
                  <p className="text-[10px] text-white/30 mt-2 font-mono uppercase tracking-wider">{timestamp}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
