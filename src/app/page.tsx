import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { blobProxy } from "@/lib/blob-url"
import Link from "next/link"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; submitted?: string }>
}) {
  const { tag, submitted } = await searchParams
  const session = await requireApproved()

  const photoFields = {
    where: { status: "VISIBLE" as const },
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      thumbnailUrl: true,
      _count: { select: { comments: true, reactions: true } },
    },
  }
  const tagInclude = { include: { tag: true } }

  const publishedWhere = tag
    ? { status: "PUBLISHED" as const, tags: { some: { tag: { slug: tag } } } }
    : { status: "PUBLISHED" as const }

  const events = await db.event.findMany({
    where: publishedWhere,
    orderBy: { date: "desc" },
    include: {
      photos: photoFields,
      tags: tagInclude,
      _count: { select: { photos: { where: { status: "VISIBLE" } } } },
    },
  })

  const isAdmin = session.user.role === "ADMIN"

  // Admins see all drafts; non-admins see their own PENDING events
  const drafts = isAdmin
    ? await db.event.findMany({
        where: { status: "DRAFT" },
        orderBy: { date: "desc" },
        include: {
          photos: photoFields,
          tags: tagInclude,
          _count: { select: { photos: { where: { status: "VISIBLE" } } } },
        },
      })
    : []

  const myPending = !isAdmin
    ? await db.event.findMany({
        where: { status: "PENDING", createdBy: session.user.id },
        orderBy: { date: "desc" },
        include: {
          photos: photoFields,
          tags: tagInclude,
          _count: { select: { photos: { where: { status: "VISIBLE" } } } },
        },
      })
    : []

  // All tags used in published events for the filter bar
  const allTags = await db.tag.findMany({
    where: { events: { some: { event: { status: "PUBLISHED" } } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* Submission confirmation banner */}
        {submitted === "event" && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
            Your event has been submitted for review. An admin will approve it shortly.
          </div>
        )}

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/"
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !tag
                  ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              All
            </Link>
            {allTags.map((t) => (
              <Link
                key={t.id}
                href={`/?tag=${t.slug}`}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  tag === t.slug
                    ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {drafts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
              Drafts
            </h2>
            <EventGrid events={drafts} isDraft />
          </section>
        )}

        {myPending.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
              Pending approval
            </h2>
            <EventGrid events={myPending} isPending />
          </section>
        )}

        {events.length === 0 && drafts.length === 0 && myPending.length === 0 ? (
          <p className="text-center text-zinc-400 dark:text-zinc-500 py-20">
            {tag ? `No events tagged "${tag}".` : "No events yet."}
          </p>
        ) : (
          <EventGrid events={events} />
        )}
      </main>
    </div>
  )
}

type EventWithTags = {
  id: string
  title: string
  date: Date
  featuredPhotoId: string | null
  photos: { id: string; thumbnailUrl: string; _count: { comments: number; reactions: number } }[]
  tags: { tag: { id: string; name: string; slug: string } }[]
  _count: { photos: number }
}

function EventGrid({
  events,
  isDraft,
  isPending,
}: {
  events: EventWithTags[]
  isDraft?: boolean
  isPending?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <Link
          key={event.id}
          href={isDraft ? `/events/${event.id}/edit` : `/events/${event.id}`}
          className={`group block bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border transition-colors ${
            isPending
              ? "border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 pointer-events-none"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
            {event.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobProxy(
                  (event.featuredPhotoId
                    ? event.photos.find((p) => p.id === event.featuredPhotoId)
                    : undefined
                  )?.thumbnailUrl ?? event.photos[0].thumbnailUrl
                )}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {isDraft && (
              <span className="absolute top-2 left-2 text-xs bg-zinc-900/70 text-white px-2 py-0.5 rounded">
                Draft
              </span>
            )}
            {isPending && (
              <span className="absolute top-2 left-2 text-xs bg-amber-500/90 text-white px-2 py-0.5 rounded">
                Pending approval
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
              {(() => {
                const totalComments = event.photos.reduce((s, p) => s + p._count.comments, 0)
                const totalReactions = event.photos.reduce((s, p) => s + p._count.reactions, 0)
                return (
                  <>
                    {totalReactions > 0 && <>{" · "}{totalReactions} ❤️</>}
                    {totalComments > 0 && <>{" · "}{totalComments} 💬</>}
                  </>
                )
              })()}
            </p>
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {event.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
