import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { logoutAction } from "@/app/actions/auth"

export default async function PendingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session as { user: { approved?: boolean } }).user.approved) redirect("/")

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Account pending approval
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Your account is waiting for an admin to approve it. You&apos;ll
          receive an email once approved.
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
