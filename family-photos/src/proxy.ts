import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/signup", "/verify", "/pending"]

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

// Next.js 16: middleware.ts is renamed to proxy.ts, function renamed to proxy
export const proxy = auth(function proxy(req: NextRequest & { auth: unknown }) {
  const isAuthenticated = !!(req as { auth?: unknown }).auth
  const path = req.nextUrl.pathname
  const isPublic = publicPaths.some((p) => path.startsWith(p))

  if (!isAuthenticated && !isPublic) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/login", req.url)))
  }

  if (isAuthenticated && isPublic) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/", req.url)))
  }

  return applySecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
