"use client"

import { useActionState, useCallback, useEffect, useRef, useState } from "react"
import {
  updateEventAction,
  publishEventAction,
  deletePhotoAction,
} from "@/app/actions/events"
import Link from "next/link"
import Image from "next/image"

type Photo = { id: string; thumbnailUrl: string; caption: string | null }

type EventData = {
  id: string
  title: string
  date: string
  description: string
  status: "DRAFT" | "PENDING" | "PUBLISHED"
  photos: Photo[]
}

export function EventEditForm({ event }: { event: EventData }) {
  const [state, action, pending] = useActionState(updateEventAction, undefined)
  const [photos, setPhotos] = useState<Photo[]>(event.photos)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && !pending && !state?.error) {
      setSaved(true)
    }
  }, [pending, state])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (files: FileList) => {
      setUploading(true)
      setUploadError(null)

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        try {
          const res = await fetch(`/api/events/${event.id}/upload`, {
            method: "POST",
            body: formData,
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            setUploadError(body.error ?? "Upload failed")
            break
          }
          const data = (await res.json()) as {
            photoId: string
            thumbnailUrl: string
          }
          setPhotos((prev) => [
            ...prev,
            { id: data.photoId, thumbnailUrl: data.thumbnailUrl, caption: null },
          ])
        } catch {
          setUploadError("Upload failed — check your connection")
          break
        }
      }

      setUploading(false)
    },
    [event.id]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files)
      }
    },
    [handleUpload]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files)
      }
    },
    [handleUpload]
  )

  const handleDelete = useCallback(
    async (photoId: string) => {
      if (!confirm("Delete this photo?")) return
      await deletePhotoAction(photoId, event.id)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    },
    [event.id]
  )

  const handlePublish = useCallback(async () => {
    if (!confirm("Publish this event? It will be visible to all family members.")) return
    await publishEventAction(event.id)
  }, [event.id])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              ← Home
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {event.status === "DRAFT" ? "Edit draft" : "Edit event"}
            </h1>
            {event.status === "PUBLISHED" && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                Published
              </span>
            )}
          </div>
          {event.status === "PUBLISHED" && (
            <Link
              href={`/events/${event.id}`}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              View →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Details form */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">
            Details
          </h2>
          <form
            action={(fd) => {
              setSaved(false)
              submitted.current = true
              action(fd)
            }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 max-w-lg"
          >
            <input type="hidden" name="id" value={event.id} />

            {state?.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            )}
            {saved && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
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
                defaultValue={event.title}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
                defaultValue={event.date}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
                defaultValue={event.description}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save details"}
              </button>

              {event.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Publish
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Photo upload */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">
            Photos
          </h2>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors mb-6"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {uploading ? (
              <p className="text-zinc-500 dark:text-zinc-400">Uploading…</p>
            ) : (
              <>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Drop photos here or click to browse
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                  EXIF data (including GPS) stripped automatically
                </p>
              </>
            )}
          </div>

          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{uploadError}</p>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.caption ?? "Photo"}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs hidden group-hover:flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label="Delete photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
