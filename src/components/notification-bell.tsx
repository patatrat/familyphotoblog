"use client"

import { useState, useTransition } from "react"
import {
  getNotificationsAction,
  markAllReadAction,
  type NotificationItem,
} from "@/app/actions/notifications"

function NotificationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString("en-NZ", { month: "short", day: "numeric" })
}

function notificationText(n: NotificationItem): string {
  const actor = n.actor?.name ?? "Someone"
  switch (n.type) {
    case "NEW_EVENT":
      return `${actor} published "${n.event?.title ?? "a new event"}"`
    case "MENTION":
      return `${actor} mentioned you in a comment on "${n.event?.title ?? "a photo"}"`
    case "REACTION":
      return `${actor} reacted to your photo in "${n.event?.title ?? "an event"}"`
  }
}

function notificationHref(n: NotificationItem): string {
  if (n.type === "NEW_EVENT" && n.event) return `/events/${n.event.id}`
  if ((n.type === "MENTION" || n.type === "REACTION") && n.event && n.photoId) {
    return `/events/${n.event.id}#photo-${n.photoId}`
  }
  if (n.event) return `/events/${n.event.id}`
  return "/"
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnread)
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (notifications === null) {
      startTransition(async () => {
        const items = await getNotificationsAction()
        setNotifications(items)
      })
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction()
      setUnread(0)
      setNotifications((prev) =>
        prev ? prev.map((n) => ({ ...n, read: true })) : prev
      )
    })
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <NotificationIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications === null ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-400">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={notificationHref(n)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 ${
                      !n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.read ? "pl-5" : ""}`}>
                      <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-snug">
                        {notificationText(n)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
