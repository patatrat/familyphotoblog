export default function HomeLoading() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="aspect-[4/3] bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
