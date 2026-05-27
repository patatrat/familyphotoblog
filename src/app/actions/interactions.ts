"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireApproved, requireAdmin } from "@/lib/session"
import { sendMentionEmail } from "@/lib/email"

// Basic profanity blocklist — intentionally short to avoid false positives on a family blog
const PROFANITY_RE = /\b(fuck|shit|cunt|cock|dick|pussy|asshole|motherfucker|faggot|nigger|nigga)\b/i

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g

function parseMentions(content: string): { name: string; userId: string }[] {
  const mentions: { name: string; userId: string }[] = []
  let match
  MENTION_RE.lastIndex = 0
  while ((match = MENTION_RE.exec(content)) !== null) {
    mentions.push({ name: match[1], userId: match[2] })
  }
  return mentions
}

export async function addCommentAction(
  photoId: string,
  content: string
): Promise<{ error?: string }> {
  const session = await requireApproved()
  const trimmed = content.trim()
  if (!trimmed) return { error: "Comment cannot be empty." }
  if (trimmed.length > 1000) return { error: "Comment too long (max 1000 characters)." }
  if (PROFANITY_RE.test(trimmed)) return { error: "Comment contains inappropriate language." }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { eventId: true, event: { select: { title: true } } },
  })
  if (!photo) return { error: "Photo not found." }

  const comment = await db.comment.create({
    data: { photoId, userId: session.user.id, content: trimmed },
  })

  const mentions = parseMentions(trimmed)
  if (mentions.length > 0) {
    // Deduplicate by userId, exclude self-mentions
    const uniqueMentionedIds = [...new Set(mentions.map((m) => m.userId))].filter(
      (id) => id !== session.user.id
    )

    if (uniqueMentionedIds.length > 0) {
      // Create in-app notifications
      await db.notification.createMany({
        data: uniqueMentionedIds.map((userId) => ({
          userId,
          type: "MENTION" as const,
          actorId: session.user.id,
          eventId: photo.eventId,
          photoId,
          commentId: comment.id,
        })),
        skipDuplicates: true,
      })

      // Fire-and-forget emails
      void db.user
        .findMany({
          where: { id: { in: uniqueMentionedIds }, emailMentions: true },
          select: { id: true, email: true, name: true },
        })
        .then((recipients) => {
          const commentPreview = trimmed.length > 200 ? trimmed.slice(0, 200) + "…" : trimmed
          return Promise.allSettled(
            recipients.map((r) =>
              sendMentionEmail(
                { email: r.email, name: r.name },
                { name: session.user.name ?? "Someone" },
                {
                  photoId,
                  eventId: photo.eventId,
                  eventTitle: photo.event.title,
                  commentPreview,
                }
              )
            )
          )
        })
        .catch((err) => console.error("[addComment] mention email failed:", err))
    }
  }

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

    // Notify photo uploader (not self)
    const photo = await db.photo.findUnique({
      where: { id: photoId },
      select: { eventId: true, uploadedBy: true },
    })
    if (photo) {
      if (photo.uploadedBy !== session.user.id) {
        // Deduplicate: only one REACTION notification per actor+photo
        const alreadyNotified = await db.notification.findFirst({
          where: {
            userId: photo.uploadedBy,
            type: "REACTION",
            actorId: session.user.id,
            photoId,
          },
        })
        if (!alreadyNotified) {
          await db.notification.create({
            data: {
              userId: photo.uploadedBy,
              type: "REACTION",
              actorId: session.user.id,
              eventId: photo.eventId,
              photoId,
            },
          })
        }
      }
      revalidatePath(`/events/${photo.eventId}`)
    }
    return
  }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { eventId: true },
  })
  if (photo) revalidatePath(`/events/${photo.eventId}`)
}
