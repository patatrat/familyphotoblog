"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { del } from "@vercel/blob"
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

  // Photo.uploadedBy and Event.createdBy have no onDelete rule, so deleting a
  // user who owns content fails with a FK error — surface it instead
  const [photoCount, eventCount] = await Promise.all([
    db.photo.count({ where: { uploadedBy: userId } }),
    db.event.count({ where: { createdBy: userId } }),
  ])
  if (photoCount > 0 || eventCount > 0) {
    redirect("/admin?error=user-has-content")
  }

  // Their interaction rows also block the delete (no cascade on these relations)
  await db.reaction.deleteMany({ where: { userId } })
  await db.comment.deleteMany({ where: { userId } })

  // Sessions, accounts, notifications cascade via Prisma schema onDelete: Cascade
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

// ─── Pending event actions ────────────────────────────────────────────────────

export async function approveEventAction(eventId: string): Promise<void> {
  await requireAdmin()
  await db.event.update({ where: { id: eventId }, data: { status: "DRAFT" } })
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function rejectEventAction(eventId: string): Promise<void> {
  await requireAdmin()
  await db.event.delete({ where: { id: eventId } })
  revalidatePath("/admin")
  revalidatePath("/")
}

// ─── Pending photo actions ────────────────────────────────────────────────────

export async function approvePhotoAction(photoId: string): Promise<void> {
  await requireAdmin()
  const photo = await db.photo.update({
    where: { id: photoId },
    data: { status: "VISIBLE" },
  })
  revalidatePath("/admin")
  revalidatePath(`/events/${photo.eventId}`)
}

export async function rejectPhotoAction(photoId: string): Promise<void> {
  await requireAdmin()
  const photo = await db.photo.findUnique({ where: { id: photoId } })
  if (!photo) return
  const blobsToDelete = [photo.blobUrl, photo.thumbnailUrl, photo.midSizeUrl].filter(
    (url): url is string => url !== null
  )
  if (blobsToDelete.length > 0) await del(blobsToDelete)
  await db.photo.delete({ where: { id: photoId } })
  revalidatePath("/admin")
  revalidatePath(`/events/${photo.eventId}`)
}
