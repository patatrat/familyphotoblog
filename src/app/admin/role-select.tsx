"use client"

import { setRoleAction } from "@/app/actions/admin"

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <form action={setRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="text-sm bg-transparent text-zinc-700 dark:text-zinc-300 border-0 focus:outline-none cursor-pointer"
      >
        <option value="USER">USER</option>
        <option value="MODERATOR">MODERATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </form>
  )
}
