"use client"

import { useActionState } from "react"
import Link from "next/link"
import { loginAction } from "@/app/actions/auth"

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)

  return (
    <>
      <h1 className="text-2xl font-semibold text-center text-zinc-900 dark:text-zinc-50 mb-8">
        Radomski Photos
      </h1>
      <form action={action} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            placeholder="you@example.com"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {pending ? "Sending..." : "Send magic link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-zinc-900 dark:text-zinc-50 font-medium hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  )
}
