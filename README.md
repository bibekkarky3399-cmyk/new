# QR Menu — QR Code Menu & Ordering SaaS

A production-ready QR menu and ordering platform for small restaurants and
cafés: guests scan a table's QR code, browse the live menu, and order from
their phone — no app, no login. Restaurant owners manage the menu, watch
orders come in live, and export sales reports from one dashboard.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **PostgreSQL** + **Prisma 6**
- Custom **JWT session auth** (httpOnly cookies, bcrypt password hashing) + **Zod** validation
- **qrcode** + **pdf-lib** for QR codes and printable posters
- **Vitest** for automated tests

## Features

- **Auth** — restaurant registration, login/logout, role-based access (`OWNER`, `STAFF`)
- **Menu** — categories, items, prices, images, availability toggles, customization (option groups/choices), instant updates
- **QR codes** — a unique QR code per table, downloadable PNG and printable PDF poster, public menu with no login required
- **Ordering** — cart, table identification via QR token, checkout, **server-side price re-validation** (client-sent prices are never trusted), order tracking page
- **Dashboard** — live order board (auto-refreshing), status transitions (Pending → Confirmed → Preparing → Ready → Served, or Cancelled), order history
- **Reports** — sales summary (total orders/revenue, top items, by-day breakdown) for a date range, CSV export
- **Settings** — branding (logo, brand color), currency, tax rate, address/phone

Every dashboard API route scopes its database queries by the authenticated
user's `restaurantId`, so one restaurant's data is never visible to another.

## Getting started

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret used to sign session JWTs. Generate with `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | Public base URL used to build QR code links (no trailing slash) |

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

### 5. (Optional) Seed demo data

```bash
npm run prisma:seed
```

Creates a demo restaurant (`rosas-cafe`) with a menu, tables, and an owner
login: **owner@rosascafe.test / password123**.

### 6. Run the app

```bash
npm run dev
```

- Dashboard: http://localhost:3000/login
- Public menu (after seeding): http://localhost:3000/r/rosas-cafe

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server (after `build`) |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest unit test suite |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:seed` | Seed demo data |

## Testing

`npm test` runs 32 unit tests covering:

- Password hashing/verification and JWT session signing/verification (`src/lib/__tests__/auth.test.ts`)
- Order pricing — the core security-sensitive logic that re-derives prices
  server-side from trusted menu data and rejects tampered/invalid requests
  (`src/lib/__tests__/order-pricing.test.ts`)
- Money/tax math (`src/lib/__tests__/money.test.ts`)
- CSV export escaping, including formula-injection neutralization
  (`src/lib/__tests__/csv.test.ts`)
- Input validation schemas (`src/lib/__tests__/validation.test.ts`)

All tests were run and passed locally (`Test Files 5 passed (5)`, `Tests 32
passed (32)`) — not fabricated. `npm run build` and `npm run lint` were also
verified clean, and the full flow (register → login → create table → scan
QR → order → server-side price validation → dashboard status updates →
reports/CSV export) was smoke-tested end-to-end against a real local
PostgreSQL database before this was pushed.

There is no browser-based end-to-end test suite (e.g. Playwright) yet — see
Known limitations.

## Architecture notes

- **Money** is stored as integer cents (`priceCents`, `totalCents`, …) to
  avoid floating-point rounding errors; tax rate is stored in basis points.
- **Order pricing is never trusted from the client.** `POST /api/orders`
  re-fetches the menu items and option choices from the database and
  recomputes every price server-side (`src/lib/order-pricing.ts`).
- **Order tracking** (`GET /api/orders/[id]`) is intentionally unauthenticated
  so a guest who just placed an order can check its status — this is safe
  because order IDs are unguessable `cuid`s (128 bits of randomness) and the
  endpoint returns only that order's own status/items, nothing else.
- **Auth** uses httpOnly, `sameSite=lax` session cookies signed with HMAC
  (JWT, algorithm pinned to `HS256` on both sign and verify). A lightweight
  edge check in `src/proxy.ts` (Next.js's middleware convention) redirects
  logged-out users away from `/dashboard`; the dashboard layout then does
  full JWT verification + tenant lookup server-side (JWT verification needs
  the Node.js runtime, which isn't available at the edge).
- **CSV export** neutralizes leading `=`, `+`, `-`, `@` characters in
  exported fields to prevent formula/CSV injection when a customer's
  freely-typed order name is opened in a spreadsheet app.

## Known limitations

- **Dev-tooling vulnerabilities**: `npm audit` reports 2 moderate/high
  findings in `vitest`'s UI mock server and Prisma's CLI config merging
  (`deepmerge-ts`). Both are build/test-time-only dependencies, not part of
  the deployed app, and fixing them requires major version bumps (Vitest 5,
  Prisma 8) that themselves introduce breaking changes — documented here
  rather than applied blind.
- **No rate limiting** on public endpoints (order creation, login). Add a
  rate limiter (e.g. at a reverse proxy or with Upstash/Redis) before
  exposing this to the public internet.
- **No file upload for images/logos** — menu item images and the restaurant
  logo are set by URL. Add an upload flow (e.g. S3/Cloudinary) if hosts
  don't want to host images elsewhere.
- **Live orders use polling** (every 5s), not WebSockets/SSE, to keep the
  app deployable anywhere without a persistent-connection server. Fine for
  small restaurants; consider SSE for larger volumes.
- **No automated browser (E2E) tests.** Core logic (pricing, auth, CSV
  escaping, validation) has unit tests; the full user flow was verified
  manually via smoke testing, not an automated E2E suite.
- **Single owner role granularity** — `STAFF` can manage menu/orders but not
  settings; there's no per-permission fine-tuning beyond `OWNER`/`STAFF`.

## Deployment

1. Provision a PostgreSQL database.
2. Set `DATABASE_URL`, `AUTH_SECRET` (strong random value), and
   `NEXT_PUBLIC_APP_URL` (your production domain) in your hosting
   provider's environment variables.
3. Run `npx prisma migrate deploy` against the production database.
4. Build and start: `npm run build && npm run start`, or deploy to a
   platform that runs these for you (e.g. Vercel — set the build command to
   include `prisma generate`, which already runs via the `postinstall`
   script).
