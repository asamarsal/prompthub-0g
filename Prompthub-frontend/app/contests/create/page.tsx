"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useWallet } from "@/lib/wallet-context"
import { createContest, verifyContestFund } from "@/lib/api"
import { parseEther } from "ethers"
import { getContestsContract, getSigner } from "@/lib/evm"

const categories = ["Brand Visual Identity", "Product Launch Campaign", "NFT Collection Design", "Social Media Challenge", "Character Design", "Packaging Design", "Video / Motion"]

export default function CreateContestPage() {
    const { address } = useWallet()
    const [prizes, setPrizes] = useState([
        { place: "1st Place", amount: "" },
        { place: "2nd Place", amount: "" },
    ])
    const [currency, setCurrency] = useState("0G")
    const [submitted, setSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form inputs
    const [title, setTitle] = useState("")
    const [brandName, setBrandName] = useState("")
    const [category, setCategory] = useState("")
    const [deadline, setDeadline] = useState("")
    const [aboutBrand, setAboutBrand] = useState("")
    const [brief, setBrief] = useState("")
    const [tags, setTags] = useState("")
    const [requirePrompt, setRequirePrompt] = useState(false)

    const handleLaunchContest = async () => {
        if (!address) {
            alert("Please connect your wallet first.")
            return
        }
        if (!title || !brandName || !category || !deadline || !aboutBrand || !brief) {
            alert("Please fill in all required fields.")
            return
        }

        setIsSubmitting(true)

        try {
            const totalAmount = prizes.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
            const amountsWei = prizes.map((p) => parseEther(String(Number(p.amount) || 0)))
            const totalWei = parseEther(String(totalAmount))

            const { provider } = await getSigner()
            const currentBlock = await provider.getBlockNumber()
            const now = new Date()
            const target = new Date(deadline)
            const days = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 86400000))
            const blockDeadline = currentBlock + days * 7200

            const contests = await getContestsContract()
            const tx = await contests.fundContest(prizes.length, amountsWei, blockDeadline, {
                value: totalWei,
            })
            const receipt = await tx.wait()

            try {
                const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean)
                const onchainContestId = receipt?.logs
                    ?.map((l: any) => {
                        try { return contests.interface.parseLog(l) } catch { return null }
                    })
                    .find((e: any) => e?.name === "ContestFunded")
                    ?.args?.contestId

                const created = await createContest({
                    title,
                    brand_name: brandName,
                    category,
                    about_brand: aboutBrand,
                    brief,
                    tags: tagArray,
                    require_prompt_submission: requirePrompt,
                    prize_tiers: prizes.map((p, idx) => ({ place: idx + 1, prize_0g: Number(p.amount) || 0 })),
                    total_prize_0g: totalAmount,
                    deadline,
                    tx_id: tx.hash,
                    onchain_contest_id: onchainContestId ? Number(onchainContestId) : undefined,
                })
                if (created?.id) {
                    await verifyContestFund(created.id, tx.hash)
                }
                setSubmitted(true)
            } catch (err) {
                console.error(err)
                alert("Transaction broadcasted, but failed to sync to backend.")
            } finally {
                setIsSubmitting(false)
            }
        } catch (err) {
            console.error(err)
            setIsSubmitting(false)
            alert("Failed to initialize transaction")
        }
    }

    const addPrize = () => setPrizes(p => [...p, { place: `${p.length + 1}th Place`, amount: "" }])
    const removePrize = (i: number) => setPrizes(p => p.filter((_, idx) => idx !== i))
    const updatePrize = (i: number, field: "place" | "amount", val: string) => setPrizes(p => p.map((pr, idx) => idx === i ? { ...pr, [field]: val } : pr))

    if (submitted) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className="text-6xl mb-6">🏆</div>
                <h2 className="text-3xl font-extrabold text-white uppercase mb-3">Contest Created!</h2>
                <p className="text-[#a78bfa] mb-8">Your contest brief has been submitted. Prize pool {currency} is in escrow. Creators can now submit their entries.</p>
                <Link href="/contests" className="inline-flex items-center gap-2 px-6 py-3 font-bold uppercase text-sm tracking-wider text-white border-2 border-[#00ffff] bg-[#00ffff]/15 shadow-[4px_4px_0_0_#00ffff]">
                    View Contests
                </Link>
            </div>
        </div>
    )

    return (
        <AppShell>
            <div className="min-h-screen py-12 px-4 lg:px-8 max-w-3xl mx-auto">
                <Link href="/contests" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Contests
                </Link>

                <div className="mb-8">
                    <p className="text-sm font-bold text-[#00ffff] uppercase tracking-widest mb-2 font-mono">{"// CREATE CONTEST"}</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white uppercase">Launch a Brand Contest</h1>
                    <p className="text-sm text-[#a78bfa] mt-2">Post a creative brief, set a prize pool, and let AI Artists compete for your brand.</p>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Basic Info */}
                    <section className="bg-[#0d0d0d] border border-[#2a2a30] p-6 flex flex-col gap-4">
                        <h2 className="text-sm font-bold text-[#00ffff] uppercase tracking-wider font-mono">01 — Contest Info</h2>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Contest Title *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Neon Horizon Brand Visual Identity" className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Brand Name *</label>
                            <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand or company name" className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Category *</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-colors cursor-pointer">
                                <option value="">Select a category</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Submission Deadline *</label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>
                    </section>

                    {/* Brief */}
                    <section className="bg-[#0d0d0d] border border-[#2a2a30] p-6 flex flex-col gap-4">
                        <h2 className="text-sm font-bold text-[#00ffff] uppercase tracking-wider font-mono">02 — Creative Brief</h2>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">About Your Brand *</label>
                            <textarea value={aboutBrand} onChange={e => setAboutBrand(e.target.value)} rows={3} placeholder="Briefly describe your brand, its audience, and values..." className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm resize-none focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Detailed Brief *</label>
                            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={5} placeholder="Describe exactly what you want creators to make: format, style, required elements, mood, color palette, etc." className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm resize-none focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>

                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Tags (comma separated)</label>
                            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. cyberpunk, gaming, neon, 3d" className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-colors" />
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-[#00ffff]/5 border border-[#00ffff]/20">
                            <input checked={requirePrompt} onChange={e => setRequirePrompt(e.target.checked)} type="checkbox" id="requirePrompt" className="mt-0.5" />
                            <label htmlFor="requirePrompt" className="text-xs text-white/60 cursor-pointer">
                                <span className="font-bold text-white">Require prompt submission</span> — Creators must include the AI prompt they used as proof of process.
                            </label>
                        </div>
                    </section>

                    {/* Prizes */}
                    <section className="bg-[#0d0d0d] border border-[#2a2a30] p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[#00ffff] uppercase tracking-wider font-mono">03 — Prize Pool ({currency})</h2>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-white/40 uppercase tracking-wider">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="bg-[#111] border border-[#2a2a30] text-white text-xs px-2 py-1 focus:outline-none focus:border-[#ff2d95]"
                                >
                                    <option value="0G">0G</option>
                                    <option value="0G">0G</option>
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-white/40">Prize pool is locked in a 0G smart contract escrow until the contest ends.</p>

                        <div className="flex flex-col gap-3">
                            {prizes.map((p, i) => (
                                <div key={i} className="flex gap-3 items-center">
                                    <input
                                        value={p.place}
                                        onChange={e => updatePrize(i, "place", e.target.value)}
                                        className="flex-1 px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#ff2d95] transition-colors"
                                        placeholder="Place label"
                                    />
                                    <input
                                        value={p.amount}
                                        onChange={e => updatePrize(i, "amount", e.target.value)}
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        className="w-36 px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#ff2d95] transition-colors"
                                        placeholder={`0.000 ${currency}`}
                                    />
                                    {prizes.length > 1 && (
                                        <button onClick={() => removePrize(i)} className="p-2 text-white/30 hover:text-[#ff2d95] transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={addPrize} className="inline-flex items-center gap-2 text-xs text-[#00ffff] hover:text-white transition-colors font-bold uppercase">
                            <Plus className="w-3.5 h-3.5" /> Add Prize Tier
                        </button>

                        <div className="flex items-center justify-between pt-3 border-t border-[#2a2a30]">
                            <span className="text-xs text-white/40 uppercase">Total Prize Pool</span>
                            <span className="font-extrabold font-mono text-[#ff2d95]">
                                {prizes.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(4)} {currency}
                            </span>
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="flex items-start gap-3 p-4 bg-[#ff2d95]/5 border border-[#ff2d95]/20">
                        <span className="text-[#ff2d95] text-lg">⚡</span>
                        <p className="text-xs text-white/50">By submitting, you agree that the prize pool will be escrowed via a 0G smart contract. Funds are released automatically to winners after judging. PromptHub charges a 3% platform fee.</p>
                    </div>

                    <button
                        onClick={handleLaunchContest}
                        disabled={isSubmitting}
                        className="w-full py-4 font-extrabold uppercase tracking-wider text-base text-white border-2 border-[#00ffff] bg-[#00ffff]/20 shadow-[6px_6px_0_0_#00ffff] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Escrowing Funds...</> : "🏆 Launch Contest & Escrow Prize Pool"}
                    </button>

                    <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Smart Contract Escrow by</span>
                        <img src="/icon/0g-logo.png" alt="0G" className="h-3" />
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
