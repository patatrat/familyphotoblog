import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { EventEditForm } from "./event-edit-form"

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireAdmin()

  const event = await db.event.findUnique({
    where: { id },
    include: {
      photos: {
        where: { status: "VISIBLE" },
        orderBy: { sortOrder: "asc" },
      },
      tags: { include: { tag: true } },
    },
  })

  if (!event) notFound()

  return (
    <EventEditForm
      event={{
        id: event.id,
        title: event.title,
        date: event.date.toISOString().split("T")[0],
        description: event.description ?? "",
        status: event.status,
        featuredPhotoId: event.featuredPhotoId,
        tags: event.tags.map((t) => t.tag.name).join(", "),
        photos: event.photos.map((p) => ({
          id: p.id,
          thumbnailUrl: p.thumbnailUrl,
          caption: p.caption ?? null,
        })),
      }}
    />
  )
}
