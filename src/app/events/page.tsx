import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { blobProxy } from "@/lib/blob-url"
import Link from "next/link"

export default async function ArchivePage() {
  const session = await requireApproved()

  const events = await db.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
    include: {
      photos: {
        where: { status: "VISIBLE" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, thumbnailUrl: true },
        take: 1,
      },
      tags: { include: { tag: true } },
      _count: { select: { photos: { where: { status: "VISIBLE" } } } },
    },
  })

  // Group by year
  const byYear = new Map<number, typeof events>()
  for (const event of events) {
    const year = new Date(event.date).getFullYear()
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(event)
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              Home
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">All events</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        </div>

        {events.length === 0 ? (
          <p className="text-center text-zinc-400 dark:text-zinc-500 py-20">No events yet.</p>
        ) : (
          <div className="space-y-10">
            {years.map((year) => (
              <section key={year}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
                  {year}
                </h2>
                <div className="space-y-2">
                  {byYear.get(year)!.map((event) => {
                    const thumb = event.featuredPhotoId
                      ? event.photos.find((p) => p.id === event.featuredPhotoId)?.thumbnailUrl
                      : event.photos[0]?.thumbnailUrl
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="group flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={blobProxy(thumb)}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors truncate">
                            {event.title}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {new Date(event.date).toLocaleDateString("en-NZ", {
                              month: "long",
                              day: "numeric",
                            })}
                            {" · "}
                            {event._count.photos}{" "}
                            {event._count.photos === 1 ? "photo" : "photos"}
                          </p>
                          {event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {event.tags.map(({ tag }) => (
                                <span
                                  key={tag.id}
                                  className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <svg
                          className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
