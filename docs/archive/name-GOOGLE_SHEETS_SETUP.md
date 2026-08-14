# Name search — Google Sheets (legacy)

**Runtime status:** `/name` now uses **Cosmos DB** via `POST /api/names/search`.  
This doc is kept only for historical sheet layout / re-export.

Live data was migrated into Cosmos table `names` (tabs `Boy`, `Girl`). See `docs/COSMOS_DATA_MIGRATION.md`.

## Sheet layout (source of migrated data)

1. Tabs: **`Boy`**, **`Girl`**
2. Headers: **`Name`**, **`Meaning`**, **`Letter`**, **`Gender`**
3. Data from row 2 onward

## Re-import into Cosmos

1. Download xlsx → `tmp/sheet-export/names.xlsx`
2. Run `node scripts/migrate-data/migrate-sheets-to-cosmos.mjs`
