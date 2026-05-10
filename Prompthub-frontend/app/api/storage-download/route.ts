import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const rootHash = request.nextUrl.searchParams.get("rootHash")
  if (!rootHash) {
    return NextResponse.json({ error: "rootHash is required" }, { status: 400 })
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
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": backendRes.headers.get("content-disposition") ?? `attachment; filename="prompt-${rootHash.slice(0, 10)}.bin"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Storage download failed" },
      { status: 502 }
    )
  }
}
