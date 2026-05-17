"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { getSystemStatus, SystemStatusResponse } from "@/lib/api"
import { Loader2, Activity, Server, Database, HardDrive, Cpu, Radio, CheckCircle2, AlertCircle, XCircle } from "lucide-react"

export default function StatusPage() {
    const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getSystemStatus()
                setStatusData(data)
            } catch (error) {
                console.error("Failed to fetch status:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()
        // Refresh every 30 seconds
        const interval = setInterval(fetchStatus, 30000)
        return () => clearInterval(interval)
    }, [])

    const getStatusIcon = (status: "up" | "down" | "degraded") => {
        switch (status) {
            case "up":
                return <CheckCircle2 className="w-5 h-5 text-[#b4ff39]" />
            case "degraded":
                return <AlertCircle className="w-5 h-5 text-yellow-500" />
            case "down":
                return <XCircle className="w-5 h-5 text-[#ff2d95]" />
            default:
                return null
        }
    }

    const getStatusText = (status: "up" | "down" | "degraded") => {
        switch (status) {
            case "up":
                return <span className="text-[#b4ff39] font-bold tracking-widest uppercase">Operational</span>
            case "degraded":
                return <span className="text-yellow-500 font-bold tracking-widest uppercase">Degraded</span>
            case "down":
                return <span className="text-[#ff2d95] font-bold tracking-widest uppercase">Outage</span>
            default:
                return null
        }
    }

    return (
        <AppShell>
            <div className="mx-auto max-w-4xl px-4 py-20 lg:px-8 min-h-screen">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold text-[#e0d4ff] mb-4 uppercase tracking-widest font-display flex items-center justify-center gap-4">
                        <Activity className="w-10 h-10 text-[#00ffff]" />
                        System Status
                    </h1>
                    <p className="text-[#a78bfa] font-mono">
                        Realtime monitoring of PromptHub core infrastructure.
                    </p>
                </div>

                {loading && !statusData ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 text-[#ff2d95] animate-spin" />
                        <span className="text-[#e0d4ff] font-mono uppercase tracking-widest text-sm">Checking systems...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Overall Status Banner */}
                        <div className={`p-6 border-2 flex items-center gap-4 transition-colors ${statusData?.status === "operational"
                                ? "bg-[#b4ff39]/10 border-[#b4ff39]/30 text-[#b4ff39]"
                                : "bg-[#ff2d95]/10 border-[#ff2d95]/30 text-[#ff2d95]"
                            }`}>
                            {statusData?.status === "operational" ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                            <div>
                                <h2 className="text-lg font-bold uppercase tracking-widest">
                                    {statusData?.status === "operational" ? "All Systems Operational" : "System Issues Detected"}
                                </h2>
                                <p className="text-xs font-mono opacity-80 mt-1">
                                    Last checked: {statusData?.timestamp ? new Date(statusData.timestamp).toLocaleString() : "Unknown"}
                                </p>
                            </div>
                        </div>

                        {/* Components Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Backend API */}
                            <div className="bg-[#160f24] border border-[#2a2a30] p-6 flex items-center justify-between hover:border-[#a78bfa]/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#a78bfa]/10 rounded-lg">
                                        <Server className="w-6 h-6 text-[#a78bfa]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider">Backend API</h3>
                                        <p className="text-xs text-[#a78bfa] font-mono mt-1">Laravel / VPS</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusData && getStatusIcon(statusData.components.api)}
                                    {statusData && getStatusText(statusData.components.api)}
                                </div>
                            </div>

                            {/* Database */}
                            <div className="bg-[#160f24] border border-[#2a2a30] p-6 flex items-center justify-between hover:border-[#a78bfa]/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#a78bfa]/10 rounded-lg">
                                        <Database className="w-6 h-6 text-[#a78bfa]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider">Database</h3>
                                        <p className="text-xs text-[#a78bfa] font-mono mt-1">PostgreSQL</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusData && getStatusIcon(statusData.components.database)}
                                    {statusData && getStatusText(statusData.components.database)}
                                </div>
                            </div>

                            {/* 0G Storage */}
                            <div className="bg-[#160f24] border border-[#2a2a30] p-6 flex items-center justify-between hover:border-[#a78bfa]/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#a78bfa]/10 rounded-lg">
                                        <HardDrive className="w-6 h-6 text-[#a78bfa]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider">0G Storage</h3>
                                        <p className="text-xs text-[#a78bfa] font-mono mt-1">Decentralized Storage Node</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusData && getStatusIcon(statusData.components["0g_storage"])}
                                    {statusData && getStatusText(statusData.components["0g_storage"])}
                                </div>
                            </div>

                            {/* Blockchain RPC */}
                            <div className="bg-[#160f24] border border-[#2a2a30] p-6 flex items-center justify-between hover:border-[#a78bfa]/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#a78bfa]/10 rounded-lg">
                                        <Cpu className="w-6 h-6 text-[#a78bfa]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider">Blockchain RPC</h3>
                                        <p className="text-xs text-[#a78bfa] font-mono mt-1">0G EVM Network</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusData && getStatusIcon(statusData.components.blockchain_rpc)}
                                    {statusData && getStatusText(statusData.components.blockchain_rpc)}
                                </div>
                            </div>

                            {/* WebSocket */}
                            <div className="bg-[#160f24] border border-[#2a2a30] p-6 flex items-center justify-between hover:border-[#a78bfa]/50 transition-colors md:col-span-2">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#a78bfa]/10 rounded-lg">
                                        <Radio className="w-6 h-6 text-[#a78bfa]" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider">WebSocket</h3>
                                        <p className="text-xs text-[#a78bfa] font-mono mt-1">Laravel Reverb (Realtime events)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusData && getStatusIcon(statusData.components.websocket)}
                                    {statusData && getStatusText(statusData.components.websocket)}
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-8">
                            <p className="text-xs text-[#a78bfa]/50 font-mono">
                                Status page auto-refreshes every 30 seconds.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
