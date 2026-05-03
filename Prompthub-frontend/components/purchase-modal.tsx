"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Loader2, ExternalLink, Download, LayoutDashboard, Share2, XCircle } from "lucide-react"
import type { Prompt } from "@/lib/mock-data"
import { useWallet } from "@/lib/wallet-context"
import { parseEther } from "ethers"
import { getMarketplaceContract } from "@/lib/evm"
import { CHAIN_CONFIG } from "@/lib/contracts"
import { recordTransaction, submitReview, fetchPremiumContent } from "@/lib/api"
import { toast } from "sonner"
import { Star } from "lucide-react"

type PurchaseState = "confirm" | "processing" | "success" | "failed" | "reviewing"
type Currency = "0G"

export function PurchaseModal({
  open,
  onClose,
  prompt,
}: {
  open: boolean
  onClose: () => void
  prompt: Prompt
}) {
  const { isConnected, address } = useWallet()
  const [state, setState] = useState<PurchaseState>("confirm")
  const [txId, setTxId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>("0G")

  // Review state
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  // In the Smart Contract, fees are deducted FROM the price.
  // So the total to pay is exactly prompt.price.
  const total = prompt.price
  const platformFee = total * 0.025
  const royaltyFee = total * (prompt.royalty / 100)
  const sellerReceives = total - platformFee - royaltyFee

  const isSelfPurchase = !!address && !!prompt.creator && address.toLowerCase() === prompt.creator.toLowerCase()

  const handleConfirm = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.")
      return
    }

    if (isSelfPurchase) {
      alert("You cannot purchase your own prompt.")
      return
    }

    if (prompt.contract_id === undefined || prompt.contract_id === null) {
      alert("This prompt is not listed on-chain yet.")
      return
    }

    setState("processing")

    try {
      if (!prompt.contract_id) throw new Error("Missing on-chain token id");
      const marketplace = await getMarketplaceContract();
      const value = parseEther(String(total));
      const tx = await marketplace.buyPrompt(prompt.contract_id, { value });
      setTxId(tx.hash);
      toast.success("Transaction broadcasted!");
      await tx.wait();
      setState("success");

      try {
        await recordTransaction(String(prompt.id), tx.hash);
      } catch (error) {
        console.error("Failed to record transaction on backend:", error);
      }
    } catch (e: any) {
      console.error("Purchase error detailed:", e)
      setErrorMsg(e?.shortMessage || e?.message || "Unknown error")
      setState("failed")
    }
  }

  const handleDownload = async () => {
    try {
      const res = await fetchPremiumContent(String(prompt.id), { address })
      const blob = new Blob([res.original_content], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${prompt.title.replace(/\s+/g, '_')}_prompt.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Download started!")
    } catch (error) {
      console.error("Download failed:", error)
      toast.error("Failed to download prompt content.")
    }
  }

  const handleSubmitReview = async () => {
    if (rating === 0) return
    setSubmittingReview(true)
    try {
      // Submit on-chain rating (1-5 stars -> scale to 10-50)
      if (prompt.contract_id) {
        try {
          const marketplace = await getMarketplaceContract()
          const tx = await marketplace.rateCreator(prompt.contract_id, rating * 10)
          await tx.wait()
        } catch (e) {
          console.error("On-chain rating failed:", e)
        }
      }
      
      await submitReview(String(prompt.id), rating, comment)
      setReviewSubmitted(true)
      setState("success")
      toast.success("Review submitted on-chain!")
    } catch (error) {
      console.error("Review failed:", error)
      toast.error("Failed to submit review.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleClose = () => {
    if (state === "success") {
      window.location.reload()
    } else {
      setState("confirm")
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-2 border-border max-w-md text-foreground shadow-[8px_8px_0_0_var(--shadow-neo)] p-0 overflow-hidden">
        {state === "success" || state === "reviewing" ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 border-2 border-[#b4ff39] flex items-center justify-center bg-[#b4ff39]/10 shadow-[4px_4px_0_0_#b4ff39]">
              <Check className="w-8 h-8 text-[#b4ff39]" />
            </div>
            <h3 className="text-xl font-extrabold text-[#e0d4ff] uppercase tracking-wider mt-2">Transaction Broadcasted</h3>
            <p className="text-sm text-[#a78bfa] text-center font-medium">
              Your purchase for &quot;{prompt.title}&quot; has been sent to the 0G network.
              It may take a few minutes to confirm and unlock the content.
            </p>
            {txId && (
              <p className="text-xs text-[#b4ff39] font-mono mt-2 p-2 border border-[#b4ff39]/30 bg-[#b4ff39]/5">
                TXID: {txId.slice(0, 8)}...{txId.slice(-6)}
                <a href={`${CHAIN_CONFIG.explorer}/tx/${txId}`} target="_blank" rel="noreferrer" className="ml-2 text-[#ff2d95] hover:underline" aria-label="View transaction">
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            )}

            {state === "success" ? (
              <>
                <div className="flex gap-3 w-full mt-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-[#00ffff] border-2 border-[#00ffff] text-black px-4 py-3 text-sm font-extrabold shadow-[4px_4px_0_0_transparent] hover:shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 transition-all uppercase items-center justify-center flex gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button onClick={handleClose} className="flex-1 bg-transparent border-2 border-[#2a2a30] text-[#e0d4ff] px-4 py-3 text-sm font-extrabold hover:border-[#ff2d95] hover:shadow-[4px_4px_0_0_#ff2d95] hover:-translate-y-1 transition-all uppercase items-center justify-center flex gap-2">
                    <LayoutDashboard className="w-4 h-4 text-[#ff2d95]" />
                    Dashboard
                  </button>
                </div>
                {!reviewSubmitted && (
                  <button
                    onClick={() => setState("reviewing")}
                    className="text-xs text-[#a78bfa] border-b border-transparent hover:border-[#ff2d95] hover:text-[#ff2d95] mt-2 transition-all font-bold uppercase tracking-widest flex items-center gap-1 pb-0.5"
                  >
                    <Star className="w-3 h-3" />
                    Rate & Review
                  </button>
                )}
              </>
            ) : (
              <div className="w-full mt-2 p-4 bg-[#160f24] border-2 border-[#2a2a30]">
                <p className="text-xs font-bold uppercase tracking-widest text-[#00ffff] mb-3">Rate & Review</p>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star className={`w-6 h-6 ${s <= rating ? "fill-[#ff2d95] text-[#ff2d95]" : "text-[#2a2a30]"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-black/50 border border-[#2a2a30] text-sm p-3 focus:border-[#ff2d95] outline-none text-[#e0d4ff] placeholder:text-[#a78bfa]/30"
                  placeholder="Share your experience..."
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setState("success")}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-widest border border-[#2a2a30] text-[#a78bfa] hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    disabled={rating === 0 || submittingReview}
                    onClick={handleSubmitReview}
                    className="flex-1 bg-[#ff2d95] py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-30"
                  >
                    {submittingReview ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : state === "failed" ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center bg-red-500/10 shadow-[4px_4px_0_0_#ef4444]">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-red-400 uppercase tracking-wider mt-2">Transaction Failed</h3>
            <p className="text-sm text-[#a78bfa] text-center font-medium">
              {errorMsg ? errorMsg.substring(0, 200) : "An unknown error occurred during the transaction."}
            </p>
            {txId && (
              <p className="text-xs text-red-400 font-mono mt-2 p-2 border border-red-500/30 bg-red-500/5">
                TXID: {txId.slice(0, 8)}...{txId.slice(-6)}
                <a href={`${CHAIN_CONFIG.explorer}/tx/${txId}`} target="_blank" rel="noreferrer" className="ml-2 text-[#ff2d95] hover:underline">
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            )}
            <button
              onClick={() => { setState("confirm"); setErrorMsg(null); }}
              className="w-full bg-[#ff2d95] border-2 border-[#ff2d95] text-white px-4 py-3 text-sm font-extrabold uppercase mt-4 hover:bg-transparent hover:text-[#ff2d95] transition-all"
            >
              Try Again
            </button>
          </div>
        ) : state === "processing" ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="relative mb-2">
              <Loader2 className="w-10 h-10 text-[#00ffff] animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-2 border-[#ff2d95]/40 animate-ping rotate-45" />
            </div>
            <h3 className="text-lg font-extrabold text-[#e0d4ff] uppercase tracking-widest">Processing</h3>
            <p className="text-sm text-[#a78bfa] text-center font-medium">
              Please confirm the transaction in your wallet extension...
            </p>
            <div className="w-full h-2 border border-[#2a2a30] bg-[#160f24] overflow-hidden mt-4">
              <div className="h-full bg-[#00ffff] animate-shimmer" style={{ width: "60%" }} />
            </div>
          </div>
        ) : (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-extrabold text-[#00ffff] uppercase tracking-widest border-l-4 border-[#00ffff] pl-3">Confirm Purchase</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-5">
              {/* Prompt preview */}
              <div className="flex items-center gap-3 p-3 bg-[#160f24]/60 border-2 border-[#2a2a30]">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#ff2d95]/20 via-[#a855f7]/15 to-[#00ffff]/20 flex items-center justify-center shrink-0 border border-[rgba(180,120,255,0.15)]">
                  <span className="text-[#00ffff] text-sm font-bold font-mono">
                    {prompt.category === "Image Generation" ? "IMG" : prompt.category === "Code Generation" ? "< />" : "TXT"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#e0d4ff] truncate">{prompt.title}</p>
                  <p className="text-xs text-[#a78bfa]">by {prompt.creatorName}</p>
                </div>
              </div>

              {/* Currency Selection */}
              <div className="flex bg-[#161218] border-2 border-[#2a2a30] p-1 gap-1">
                <button
                  onClick={() => setCurrency("0G")}
                  className={`flex-1 py-2 text-sm font-extrabold uppercase tracking-widest transition-all ${currency === "0G" ? "bg-[#00ffff] text-black shadow-[2px_2px_0_0_#fff]" : "text-[#a78bfa] hover:text-white"
                    }`}
                >
                  Pay with 0G
                </button>
              </div>

              {/* Price breakdown */}
              <div className="flex flex-col gap-2 p-4 bg-[#161218] border-2 border-[#2a2a30]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#a78bfa] font-bold">Total Price</span>
                  <span className="text-[#00ffff] font-mono font-bold">{total} {currency}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1 text-white/40 italic">
                  <span>- Platform Fee (2.5%)</span>
                  <span>{platformFee.toFixed(6)} {currency}</span>
                </div>
                {prompt.royalty > 0 && (
                  <div className="flex justify-between text-[11px] text-white/40 italic">
                    <span>- Royalty ({prompt.royalty}%)</span>
                    <span>{royaltyFee.toFixed(6)} {currency}</span>
                  </div>
                )}
                <div className="border-t border-[#2a2a30] mt-2 pt-2 flex justify-between items-center text-sm">
                  <span className="text-[#e0d4ff] font-bold uppercase tracking-wider">Artist Receives</span>
                  <span className="font-extrabold text-[#b4ff39]">{sellerReceives.toFixed(6)} {currency}</span>
                </div>
              </div>

              {/* Network info */}
              <div className="flex items-center justify-between text-xs text-[#a78bfa] font-bold uppercase tracking-wider mt-1 border-l-2 border-[#ff6b2b] pl-2">
                <span>Network Target</span>
                <span className="flex items-center gap-1 font-mono text-[#ff6b2b]">
                  0G Testnet
                </span>
              </div>

              {/* Unlisted Warning */}
              {(!prompt.contract_id || prompt.contract_id === 0) && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-400 text-[11px] font-bold uppercase leading-tight">
                  <p>Warning: This prompt is not listed on-chain (Seeded/Draft). Purchases will fail until it is properly published.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-transparent border-2 border-[#2a2a30] text-[#a78bfa] px-4 py-3.5 text-sm font-extrabold hover:text-[#ff2d95] hover:border-[#ff2d95] transition-all uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSelfPurchase || !prompt.contract_id || prompt.contract_id === 0}
                  className={`flex-1 px-4 py-3.5 text-sm font-extrabold shadow-[4px_4px_0_0_transparent] transition-all uppercase border-2 ${isSelfPurchase || !prompt.contract_id || prompt.contract_id === 0 ? "opacity-30 cursor-not-allowed border-white/20 text-white/20" : "bg-[#ff2d95] border-[#ff2d95] text-white hover:shadow-[4px_4px_0_0_#fff] hover:-translate-y-1"}`}
                >
                  {isSelfPurchase ? "Own Listing" : (!prompt.contract_id || prompt.contract_id === 0) ? "Unlisted" : "Confirm Purchase"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
