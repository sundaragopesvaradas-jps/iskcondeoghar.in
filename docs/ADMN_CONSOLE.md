# /admn — data console

## Access

| Role | Can do |
|---|---|
| `owner` | Everything below + manage accounts (create/update/delete others), transfer ownership. Only **one** owner. Never expires. |
| `editor` | View tables/tabs/rows + edit/add rows (atomic batch Update), create tables/tabs, edit shared column allowed-values. May delete **own** account. Optional access expiry. |
| `viewer` | View tables, tabs, rows only. May delete **own** account. Optional access expiry. |

Legacy roles `write` / `read` are auto-mapped to `editor` / `viewer`. On login, `sandip` is promoted to the sole owner if no owner exists yet (also: `npx tsx scripts/migrate-admn-roles.ts`).

## Console features

- **Rows per page**: 25 / 50 / 100 / 200 / 1000 / 3000 / 5000
- **Update**: edit many cells, then click **Update** — Cosmos transactional batch (all succeed or all fail; max 100 dirty rows)
- **Add column**: metadata on the current tab only (no backfill)
- **Column prefix filters**: type in a column header to filter the current page in real time
- **Allowed values**: stored once on the table (`columnSchemas`); dropdowns in the grid; edit under **Allowed values (shared)**. For `sadhana`, these lists are the **only** source for `/sadhana` form radios/checkboxes and history charts (no code fallbacks). Seed once: `npx tsx scripts/seed-sadhana-column-schemas.ts`
- **Sadhana overview admin key**: 4 digits only; set on the `sadhana` table in this UI. Used by `/sadhana/overview`.
- **Sadhana leaderboard (last year)**: assign points on allowed values, then Generate all — 12 rolling windows (1–30 … 331–365).
- **Tabs**: search with datalist suggestions + horizontally scrollable tab chips
- **Admin accounts** (owner only, bottom of console): list access + expiry, create editor/viewer with optional hours/days expiry, edit access, delete anyone, transfer ownership

## Sadhana data shape

- **`Sadhana Responses`** — only place submissions are stored
- **`Sadhana Unique Names`** — name list + devotee PIN for `/sadhana/records`
- Legacy per-person tabs: remove with `npx tsx scripts/cleanup-sadhana-person-tabs.ts`

## Create admin credentials

### Option A — CLI (recommended for first user)

From repo root (needs `.env.local` with Cosmos + any existing settings):

```bash
npx tsx scripts/create-admin.ts --username sandip --password 'ChooseALongPassword' --role owner
npx tsx scripts/create-admin.ts --username editor1 --password 'ChooseALongPassword' --role editor --expires-days 30
npx tsx scripts/create-admin.ts --username viewer --password 'ChooseALongPassword' --role viewer --expires-hours 48
npx tsx scripts/migrate-admn-roles.ts --owner sandip
```

### Option B — UI (owner only)

1. Sign in at `/admn` as owner
2. Scroll to **Admin accounts (owner only)**
3. Create username, password (min 8), role Editor/Viewer, optional expiry
4. Edit access / delete / transfer ownership from the same panel

## Env

| Name | Purpose |
|---|---|
| `COSMOS_*` | Storage |
| `ADMN_SESSION_SECRET` | Cookie signing (min 16 chars; use a long random string) |

Set `ADMN_SESSION_SECRET` on App Service the same way as Cosmos keys.
