import { NextRequest, NextResponse } from "next/server"
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk"
import { ethers } from "ethers"

const INDEXER_RPC = process.env.NEXT_PUBLIC_ZG_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai"
const BLOCKCHAIN_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai"
// Private key for server-side 0G Storage uploads (same deployer key)
const PRIVATE_KEY = process.env.ZG_STORAGE_PRIVATE_KEY || ""

export async function POST(request: NextRequest) {
  try {
    if (!PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: "ZG_STORAGE_PRIVATE_KEY not configured on server" },
        { status: 500 }
      )
    }

    // 1. Read file from request
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    // 2. Convert File to Uint8Array
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB limit
    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 50MB, got ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB` },
        { status: 413 }
      )
    }
    const data = new Uint8Array(arrayBuffer)

    // 3. Create signer with private key
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC)
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)

    // 4. Create indexer and MemData
    const indexer = new Indexer(INDEXER_RPC)
    const memData = new MemData(data)

    // 5. Compute Merkle tree
    const [tree, treeErr] = await memData.merkleTree()
    if (treeErr !== null) {
      return NextResponse.json(
        { success: false, error: `Merkle tree error: ${treeErr}` },
        { status: 500 }
      )
    }

    const rootHashPreview = tree?.rootHash() || ""
    console.log("[0G Storage API] Merkle root:", rootHashPreview, "File:", file.name, "Size:", data.length)

    // 6. Upload to 0G Storage network
    const [tx, uploadErr] = await indexer.upload(memData, BLOCKCHAIN_RPC, signer)

    if (uploadErr !== null) {
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadErr}` },
        { status: 502 }
      )
    }

    // 7. Parse result
    if ("rootHash" in tx) {
      console.log("[0G Storage API] Upload SUCCESS:", tx.rootHash)
      return NextResponse.json({
        success: true,
        rootHash: tx.rootHash,
        txHash: tx.txHash,
      })
    } else {
      console.log("[0G Storage API] Fragmented upload SUCCESS")
      return NextResponse.json({
        success: true,
        rootHash: tx.rootHashes[0] || "",
        txHash: tx.txHashes[0] || "",
      })
    }
  } catch (err: any) {
    console.error("[0G Storage API] Error:", err?.message || err)
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
