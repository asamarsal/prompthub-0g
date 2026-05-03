/**
 * 0G Storage Service
 * 
 * Uploads files to 0G Storage network via a Next.js API route (server-side).
 * The SDK requires Node.js `fs` module which is NOT available in browser,
 * so we use a server-side API route that has full Node.js access.
 *
 * Flow:
 * 1. Frontend sends file to /api/storage-upload (Next.js API route)
 * 2. API route uses 0G SDK (MemData + Indexer.upload) with server private key
 * 3. Returns rootHash (Merkle root) + txHash (on-chain Flow contract tx)
 * 4. txHash is viewable on ChainScan: https://chainscan-galileo.0g.ai/tx/{txHash}
 */

export interface ZgUploadResult {
  rootHash: string
  txHash: string
  success: boolean
  error?: string
}

/**
 * Upload a browser File to 0G Storage network via server-side API route.
 * This avoids browser `fs` module issues with the 0G SDK.
 *
 * @param file - Browser File object to upload
 * @returns Upload result with rootHash for retrieval/verification
 */
export async function uploadTo0GStorageNetwork(file: File): Promise<ZgUploadResult> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    console.log("[0G Storage] Uploading via server API route...", file.name, file.size, "bytes")

    const res = await fetch("/api/storage-upload", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      console.warn("[0G Storage] Server upload failed:", data.error)
      return {
        rootHash: "",
        txHash: "",
        success: false,
        error: data.error || `HTTP ${res.status}`,
      }
    }

    console.log("[0G Storage] SUCCESS! rootHash:", data.rootHash, "txHash:", data.txHash)
    return {
      rootHash: data.rootHash,
      txHash: data.txHash,
      success: true,
    }
  } catch (err: any) {
    console.error("[0G Storage] Upload error:", err?.message)
    return {
      rootHash: "",
      txHash: "",
      success: false,
      error: err?.message || "Network error",
    }
  }
}

/**
 * Get the correct explorer URL for a 0G Storage transaction.
 * Storage uploads create a tx to the Flow contract — visible on ChainScan.
 */
export function getStorageTxExplorerUrl(txHash: string): string {
  return `https://chainscan-galileo.0g.ai/tx/${txHash}`
}
