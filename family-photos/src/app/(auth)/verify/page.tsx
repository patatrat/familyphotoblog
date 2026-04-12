import Link from "next/link"

export default function VerifyPage() {
  return (
    <div className="text-center">
      <div className="text-5xl mb-6">&#9993;</div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        Check your email
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        We sent you a sign-in link. Click it to continue — no password needed.
      </p>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        Wrong email?{" "}
        <Link
          href="/login"
          className="text-zinc-900 dark:text-zinc-50 font-medium hover:underline"
        >
          Try again
        </Link>
      </p>
    </div>
  )
}
