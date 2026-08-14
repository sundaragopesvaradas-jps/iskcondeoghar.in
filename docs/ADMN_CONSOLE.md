# /admn — data console

## Access

| Role | Can do |
|---|---|
| `read` | View tables, tabs, rows |
| `write` | Everything `read` can + edit/add rows, create tables/tabs, create users |

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
