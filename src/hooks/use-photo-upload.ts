"use client"

import { useCallback, useState } from "react"

const CONCURRENCY = 3
const VIDEO_EXTS = new Set(["mov", "mp4", "avi", "mkv", "webm", "m4v", "m4p", "3gp"])

type UploadResult = { photoId: string; thumbnailUrl: string; pending: boolean }

export function usePhotoUpload(
  eventId: string,
  onSuccess?: (photo: UploadResult) => void
) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const handleUpload = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setIsUploading(true)
      setProgress({ done: 0, total: fileArray.length })
      setErrors([])

      let index = 0
      const collected: string[] = []

      async function worker() {
        while (index < fileArray.length) {
          const file = fileArray[index++]
          const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
          if (file.type.startsWith("video/") || VIDEO_EXTS.has(ext)) {
            collected.push(`${file.name}: video files are not supported`)
            setProgress((prev) => prev && { done: prev.done + 1, total: prev.total })
            continue
          }
          try {
            const formData = new FormData()
            formData.append("file", file)
            const res = await fetch(`/api/events/${eventId}/upload`, {
              method: "POST",
              body: formData,
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              collected.push(`${file.name}: ${(body as { error?: string }).error ?? "Upload failed"}`)
            } else {
              const data = (await res.json()) as UploadResult
              onSuccess?.(data)
            }
          } catch {
            collected.push(`${file.name}: network error`)
          }
          setProgress((prev) => prev && { done: prev.done + 1, total: prev.total })
        }
      }

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, fileArray.length) },
        worker
      )
      Promise.all(workers).then(() => {
        setIsUploading(false)
        setErrors(collected)
        setProgress(null)
      })
    },
    [eventId, onSuccess]
  )

  return { handleUpload, isUploading, progress, errors }
}
