"use client"

import { useState, useTransition } from "react"
import { addEventTagAction } from "@/app/actions/events"

export function TagSuggestion({
  eventId,
  initialTags,
}: {
  eventId: string
  initialTags: { id: string; name: string; slug: string }[]
}) {
  const [tags, setTags] = useState(initialTags)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const name = input.trim()
    if (!name) return
    setError(null)
    startTransition(async () => {
      const result = await addEventTagAction(eventId, name)
      if (result.error) {
        setError(result.error)
      } else {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        setTags((prev) => {
          if (prev.some((t) => t.slug === slug)) return prev
          return [...prev, { id: slug, name, slug }]
        })
        setInput("")
      }
    })
  }

  return (
    <div className="mt-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          placeholder="Add a tag…"
          maxLength={50}
          className="px-2.5 py-1 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 w-40"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
          className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
