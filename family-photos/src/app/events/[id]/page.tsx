import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireApproved()

  const event = await db.event.findUnique({
    where: { id },
    include: {
      photos: {
        where: { status: "VISIBLE" },
        orderBy: { sortOrder: "asc" },
      },
      creator: { select: { name: true } },
    },
  })

  if (!event) notFound()

  // Non-admins can't see drafts
  if (event.status !== "PUBLISHED" && session.user.role !== "ADMIN") notFound()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/"
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  Home
                </Link>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {event.title}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {event.title}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {new Date(event.date).toLocaleDateString("en-NZ", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {" · "}
                {event.photos.length}{" "}
                {event.photos.length === 1 ? "photo" : "photos"}
                {event.status === "DRAFT" && (
                  <span className="ml-2 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
              </p>
              {event.description && (
                <p className="mt-3 text-zinc-600 dark:text-zinc-300 text-sm max-w-prose">
                  {event.description}
                </p>
              )}
            </div>

            {session.user.role === "ADMIN" && (
              <Link
                href={`/events/${id}/edit`}
                className="shrink-0 text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        {event.photos.length === 0 ? (
          <p className="text-center text-zinc-400 dark:text-zinc-500 py-20">
            No photos yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {event.photos.map((photo, i) => (
              <div
                key={photo.id}
                className="aspect-square relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 group cursor-pointer"
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.caption ?? `Photo ${i + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
