"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/session"

export type EventFormState = { error?: string } | undefined

export async function createEventAction(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireAdmin()

  const title = (formData.get("title") as string)?.trim()
  const dateStr = formData.get("date") as string
  const description = (formData.get("description") as string)?.trim() || null

  if (!title) return { error: "Title is required." }
  if (!dateStr) return { error: "Date is required." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { error: "Invalid date." }

  const event = await db.event.create({
    data: { title, date, description, createdBy: session.user.id },
  })

  redirect(`/events/${event.id}/edit`)
}

export async function updateEventAction(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireAdmin()

  const id = formData.get("id") as string
  const title = (formData.get("title") as string)?.trim()
  const dateStr = formData.get("date") as string
  const description = (formData.get("description") as string)?.trim() || null

  if (!title) return { error: "Title is required." }
  if (!dateStr) return { error: "Date is required." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { error: "Invalid date." }

  await db.event.update({
    where: { id },
    data: { title, date, description },
  })

  revalidatePath(`/events/${id}`)
  revalidatePath(`/events/${id}/edit`)
  return undefined
}

export async function publishEventAction(eventId: string): Promise<void> {
  await requireAdmin()

  await db.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
  })

  revalidatePath("/")
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/edit`)
}

export async function deletePhotoAction(photoId: string, eventId: string): Promise<void> {
  await requireAdmin()

  await db.photo.delete({ where: { id: photoId } })

  revalidatePath(`/events/${eventId}/edit`)
  revalidatePath(`/events/${eventId}`)
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
