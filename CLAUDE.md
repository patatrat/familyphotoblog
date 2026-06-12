# Family Photo Blog — Project Brief
**URL:** photos.radomski.co.nz  
**Owner:** Radomski family (private, invite-only)  
**Stack:** Next.js (App Router) · Neon (Postgres) · Vercel Blob · Forward Email · Cloudflare DNS  
**Repo:** GitHub (Codespaces dev environment)

---

## Vision

A private, family-focused photo blog. Users must be authenticated to see anything. Structured around "events" (e.g. Christmas 2024) that contain photos, comments, and reactions. Designed for ~50–200 users, predominantly NZ/AU-based, with low concurrency. This is a bespoke family tool, not a product — but should be built with open-source portability in mind (configurable storage, auth, email providers).

---

## Architecture

```
Browser → Cloudflare DNS/CDN → Vercel (Next.js App Router)
                                    ├── Neon Postgres     (users, events, photos, comments, reactions, tags)
                                    ├── Vercel Blob       (thumbnail + mid-size WebP versions; originals NOT stored)
                                    └── Forward Email     (magic links, notifications)
```

### Key Decisions (locked in)

**Database:** Neon (Postgres) with Prisma ORM for type-safe access and migrations in version control.

**Photo processing:** Server-side on upload using `sharp`.
- Upload hits a Next.js API route (`/api/events/[id]/upload`)
- EXIF date (`DateTimeOriginal`/`CreateDate`) extracted via `exifr` for sorting, then sharp strips all EXIF (privacy — GPS coordinates in phone photos); `.rotate()` applies orientation before stripping
- HEIC/HEIF converted to JPEG first via `heic-convert` (Vercel's sharp lacks the HEVC codec)
- sharp generates WebP: thumbnail (400px wide, q=80) + mid-size (1200px wide, q=82)
- **Originals are NOT stored** — this is a sharing site, not a backup service (`Photo.blobUrl` is a legacy nullable column)
- SHA-256 hash of original bytes stored for per-event duplicate detection
- Rationale: instant page loads, controlled dimensions, cheaper than on-demand optimisation, EXIF strip in same pipeline; WebP saves ~30% bandwidth over JPEG

**Staging:** Separate Vercel project at `photos-staging.radomski.co.nz` tied to the `staging` branch.
- Rationale: stable URL required for magic link email flows and reliable Playwright E2E tests
- Branch preview deployments generate random URLs which break email auth

**Testing:** Vitest + React Testing Library + Playwright, used selectively.
- Vitest/RTL: utility functions, auth helpers, image processing logic, components with real branching logic
- Playwright E2E: sign up, login, upload photo, view event, admin approval flows
- Philosophy: confidence on critical paths over coverage numbers

**Auth:** Auth.js (NextAuth v5) with email magic link provider.

**Styling:** Tailwind CSS. Dark mode toggle matching radomski.co.nz. Mobile-first.

---

## Environment Variables

```
DATABASE_URL                  # Neon Postgres pooled connection string (app runtime)
DATABASE_DIRECT_URL           # Neon direct (non-pooler) URL — Prisma migrations only
BLOB_READ_WRITE_TOKEN         # Vercel Blob token
AUTH_SECRET                   # NextAuth secret (generate: openssl rand -base64 32)
AUTH_TRUST_HOST               # true (required on Vercel)
SMTP_HOST                     # Forward Email SMTP host (smtp.forwardemail.net)
SMTP_PORT                     # 587
SMTP_USER                     # SMTP username
SMTP_PASS                     # SMTP password
EMAIL_FROM                    # noreply@radomski.co.nz
NEXT_PUBLIC_APP_URL           # https://photos.radomski.co.nz
SIGNUP_PASSPHRASE             # Family passphrase required on signup
ADMIN_EMAIL                   # Admin user seeded via npm run seed
ADMIN_NAME                    # Admin user display name
```

All vars must be documented in `.env.example` with placeholder values and comments. Never commit real values.

---

## Feature Backlog

Priority scale:  
**P1** = MVP — required before any family members are invited  
**P2** = Initial launch — required before sharing broadly  
**P3** = Soon after launch  
**P4** = Nice to have / future

---

### Authentication & Users

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A1 | ✓ Magic link signup — name + email + family passphrase → email link → logged in | P1 | Via Auth.js; passphrase checked server-side |
| A2 | ✓ Magic link login — email only → link → logged in | P1 | |
| A3 | ✓ Persistent session until explicit logout | P1 | |
| A4 | ✓ Rate limiting on magic link requests | P1 | Per-IP and per-email; prevent email spam abuse |
| A5 | ✓ EXIF stripping from photos before storage | P1 | Privacy — GPS data in phone photos |
| A6 | ✓ Admin role — full access to all functions | P1 | Seeded on first deploy via seed script |
| A7 | ✓ Revoke / delete user | P1 | Admin only; invalidates all sessions |
| A8 | ✓ Allow new signups toggle (on/off) | P2 | Admin setting; default on |
| A9 | ✓ New users require approval toggle (on/off) | P2 | Admin setting; default on |
| A10 | ✓ Approve new user | P2 | Admin panel action |
| A11 | Moderator role — can approve photos, events, handle removal requests | P3 | |
| A12 | Assign moderator role | P3 | Admin only |
| A13 | Invite user via email, including a welcome email text that can be edited before send, and bulk invites | P4 | Admin sends invite link directly |
| A14 | Remove user's ability to comment | P4 | Soft mute |

---

### Events (Blog Posts)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| E1 | ✓ Create event with title, date, description | P1 | |
| E2 | ✓ Event defaults to draft on creation | P1 | Only admin/creator can see drafts |
| E3 | ✓ Publish event (makes it visible to all users) | P1 | |
| E4 | ✓ Home page event card: title, date, photo count, featured photo thumbnail | P1 | |
| E5 | ✓ Click card → open event page | P1 | |
| E6 | ✓ Photos sorted by EXIF time taken by default (oldest first) | P1 | Critical for multi-contributor events |
| E7 | ✓ Tag events on creation | P2 | |
| E8 | ✓ Browse / filter events by tag | P2 | |
| E9 | ✓ Select featured image for event card | P2 | |
| E10 | ✓ Archive / all events list page | P3 | |
| E11 | ✓ Users create new events (pending approval) | P3 | |
| E12 | ✓ New user-submitted events require admin approval before visible | P3 | |
| E13 | ✓ Bulk photo upload to event | P3 | Concurrent (3 workers), progress counter, cancel, duplicate detection |
| E14 | ✓ Reorder photos during create/edit (drag-and-drop) | P3 | |
| E15 | ✓ Users suggest or add tags to others' events | P4 | Any approved user can add tags to PUBLISHED events via inline input on event page |
| E16 | Restrict event visibility to specific users or groups | P4 | |
| E17 | ✓ Edit event details (title, date, description) by creator after submission | P4 | Creators can edit PENDING events via inline form on event page |
| E18 | ✓ Unpublish / Delete events | P2 | Admin only; delete cascades photos+blobs |

---

### Photos

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| PH1 | ✓ Upload photos to event (admin/creator) | P1 | |
| PH2 | ✓ Server-side processing on upload: EXIF strip, thumbnail (400px), mid-size (1200px) | P1 | Using sharp |
| PH3 | ✓ Serve thumbnails on event page, mid-size in lightbox | P1 | Thumbnails done; lightbox is PH5 |
| PH4 | ✓ Signed/protected blob URLs — photos inaccessible without valid session | P1 | Proxied via /api/blob with session check |
| PH5 | ✓ Full-size photo viewer — lightbox overlay with ← → navigation and X to close | P2 | |
| PH6 | ✓ Photo removal request — hides photo immediately; admin reviews in panel | P2 | |
| PH7 | ✓ Admin resolves removal request (delete permanently or restore) | P2 | |
| PH8 | ✓ Display who took the photo (uploader attribution) | P3 | Shown in lightbox |
| PH9 | ✓ Users upload photos to existing events (pending approval) | P3 | |
| PH10 | ✓ New user-submitted photos require approval before visible | P3 | |
| PH11 | Download photo (requires auth) | P3 | Originals no longer stored — mid-size (1200px WebP) is the largest version available |
| PH12 | ✓ Add caption to photo on upload / edit | P3 | Inline per-photo caption input in admin edit form; blur-to-save |
| PH13 | ✓ Duplicate photo detection | P3 | SHA-256 hash per event; skipped count shown in UI |
| PH14 | Simple photo manipulation — rotate, crop, flip | P4 | |
| PH15 | Toggle: allow users to upload photos (on/off) | P4 | Admin setting |
| PH16 | Extract location from EXIF before stripping (optional, user opt-in) | P5 | |
| PH17 | Tag photos | P4 | |

---

### Comments & Reactions

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| CR1 | ✓ Per-photo comments — show author, timestamp, content | P3 | |
| CR2 | ✓ Delete comment | P3 | Admin only |
| CR3 | ✓ Per-photo emoji reactions with counts | P3 | 6 emoji, optimistic toggle |
| CR4 | ✓ Display total comment count and reaction count on event card | P3 | |
| CR5 | ✓ Hover emoji to see list of users who reacted | P4 | Tooltip above button; optimistic on toggle |
| CR6 | ✓ Tag other users in comments with @name | P4 | @[Name](userId) format; autocomplete dropdown on @ |
| CR7 | ✓ Email notification when mentioned in a comment | P4 | Fire-and-forget; respects emailMentions setting |
| CR8 | ✓ User setting: opt out of mention emails | P4 | Toggle in /account |
| CR9 | ✓ Profanity filter on comments | P4 | Regex blocklist in addCommentAction; returns error (no auto-censor) |
| CR10 | Email notification to uploader when their submitted photo is approved or rejected | P4 | |
| CR11 | Email notification to submitter when their event is approved or rejected | P4 | |
| CR12 | ✓ In app notifications, displaying reactions, tags, comment mentions | P4 | Bell icon in nav; NEW_EVENT, MENTION, REACTION; mark-all-read |
| CR13 | Report comment | P4 | |

---

### Admin Panel

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| AD1 | ✓ User list — view, approve, revoke, delete, assign roles | P1 | |
| AD2 | ✓ Site settings — all toggles in one place | P2 | Signups, approval required, user uploads |
| AD3 | ✓ Photo removal request queue with photo preview | P2 | Approve (delete permanently) or restore |
| AD4 | ✓ New user approval queue | P2 | When approval-required toggle is on |
| AD5 | ✓ New event approval queue | P3 | When user-submitted events enabled |
| AD6 | ✓ New photo approval queue | P3 | When user-submitted photos enabled |
| AD7 | Storage usage display (blob usage, photo count, DB size) | P4 | |
| AD8 | Usage stats — most viewed photo/event, active users | P4 | |

---

### Email Notifications

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| EM1 | ✓ Magic link email — signup | P1 | |
| EM2 | ✓ Magic link email — login | P1 | |
| EM3 | ✓ Email sent when new event is published | P3 | |
| EM4 | ✓ User setting: opt out of new event emails (opt-in default) | P3 | |
| EM5 | ✓ Email when mentioned in a comment | P4 | |
| EM6 | ✓ User setting: opt out of mention emails | P4 | |

---

### Tags

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| TG1 | ✓ Creator tags events | P2 | |
| TG2 | ✓ Browse / filter events by tag | P2 | |
| TG3 | Users suggest tags on others' events | P4 | |
| TG4 | Tag photos | P4 | |
| TG5 | Tag people (users) in photos | P4 | |

---

### Security

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| SE1 | ✓ Security headers — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | P1 | Set via next.config.ts headers() |
| SE2 | ✓ Auth-gated photo proxy — blob URLs never exposed directly to browser | P1 | /api/blob route checks session |
| SE3 | ✓ EXIF stripping on upload | P1 | GPS data removed before storage |
| SE4 | ✓ Rate limiting on magic link requests | P1 | Per-IP and per-email |
| SE5 | Subresource Integrity for any external scripts | P4 | None currently used |
| SE6 | ✓ Blob proxy requires approved session | P1 | Unapproved users blocked from /api/blob even with valid session |
| SE7 | ✓ Auth.js magic-link guard — sendVerificationRequest checks user exists | P1 | Prevents email spam via POST /api/auth/signin/nodemailer |
| SE8 | ✓ Generic error responses from upload route | P1 | Prevents Prisma/Blob schema leakage via error messages |
| SE9 | ✓ Photo removal action validates event is PUBLISHED | P1 | Prevents hiding photos from draft events or re-hiding after restore |
| SE10 | ✓ Signup rate-limited before passphrase check; constant-time compare | P1 | Failed passphrase guesses count against the rate limit (brute-force protection) |
| SE11 | ✓ Comments/reactions validate photo+event status; emoji allowlist; mention IDs verified | P2 | Non-admins can only interact with VISIBLE photos on PUBLISHED events |
| SE12 | ✓ CSP drops 'unsafe-eval' in production | P2 | Only emitted in development (Next.js fast-refresh needs it) |

---

### UI / Design

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| UI1 | ✓ Dark mode toggle | P2 | Class-based via ThemeProvider; localStorage persistence; anti-flash inline script |
| UI2 | ✓ Photo frame favicon | P2 | PNG generated via sharp |
| UI3 | ✓ Loading skeleton for photo grid | P3 | Improve perceived performance on slow connections |
| UI4 | "Back to top" button on long event pages | P4 | |
| UI5 | Thumbnail blur-up placeholder (base64 LQIP) | P4 | Further reduce perceived load time for photo grid |
| UI6 | Pull-to-refresh on mobile | P4 | |
| UI7 | UI / UX review with a specalised agent skill | P3 | | 
| UI8 | Mobile web app: IOS and Andriod | P4 | |

---

### Infrastructure & Dev Practice

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| IN1 | ✓ GitHub branch protection on `main` — PRs required, no direct push | P1 | |
| IN2 | ✓ `staging` branch → separate Vercel project at `photos-staging.radomski.co.nz` | P1 | |
| IN3 | ✓ CI: lint, type-check, unit tests on every PR via GitHub Actions | P1 | |
| IN4 | ✓ Vitest + React Testing Library (unit/component tests) | P1 | |
| IN5 | ✓ `.env.example` with all vars documented | P1 | |
| IN6 | ✓ Prisma migrations tracked in version control | P1 | |
| IN7 | ✓ Seed script: admin user + sample events for local dev | P1 | |
| IN8 | ✓ Playwright E2E tests for critical flows, run against staging | P2 | |
| IN12 | ✓ Move Next.js app from family-photos/ subfolder to repo root | P1 | Update Vercel root directory (prod + staging) and GitHub Actions workflow path |
| IN13 | ✓ `prisma migrate deploy` runs automatically on every Vercel build | P1 | Added to npm build script |
| IN9 | ✓ Scheduled DB backup to AWS S3 (Standard-IA) | P3 | pg_dump --format=custom → S3; daily via GitHub Actions |
| IN10 | ✓ Scheduled Vercel Blob export/backup | P3 | Incremental sync to S3; scripts/backup-blobs.mjs |
| IN11 | Open-source portability — storage, email, auth configurable via env vars | P4 | |
| IN12 | Restore from backup | P3 | Documented in README; pg_restore for DB, re-put for blobs |

---

## Data Model (Prisma schema)

```prisma
// Auth.js models (Account, Session, VerificationToken) also exist — see prisma/schema.prisma

model User {
  id              String     @id @default(cuid())
  name            String
  email           String     @unique
  emailVerified   DateTime?
  image           String?
  role            Role       @default(USER)
  approved        Boolean    @default(false)
  canComment      Boolean    @default(true)  // NOTE: not yet enforced anywhere (A14 pending)
  emailNewEvents  Boolean    @default(true)
  emailMentions   Boolean    @default(true)
  createdAt       DateTime   @default(now())
  accounts        Account[]
  sessions        Session[]
  events          Event[]
  photos          Photo[]
  comments        Comment[]
  reactions       Reaction[]
  notifications     Notification[] @relation("notif_recipient")
  sentNotifications Notification[] @relation("notif_actor")
}

enum Role { USER MODERATOR ADMIN }

model Event {
  id              String      @id @default(cuid())
  title           String
  date            DateTime
  description     String?
  status          EventStatus @default(DRAFT)
  featuredPhotoId String?
  createdBy       String
  creator         User        @relation(fields: [createdBy], references: [id])
  photos          Photo[]
  tags            EventTag[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum EventStatus { DRAFT PENDING PUBLISHED }

model Photo {
  id             String      @id @default(cuid())
  eventId        String
  event          Event       @relation(fields: [eventId], references: [id])
  uploadedBy     String
  uploader       User        @relation(fields: [uploadedBy], references: [id])
  blobUrl        String?     // legacy — originals are no longer stored
  thumbnailUrl   String
  midSizeUrl     String
  caption        String?
  takenAt        DateTime?
  sortOrder      Int         @default(0)
  status         PhotoStatus @default(VISIBLE)
  hash           String?     // SHA-256 of original bytes, for duplicate detection
  comments       Comment[]
  reactions      Reaction[]
  removalRequest RemovalRequest?
  notifications  Notification[]
  createdAt      DateTime    @default(now())
  @@unique([eventId, hash])
  @@index([eventId, status])
}

enum PhotoStatus { PENDING VISIBLE HIDDEN }

model RemovalRequest {
  id          String        @id @default(cuid())
  photoId     String        @unique
  photo       Photo         @relation(fields: [photoId], references: [id])
  requestedBy String
  reason      String?
  status      RemovalStatus @default(PENDING)
  createdAt   DateTime      @default(now())
}

enum RemovalStatus { PENDING REMOVED RESTORED }

model Comment {
  id        String   @id @default(cuid())
  photoId   String
  photo     Photo    @relation(fields: [photoId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  content   String
  createdAt DateTime @default(now())
}

model Reaction {
  id        String   @id @default(cuid())
  photoId   String
  photo     Photo    @relation(fields: [photoId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  emoji     String
  createdAt DateTime @default(now())
  @@unique([photoId, userId, emoji])
}

model Tag {
  id     String     @id @default(cuid())
  name   String     @unique
  slug   String     @unique
  events EventTag[]
}

model EventTag {
  eventId String
  tagId   String
  event   Event  @relation(fields: [eventId], references: [id])
  tag     Tag    @relation(fields: [tagId], references: [id])
  @@id([eventId, tagId])
}

enum NotificationType { NEW_EVENT MENTION REACTION }

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation("notif_recipient", fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  read      Boolean          @default(false)
  actorId   String?
  actor     User?            @relation("notif_actor", fields: [actorId], references: [id], onDelete: SetNull)
  eventId   String?
  photoId   String?
  commentId String?
  createdAt DateTime         @default(now())
  @@index([userId, read, createdAt(sort: Desc)])
}

// Rate-limiting ledger for magic link requests (identifier = email or IP)
model MagicLinkRequest {
  id         String   @id @default(cuid())
  identifier String
  createdAt  DateTime @default(now())
  @@index([identifier, createdAt])
}

// Single-row site-wide settings (id = "global")
model SiteSettings {
  id                  String  @id @default("global")
  signupsEnabled      Boolean @default(true)
  approvalRequired    Boolean @default(true)
  userEventsEnabled   Boolean @default(false)
  userPhotosEnabled   Boolean @default(false)
  eventEmailsEnabled  Boolean @default(true)
}
```

---

## Design Notes

- Dark mode toggle matching radomski.co.nz style
- Simple and clean — photos are the hero, UI gets out of the way
- Mobile-first (most family members on phones)
- Tailwind CSS + custom components (no heavy UI library)

---

## Current Status

All P1, P2, and P3 features complete. Several P4 features also done. Site is live.

### Infrastructure notes
- `prisma migrate deploy` runs as part of `npm run build` — migrations apply automatically on every Vercel deploy
- `family-photos/` subfolder fully removed; repo root is the Next.js app
- Dark mode: class-based via ThemeProvider + localStorage, anti-flash inline script, defaults to system preference
- E2E tests run against staging (`https://photos-staging.radomski.co.nz`) and are opt-in: include `[e2e]` in the commit message to trigger them. Requires `E2E_DATABASE_URL` GitHub Actions secret (staging Neon direct URL).
- Dependabot configured: monthly grouped npm + GitHub Actions updates; major version bumps ignored for nodemailer, typescript, eslint, @types/node.
- `scripts/vercel-ignored-build-step.sh` skips Vercel preview builds for dependabot PRs (set as "Ignored Build Step" in Vercel project settings).

### Known npm audit vulnerabilities (not directly exploitable)
- `nodemailer ^7` — SMTP injection CVEs (GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g). Neither vector is user-controlled (we don't set transport `name` or `envelope.size`). Patched in nodemailer 8, but `@auth/core` peer dep is still `^7` (verified June 2026); cannot upgrade until upstream changes.
- `postcss` in `next` internals — Next.js pins its own postcss 8.4.31 at build time; not exposed to user-controlled CSS. Only "fix" npm offers is downgrading next — not applicable.
- Resolved June 2026: `hono` updated in-range to ≥4.12.21 (4 CVEs); `@hono/node-server` forced to ^1.19.13 via package.json `overrides` (prisma pins `@prisma/dev` exactly, which pinned the vulnerable version — remove the override once prisma's `@prisma/dev` catches up).

### Remaining work
- UI7 — UI/UX review with specialised agent skill (P3)
- P4 features (see backlog tables above)

### Recently completed
- Security review pass ✓ — SE10/SE11/SE12 (see Security table); `deleteUserAction` no longer FK-errors on users with content (blocks with admin banner, cleans up comments/reactions otherwise); caption/reason/name length caps; reaction emoji list shared via `src/lib/emojis.ts`
- Bandwidth/perf ✓ — All photos now WebP (thumb q=80, mid q=82); originals no longer stored; immutable 1-year cache on blob proxy responses; lazy loading; one-shot migration script (`scripts/convert-to-webp.mjs`) re-encoded existing JPEG/PNG photos
- PH12/E17/E15/CR9 ✓ — Photo captions (inline per-photo input in edit form, blur-to-save); creators can view/edit PENDING events (inline form with amber notice); any user can add tags to PUBLISHED events; profanity filter on comments (blocklist regex, returns error)
- CR6/CR7/CR8/CR12 ✓ — @mentions in comments (autocomplete, @[Name](userId) storage, highlighted render); MENTION + REACTION + NEW_EVENT in-app notifications (bell icon in nav with unread badge + dropdown); mention emails; emailMentions opt-out in /account
- E14 ✓ — Drag-and-drop photo reorder in event edit page
- IN9/IN10 ✓ — Daily DB backup (pg_dump → S3 STANDARD_IA) + incremental blob sync (Vercel → S3); `.github/workflows/backup.yml`; requires 6 GitHub Actions secrets (see README)
- Branch cleanup ✓ — Deleted 4 stale merged branches; added vercel-ignored-build-step.sh
- Security ✓ — 5 vulnerabilities resolved: blob proxy approval check; upload error message leakage; Auth.js magic-link rate-limit bypass via `POST /api/auth/signin/nodemailer`; photo removal action event-status guard; conflicting CSP headers between proxy.ts and next.config.ts
- E13 ✓ — Bulk photo upload: concurrent (3 workers), progress counter, cancel button, duplicate detection (SHA-256)
- E18 ✓ — Unpublish + delete event (admin only); delete cascades all photos and blobs
- PH13 ✓ — Duplicate photo detection: SHA-256 hash per event, skipped count in UI
- IN8 ✓ — Playwright E2E tests (19 tests: auth, events, lightbox, admin) running in CI on staging pushes
- PH8 ✓ — Uploader attribution shown in lightbox
- E10 ✓ — Archive / all events page (grouped by year, linked from nav)
- UI1 ✓ — Dark mode toggle (class-based, localStorage persistence)
- UI3 ✓ — Loading skeletons for home and event pages + image fade-in
- E11/E12 + AD5 ✓ — User-submitted events with approval queue
- PH9/PH10 + AD6 ✓ — User-submitted photos with approval queue
- EM3/EM4 ✓ — New event publish emails + per-user opt-out in /account
