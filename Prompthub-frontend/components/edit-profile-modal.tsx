"use client"

import { useState, useRef } from "react"
import { useWallet, type UserProfile } from "@/lib/wallet-context"
import { X, Upload, User, Loader2 } from "lucide-react"
import { uploadFile } from "@/lib/api"
import { toast } from "sonner"
import Cropper, { type Area, type Point } from "react-easy-crop"

const CircularProgress = ({ size = 40, strokeWidth = 3, color = "#a855f7" }) => {
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={(size - strokeWidth) / 2}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/10"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={(size - strokeWidth) / 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={(size - strokeWidth) * Math.PI}
                    className="animate-[progress_1.5s_ease-in-out_infinite]"
                    style={{
                        strokeDashoffset: ((size - strokeWidth) * Math.PI) * 0.3,
                        strokeLinecap: "round"
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    )
}

interface Props {
    open: boolean
    onClose: () => void
    view?: "all" | "info" | "avatar" | "cover"
    accentColor?: string
}

export function EditProfileModal({ open, onClose, view = "all", accentColor }: Props) {
    const { profile, saveProfile } = useWallet()

    const [name, setName] = useState(profile.name || "")
    const [bio, setBio] = useState(profile.bio || "")
    const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "")
    const [coverImage, setCoverImage] = useState(profile.coverImage || "")
    const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl || "")
    const [coverPreview, setCoverPreview] = useState(profile.coverImage || "")

    const avatarInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [isUploadingCover, setIsUploadingCover] = useState(false)

    // Cropping state
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

    if (!open) return null

    // Helper to get cropped image blob
    const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        const image = new Image()
        image.src = imageSrc
        await new Promise((resolve) => (image.onload = resolve))

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("No 2d context")

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) throw new Error("Canvas is empty")
                resolve(blob)
            }, "image/jpeg")
        })
    }

    const handleFile = async (file: File, type: "avatar" | "cover") => {
        const isAvatar = type === "avatar"

        if (!isAvatar) {
            // For cover, we show the cropper first
            const reader = new FileReader()
            reader.onload = () => setTempImage(reader.result as string)
            reader.readAsDataURL(file)
            return
        }

        setIsUploadingAvatar(true)
        // Show local preview immediately
        const reader = new FileReader()
        reader.onload = (e) => setAvatarPreview(e.target?.result as string)
        reader.readAsDataURL(file)

        try {
            const { url } = await uploadFile(file, type)
            setAvatarUrl(url)
            setAvatarPreview(url)
            toast.success("Avatar uploaded!")
        } catch (err: any) {
            console.error("Upload failed:", err)
            toast.error(err.message || "Failed to upload")
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleCroppedUpload = async () => {
        if (!tempImage || !croppedAreaPixels) return
        setIsUploadingCover(true)

        try {
            const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels)
            const file = new File([croppedBlob], "cover.jpg", { type: "image/jpeg" })

            const { url } = await uploadFile(file, "cover")
            setCoverImage(url)
            setCoverPreview(url)
            setTempImage(null)
            toast.success("Cover uploaded and adjusted!")
        } catch (err: any) {
            console.error("Upload failed:", err)
            toast.error("Failed to process cropped image")
        } finally {
            setIsUploadingCover(false)
        }
    }

    const handleSave = () => {
        if (!name.trim()) return
        const updated: UserProfile = {
            ...profile,
            name: name.trim(),
            bio: bio.trim(),
            avatarUrl,
            coverImage,
        }
        saveProfile(updated)
        onClose()
    }

    const accent = accentColor || "#a855f7"

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-[#0a0a0c] border-2 max-w-lg w-full relative max-h-[90vh] overflow-y-auto"
                style={{ borderColor: accent, boxShadow: `8px 8px 0 0 ${accent}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a30] sticky top-0 bg-[#0a0a0c] z-10">
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: accent }}>// EDIT {view === "info" ? "INFO" : view === "avatar" ? "AVATAR" : view === "cover" ? "COVER" : "PROFILE"}</p>
                        <h2 className="text-lg font-extrabold text-white uppercase">{view === "info" ? "Name & Bio" : view === "avatar" ? "Avatar Photo" : view === "cover" ? "Cover Photo" : "Your Profile"}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-white/30 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Cover Image */}
                    {(view === "all" || view === "cover") && (
                        <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Cover Image</label>
                            <div
                                className="relative aspect-[3/1] max-h-[240px] border-2 border-dashed border-[#2a2a30] hover:border-accent transition-colors overflow-hidden cursor-pointer group"
                                onClick={() => coverInputRef.current?.click()}
                                style={coverPreview
                                    ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                                    : { background: `linear-gradient(135deg, #080808, ${accent}22)` }
                                }
                            >
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${accent}40 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${accent}40 40px)`,
                                }} />
                                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 transition-opacity ${isUploadingCover ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                    {isUploadingCover ? (
                                        <CircularProgress size={30} />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-white" />
                                            <span className="text-xs text-white font-bold">Upload cover image</span>
                                        </>
                                    )}
                                </div>
                                {!coverPreview && (
                                    <div className="flex flex-col items-center justify-center h-full gap-1 text-white/30">
                                        <Upload className="w-5 h-5" />
                                        <span className="text-xs">Click to upload cover</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], "cover")}
                            />
                            <input
                                value={coverImage.startsWith("data:") ? "" : coverImage}
                                onChange={e => { setCoverImage(e.target.value); setCoverPreview(e.target.value) }}
                                placeholder="...or paste image URL"
                                className="w-full mt-2 px-3 py-2 bg-[#111] border border-[#2a2a30] text-white text-xs focus:outline-none focus:border-[#a855f7] transition-colors placeholder:text-white/20"
                            />
                        </div>
                    )}

                    {/* Avatar */}
                    {(view === "all" || view === "avatar") && (
                        <div className="flex items-start gap-5">
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Avatar</label>
                                <div
                                    className="w-20 h-20 rounded-full overflow-hidden cursor-pointer relative group border-2 border-[#2a2a30] hover:border-[#a855f7] transition-colors shrink-0"
                                    onClick={() => avatarInputRef.current?.click()}
                                    style={avatarPreview
                                        ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                                        : { background: `linear-gradient(135deg, ${accent}, #00ffff)` }
                                    }
                                >
                                    {!avatarPreview && (
                                        <div className="flex items-center justify-center h-full">
                                            <span className="text-3xl font-black text-white">{name?.[0]?.toUpperCase() || <User className="w-8 h-8" />}</span>
                                        </div>
                                    )}
                                    <div className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center transition-opacity ${isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                        {isUploadingAvatar ? (
                                            <CircularProgress size={24} strokeWidth={2.5} />
                                        ) : (
                                            <Upload className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], "avatar")}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Avatar URL <span className="text-white/20">(optional)</span></label>
                                <input
                                    value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                                    onChange={e => { setAvatarUrl(e.target.value); setAvatarPreview(e.target.value) }}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Info (Name/Bio) */}
                    {(view === "all" || view === "info") && (
                        <>
                            {/* Name */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Display Name *</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Yuki Tanaka"
                                    className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Bio <span className="text-white/20">(optional)</span></label>
                                <textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    rows={3}
                                    maxLength={200}
                                    placeholder="A short intro about you or your brand..."
                                    className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a30] text-white text-sm resize-none focus:outline-none focus:border-[#a855f7] transition-colors"
                                />
                                <p className="text-right text-[11px] text-white/20 mt-1">{bio.length}/200</p>
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-[#2a2a30]">
                        <button onClick={onClose} className="px-5 py-3 text-sm text-white/40 border border-[#2a2a30] hover:border-white/30 transition-colors">
                            Cancel
                        </button>
                        <button
                            disabled={!name.trim() || isUploadingAvatar || isUploadingCover}
                            onClick={handleSave}
                            className="flex-1 py-3 font-extrabold uppercase tracking-wider text-sm border-2 text-white shadow-none transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: accent, backgroundColor: `${accent}20`, boxShadow: `4px 4px 0 0 ${accent}` }}
                        >
                            Save Profile ✓
                        </button>
                    </div>
                </div>

                {/* Cropper Overlay */}
                {tempImage && (
                    <div className="absolute inset-0 z-50 bg-[#0a0a0c] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a30]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Adjust Cover Photo</h3>
                            <button onClick={() => setTempImage(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 relative bg-black/80 flex items-center justify-center p-4">
                            <div className="w-full aspect-[3/1] max-h-[240px] relative overflow-hidden border border-[#2a2a30]">
                                <Cropper
                                    image={tempImage}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={3 / 1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                                />
                                <div className="absolute inset-0 opacity-10 pointer-events-none z-10" style={{
                                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${accent}40 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${accent}40 40px)`,
                                }} />
                            </div>
                        </div>
                        <div className="p-6 bg-[#0a0a0c] border-t border-[#2a2a30] flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Zoom</span>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="flex-1 h-1 bg-[#2a2a30] appearance-none rounded-full accent-[#a855f7]"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setTempImage(null)} className="px-6 py-3 text-xs font-bold text-white/40 border border-[#2a2a30] uppercase">Cancel</button>
                                <button
                                    onClick={handleCroppedUpload}
                                    disabled={isUploadingCover}
                                    className="flex-1 py-3 bg-[#a855f7] text-white font-black uppercase text-xs tracking-widest shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply & Upload"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes progress {
                    0% { stroke-dashoffset: 70; }
                    50% { stroke-dashoffset: 20; }
                    100% { stroke-dashoffset: 70; }
                }
            `}</style>
        </div>
    )
}
