"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWallet, truncateAddress } from "@/lib/wallet-context"
import { Check, Loader2, ExternalLink, Wallet } from "lucide-react"
import { toast } from "sonner"

const wallets = [
  { id: "metamask", name: "MetaMask", recommended: true },
]

export function ConnectWalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isConnected, isConnecting, address, balance, connect, disconnect } = useWallet()

  const handleConnect = async (walletId: string) => {
    try {
      await connect(walletId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect wallet")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card/95 border border-border backdrop-blur-xl max-w-md text-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text-holographic">
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
        </DialogHeader>

        {isConnected ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3 p-4 rounded-xl glass-iridescent">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ffff] to-[#b4ff39] flex items-center justify-center glow-cyan">
                <Check className="w-5 h-5 text-[#0a001a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#b4ff39]">Connected</p>
                <p className="text-xs text-[#a78bfa] truncate font-mono">{truncateAddress(address!)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl glass">
              <span className="text-sm text-[#a78bfa]">Balance</span>
              <span className="text-lg font-extrabold text-[#00ffff]">{balance.toFixed(4)} 0G</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl glass">
              <span className="text-sm text-[#a78bfa]">Network</span>
              <span className="text-sm font-bold text-[#ff6b2b] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff6b2b] animate-pulse" />
                0G Testnet
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { disconnect(); onClose() }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[rgba(180,120,255,0.2)] text-sm font-semibold text-[#a78bfa] hover:text-[#ff3366] hover:border-[#ff3366]/30 transition-all"
              >
                Disconnect
              </button>
              <button
                onClick={onClose}
                className="flex-1 btn-gradient px-4 py-2.5 rounded-lg text-sm font-bold text-white"
              >
                View Dashboard
              </button>
            </div>
          </div>
        ) : isConnecting ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-[#ff2d95] animate-spin" />
              <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-[#00ffff]/20 animate-ping" />
            </div>
            <p className="text-sm text-[#a78bfa]">Connecting to wallet...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-[#a78bfa]">
              Choose a wallet to connect to PromptHub
            </p>
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => handleConnect(w.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(180,120,255,0.15)] bg-[rgba(180,120,255,0.04)] hover:bg-[rgba(255,45,149,0.08)] hover:border-[rgba(255,45,149,0.3)] transition-all group"
              >
                <div className="w-10 h-10 rounded-lg glass-iridescent flex items-center justify-center group-hover:glow-pink transition-shadow">
                  <Wallet className="w-5 h-5 text-[#ff2d95]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-[#e0d4ff]">{w.name}</p>
                  {w.recommended && (
                    <p className="text-xs text-[#00ffff] font-semibold">Recommended</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-[#a78bfa] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
