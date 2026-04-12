export default function EventLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Nav skeleton */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Event title area */}
        <div className="mb-8 space-y-2">
          <div className="h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-7 w-64 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
              style={{ animationDelay: `${(i % 4) * 75}ms` }}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
