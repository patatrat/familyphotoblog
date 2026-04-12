"use server"

import { signIn, signOut } from "@/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

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
  if (!email) return { error: "Email is required." }
  if (!passphrase) return { error: "Family passphrase is required." }

  if (passphrase !== process.env.SIGNUP_PASSPHRASE) {
    return { error: "Incorrect family passphrase." }
  }

  const { limited, message } = await checkRateLimit(email)
  if (limited) return { error: message }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return {
      error: "An account already exists for that email. Please log in.",
    }
  }

  await db.user.create({ data: { name, email, approved: true } })

  // Throws NEXT_REDIRECT to /verify — Next.js handles it
  await signIn("nodemailer", { email })
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
