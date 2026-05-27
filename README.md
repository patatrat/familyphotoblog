# Family Photos

A private, invite-only photo blog for the Radomski family. Built around "events" (e.g. Christmas 2024) that contain photos, comments, and emoji reactions. Only authenticated, approved family members can see anything.

**Production:** [photos.radomski.co.nz](https://photos.radomski.co.nz)  
**Staging:** [photos-staging.radomski.co.nz](https://photos-staging.radomski.co.nz)

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
| Hosting | Vercel (prod + staging) |

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

Two Vercel projects mirror two branches:

| Branch | Project | URL |
|--------|---------|-----|
| `staging` | family-photos-staging | photos-staging.radomski.co.nz |
| `main` | family-photos | photos.radomski.co.nz |

**Workflow:** develop on feature branch → PR to `staging` → test on staging URL → merge to `main` → production deploys automatically.

`prisma migrate deploy` runs automatically as part of `npm run build` on every Vercel deploy.

After deploying to a new environment, run the seed script to create the initial admin user:

```bash
npx prisma db seed
```

### Vercel Ignored Build Step

Set `scripts/vercel-ignored-build-step.sh` as the "Ignored Build Step" command in Vercel project settings to skip builds triggered by Dependabot PRs (they lack env vars and must not run migrations).

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

E2E tests run against the staging deployment. Include `[e2e]` in your commit message to trigger them in CI. Requires `E2E_DATABASE_URL` GitHub Actions secret (staging Neon direct URL).

---

## Known Vulnerabilities

The following `npm audit` findings are present but not directly exploitable in this application:

| Package | CVE | Severity | Notes |
|---------|-----|----------|-------|
| `nodemailer ^7` | GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g | Moderate | SMTP injection via `envelope.size` / transport name CRLF. Neither vector is user-controlled in this app. Blocked on `@auth/core` peer dep `^7.0.7`; fix requires upstream change. |
| `@hono/node-server` (in `@prisma/dev`) | GHSA-92pp-h63x-v22m | Moderate | Dev/build-time only — Prisma Studio. Not in production runtime. |
| `postcss` (in `next` internal) | GHSA-qx2v-qp2m-jg93 | Moderate | Bundled inside Next.js; not exposed to user-controlled CSS input. |
