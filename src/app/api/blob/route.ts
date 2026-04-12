import { NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { auth } from "@/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url")
  if (!url) {
    return new NextResponse("Missing url param", { status: 400 })
  }

  // Only proxy URLs from our blob store
  try {
    const { hostname } = new URL(url)
    if (!hostname.endsWith(".blob.vercel-storage.com")) {
      return new NextResponse("Invalid URL", { status: 400 })
    }
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  const result = await get(url, { access: "private" })
  if (!result) {
    return new NextResponse("Not found", { status: 404 })
  }

  return new NextResponse(result.stream as ReadableStream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      // Browsers cache privately — avoids round-trips while enforcing auth
      "Cache-Control": "private, max-age=86400",
    },
  })
}
