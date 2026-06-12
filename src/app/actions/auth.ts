"use server"

import { createHash, timingSafeEqual } from "crypto"
import { signIn, signOut } from "@/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getSettings } from "@/lib/settings"

// Constant-time comparison via fixed-length digests (timingSafeEqual requires equal lengths)
function passphraseMatches(input: string): boolean {
  const expected = process.env.SIGNUP_PASSPHRASE
  if (!expected) return false
  const a = createHash("sha256").update(input).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}

export type AuthFormState = { error?: string } | undefined

export async function loginAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase()

  if (!email) return { error: "Email is required." }

  const { limited, message } = await checkRateLimit(email)
  if (limited) return { error: message }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return { error: "No account found for that email. Please sign up first." }
  }

  // Throws NEXT_REDIRECT to /verify — Next.js handles it
  await signIn("nodemailer", { email })
}

export async function signupAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const passphrase = (formData.get("passphrase") as string)?.trim()

  if (!name) return { error: "Name is required." }
  if (name.length > 100) return { error: "Name too long (max 100 characters)." }
  if (!email) return { error: "Email is required." }
  if (!passphrase) return { error: "Family passphrase is required." }

  // Rate limit BEFORE the passphrase check so failed guesses count against
  // the limit — otherwise the passphrase could be brute-forced without bound
  const { limited, message } = await checkRateLimit(email)
  if (limited) return { error: message }

  if (!passphraseMatches(passphrase)) {
    return { error: "Incorrect family passphrase." }
  }

  const settings = await getSettings()
  if (!settings.signupsEnabled) {
    return { error: "Signups are currently closed." }
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return {
      error: "An account already exists for that email. Please log in.",
    }
  }

  // Auto-approve only when approval is not required
  await db.user.create({ data: { name, email, approved: !settings.approvalRequired } })

  // Throws NEXT_REDIRECT to /verify — Next.js handles it
  await signIn("nodemailer", { email })
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
