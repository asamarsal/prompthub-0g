"use client"

import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Trophy, Clock, Users, BadgeCheck, Upload, Loader2, CheckCircle } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { getContest, getContestSubmissions, submitContestEntry, declareContestWinner, uploadPromptAsset, uploadMetadata, uploadTo0GStorage } from "@/lib/api"
import { useWallet } from "@/lib/wallet-context"
import { truncateAddress } from "@/lib/utils"
import { getContestsContract } from "@/lib/evm"

const statusColors: Record<string, string> = {
    active: "#b4ff39",
    judging: "#00ffff",
    ended: "#ffffff40",
    OPEN: "#b4ff39",
    COMPLETED: "#ffffff40",
}

function daysLeft(deadline: string) {
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    return d > 0 ? `${d} days left` : "Ended"
}

export default function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { address: myAddress, isConnected } = useWallet()

    const [contest, setContest] = useState<any>(null)
    const [submissions, setSubmissions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showSubmit, setShowSubmit] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form for new submission
    const [previewUrl, setPreviewUrl] = useState("")
    const [prompt, setPrompt] = useState("")
    const [tool, setTool] = useState("")
    const [previewImageFile, setPreviewImageFile] = useState<File | null>(null)
    const [promptTxtFile, setPromptTxtFile] = useState<File | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const [cData, sData] = await Promise.all([
                getContest(id),
                getContestSubmissions(id)
            ])
            setContest(cData)
            setSubmissions(sData)
        } catch (err) {
            console.error("Failed to fetch contest detail", err)
        } finally {
            setLoading(false)
        }
    }, [id])

    const resolveOnchainContestId = () => {
        const fromContest = Number((contest as any)?.onchain_contest_id)
        if (Number.isFinite(fromContest) && fromContest > 0) return fromContest
        const fromId = Number(id)
        if (Number.isFinite(fromId) && fromId > 0) return fromId
        return 1
    }

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (!file.type.startsWith("image/")) {
                alert("Preview file must be an image.")
                e.target.value = ""
                return
            }
            setPreviewImageFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handlePromptTxtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
                alert("Prompt proof must be a .txt file.")
                e.target.value = ""
                return
            }
            setPromptTxtFile(file)
        }
    }

    const handleSubmitEntry = async () => {
        if (!myAddress) return alert("Connect wallet first")
        if (!previewImageFile && !previewUrl) return alert("Please provide a preview image or URL")
        if (contest?.require_prompt_submission && !prompt.trim() && !promptTxtFile) {
            return alert("This contest requires prompt submission.")
        }

        setIsSubmitting(true)
        try {
            let finalImageUrl = previewUrl

            // 1. Upload preview image to backend cache only. Pinata is reserved for text metadata/JSON.
            if (previewImageFile) {
                const uploadRes = await uploadPromptAsset(previewImageFile)
                finalImageUrl = uploadRes.url
            }
            if (!finalImageUrl || finalImageUrl.startsWith("blob:")) {
                throw new Error("Invalid preview URL. Please upload a valid image.")
            }

            let storageRootHash = ""
            let storageTxHash: string | null = null
            if (promptTxtFile) {
                const storageRes = await uploadTo0GStorage(promptTxtFile, "attachment", true)
                storageRootHash = storageRes.rootHash
                storageTxHash = storageRes.txHash
            }

            // 2. Upload canonical text metadata JSON to Pinata.
            const entryPayload = {
                contest_id: id,
                artist_address: myAddress,
                preview_image_url: finalImageUrl,
                prompt_used: prompt || (promptTxtFile ? promptTxtFile.name : undefined),
                tool: tool || undefined,
                prompt_txt_name: promptTxtFile?.name,
                storage_root_hash: storageRootHash || undefined,
                submitted_at: new Date().toISOString(),
            }
            const metadataRes = await uploadMetadata({
                name: `Contest Entry ${id}`,
                description: prompt || `Submission for ${contest?.title || "contest"}`,
                image: finalImageUrl,
                properties: entryPayload,
            })
            const metadataUri = metadataRes.ipfs_uri
            const entryId = storageRootHash || metadataUri

            // 3. Call Smart Contract
            const onchainContestId = resolveOnchainContestId()
            const contests = await getContestsContract()
            const tx = await contests.submitEntry(onchainContestId, entryId)
            await tx.wait()

            // 4. Sync to Backend
            await submitContestEntry(id, {
                artist_address: myAddress,
                preview_image_url: finalImageUrl,
                cid_ipfs: metadataUri,
                prompt_used: prompt || (promptTxtFile ? promptTxtFile.name : undefined),
                tool: tool || undefined,
                storage_root_hash: storageRootHash || undefined,
                storage_tx_hash: storageTxHash || undefined,
                ipfs_metadata_uri: metadataUri,
                onchain_entry_id: entryId,
            })
            setShowSubmit(false)
            setPreviewUrl("")
            setPrompt("")
            setTool("")
            setPreviewImageFile(null)
            setPromptTxtFile(null)
            fetchData()
            alert("Submission successful!")
        } catch (err) {
            console.error(err)
            alert("Submission failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSelectWinner = async (sub: any) => {
        if (!confirm(`Are you sure you want to select ${truncateAddress(sub.artist_address)} as the winner?`)) return

        setIsSubmitting(true)
        try {
            const onchainContestId = resolveOnchainContestId()
            const contests = await getContestsContract()
            const tx = await contests.declareWinner(onchainContestId, 1, sub.artist_address)
            await tx.wait()
            await declareContestWinner(id, sub.id, tx.hash, 1)
            fetchData()
            alert("Winner declared! Funds released.")
        } catch (err) {
            console.error(err)
            alert("Failed to declare winner")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white/30 text-xl animate-pulse font-mono tracking-widest">LOADING CONTEST...</div>
    if (!contest) return <div className="min-h-screen flex items-center justify-center text-white/30 text-xl font-mono">CONTEST NOT FOUND</div>

    const isOwner = !!myAddress && !!contest?.brand_address && myAddress.toLowerCase() === String(contest.brand_address).toLowerCase()
    const status = contest.status === "OPEN" ? "active" : contest.status === "COMPLETED" ? "ended" : contest.status.toLowerCase()
    const accent = "#00ffff"

    return (
        <AppShell>
            <div className="min-h-screen py-12 px-4 lg:px-8 max-w-7xl mx-auto">
                <Link href="/contests" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Contests
                </Link>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Left: Brief card */}
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="relative h-48 overflow-hidden border border-[#2a2a30]">
                            <img src={contest.image || `/example/prompt-example-1.png`} alt={contest.title} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 border backdrop-blur-sm" style={{ color: statusColors[contest.status], borderColor: `${statusColors[contest.status]}50`, background: "rgba(0,0,0,0.7)" }}>{status}</span>
                        </div>

                        <div className="bg-[#0d0d0d] border-2 border-[#2a2a30] p-5" style={{ boxShadow: `5px 5px 0 0 ${accent}` }}>
                            <p className="text-xs text-[#a78bfa] font-mono mb-1">{contest.brand_name || "PROMPTHUB BRAND"}</p>
                            <h1 className="text-xl font-extrabold text-white uppercase mb-3">{contest.title}</h1>

                            <div className="flex flex-col gap-2 text-xs text-white/50 mb-4">
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#00ffff]" /> {submissions.length} submissions</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#ff2d95]" /> {daysLeft(contest.deadline)}</span>
                                <span className="text-[#a78bfa]/60">{contest.category}</span>
                            </div>

                            <div className="border-t border-[#2a2a30] pt-4 mb-4">
                                <p className="text-xs text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#ff2d95]" /> Prize Pool: <span className="text-[#ff2d95] font-extrabold font-mono">{contest.total_prize_0g} 0G</span></p>
                                <div className="flex flex-col gap-1.5">
                                    {(contest.prize_tiers || []).map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between text-xs">
                                            <span className="text-white/50">{p.place === 1 ? "1st Place" : p.place === 2 ? "2nd Place" : `${p.place}th Place`}</span>
                                            <span className="font-mono font-bold text-[#ff2d95]">{p.prize_0g} 0G</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {status === "active" && !isOwner && (
                                <button
                                    onClick={() => setShowSubmit(true)}
                                    className="w-full py-3 font-extrabold uppercase tracking-wider text-sm border-2 transition-all text-white hover:bg-[#00ffff]/30"
                                    style={{ borderColor: accent, background: `${accent}22`, boxShadow: `4px 4px 0 0 ${accent}` }}
                                >
                                    <Upload className="w-4 h-4 inline mr-2" /> Submit Your Work
                                </button>
                            )}

                            {isOwner && status === "active" && (
                                <div className="p-3 bg-[#00ffff]/10 border border-[#00ffff]/30 text-[10px] text-[#00ffff] font-bold uppercase tracking-widest text-center mt-2">
                                    You are the Brand Owner
                                </div>
                            )}
                        </div>

                        <div className="bg-[#0d0d0d] border border-[#2a2a30] p-5">
                            <p className="text-xs text-[#00ffff] uppercase tracking-wider mb-3 font-mono">// Creative Brief</p>
                            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{contest.brief}</p>
                        </div>
                    </div>

                    {/* Right: Submissions gallery */}
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-extrabold text-white uppercase mb-6 flex items-center gap-3">
                            Submissions
                            <span className="text-sm font-normal font-mono text-white/30">({submissions.length})</span>
                        </h2>

                        {submissions.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-[#2a2a30] text-white/20 uppercase tracking-widest text-sm font-bold">
                                No submissions yet. Be the first!
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {submissions.map((s, i) => (
                                    <div key={s.id} className={`group bg-[#0d0d0d] border-2 transition-all overflow-hidden relative ${s.is_winner ? "border-[#ff2d95]" : "border-[#2a2a30] hover:border-[#00ffff]"}`}>
                                        {s.is_winner && (
                                            <div className="absolute top-3 right-3 z-20 bg-[#ff2d95] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> WINNER
                                            </div>
                                        )}
                                        <div className="relative h-64 overflow-hidden border-b border-[#2a2a30]">
                                            <img src={s.preview_image_url} alt="Submission" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ffff] to-[#a855f7] flex items-center justify-center text-xs font-bold text-white uppercase">
                                                        {s.artist_address[2]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{truncateAddress(s.artist_address)}</p>
                                                        <p className="text-[10px] font-mono text-white/40 uppercase">Creator</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {isOwner && status === "active" && !s.is_winner && (
                                                <button
                                                    onClick={() => handleSelectWinner(s)}
                                                    className="w-full py-2 bg-[#ff2d95]/20 hover:bg-[#ff2d95] border border-[#ff2d95] text-white text-[10px] font-extrabold uppercase tracking-widest transition-all"
                                                >
                                                    Select as Winner
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit modal */}
                {showSubmit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setShowSubmit(false)}>
                        <div className="bg-[#0b0b0b] border-2 border-[#00ffff] p-8 max-w-lg w-full relative" style={{ boxShadow: "10px 10px 0 0 #00ffff" }} onClick={e => e.stopPropagation()}>
                            <h3 className="text-2xl font-extrabold text-white uppercase mb-6 tracking-tighter">Submit Your Entry</h3>

                            <div className="flex flex-col gap-5">
                                <div className="border-2 border-dashed border-[#2a2a30] p-4 text-center cursor-pointer hover:border-[#00ffff] transition-all relative group h-48 flex flex-col items-center justify-center overflow-hidden">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-white/20 mb-2 group-hover:text-[#00ffff] transition-colors" />
                                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Click to upload your work</p>
                                        </>
                                    )}
                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold block mb-1.5">Or Paste Preview Image URL</label>
                                    <input value={previewUrl} onChange={e => setPreviewUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-[#151515] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-all" />
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold block mb-1.5">Prompt Used (Optional)</label>
                                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Provide your AI prompt..." className="w-full px-4 py-3 bg-[#151515] border border-[#2a2a30] text-white text-sm resize-none focus:outline-none focus:border-[#00ffff] transition-all" />
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold block mb-1.5">Prompt .txt Proof (0G Storage)</label>
                                    <div className="relative border border-dashed border-[#2a2a30] bg-[#151515] px-4 py-3 text-sm text-white/60 hover:border-[#00ffff] transition-colors">
                                        <input type="file" accept=".txt,text/plain" onChange={handlePromptTxtChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        {promptTxtFile ? (
                                            <span className="font-mono text-[#b4ff39]">{promptTxtFile.name}</span>
                                        ) : (
                                            <span>Upload first .txt prompt file for decentralized proof</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold block mb-1.5">Tool / Model (Optional)</label>
                                    <input value={tool} onChange={e => setTool(e.target.value)} placeholder="e.g. Midjourney v7, FLUX, GPT-4.1" className="w-full px-4 py-3 bg-[#151515] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#00ffff] transition-all" />
                                </div>

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                                    <button onClick={() => setShowSubmit(false)} className="px-6 py-3 text-sm font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Cancel</button>
                                    <button
                                        disabled={isSubmitting || (!previewUrl && !previewImageFile)}
                                        onClick={handleSubmitEntry}
                                        className="px-8 py-3 bg-[#00ffff] text-black font-extrabold uppercase tracking-widest shadow-[4px_4px_0_0_#ffffff] transition-all hover:scale-95 disabled:opacity-30 disabled:grayscale flex items-center gap-2"
                                    >
                                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Work"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
