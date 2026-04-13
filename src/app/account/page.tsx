import { requireApproved } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { updateAccountAction } from "@/app/actions/account"
import Link from "next/link"

export const metadata = { title: "Account" }

export default async function AccountPage() {
  const session = await requireApproved()

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, emailNewEvents: true },
  })

  if (!user) return null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            ← Home
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Account</h1>
        </div>

        {/* Profile info */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-6 py-5 mb-6 space-y-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.name}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
        </div>

        {/* Notification preferences */}
        <form action={updateAccountAction} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-6 py-5 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                New event emails
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Get an email when new photos are published to the family album.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <input type="radio" name="emailNewEvents" value="true" defaultChecked={user.emailNewEvents} />
                On
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <input type="radio" name="emailNewEvents" value="false" defaultChecked={!user.emailNewEvents} />
                Off
              </label>
            </div>
          </div>
          <div className="px-6 py-4">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
