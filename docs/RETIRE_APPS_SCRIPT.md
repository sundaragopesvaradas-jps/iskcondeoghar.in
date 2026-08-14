# Retire public Google Apps Script deployments

The site no longer calls Apps Script. Public web app URLs for **name**, **sadhana**, and **BV** should be disabled so old clients cannot hit them.

## In Google (manual — once per spreadsheet)

For each of the three projects (Name, Sadhana, BV):

1. Open the spreadsheet → **Extensions → Apps Script**
2. **Deploy → Manage deployments**
3. For each **Web app** deployment: **⋮ → Manage → Delete** (or set access so it is no longer executable)
4. Optional: delete time-driven triggers under **Triggers**
5. Optional: unshare the sheet if it was only used as the backend

Archived script sources (reference only): `docs/archive/google-apps-script-*.js`

## In Azure / repo

- App setting `SADHANA_ADMIN_KEY` is unused (overview key lives on Cosmos `tables/sadhana.adminKey`, edited in `/admn`)
- Site APIs: `/api/names/search`, `/api/bv`, `/api/sadhana`, `/api/sadhana/form`, `/admn`
