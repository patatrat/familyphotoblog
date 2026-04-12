import { requireAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { Nav } from "@/components/nav"
import { approveUserAction, revokeUserAction, deleteUserAction, setRoleAction } from "@/app/actions/admin"
import { getSettings } from "@/lib/settings"
import Link from "next/link"

export default async function AdminPage() {
  const session = await requireAdmin()
  const settings = await getSettings()

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      createdAt: true,
    },
  })

  const pending = users.filter((u) => !u.approved)
  const approved = users.filter((u) => u.approved)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav session={session} />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* Pending approval queue */}
        {settings.approvalRequired && pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">
              Pending approval ({pending.length})
            </h2>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-amber-200 dark:border-amber-900 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pending.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 text-xs hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString("en-NZ")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <form action={approveUserAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <button type="submit" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                              Approve
                            </button>
                          </form>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <button type="submit" className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* All users */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              Users ({approved.length} approved{pending.length > 0 ? `, ${pending.length} pending` : ""})
            </h2>
            <Link
              href="/admin/settings"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              Settings →
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.map((user) => (
                  <tr key={user.id} className="group">
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{user.name}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.id === session.user.id ? (
                        <span className="text-zinc-500 dark:text-zinc-400">{user.role}</span>
                      ) : (
                        <form action={setRoleAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="role"
                            defaultValue={user.role}
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                            className="text-sm bg-transparent text-zinc-700 dark:text-zinc-300 border-0 focus:outline-none cursor-pointer"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.approved ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Approved</span>
                      ) : (
                        <span className="text-amber-500">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== session.user.id && (
                        <div className="flex items-center gap-3 justify-end">
                          {!user.approved && (
                            <form action={approveUserAction}>
                              <input type="hidden" name="userId" value={user.id} />
                              <button type="submit" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                                Approve
                              </button>
                            </form>
                          )}
                          {user.approved && (
                            <form action={revokeUserAction}>
                              <input type="hidden" name="userId" value={user.id} />
                              <button type="submit" className="text-xs text-amber-500 hover:underline">
                                Revoke
                              </button>
                            </form>
                          )}
                          <form action={deleteUserAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <button type="submit" className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
