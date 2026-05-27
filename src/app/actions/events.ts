"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { del } from "@vercel/blob"
import { db } from "@/lib/db"
import { requireApproved, requireAdmin } from "@/lib/session"
import { getSettings } from "@/lib/settings"
import { setEventTags, toSlug } from "@/lib/tags"
import { sendNewEventEmails } from "@/lib/email"

export type EventFormState = { error?: string } | undefined

export async function createEventAction(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireApproved()
  const isAdmin = session.user.role === "ADMIN"

  if (!isAdmin) {
    const settings = await getSettings()
    if (!settings.userEventsEnabled) return { error: "Event submissions are not enabled." }
  }

  const title = (formData.get("title") as string)?.trim()
  const dateStr = formData.get("date") as string
  const description = (formData.get("description") as string)?.trim() || null

  if (!title) return { error: "Title is required." }
  if (!dateStr) return { error: "Date is required." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { error: "Invalid date." }

  const event = await db.event.create({
    data: {
      title,
      date,
      description,
      createdBy: session.user.id,
      status: isAdmin ? "DRAFT" : "PENDING",
    },
  })

  if (isAdmin) {
    redirect(`/events/${event.id}/edit`)
  } else {
    redirect("/?submitted=event")
  }
}

export async function updateEventAction(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireApproved()
  const isAdmin = session.user.role === "ADMIN"

  const id = formData.get("id") as string
  const title = (formData.get("title") as string)?.trim()
  const dateStr = formData.get("date") as string
  const description = (formData.get("description") as string)?.trim() || null

  if (!title) return { error: "Title is required." }
  if (!dateStr) return { error: "Date is required." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { error: "Invalid date." }

  if (!isAdmin) {
    const event = await db.event.findUnique({
      where: { id },
      select: { createdBy: true, status: true },
    })
    if (!event || event.createdBy !== session.user.id || event.status !== "PENDING") {
      return { error: "Not authorized to edit this event." }
    }
  }

  await db.event.update({
    where: { id },
    data: { title, date, description },
  })

  if (isAdmin) {
    const tagsRaw = (formData.get("tags") as string) ?? ""
    await setEventTags(id, tagsRaw)
  }

  revalidatePath("/")
  revalidatePath(`/events/${id}`)
  revalidatePath(`/events/${id}/edit`)
  return undefined
}

export async function publishEventAction(eventId: string): Promise<void> {
  const session = await requireAdmin()

  const event = await db.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
  })

  revalidatePath("/")
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/edit`)

  // Create in-app NEW_EVENT notifications for all approved non-creator users
  void db.user
    .findMany({
      where: { approved: true, NOT: { id: session.user.id } },
      select: { id: true },
    })
    .then((users) =>
      db.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: "NEW_EVENT" as const,
          actorId: session.user.id,
          eventId,
        })),
        skipDuplicates: true,
      })
    )
    .catch((err) => console.error("[publishEvent] notification creation failed:", err))

  // Fire-and-forget — email is non-critical and can be slow; don't block the response
  void getSettings()
    .then((settings) => {
      if (!settings.eventEmailsEnabled) return
      return db.user
        .findMany({
          where: { approved: true, emailNewEvents: true, NOT: { id: session.user.id } },
          select: { email: true, name: true },
        })
        .then((recipients) => sendNewEventEmails(event, recipients))
    })
    .catch((err) => console.error("[publishEvent] email notification failed:", err))
}

export async function deletePhotoAction(photoId: string, eventId: string): Promise<void> {
  await requireAdmin()

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { blobUrl: true, thumbnailUrl: true, midSizeUrl: true },
  })

  await db.reaction.deleteMany({ where: { photoId } })
  await db.comment.deleteMany({ where: { photoId } })
  await db.removalRequest.deleteMany({ where: { photoId } })
  await db.photo.delete({ where: { id: photoId } })

  if (photo) {
    const blobsToDelete = [photo.blobUrl, photo.thumbnailUrl, photo.midSizeUrl].filter(
      (url): url is string => url !== null
    )
    if (blobsToDelete.length > 0) {
      try {
        await del(blobsToDelete)
      } catch (err) {
        console.error("[deletePhoto] blob deletion failed:", err)
      }
    }
  }

  revalidatePath(`/events/${eventId}/edit`)
  revalidatePath(`/events/${eventId}`)
}

export async function unpublishEventAction(eventId: string): Promise<void> {
  await requireAdmin()

  await db.event.update({
    where: { id: eventId },
    data: { status: "DRAFT" },
  })

  revalidatePath("/")
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/edit`)
}

export async function deleteEventAction(eventId: string): Promise<void> {
  await requireAdmin()

  const photos = await db.photo.findMany({
    where: { eventId },
    select: { id: true, blobUrl: true, thumbnailUrl: true, midSizeUrl: true },
  })

  const photoIds = photos.map((p) => p.id)

  // Delete child records in dependency order before removing photos and event
  if (photoIds.length > 0) {
    await db.reaction.deleteMany({ where: { photoId: { in: photoIds } } })
    await db.comment.deleteMany({ where: { photoId: { in: photoIds } } })
    await db.removalRequest.deleteMany({ where: { photoId: { in: photoIds } } })
    await db.photo.deleteMany({ where: { eventId } })
  }

  await db.eventTag.deleteMany({ where: { eventId } })
  await db.event.delete({ where: { id: eventId } })

  const blobsToDelete = photos
    .flatMap((p) => [p.blobUrl, p.thumbnailUrl, p.midSizeUrl])
    .filter((url): url is string => url !== null)

  if (blobsToDelete.length > 0) {
    try {
      await del(blobsToDelete)
    } catch (err) {
      console.error("[deleteEvent] blob deletion failed:", err)
    }
  }

  revalidatePath("/")
  redirect("/")
}

export async function reorderPhotosAction(
  eventId: string,
  orderedPhotoIds: string[]
): Promise<{ error?: string }> {
  await requireAdmin()

  const photos = await db.photo.findMany({
    where: { eventId, id: { in: orderedPhotoIds } },
    select: { id: true },
  })

  if (photos.length !== orderedPhotoIds.length) {
    return { error: "Some photos do not belong to this event." }
  }

  await db.$transaction(
    orderedPhotoIds.map((id, index) =>
      db.photo.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/edit`)
  return {}
}

export async function setFeaturedPhotoAction(eventId: string, photoId: string): Promise<void> {
  await requireAdmin()

  await db.event.update({
    where: { id: eventId },
    data: { featuredPhotoId: photoId },
  })

  revalidatePath("/")
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/edit`)
}

export async function addEventTagAction(
  eventId: string,
  tagName: string
): Promise<{ error?: string }> {
  await requireApproved()

  const name = tagName.trim()
  if (!name) return { error: "Tag name is required." }
  if (name.length > 50) return { error: "Tag name too long." }

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  })
  if (!event || event.status !== "PUBLISHED") return { error: "Event not found." }

  const slug = toSlug(name)
  const tag = await db.tag.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  })

  await db.eventTag.upsert({
    where: { eventId_tagId: { eventId, tagId: tag.id } },
    update: {},
    create: { eventId, tagId: tag.id },
  })

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/")
  return {}
}
