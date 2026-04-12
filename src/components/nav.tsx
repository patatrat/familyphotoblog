import { logoutAction } from "@/app/actions/auth"
import { getSettings } from "@/lib/settings"
import type { AuthSession } from "@/lib/session"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"

export async function Nav({ session }: { session: AuthSession }) {
  const isAdmin = session.user.role === "ADMIN"
  const settings = await getSettings()
  const canCreateEvent = isAdmin || settings.userEventsEnabled

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Radomski Photos
        </Link>
        <div className="flex items-center gap-4">
          {canCreateEvent && (
            <Link
              href="/events/new"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              New event
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Admin
            </Link>
          )}
          <ThemeToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
