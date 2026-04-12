import { headers } from "next/headers"
import { db } from "./db"

const MAX_EMAIL_ATTEMPTS = 5
const MAX_IP_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const CLEANUP_AFTER_MS = 60 * 60 * 1000 // clean up attempts older than 1 hour

export async function checkRateLimit(
  email: string
): Promise<{ limited: boolean; message?: string }> {
  const headersList = await headers()
  const forwarded = headersList.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : null

  const windowStart = new Date(Date.now() - WINDOW_MS)

  // Opportunistic cleanup of old attempts
  await db.magicLinkRequest.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - CLEANUP_AFTER_MS) } },
  })

  // Per-email limit
  const emailCount = await db.magicLinkRequest.count({
    where: { identifier: email, createdAt: { gte: windowStart } },
  })
  if (emailCount >= MAX_EMAIL_ATTEMPTS) {
    return {
      limited: true,
      message: "Too many requests for this email. Please wait 15 minutes.",
    }
  }

  // Per-IP limit
  if (ip) {
    const ipCount = await db.magicLinkRequest.count({
      where: { identifier: ip, createdAt: { gte: windowStart } },
    })
    if (ipCount >= MAX_IP_ATTEMPTS) {
      return {
        limited: true,
        message: "Too many requests from your network. Please wait 15 minutes.",
      }
    }
  }

  // Record this attempt
  await db.magicLinkRequest.createMany({
    data: [
      { identifier: email },
      ...(ip ? [{ identifier: ip }] : []),
    ],
  })

  return { limited: false }
}
