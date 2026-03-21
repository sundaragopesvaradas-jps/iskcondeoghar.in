# Send Sadhana form answers into Google Sheets (step by step)

You do **not** need to “program” the sheet itself. You will:

1. Create a Google Sheet (or use one you already have).
2. Attach a small script that **writes new rows** when someone submits the website form.
3. Paste that **Web App URL** into a small config file in this repo so the form knows where to send data.

---

## Part 1 — Google Sheet + script (do this once)

### Step 1: Create the spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and sign in with the Google account that should **own** the data.
2. Click **Blank** to create a new spreadsheet (or open an existing one).
3. Optional: rename the file (top left) to something like `ISKCON Deoghar — Sadhana responses`.

You can leave **Sheet1** as it is. The script will add tabs automatically:

- **Sadhana Responses** — full form rows (first successful submit creates headers).
- **Sadhana Unique Names** — columns **Name** | **PIN**. Unique devotee names (updated on each submit; used for autocomplete). The script adds the **PIN** column automatically if it is missing. An empty PIN cell means the default PIN **1111** until the user logs in to “past records” or changes their PIN.

After changing the script, use **Deploy → Manage deployments → Edit (pencil) → New version → Deploy** so `SADHANA_SUBMIT`, `SADHANA_NAMES`, `SADHANA_LOOKUP`, and `SADHANA_CHANGE_PIN` all work.

### Step 2: Open Apps Script **from this spreadsheet** (important)

The script must be opened **from the same file** so it can write into it.

1. With that spreadsheet open, menu: **Extensions** → **Apps Script**.
2. A new tab opens with a code editor. You may see a few lines like `function myFunction() { ... }`.

### Step 3: Paste the script

1. In the Apps Script tab, **select all** the code in the editor and delete it.
2. Open this project file on your computer:  
   `iskcondeoghar.in/src/sadhana/google-apps-script-sadhana.js`
3. **Copy the entire file** and paste it into the Apps Script editor.
4. Click **Save** (disk icon) or press Ctrl+S / Cmd+S.
5. Name the project if asked (e.g. `Sadhana form handler`).

### Step 4: Authorize the script (first run)

1. Still in Apps Script, click **Run** (▶). If it asks which function to run, pick **`doPost`** if listed; if Run is disabled, go straight to **Deploy** in Step 5 — deployment will also ask for permission.
2. Google will show **Authorization required** → **Review permissions**.
3. Choose your Google account → if you see **Google hasn’t verified this app**, click **Advanced** → **Go to … (unsafe)** only if you trust **your own** script (you pasted it yourself).
4. Allow access to **Google Sheets** (and anything else it asks for).

### Step 5: Deploy as a “Web app” and copy the URL

1. Top right: **Deploy** → **New deployment**.
2. Click the gear ⚙️ next to **Select type** → choose **Web app**.
3. Set:
   - **Description**: e.g. `Sadhana v1` (any text).
   - **Execute as**: **Me** (your account).
   - **Who has access**: **Anyone**  
     (This is required: visitors on `iskcondeoghar.in` are not logged into your Google account.)
4. Click **Deploy**.
5. **Copy the Web App URL** — it looks like:  
   `https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec`  
   Keep this URL safe; you will paste it into your website config next.

If you **change the script code later**, use **Deploy** → **Manage deployments** → **Edit** (pencil) on the active deployment → **Version: New version** → **Deploy** again. The URL usually stays the same.

---

## Part 2 — Put the URL in the project (no Azure env var needed)

1. In this repo, open **`src/sadhana/sadhanaBackendConfig.ts`**.
2. Set **`SADHANA_GOOGLE_SCRIPT_URL`** to your Web App URL (inside the quotes), for example:

```ts
export const SADHANA_GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec';
```

3. **Save the file**, commit, and push (or run your usual deploy). The URL is included when the app is **built** — after you change it, run a new build/deploy so the live site picks it up.

### Test locally

1. After editing `sadhanaBackendConfig.ts`, run `npm start`.
2. Open `http://localhost:3000/sadhana`, submit the form.
3. In the Google Sheet, open the **Sadhana Responses** tab — a new row should appear.

**Note:** The URL will be visible in the published JavaScript bundle (same as with env vars). That is normal for this setup; avoid using the sheet for highly sensitive data unless you add server-side protection.

---

## What you will see in the Sheet

- Tab: **Sadhana Responses**
- Row 1: **Timestamp**, then column headers matching your form field labels (from `sadhanaFormConfig.ts`).
- Each submit adds **one new row** underneath.

- Tab: **Sadhana Unique Names**
- Row 1: **Name** | **PIN** (PIN may be added on first script run after an upgrade).
- One row per known devotee; **PIN** can be empty (= use default **1111** on the site).

### “Past sadhana records” on `/sadhana`

The site sends the same Web App URL with JSON actions:

| Action | Purpose |
|--------|----------------|
| `SADHANA_NAMES` | Load name list for autocomplete. |
| `SADHANA_LOOKUP` | Name + PIN → rows from that devotee’s tab if it exists, else filtered from **Sadhana Responses** (tab title = `sheetTitleForDevotee_` in the script: max **31** chars, no `\ / ? * [ ]`). |
| `SADHANA_CHANGE_PIN` | Update **PIN** in **Sadhana Unique Names** after a successful login. |

**Per-devotee tabs:** Each successful submit also **appends** that row to the devotee’s tab (`appendLastSubmitToDevoteeTab_`). New tabs get the same header row as **Sadhana Responses**. If the tab append fails, the main row is still saved.

**Manual `syncNameSheets`:** Run from the Apps Script editor to **rebuild all** devotee tabs from **Sadhana Responses** (e.g. after schema changes). Not run on each submit.

PIN length and default are defined in `src/sadhana/sadhanaPinConfig.ts` and must stay in sync with `pinLen_` / `DEFAULT_PIN` in `google-apps-script-sadhana.js` when you change them.

---

## If something does not work

| Problem | What to check |
|--------|----------------|
| Submit shows “not configured” | `SADHANA_GOOGLE_SCRIPT_URL` in `sadhanaBackendConfig.ts` is still empty, or production wasn’t **rebuilt** after you set it. |
| Submit fails / network error | Web App URL wrong or deployment removed. Redeploy and copy URL again. |
| “Access denied” for visitors | **Who has access** must be **Anyone**, not “Only myself”. |
| Nothing appears in Sheet | Open Apps Script from **this** spreadsheet (Extensions → Apps Script). Standalone scripts without a linked sheet won’t write where you expect. |
| Sheet tab missing | Submit once successfully; the script creates **Sadhana Responses** on first successful POST. |

---

## Short checklist

- [ ] Sheet created in the Google account you want to own the data  
- [ ] Extensions → Apps Script → pasted `google-apps-script-sadhana.js` → saved  
- [ ] Deploy → Web app → Execute as **Me**, access **Anyone**  
- [ ] Copied Web App URL  
- [ ] Pasted Web App URL into `src/sadhana/sadhanaBackendConfig.ts`  
- [ ] Rebuilt/redeployed the website after changing that file  

After that, each submit from `/sadhana` should append one row to **Sadhana Responses**.

**New fields:** Headers come from `sadhanaFormConfig.ts` (e.g. conditional fields such as **कौन-सी पुस्तकें पढ़ीं?** when reading time is not `0`). After you ship a new field, the **first** submission that includes it will align columns; if the sheet already had a header row from an older form version, you may need to add the new column manually or use a fresh sheet tab.

**Name autocomplete:** The live site sends `{ "action": "SADHANA_NAMES" }` to the same Web App URL to load suggestions. If names never appear, the deployment is still on an old script version, or the browser blocked the request (check DevTools → Network). Until the sheet has rows in **Sadhana Unique Names**, the list may be empty except for names cached in the browser after successful submits.
