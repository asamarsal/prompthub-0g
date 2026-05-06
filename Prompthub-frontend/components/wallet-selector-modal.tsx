"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface WalletSelectorModalProps {
    open: boolean
    onClose: () => void
    onConnected: (address: string) => void
}

export function WalletSelectorModal({
    open,
    onClose,
    onConnected,
}: WalletSelectorModalProps) {
    const [connecting, setConnecting] = useState(false)

    if (!open) return null

    const isMetaMaskInstalled = typeof window !== "undefined" && !!(window as any).ethereum

    const handleConnect = async () => {
        if (!isMetaMaskInstalled) {
            window.open("https://metamask.io/download/", "_blank")
            return
        }

        setConnecting(true)
        try {
            const ethereum = (window as any).ethereum
            try {
                await ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }],
                })
            } catch (err: any) {
                if (err?.code === 4001) throw err
            }
            const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" })
            const address = accounts?.[0]

            if (address) {
                onConnected(address)
                onClose()
            } else {
                alert("Could not retrieve wallet address.")
            }
        } catch (err) {
            console.error("Connect failed:", err)
            alert("Connection failed. Please try again.")
        } finally {
            setConnecting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#0a001a] border-2 border-[#2a2a30] shadow-[8px_8px_0_0_#2a2a30] w-full max-w-sm mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-extrabold text-[#00ffff] uppercase tracking-widest">
                            Connect Wallet
                        </h2>
                        <p className="text-xs text-[#a78bfa] mt-1">
                            Connect via MetaMask or compatible EVM wallet
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[#a78bfa] hover:text-[#ff2d95] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Wallet option */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className={`flex items-center gap-4 p-4 border-2 text-left transition-all relative group ${isMetaMaskInstalled
                            ? "border-[#2a2a30] hover:border-[#00ffff] hover:shadow-[4px_4px_0_0_#00ffff] hover:-translate-y-0.5"
                            : "border-[#1a1a20] opacity-60 hover:border-[#a78bfa] hover:opacity-80"
                            }`}
                    >
                        {/* Wallet icon */}
                        <div className="w-10 h-10 flex items-center justify-center border border-[#2a2a30] bg-[#160f24] shrink-0 overflow-hidden">
                            <img
                                src="/icon/metamask-icon.png"
                                alt="MetaMask"
                                className="w-7 h-7 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none"
                                }}
                            />
                        </div>

                        {/* Wallet info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-[#e0d4ff]">
                                    MetaMask
                                </span>
                                {isMetaMaskInstalled && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#b4ff39]/20 text-[#b4ff39] font-bold uppercase tracking-wider border border-[#b4ff39]/30">
                                        Installed
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#a78bfa] mt-0.5">
                                {isMetaMaskInstalled ? "EVM-compatible wallet" : "Click to install →"}
                            </p>
                        </div>

                        {/* Connecting spinner */}
                        {connecting && (
                            <div className="w-4 h-4 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
                        )}
                    </button>
                </div>

                <div className="mt-6 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#a78bfa]">Secured by</span>
                        <img src="/icon/prompthub-logo.png" alt="0G Network" className="h-3.5 object-contain" />
                    </div>
                    <p className="text-[9px] text-[#a78bfa]/40 text-center font-mono mt-1">
                        By connecting, you agree to our Terms of Service
                    </p>
                </div>
            </div>
        </div>
    )
}
