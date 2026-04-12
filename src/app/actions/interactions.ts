"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireApproved, requireAdmin } from "@/lib/session"

export async function addCommentAction(
  photoId: string,
  content: string
): Promise<{ error?: string }> {
  const session = await requireApproved()
  const trimmed = content.trim()
  if (!trimmed) return { error: "Comment cannot be empty." }
  if (trimmed.length > 1000) return { error: "Comment too long (max 1000 characters)." }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { eventId: true },
  })
  if (!photo) return { error: "Photo not found." }

  await db.comment.create({
    data: { photoId, userId: session.user.id, content: trimmed },
  })

  revalidatePath(`/events/${photo.eventId}`)
  return {}
}

export async function deleteCommentAction(
  commentId: string
): Promise<{ error?: string }> {
  await requireAdmin()

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { photo: { select: { eventId: true } } },
  })
  if (!comment) return { error: "Comment not found." }

  await db.comment.delete({ where: { id: commentId } })
  revalidatePath(`/events/${comment.photo.eventId}`)
  return {}
}

export async function toggleReactionAction(
  photoId: string,
  emoji: string
): Promise<void> {
  const session = await requireApproved()

  const existing = await db.reaction.findUnique({
    where: { photoId_userId_emoji: { photoId, userId: session.user.id, emoji } },
  })

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } })
  } else {
    await db.reaction.create({
      data: { photoId, userId: session.user.id, emoji },
    })
  }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { eventId: true },
  })
  if (photo) revalidatePath(`/events/${photo.eventId}`)
}
