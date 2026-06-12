#!/usr/bin/env node
/**
 * Run `prisma migrate deploy` only on Vercel PRODUCTION builds.
 *
 * Preview builds get a DATABASE_URL (needed at runtime) but must never
 * apply migrations — otherwise a PR containing a migration would alter
 * the production schema at preview-build time, before the PR is merged.
 * Local `npm run build` also skips migrations for the same reason.
 */
import { execSync } from "node:child_process"

if (process.env.VERCEL_ENV === "production") {
  execSync("npx prisma migrate deploy", { stdio: "inherit" })
} else {
  console.log(
    `[build] Skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "not set — local build"})`
  )
}
