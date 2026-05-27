"use server"

import { db } from "@/lib/db"
import { requireApproved } from "@/lib/session"

export type NotificationItem = {
  id: string
  type: "NEW_EVENT" | "MENTION" | "REACTION"
  read: boolean
  createdAt: Date
  actor: { name: string } | null
  event: { id: string; title: string } | null
  photoId: string | null
  commentId: string | null
}

export async function getNotificationsAction(): Promise<NotificationItem[]> {
  const session = await requireApproved()

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      read: true,
      createdAt: true,
      photoId: true,
      commentId: true,
      actor: { select: { name: true } },
      event: { select: { id: true, title: true } },
    },
  })

  return notifications
}

export async function getUnreadCountAction(): Promise<number> {
  const session = await requireApproved()
  return db.notification.count({
    where: { userId: session.user.id, read: false },
  })
}

export async function markAllReadAction(): Promise<void> {
  const session = await requireApproved()
  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })
}
