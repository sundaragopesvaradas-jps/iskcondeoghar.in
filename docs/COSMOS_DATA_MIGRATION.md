# Sheet → Cosmos one-time migration

## Azure

| Resource | Value |
|---|---|
| Resource group | `iskcon-deoghar-rg` |
| Cosmos account | `iskcondeoghar-data` (serverless, Central India) |
| Database | `iskcon` |
| Containers | `tables` (PK `/id`), `rows` (PK `/tableId`) |

## Re-run

1. Re-download xlsx into `tmp/sheet-export/` (`names.xlsx`, `sadhana.xlsx`, `bv.xlsx`).
2. Ensure `scripts/migrate-data/.env` has `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DB`.
3. `cd scripts/migrate-data && npm install && node migrate-sheets-to-cosmos.mjs`

Upserts are idempotent by deterministic row `id`.

## Imported tables (2026-08-13)

| tableId | tabs | rows |
|---|---|---|
| `names` | Boy, Girl | 36858 |
| `sadhana` | Responses + Unique Names (legacy person tabs removed) | was 1800 incl. person tabs |
| `bv` | Sheet1 (not named BvRegistrations in the sheet) | 13 |

Website APIs use Cosmos only (`/api/names/search`, `/api/bv`, `/api/sadhana`). Undeploy old Apps Script web apps: `docs/RETIRE_APPS_SCRIPT.md`.
