import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { blobProxy } from "@/lib/blob-url"
import Link from "next/link"

export default async function HomePage() {
  const session = await requireApproved()

  const events = await db.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
    include: {
      photos: {
        where: { status: "VISIBLE" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { thumbnailUrl: true },
      },
      _count: { select: { photos: { where: { status: "VISIBLE" } } } },
    },
  })

  // Admins also see their own drafts
  const drafts =
    session.user.role === "ADMIN"
      ? await db.event.findMany({
          where: { status: "DRAFT" },
          orderBy: { date: "desc" },
          include: {
            photos: {
              where: { status: "VISIBLE" },
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { thumbnailUrl: true },
            },
            _count: { select: { photos: { where: { status: "VISIBLE" } } } },
          },
        })
      : []

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        {drafts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
              Drafts
            </h2>
            <EventGrid events={drafts} isDraft />
          </section>
        )}

        {events.length === 0 && drafts.length === 0 ? (
          <p className="text-center text-zinc-400 dark:text-zinc-500 py-20">
            No events yet.
          </p>
        ) : (
          <EventGrid events={events} />
        )}
      </main>
    </div>
  )
}

type EventWithCount = {
  id: string
  title: string
  date: Date
  photos: { thumbnailUrl: string }[]
  _count: { photos: number }
}

function EventGrid({
  events,
  isDraft,
}: {
  events: EventWithCount[]
  isDraft?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <Link
          key={event.id}
          href={isDraft ? `/events/${event.id}/edit` : `/events/${event.id}`}
          className="group block bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
            {event.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobProxy(event.photos[0].thumbnailUrl)}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {isDraft && (
              <span className="absolute top-2 left-2 text-xs bg-zinc-900/70 text-white px-2 py-0.5 rounded">
                Draft
              </span>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {new Date(event.date).toLocaleDateString("en-NZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {event._count.photos}{" "}
              {event._count.photos === 1 ? "photo" : "photos"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
