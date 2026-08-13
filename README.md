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
- `/name` — name search (Google Apps Script)
- `/sadhana`, `/sadhana/records`, `/sadhana/overview`
- `/spbooks`, `/spletters` — external redirects

## Backends

Sadhana / Name / BV still use Google Apps Script web apps. See:

- `src/sadhana/GOOGLE_SHEETS_SETUP.md`
- `src/name/GOOGLE_SHEETS_SETUP.md`

## Hosting

**Azure App Service (Linux, Always On)** in **Central India (Pune)** for Jharkhand users.

Setup + DNS cutover: [`docs/AZURE_APP_SERVICE_SETUP.md`](docs/AZURE_APP_SERVICE_SETUP.md)
