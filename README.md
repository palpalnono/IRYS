# IRYS Uptime Optimization Platform

IRYS is a Next.js dashboard for Intecs operations. It currently contains the active Fleet product and a hidden Fuel Station module:

- **Fleet**: mobile equipment uptime monitoring for excavators, dump trucks, wheel loaders, and bulldozers.
- **Fuel Station**: Klubher fuel-depot monitoring retained in code, but hidden from the portal.

The root route (`/`) links into the Fleet dashboard (`/fleet`). Authenticated direct requests to `/station/*` redirect to `/fleet`.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Server components for data loading
- Client components for interactive tables, filters, and charts

## Requirements

- Node.js `>=18.17.0`
- npm

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
IRYS_PASSWORD=change-me
AUTH_SECRET=replace-with-32-plus-random-chars

# Optional: live INTECS fleet API. Leave unset to use mock fleet data.
INTECS_API_KEY=<x-api-key>
INTECS_UNIT_IDS=HT144,HT145
```

Generate a suitable `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Commands

```bash
npm run dev     # Start local dev server at http://localhost:3000
npm run build   # Production build
npm start       # Start built Next.js app
npm run lint    # Next.js lint command
```

Note: `next lint` may prompt for ESLint setup if no ESLint config exists.

## Routes

### Portal

- `/` — IRYS product chooser.

### Fleet

- `/fleet` — fleet overview with KPI tiles, availability, and system health.
- `/units` — searchable, filterable unit table.
- `/alerts` — not-ready history and incident timeline.
- `/unit/[id]` — unit detail page for subsystem telemetry.
- `/system/cas` — Stonkam CAS camera safety dashboard.
- `/system/lube` — fleet lube subsystem view.
- `/system/fire` — fleet ANSUL fire subsystem view.
- `/system/gps` — fleet GPS subsystem view.
- `/system/device` — IRYS logger/connectivity view.

### Fuel Station

Fuel Station routes remain in the codebase but are hidden from the active product surface:

- `/station` — redirects to `/fleet` for authenticated users.
- `/station/inventory` — hidden route.
- `/station/condition` — hidden route.
- `/station/fms` — hidden route.

### Auth

- `/login` — password gate.

## Data Layer

Fleet data can now come from the INTECS public API described in `public-api.md`.
Set `INTECS_API_KEY` and a comma-separated `INTECS_UNIT_IDS` roster to enable it.
If either value is missing, the Fleet product will fail to load or show empty data.

The `/fleet` and `/unit/[id]` pages accept `dateStart` and `dateEnd` query
parameters in `YYYY-MM-DD` format. When omitted, they default to the current
site day, for example `2026-06-05` through `2026-06-05`, which the public API
expands to the full day.

Optional INTECS API settings:

- `INTECS_PUBLIC_API_BASE_URL` — defaults to `https://api.intecs.flowmeter.qimxmining.cloud`.
- `INTECS_PUBLIC_API_LOOKBACK_HOURS` — live range when explicit dates are not set; defaults to `24`.
- `INTECS_PUBLIC_API_LIMIT` — max records per dataset per API page; defaults to `1000`, max `5000`.
- `INTECS_PUBLIC_API_REVALIDATE_SECONDS` — Next.js fetch revalidation interval; defaults to `60`.
- `INTECS_DATE_START` / `INTECS_DATE_END` — optional fixed query range using `YYYY-MM-DD` or ISO timestamps.

Data modules are server-side:

- `lib/data.ts` — fleet units, alerts, stats, INTECS API adapter, and unit lookup.
- `lib/cas-data.ts` — CAS device, alarm, trend, and Stonkam CMS endpoint reference data.
- `lib/klubher-data.ts` — fuel station tanks, inventory, condition, and FMS data.
- `lib/klubher-types.ts` — shared Klubher types, thresholds, and classifiers.



## Auth

Authentication is handled by:

- `middleware.ts` — protects non-static requests.
- `lib/auth.ts` — HMAC-signed session cookie helpers.
- `app/actions/auth.ts` — password login server action.

Required environment variables:

- `IRYS_PASSWORD`
- `AUTH_SECRET`

In production the auth cookie is secure, so HTTPS is required.

## Structure

```text
app/                 Next.js App Router (pages, layouts, globals.css)
components/          React components (Dashboard, charts, UI pieces)
lib/                 Auth, rate limiting, and shared types

public/              Static assets
app/globals.css      Global styles, tokens, and component utility classes
tailwind.config.ts   Tailwind theme
middleware.ts        Auth middleware
```

## Deployment

The app is designed for Vercel. Configure `IRYS_PASSWORD` and `AUTH_SECRET` in the Vercel project environment before deploying.
Add `INTECS_API_KEY` and `INTECS_UNIT_IDS` in the same environment to enable
live Fleet data.
