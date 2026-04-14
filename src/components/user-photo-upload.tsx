"use client"

import { useCallback, useRef, useState } from "react"

export function UserPhotoUpload({ eventId }: { eventId: string }) {
  type UploadItem = { name: string; status: "uploading" | "done" | "error"; error?: string }
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [totalSubmitted, setTotalSubmitted] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files)
      setUploadQueue(fileArray.map((f) => ({ name: f.name, status: "uploading" as const })))

      let successCount = 0
      await Promise.allSettled(
        fileArray.map(async (file, i) => {
          const formData = new FormData()
          formData.append("file", file)
          try {
            const res = await fetch(`/api/events/${eventId}/upload`, {
              method: "POST",
              body: formData,
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              setUploadQueue((prev) =>
                prev.map((item, j) =>
                  j === i ? { ...item, status: "error", error: body.error ?? "Upload failed" } : item
                )
              )
              return
            }
            successCount++
            setUploadQueue((prev) =>
              prev.map((item, j) => (j === i ? { ...item, status: "done" } : item))
            )
          } catch {
            setUploadQueue((prev) =>
              prev.map((item, j) =>
                j === i ? { ...item, status: "error", error: "Connection error" } : item
              )
            )
          }
        })
      )

      if (successCount > 0) setTotalSubmitted((prev) => prev + successCount)

      // Clear queue after a short delay if no failures
      setTimeout(() => {
        setUploadQueue((prev) => (prev.some((i) => i.status === "error") ? prev : []))
      }, 2000)
    },
    [eventId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  const uploading = uploadQueue.some((i) => i.status === "uploading")
  const done = uploadQueue.filter((i) => i.status === "done").length
  const failed = uploadQueue.filter((i) => i.status === "error")
  const total = uploadQueue.length

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
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Drop photos here or click to browse
        </p>
        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
          Select multiple files — EXIF data (including GPS) stripped automatically
        </p>
      </div>

      {uploadQueue.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              {uploading ? `Uploading ${done} / ${total}…` : `${done} of ${total} uploaded`}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
          {failed.map((item, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400">
              {item.name}: {item.error}
            </p>
          ))}
        </div>
      )}

      {totalSubmitted > 0 && uploadQueue.length === 0 && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {totalSubmitted} photo{totalSubmitted !== 1 ? "s" : ""} submitted for review. An admin will approve them shortly.
        </p>
      )}
    </section>
  )
}
