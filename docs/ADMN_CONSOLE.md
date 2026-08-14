# /admn — data console

## Access

| Role | Can do |
|---|---|
| `read` | View tables, tabs, rows |
| `write` | Everything `read` can + edit/add rows (atomic batch Update), create tables/tabs, edit shared column allowed-values, create users |

## Console features

- **Rows per page**: 25 / 50 / 100 / 200 / 1000 / 3000 / 5000
- **Update**: edit many cells, then click **Update** — Cosmos transactional batch (all succeed or all fail; max 100 dirty rows)
- **Add column**: metadata on the current tab only (no backfill)
- **Column prefix filters**: type in a column header to filter the current page in real time
- **Allowed values**: stored once on the table (`columnSchemas`); dropdowns in the grid; edit under **Allowed values (shared)**. For `sadhana`, these lists are the **only** source for `/sadhana` form radios/checkboxes and history charts (no code fallbacks). Seed once: `npx tsx scripts/seed-sadhana-column-schemas.ts`
- **Sadhana overview admin key**: 4 digits only; set on the `sadhana` table in this UI. Used by `/sadhana/overview`.
- **Sadhana leaderboard (last year)**: assign points on allowed values, then Generate all — 12 rolling windows (1–30 … 331–365).
- **Tabs**: search with datalist suggestions + horizontally scrollable tab chips

## Sadhana data shape

- **`Sadhana Responses`** — only place submissions are stored
- **`Sadhana Unique Names`** — name list + devotee PIN for `/sadhana/records`
- Legacy per-person tabs: remove with `npx tsx scripts/cleanup-sadhana-person-tabs.ts` |

## Create admin credentials

### Option A — CLI (recommended for first user)

From repo root (needs `.env.local` with Cosmos + any existing settings):

```bash
npx tsx scripts/create-admin.ts --username sandip --password 'ChooseALongPassword' --role write
npx tsx scripts/create-admin.ts --username viewer --password 'ChooseALongPassword' --role read
```

### Option B — UI (after you have a write user)

1. Sign in at `/admn`
2. Open console → **Create admin user**
3. Choose username, password (min 8), role `read` or `write`

## Env

| Name | Purpose |
|---|---|
| `COSMOS_*` | Storage |
| `ADMN_SESSION_SECRET` | Cookie signing (min 16 chars; use a long random string) |

Set `ADMN_SESSION_SECRET` on App Service the same way as Cosmos keys.
