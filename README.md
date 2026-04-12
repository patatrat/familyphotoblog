# Family Photos

A private, invite-only photo blog for the Radomski family. Built around "events" (e.g. Christmas 2024) that contain photos, comments, and emoji reactions. Only authenticated, approved family members can see anything.

**Production:** [photos.radomski.co.nz](https://photos.radomski.co.nz)  
**Staging:** [staging.photos.radomski.co.nz](https://staging.photos.radomski.co.nz)

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
- **Admin approval** — new signups require admin approval before they can view anything
- **Events** — create, draft, tag, and publish photo albums
- **Photos** — upload with automatic EXIF stripping, thumbnail generation, and sort by time taken
- **Lightbox** — full photo viewer with keyboard and swipe navigation
- **Comments & reactions** — per-photo comments and 6 emoji reactions, optimistic UI
- **Photo reporting** — any member can flag a photo; admin reviews and deletes or restores
- **Tag filtering** — events can be tagged and filtered on the home page
- **Admin panel** — user management, site settings, removal request queue
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

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
| `staging` | family-photos-staging | staging.photos.radomski.co.nz |
| `main` | family-photos | photos.radomski.co.nz |

**Workflow:** develop on `staging` branch → push → test on staging URL → merge to `main` → production deploys automatically.

After deploying to a new environment, run the seed script to create the initial admin user:

```bash
npx prisma db seed
```

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
