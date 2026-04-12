import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { PhotoGrid } from "./photo-grid"
import { notFound } from "next/navigation"
import Link from "next/link"

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🙌"]

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
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, name: true } } },
          },
          reactions: { select: { emoji: true, userId: true } },
        },
      },
      creator: { select: { name: true } },
    },
  })

  if (!event) notFound()
  if (event.status !== "PUBLISHED" && session.user.role !== "ADMIN") notFound()

  const photos = event.photos.map((p) => ({
    id: p.id,
    thumbnailUrl: p.thumbnailUrl,
    midSizeUrl: p.midSizeUrl,
    caption: p.caption,
    comments: p.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      userId: c.user.id,
      userName: c.user.name,
    })),
    reactions: EMOJIS.map((emoji) => ({
      emoji,
      count: p.reactions.filter((r) => r.emoji === emoji).length,
      userReacted: p.reactions.some(
        (r) => r.emoji === emoji && r.userId === session.user.id
      ),
    })),
  }))

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
          <PhotoGrid
            photos={photos}
            currentUserId={session.user.id}
            isAdmin={session.user.role === "ADMIN"}
          />
        )}
      </main>
    </div>
  )
}
