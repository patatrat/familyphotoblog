import { auth } from "@/auth"
import { logoutAction } from "@/app/actions/auth"

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Radomski Photos
          </h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">
          Welcome, {session?.user?.name}. Events coming soon.
        </p>
      </div>
    </main>
  )
}
