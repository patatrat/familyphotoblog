"use client"

import { useCallback, useRef, useState } from "react"
import { usePhotoUpload } from "@/hooks/use-photo-upload"

export function UserPhotoUpload({ eventId }: { eventId: string }) {
  const [submitted, setSubmitted] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { handleUpload, isUploading, progress, errors } = usePhotoUpload(
    eventId,
    () => setSubmitted((prev) => prev + 1)
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
        Add photos
      </h2>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files)
              e.target.value = ""
            }
          }}
        />
        {isUploading ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
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

      {errors.length > 0 && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {errors.length} failed:{" "}
          {errors.map((e) => e.split(":")[0]).join(", ")}
        </p>
      )}

      {submitted > 0 && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {submitted} photo{submitted !== 1 ? "s" : ""} submitted for review. An admin will approve them shortly.
        </p>
      )}
    </section>
  )
}
