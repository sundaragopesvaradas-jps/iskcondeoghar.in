# ISKCON Deoghar

Next.js (App Router) site for ISKCON Deoghar.

## Scripts

- `npm run dev` — local development (http://localhost:3000)
- `npm run build` — production build
- `npm start` — serve production build
- `npm run prepare:appservice` — pack standalone `deploy/` for Azure App Service

## Routes

- `/home` — home / gallery
- `/bv` — GITAMRTA registration
- `/name` — name search (Cosmos)
- `/sadhana`, `/sadhana/records`, `/sadhana/overview`
- `/spbooks`, `/spletters` — external redirects

## Backends

- `/name` — Cosmos via `POST /api/names/search`
- `/bv` — Cosmos via `POST /api/bv`
- `/sadhana` (+ records/overview) — Cosmos via `POST /api/sadhana`. Overview admin key is set in `/admn` on the sadhana table (not env).
- `/admn` — data console (username/password; roles `read`/`write`) — see `docs/ADMN_CONSOLE.md`
- Data migration: `docs/COSMOS_DATA_MIGRATION.md`
- Retire old Google web apps: `docs/RETIRE_APPS_SCRIPT.md`

## Hosting

**Azure App Service (Linux, Always On)** in **Central India (Pune)** for Jharkhand users.

Setup + DNS cutover: [`docs/AZURE_APP_SERVICE_SETUP.md`](docs/AZURE_APP_SERVICE_SETUP.md)
