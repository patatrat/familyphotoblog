"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export async function approveUserAction(formData: FormData) {
  await requireAdmin()
  const userId = formData.get("userId") as string

  await db.user.update({ where: { id: userId }, data: { approved: true } })
  revalidatePath("/admin")
}

export async function revokeUserAction(formData: FormData) {
  await requireAdmin()
  const userId = formData.get("userId") as string

  await db.user.update({ where: { id: userId }, data: { approved: false } })

  // Delete all sessions for this user so they're kicked out
  await db.session.deleteMany({ where: { userId } })

  revalidatePath("/admin")
}

export async function deleteUserAction(formData: FormData) {
  await requireAdmin()
  const userId = formData.get("userId") as string

  // Cascade deletes sessions, accounts via Prisma schema onDelete: Cascade
  await db.user.delete({ where: { id: userId } })

  revalidatePath("/admin")
}

export async function setRoleAction(formData: FormData) {
  await requireAdmin()
  const userId = formData.get("userId") as string
  const role = formData.get("role") as "USER" | "MODERATOR" | "ADMIN"

  if (!["USER", "MODERATOR", "ADMIN"].includes(role)) return

  await db.user.update({ where: { id: userId }, data: { role } })
  revalidatePath("/admin")
}
