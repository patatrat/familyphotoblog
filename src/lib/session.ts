import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"

export type AuthSession = Session & {
  user: {
    id: string
    role: "USER" | "MODERATOR" | "ADMIN"
    approved: boolean
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session as AuthSession
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") redirect("/")
  return session
}

export async function requireApproved(): Promise<AuthSession> {
  const session = await requireAuth()
  if (!session.user.approved) redirect("/pending")
  return session
}
