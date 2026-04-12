"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { blobProxy } from "@/lib/blob-url"
import { requestRemovalAction } from "@/app/actions/photos"
import {
  addCommentAction,
  deleteCommentAction,
  toggleReactionAction,
} from "@/app/actions/interactions"

type Comment = {
  id: string
  content: string
  createdAt: string
  userId: string
  userName: string
}

type ReactionGroup = {
  emoji: string
  count: number
  userReacted: boolean
}

type Photo = {
  id: string
  thumbnailUrl: string
  midSizeUrl: string
  caption: string | null
  comments: Comment[]
  reactions: ReactionGroup[]
}

export function PhotoGrid({
  photos: initial,
  currentUserId,
  isAdmin,
}: {
  photos: Photo[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [photos, setPhotos] = useState(initial)
  const [index, setIndex] = useState<number | null>(null)
  const [reporting, setReporting] = useState<string | null>(null)

  const close = useCallback(() => setIndex(null), [])
  const prev = useCallback(
    () => setIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)),
    [photos.length]
  )
  const next = useCallback(
    () => setIndex((i) => (i !== null ? (i + 1) % photos.length : null)),
    [photos.length]
  )

  const handleReported = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setIndex(null)
    setReporting(null)
  }, [])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "Escape") { close(); setReporting(null) }
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, close, prev, next])

  useEffect(() => {
    document.body.style.overflow = index !== null ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [index])

  if (photos.length === 0) {
    return (
      <p className="text-center text-zinc-400 dark:text-zinc-500 py-20">No photos yet.</p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, i) => {
          const totalComments = photo.comments.length
          const totalReactions = photo.reactions.reduce((sum, r) => sum + r.count, 0)
          return (
            <div key={photo.id} className="group relative aspect-square">
              <button
                onClick={() => setIndex(i)}
                className="w-full h-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                aria-label={photo.caption ?? `Photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blobProxy(photo.thumbnailUrl)}
                  alt={photo.caption ?? `Photo ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </button>

              {(totalComments > 0 || totalReactions > 0) && (
                <div className="absolute bottom-1.5 left-1.5 flex gap-1 pointer-events-none">
                  {totalReactions > 0 && (
                    <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-none">
                      {totalReactions} ❤️
                    </span>
                  )}
                  {totalComments > 0 && (
                    <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-none">
                      {totalComments} 💬
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setReporting(photo.id) }}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 text-white/80 hidden group-hover:flex items-center justify-center hover:bg-black/70 transition-colors"
                aria-label="Report photo"
                title="Report this photo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {index !== null && (
        <Lightbox
          photo={photos[index]}
          index={index}
          total={photos.length}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={close}
          onPrev={prev}
          onNext={next}
          onReport={(photoId) => setReporting(photoId)}
        />
      )}

      {reporting && (
        <ReportModal
          photoId={reporting}
          onDone={handleReported}
          onCancel={() => setReporting(null)}
        />
      )}
    </>
  )
}

function Lightbox({
  photo,
  index,
  total,
  currentUserId,
  isAdmin,
  onClose,
  onPrev,
  onNext,
  onReport,
}: {
  photo: Photo
  index: number
  total: number
  currentUserId: string
  isAdmin: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onReport: (photoId: string) => void
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row">
      {/* Photo pane */}
      <div
        className="relative flex-1 min-h-0 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm tabular-nums pointer-events-none">
          {index + 1} / {total}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onReport(photo.id) }}
          className="absolute top-4 right-16 text-white/40 hover:text-white/80 transition-colors p-2 z-10"
          aria-label="Report photo"
          title="Report this photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </button>

        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-3 sm:left-6 text-white/70 hover:text-white transition-colors p-2 z-10"
            aria-label="Previous photo"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          className="max-w-full max-h-full flex flex-col items-center gap-3 p-4 lg:p-8"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStart === null) return
            const delta = e.changedTouches[0].clientX - touchStart
            if (delta < -50) onNext()
            else if (delta > 50) onPrev()
            setTouchStart(null)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={blobProxy(photo.midSizeUrl)}
            alt={photo.caption ?? ""}
            className="max-w-full max-h-[55vh] lg:max-h-[85vh] object-contain rounded"
          />
          {photo.caption && (
            <p className="text-white/70 text-sm text-center">{photo.caption}</p>
          )}
        </div>

        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-3 sm:right-6 text-white/70 hover:text-white transition-colors p-2 z-10"
            aria-label="Next photo"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Interaction panel */}
      <div className="h-64 lg:h-auto lg:w-80 bg-white dark:bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        <InteractionPanel
          key={photo.id}
          photo={photo}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}

function InteractionPanel({
  photo,
  currentUserId,
  isAdmin,
}: {
  photo: Photo
  currentUserId: string
  isAdmin: boolean
}) {
  const [comments, setComments] = useState(photo.comments)
  const [reactions, setReactions] = useState(photo.reactions)
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const handleReaction = async (emoji: string) => {
    const current = reactions.find((r) => r.emoji === emoji)
    const wasReacted = current?.userReacted ?? false
    setReactions((prev) =>
      prev.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.count + (wasReacted ? -1 : 1), userReacted: !wasReacted }
          : r
      )
    )
    await toggleReactionAction(photo.id, emoji)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = commentText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setCommentError(null)
    const tempId = `temp-${Date.now()}`
    const tempComment: Comment = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      userName: "You",
    }
    setComments((prev) => [...prev, tempComment])
    setCommentText("")
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    const result = await addCommentAction(photo.id, text)
    if (result.error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentError(result.error)
      setCommentText(text)
    }
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    await deleteCommentAction(commentId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Reactions */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {reactions.map(({ emoji, count, userReacted }) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                userReacted
                  ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-600"
                  : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
            No comments yet
          </p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="group flex gap-2 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {comment.userId === currentUserId ? "You" : comment.userName}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 break-words leading-snug mt-0.5">
                {comment.content}
              </p>
            </div>
            {isAdmin && !comment.id.startsWith("temp-") && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="opacity-0 group-hover:opacity-100 mt-0.5 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                aria-label="Delete comment"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Add comment */}
      <form onSubmit={handleAddComment} className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {commentError && (
          <p className="text-xs text-red-500 mb-2">{commentError}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={1000}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString("en-NZ", { month: "short", day: "numeric" })
}

function ReportModal({
  photoId,
  onDone,
  onCancel,
}: {
  photoId: string
  onDone: (photoId: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await requestRemovalAction(photoId, reason)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      onDone(photoId)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Report photo</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This photo will be hidden immediately. An admin will review and either remove it permanently or restore it.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Reporting…" : "Report"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
