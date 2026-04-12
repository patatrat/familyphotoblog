import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/signup", "/verify"]

// Next.js 16: middleware.ts is renamed to proxy.ts, function renamed to proxy
export const proxy = auth(function proxy(req: NextRequest & { auth: unknown }) {
  const isAuthenticated = !!(req as { auth?: unknown }).auth
  const path = req.nextUrl.pathname
  const isPublic = publicPaths.some((p) => path.startsWith(p))

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
