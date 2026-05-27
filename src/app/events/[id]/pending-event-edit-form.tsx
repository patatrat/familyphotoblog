"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { updateEventAction } from "@/app/actions/events"

export function PendingEventEditForm({
  event,
}: {
  event: { id: string; title: string; date: string; description: string }
}) {
  const [state, action, pending] = useActionState(updateEventAction, undefined)
  const [saved, setSaved] = useState(false)
  const submitted = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (submitted.current && !pending && !state?.error) setSaved(true)
  }, [pending, state])

  return (
    <form
      action={(fd) => { setSaved(false); submitted.current = true; action(fd) }}
      className="space-y-3 max-w-lg"
    >
      <input type="hidden" name="id" value={event.id} />

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Title
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={event.title}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Date
        </label>
        <input
          name="date"
          type="date"
          required
          defaultValue={event.date}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Description <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={event.description}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>}
      </div>
    </form>
  )
}
