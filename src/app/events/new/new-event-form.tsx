"use client"

import { useActionState } from "react"
import { createEventAction } from "@/app/actions/events"
import Link from "next/link"

export function NewEventForm({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(createEventAction, undefined)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            New event
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {!isAdmin && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Your event will be reviewed by an admin before it becomes visible to the family.
          </p>
        )}

        <form action={action} className="space-y-5">
          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Christmas 2024"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Description{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="A short description of the event"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {pending ? "Submitting…" : isAdmin ? "Create event" : "Submit for review"}
          </button>
        </form>
      </main>
    </div>
  )
}
