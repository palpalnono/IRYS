# IRYS Uptime Optimization Platform - Handover Document

Welcome to the IRYS project! This document is intended to help you get up to speed quickly with the current state of the codebase, recent architecture changes, and pending tasks. 

## 1. Project Overview & Purpose
IRYS is a fleet uptime monitoring dashboard built for Intecs. Its primary goal is to **shorten mean time to repair (MTTR)** for construction equipment (Excavators, Dump Trucks, Wheel Loaders, Bulldozers). 

The application is heavily geared towards an operational, NOC-like environment. The UI emphasizes high data density and quick triage over consumer aesthetics (e.g. no unnecessary illustrations, gradients, or "SaaS" tropes).

## 2. Architecture & Tech Stack
- **Framework:** Next.js 15.3.x (App Router) with Turbopack enabled
- **UI & Styling:** React 18.3.x, Tailwind CSS
- **Data Fetching:** Server components are utilized extensively for data loading, passing data down to interactive Client components. (Uses Next 15 patterns like awaited `params` and `searchParams`).
- **Authentication:** Lightweight, password-based gate (`/login`) utilizing HMAC-signed session cookies (via `lib/auth.ts` and `middleware.ts`), with 8-hour maxAge and hardened CSP.

## 3. Current State & Recent Changes
The repository currently supports two product lines, although one is hidden:

### Fleet Module (Active)
- The core offering available under `/fleet` and its sub-routes.
- **Recent Update:** The Fleet module is fully integrated with the **live INTECS public API** (documented in `public-api.md`).
- It parses telemetry from multiple subsystems (Fuel, Fire/Ansul, Lube, GPS, CAS) and bubbles up system health to the main dashboard.
- Subsystem routes have been reorganized (e.g., from `/unit/[id]/[system]` to `/system/[system]/[id]`).
- Note: Signal monitoring has been completely removed across the project in favor of simple online/offline status.

### Fuel Station / Klubher Module (Hidden)
- A separate module for fuel-depot monitoring (`/station/*`).
- **Current Status:** This product is currently hidden from the user interface. The link from the main entry screen (`components/PortalHome.tsx`) was removed in a recent commit, leaving the routes disconnected. 
- It still runs entirely on deterministic mock data (see `lib/klubher-data.ts`).

### Data Layer
- Fleet data is fetched server-side in `lib/data.ts`.
- Mock data cleanup has been completed (legacy `mulberry32` and hardcoded arrays removed).
- Diagnostic CLI script available at `scripts/test.ts` (run via `npm run test:api`).

## 4. Codebase Navigation
- `app/` — All Next.js routes, server actions, and layout definitions.
- `components/` — UI components. Contains `PortalHome.tsx` (the entry point), and subdirectories for `klubher` and `atoms` (basic building blocks).
- `lib/` — Contains core logic:
  - `data.ts`: Fleet API adapter and lookup logic.
  - `klubher-data.ts` & `klubher-types.ts`: Mock data and types for the Fuel Station module.
  - `auth.ts`: Authentication utilities.
- `.impeccable/critiques/` — A directory containing historical design and product feedback (useful for understanding the "why" behind the UI).
- `scripts/` — Contains diagnostic scripts like `test.ts`.

## 5. Running & Deploying

### Environment Variables
You will need a `.env.local` file with the following:
```bash
IRYS_PASSWORD=change-me
AUTH_SECRET=replace-with-32-plus-random-chars

# Live INTECS fleet API variables
INTECS_API_KEY=<your-api-key>
INTECS_UNIT_IDS=HT144,HT145,etc
```
*(You can generate an `AUTH_SECRET` by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*

### Local Development
Requires Node.js `>=20.x` (optimally `24.x` as pinned in `package.json`).
```bash
npm install
npm run dev
```

### Deployment
Designed for Vercel. Ensure you add `IRYS_PASSWORD`, `AUTH_SECRET`, `INTECS_API_KEY`, and `INTECS_UNIT_IDS` as Environment Variables in the Vercel dashboard prior to deployment.

## 6. Outstanding Tasks & Future Roadmap
1. **Klubher Module Fate:** Determine if the `/station` product should be fully integrated with a real API and re-linked in `PortalHome.tsx`, or if it should be completely removed from the repository.
2. **Review Critiques:** Check `.impeccable/critiques/system-rest.md` for any remaining visual polishes that haven't been implemented yet.

Good luck with the project!
