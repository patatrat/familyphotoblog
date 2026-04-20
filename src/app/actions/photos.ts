"use server"

import { revalidatePath } from "next/cache"
import { del } from "@vercel/blob"
import { db } from "@/lib/db"
import { requireApproved, requireAdmin } from "@/lib/session"

export async function requestRemovalAction(
  photoId: string,
  reason: string
): Promise<{ error?: string }> {
  const session = await requireApproved()

  const photo = await db.photo.findUnique({ where: { id: photoId } })
  if (!photo) return { error: "Photo not found." }

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
    // Delete blobs, then the photo row (cascades removal request)
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
