import { NextRequest, NextResponse } from "next/server"
import { Indexer } from "@0gfoundation/0g-storage-ts-sdk"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const INDEXER_RPC = process.env.NEXT_PUBLIC_ZG_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai"

export const runtime = "nodejs"

function inferContentType(bytes: Uint8Array) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4))
    const webp = String.fromCharCode(...bytes.slice(8, 12))
    if (riff === "RIFF" && webp === "WEBP") return "image/webp"
  }
  if (bytes.length >= 6) {
    const gif = String.fromCharCode(...bytes.slice(0, 6))
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif"
  }
  return "application/octet-stream"
}

function responseFromBytes(rootHash: string, bytes: Uint8Array, contentType?: string | null, disposition = "inline") {
  const finalContentType = contentType || inferContentType(bytes)
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": finalContentType,
      "Content-Disposition": `${disposition}; filename="0g-${rootHash.slice(0, 10)}${finalContentType.startsWith("image/") ? "." + finalContentType.split("/")[1] : ".bin"}"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}

export async function GET(request: NextRequest) {
  const rootHash = request.nextUrl.searchParams.get("rootHash")
  if (!rootHash) {
    return NextResponse.json({ error: "rootHash is required" }, { status: 400 })
  }

  try {
    const indexer = new Indexer(INDEXER_RPC)
    const [blob, downloadErr] = await indexer.downloadToBlob(rootHash)

    if (!downloadErr && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      return responseFromBytes(rootHash, bytes, blob.type)
    }

    console.warn("[0G Storage Download] SDK download failed, falling back to backend:", downloadErr?.message || downloadErr)
  } catch (error: any) {
    console.warn("[0G Storage Download] SDK download threw, falling back to backend:", error?.message || error)
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/storage/download/${encodeURIComponent(rootHash)}`, {
      headers: {
        Accept: "application/octet-stream",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization") as string }
          : {}),
      },
    })

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: "Storage download unavailable" },
        { status: backendRes.status }
      )
    }

    const body = await backendRes.arrayBuffer()
    return responseFromBytes(
      rootHash,
      new Uint8Array(body),
      backendRes.headers.get("content-type"),
      backendRes.headers.get("content-disposition")?.startsWith("attachment") ? "attachment" : "inline"
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Storage download failed" },
      { status: 502 }
    )
  }
}
