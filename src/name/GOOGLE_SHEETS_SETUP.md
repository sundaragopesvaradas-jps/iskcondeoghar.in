# Name search → Google Sheets (step by step)

## What you need

1. A Google Sheet with two tabs named exactly **`Boy`** and **`Girl`**.
2. Row 1 headers on each tab: **`Name`**, **`Meaning`**, **`Letter`**, **`Gender`**.
3. Data from row 2 onward.

## Part 1 — Apps Script

1. Open the Google Sheet.
2. **Extensions** → **Apps Script**.
3. Delete any default code.
4. Paste the full contents of `src/name/google-apps-script-name.js`.
5. Save.

### Deploy as Web App

1. **Deploy** → **New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy → authorize if prompted.
6. Copy the Web app URL (`https://script.google.com/macros/s/.../exec`).

## Part 2 — Frontend config

1. Open `src/name/nameBackendConfig.ts`.
2. Set `NAME_GOOGLE_SCRIPT_URL` to your Web app URL.
3. Rebuild / redeploy the site (`npm run build`).

## Request / response

**POST** body (sent as `text/plain` JSON for CORS):

```json
{
  "action": "NAME_SEARCH",
  "gender": "Boy",
  "wordCount": "any",
  "query": "sa,hi,k"
}
```

- `wordCount`: `1` | `2` | `3` | `any`
- `any` → each item includes `name` + `meaning`
- `1` / `2` / `3` → `name` only
- Word count: split on spaces (trim/collapse); hyphenated tokens count as one word

## Checklist

- [ ] Boy and Girl tabs exist with correct headers
- [ ] Script pasted from this repo and saved
- [ ] Web app deployed (Anyone)
- [ ] URL set in `nameBackendConfig.ts`
- [ ] Site rebuilt after config change
