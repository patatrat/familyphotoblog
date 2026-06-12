# Family Photos

A private, invite-only photo blog for the Radomski family. Built around "events" (e.g. Christmas 2024) that contain photos, comments, and emoji reactions. Only authenticated, approved family members can see anything.

**Production:** [photos.radomski.co.nz](https://photos.radomski.co.nz)  
**Pre-merge testing:** Vercel preview deployments on every PR

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, TypeScript) |
| Database | Neon (Postgres) via Prisma ORM |
| File storage | Vercel Blob (private store, auth-gated proxy) |
| Auth | Auth.js v5 — magic link (no passwords) |
| Email | Forward Email (SMTP) |
| Image processing | sharp — EXIF strip, thumbnail (400px), mid-size (1200px) |
| Styling | Tailwind CSS |
| DNS / CDN | Cloudflare |
| Hosting | Vercel (production + PR previews) |

---

## Features

- **Magic link auth** — sign up with name, email, and a family passphrase; log in with email only
- **Admin approval** — new signups require admin approval before they can view anything; toggle on/off
- **Events** — create, draft, tag, publish, unpublish, and delete photo albums; user-submitted events require approval
- **Bulk photo upload** — concurrent (3 workers), progress counter, cancel button, duplicate detection (SHA-256)
- **HEIC support** — iOS HEIC photos converted server-side before processing
- **Photos** — automatic EXIF stripping, thumbnail generation, sorted by time taken; user-submitted photos require approval
- **Lightbox** — full photo viewer with keyboard/swipe navigation, uploader attribution
- **Comments & reactions** — per-photo comments and 6 emoji reactions with hover tooltips showing who reacted
- **Photo reporting** — any member can flag a photo; admin reviews and deletes or restores
- **Tag filtering** — events tagged and filterable on the home page
- **Archive page** — all events grouped by year
- **Dark mode** — matches radomski.co.nz; localStorage persistence, anti-flash inline script
- **Email notifications** — new event published emails; per-user opt-out in /account
- **Admin panel** — user management, site settings, removal queue, event/photo approval queues
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Auth-gated blob proxy** — photo URLs never exposed; session + approval checked on every request

---

## Local Development

### Prerequisites

- Node.js 20+
- A Neon Postgres database
- A Vercel Blob store (private)
- An SMTP server (Forward Email or similar)

### Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Seed an admin user
npx prisma db seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Set to `true` on Vercel |
| `EMAIL_SERVER` | SMTP connection string |
| `EMAIL_FROM` | Sender address for magic link emails |
| `NEXT_PUBLIC_APP_URL` | Public URL (e.g. `https://photos.radomski.co.nz`) |
| `SIGNUP_PASSPHRASE` | Family passphrase required on signup |

---

## Project Structure

```
/
├── prisma/
│   ├── schema.prisma          # Data model
│   └── migrations/            # Migration history
├── scripts/
│   └── vercel-ignored-build-step.sh  # Skips Vercel builds for dependabot PRs
├── src/
│   ├── app/
│   │   ├── actions/           # Server actions (events, photos, auth, admin)
│   │   ├── admin/             # Admin panel pages
│   │   ├── api/               # API routes (blob proxy, photo upload, auth)
│   │   ├── auth/              # Sign in / sign up pages
│   │   └── events/[id]/       # Event page + edit page + photo grid
│   ├── components/            # Shared UI components (Nav)
│   └── lib/                   # Utilities (db, session, blob-url, tags, settings)
└── next.config.ts
```

---

## Deployment

One Vercel project, deployed from `main`:

| Branch | Project | URL |
|--------|---------|-----|
| `main` | familyphotoblog | photos.radomski.co.nz |

**Workflow:** develop on feature branch → open PR → CI runs (lint, typecheck, unit tests) and Vercel builds a preview deployment → click around the preview URL → merge to `main` → production deploys automatically.

`prisma migrate deploy` runs as part of `npm run build` **only on production builds** (guarded by `VERCEL_ENV` in `scripts/migrate-deploy-production.mjs`). Preview and local builds never apply migrations. Note: preview deployments connect to the production database at runtime, so a PR that adds a migration will not be fully functional on its preview URL — test schema changes locally instead.

After deploying to a new environment, run the seed script to create the initial admin user:

```bash
npx prisma db seed
```

### Vercel Ignored Build Step

Set `scripts/vercel-ignored-build-step.sh` as the "Ignored Build Step" command in Vercel project settings to skip builds triggered by Dependabot PRs (they lack env vars and must not run migrations).

---

## Backups

Daily backups run via `.github/workflows/backup.yml` at 01:00 UTC:

- **Database (IN9):** `pg_dump --format=custom` piped to `s3://bucket/db/photos-YYYY-MM-DD.dump` with `STANDARD_IA` storage class.
- **Blobs (IN10):** Incremental sync of all Vercel Blob objects to `s3://bucket/blobs/`. Only new blobs are uploaded on each run; existing ones are skipped.

### Required GitHub Actions secrets

| Secret | Value |
|--------|-------|
| `BACKUP_DATABASE_DIRECT_URL` | Neon direct (non-pooler) connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (already set for CI) |
| `BACKUP_S3_BUCKET` | S3 bucket name |
| `BACKUP_AWS_ACCESS_KEY_ID` | AWS IAM key with `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on the backup bucket |
| `BACKUP_AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `BACKUP_AWS_REGION` | AWS region, e.g. `ap-southeast-2` |

### Restoring the database

```bash
# Download the dump
aws s3 cp s3://your-bucket/db/photos-YYYY-MM-DD.dump ./restore.dump

# Restore into a target database
pg_restore --clean --no-owner --no-privileges \
  -d "postgresql://USER:PASSWORD@host/dbname?sslmode=require" \
  ./restore.dump
```

### Restoring blobs

Blobs are stored in S3 under `blobs/` with the same pathname as in Vercel. Re-upload them to Vercel Blob using `@vercel/blob`'s `put()` with `addRandomSuffix: false` and the original pathname.

---

## Testing

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests
npm run test
```

### E2E Tests (Playwright)

E2E tests run locally on demand against a dev server. They must point at a **test database** (a Neon branch or the old staging DB) — never production, since the setup seeds a test admin user and the tests create/delete content.

```bash
# 1. Point the app at the test database
npm run env:staging        # copies .env.local.staging → .env.local

# 2. Set E2E_DATABASE_URL in .env.local to the SAME database (direct, non-pooler URL)

# 3. Start the dev server, then run the tests
npm run dev
npm run test:e2e           # defaults to http://localhost:3000
```

To run against any deployed URL instead: `PLAYWRIGHT_BASE_URL=https://... npm run test:e2e` (with `E2E_DATABASE_URL` pointing at that deployment's database).

---

## Known Vulnerabilities

The following `npm audit` findings are present but not directly exploitable in this application:

| Package | CVE | Severity | Notes |
|---------|-----|----------|-------|
| `nodemailer ^7` | GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g | Moderate | SMTP injection via `envelope.size` / transport name CRLF. Neither vector is user-controlled in this app. Blocked on `@auth/core` peer dep `^7.0.7`; fix requires upstream change. |
| `@hono/node-server` (in `@prisma/dev`) | GHSA-92pp-h63x-v22m | Moderate | Dev/build-time only — Prisma Studio. Not in production runtime. |
| `postcss` (in `next` internal) | GHSA-qx2v-qp2m-jg93 | Moderate | Bundled inside Next.js; not exposed to user-controlled CSS input. |
