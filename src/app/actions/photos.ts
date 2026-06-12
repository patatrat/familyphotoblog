"use server"

import { revalidatePath } from "next/cache"
import { del } from "@vercel/blob"
import { db } from "@/lib/db"
import { requireApproved, requireAdmin } from "@/lib/session"

export async function updatePhotoCaptionAction(
  photoId: string,
  caption: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const trimmed = caption.trim()
  if (trimmed.length > 500) return { error: "Caption too long (max 500 characters)." }
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { eventId: true } })
  if (!photo) return { error: "Photo not found." }
  await db.photo.update({ where: { id: photoId }, data: { caption: trimmed || null } })
  revalidatePath(`/events/${photo.eventId}`)
  revalidatePath(`/events/${photo.eventId}/edit`)
  return {}
}

export async function requestRemovalAction(
  photoId: string,
  reason: string
): Promise<{ error?: string }> {
  const session = await requireApproved()

  if (reason.length > 500) return { error: "Reason too long (max 500 characters)." }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    include: { event: { select: { status: true } } },
  })
  if (!photo) return { error: "Photo not found." }

  // Only allow removal requests on photos from published events
  if (photo.event.status !== "PUBLISHED") return { error: "Photo not found." }

  // Prevent re-hiding if already hidden (blocks restore-then-immediately-rehide abuse)
  if (photo.status === "HIDDEN") return { error: "A removal request is already pending for this photo." }

  // Hide immediately — removal request is admin's to resolve
  await db.photo.update({ where: { id: photoId }, data: { status: "HIDDEN" } })

  await db.removalRequest.upsert({
    where: { photoId },
    update: {
      requestedBy: session.user.id,
      reason: reason.trim() || null,
      status: "PENDING",
    },
    create: {
      photoId,
      requestedBy: session.user.id,
      reason: reason.trim() || null,
    },
  })

  revalidatePath(`/events/${photo.eventId}`)
  revalidatePath("/admin")
  return {}
}

export async function resolveRemovalAction(
  requestId: string,
  resolution: "delete" | "restore"
): Promise<void> {
  await requireAdmin()

  const request = await db.removalRequest.findUnique({
    where: { id: requestId },
    include: { photo: true },
  })
  if (!request) return

  if (resolution === "delete") {
    const blobsToDelete = [
      request.photo.blobUrl,
      request.photo.thumbnailUrl,
      request.photo.midSizeUrl,
    ].filter((url): url is string => url !== null)
    if (blobsToDelete.length > 0) {
      try {
        await del(blobsToDelete)
      } catch (err) {
        console.error("[resolveRemoval] blob deletion failed:", err)
      }
    }
    // Delete child records in FK order before removing the photo row
    await db.reaction.deleteMany({ where: { photoId: request.photoId } })
    await db.comment.deleteMany({ where: { photoId: request.photoId } })
    await db.removalRequest.delete({ where: { id: requestId } })
    await db.photo.delete({ where: { id: request.photoId } })
  } else {
    await db.photo.update({
      where: { id: request.photoId },
      data: { status: "VISIBLE" },
    })
    await db.removalRequest.update({
      where: { id: requestId },
      data: { status: "RESTORED" },
    })
    revalidatePath(`/events/${request.photo.eventId}`)
  }

  revalidatePath("/admin")
}
