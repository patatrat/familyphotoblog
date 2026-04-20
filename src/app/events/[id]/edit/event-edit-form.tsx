"use client"

import { useActionState, useCallback, useEffect, useRef, useState } from "react"
import {
  updateEventAction,
  publishEventAction,
  deletePhotoAction,
  setFeaturedPhotoAction,
} from "@/app/actions/events"
import { blobProxy } from "@/lib/blob-url"
import { usePhotoUpload } from "@/hooks/use-photo-upload"
import Link from "next/link"

type Photo = { id: string; thumbnailUrl: string; caption: string | null }

type EventData = {
  id: string
  title: string
  date: string
  description: string
  tags: string
  status: "DRAFT" | "PENDING" | "PUBLISHED"
  photos: Photo[]
  featuredPhotoId: string | null
}

export function EventEditForm({ event }: { event: EventData }) {
  const [state, action, pending] = useActionState(updateEventAction, undefined)
  const [photos, setPhotos] = useState<Photo[]>(event.photos)
  const [featuredPhotoId, setFeaturedPhotoId] = useState<string | null>(event.featuredPhotoId)
  const [saved, setSaved] = useState(false)
  const submitted = useRef(false)

  const { handleUpload, isUploading, progress, errors: uploadErrors } = usePhotoUpload(
    event.id,
    (photo) =>
      setPhotos((prev) => [
        ...prev,
        { id: photo.photoId, thumbnailUrl: photo.thumbnailUrl, caption: null },
      ])
  )

  useEffect(() => {
    if (submitted.current && !pending && !state?.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true)
    }
  }, [pending, state])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      if (featuredPhotoId === photoId) setFeaturedPhotoId(null)
    },
    [event.id, featuredPhotoId]
  )

  const handleSetFeatured = useCallback(
    async (photoId: string) => {
      await setFeaturedPhotoAction(event.id, photoId)
      setFeaturedPhotoId(photoId)
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

            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Tags{" "}
                <span className="text-zinc-400 font-normal">(comma-separated, optional)</span>
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                defaultValue={event.tags}
                placeholder="Christmas, Family, Auckland"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {isUploading ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                {progress
                  ? `Uploading ${progress.done} of ${progress.total}…`
                  : "Uploading…"}
              </p>
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

          {uploadErrors.length > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {uploadErrors.length} failed:{" "}
              {uploadErrors.map((e) => e.split(":")[0]).join(", ")}
            </p>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => {
                const isCover = photo.id === featuredPhotoId
                return (
                  <div key={photo.id} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blobProxy(photo.thumbnailUrl)}
                      alt={photo.caption ?? "Photo"}
                      className="w-full h-full object-cover rounded-lg"
                    />

                    {/* Cover badge */}
                    {isCover && (
                      <span className="absolute bottom-1 left-1 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium pointer-events-none">
                        Cover
                      </span>
                    )}

                    {/* Hover controls */}
                    <div className="absolute inset-0 rounded-lg hidden group-hover:flex flex-col items-end justify-between p-1 bg-black/10">
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(photo.id)}
                        className="w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                        aria-label="Delete photo"
                      >
                        ×
                      </button>

                      {/* Set as cover */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetFeatured(photo.id)}
                          className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded hover:bg-amber-500 transition-colors"
                        >
                          Set cover
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
