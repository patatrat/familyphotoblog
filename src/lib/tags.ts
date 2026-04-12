import { db } from "./db"

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Replace all tags on an event with the parsed tag string (comma-separated). */
export async function setEventTags(eventId: string, raw: string): Promise<void> {
  const names = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20) // safety cap

  // Upsert each tag by slug
  const tags = await Promise.all(
    names.map((name) =>
      db.tag.upsert({
        where: { slug: toSlug(name) },
        update: {},
        create: { name, slug: toSlug(name) },
      })
    )
  )

  // Replace junction rows
  await db.eventTag.deleteMany({ where: { eventId } })
  if (tags.length > 0) {
    await db.eventTag.createMany({
      data: tags.map((tag) => ({ eventId, tagId: tag.id })),
    })
  }
}
