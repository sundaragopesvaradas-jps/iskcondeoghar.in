/**
 * Google Apps Script — Sadhana form → Spreadsheet
 *
 * 1. Create a new Google Sheet (or open an existing one).
 * 2. Extensions → Apps Script → paste this file (replace default code).
 * 3. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL into src/sadhana/sadhanaBackendConfig.ts (SADHANA_GOOGLE_SCRIPT_URL)
 *
 * Tabs:
 * - "Sadhana Responses" — one row per submit (Timestamp + fields).
 * - "Sadhana Unique Names" — columns "Name" | "PIN" (PIN optional; empty = default 1111).
 * - "Sadhana Admin" — optional; cell **B1** = admin overview secret key (`seeAllSadhanas`). If missing/empty, admin actions return FORBIDDEN.
 *
 * Actions (POST JSON):
 * - { "action": "SADHANA_SUBMIT", ... } — append row + upsert name + append same row to that devotee’s tab (incremental).
 * - { "action": "SADHANA_NAMES" } — return { names: string[] } for autocomplete.
 * - { "action": "SADHANA_LOOKUP", "name", "pin", "pinLength" } — past rows (prefers per-devotee tab if present, else filters Sadhana Responses); capped at MAX_HISTORY_ROWS_RETURN (newest first).
 * - { "action": "SADHANA_CHANGE_PIN", "name", "oldPin", "newPin", "pinLength" } — update PIN.
 * - { "action": "seeAllSadhanas", "adminKey", "mode": "names" | "lookup", "name"?(lookup) } — admin overview (key in sheet "Sadhana Admin" cell B1).
 */

/**
 * Max rows returned for `SADHANA_LOOKUP` and `seeAllSadhanas` (lookup). Rows are read in
 * **sheet order** (top → bottom); new submits are appended at the **bottom**, so we keep the
 * **last N** rows only. Then rows are sorted by **`Date` only**, **newest → oldest** (not timestamp).
 * Change here and redeploy the web app — no frontend rebuild required.
 */
var MAX_HISTORY_ROWS_RETURN = 30;

/** Admin key for `seeAllSadhanas`: read from this tab, cell F2 (see getStoredAdminKey_). */
var UNIQUE_NAMES_SHEET = 'Sadhana Unique Names';
var RESPONSES_SHEET = 'Sadhana Responses';
var NAME_FIELD_ID = 'devotee_name';
var MAX_NAMES_RETURN = 2000;


var DEFAULT_PIN = '1111';

var ADMIN_KEY_CACHE_KEY = 'sadhana_admin_key_sheet_f2';
var ADMIN_KEY_CACHE_SECONDS = 120;

/** Hindi headers in Sadhana Responses — must match sadhanaFormConfig.ts labels */
var HINDI_NAME_HEADER = 'आपका नाम';
var HINDI_LABELS_HISTORY = [
  'आप किस दिन का साधना भर रहे हैं?',
  'पिछली रात आप कितने बजे सोए थे?',
  'आप कितने बजे सोकर उठे?',
  'आपने कितने माला जप किए?',
  'आपने कितने बजे तक 16 (या न्यूनतम) माला जप किए?',
  'आपने कितने मिनट श्रीला प्रभुपाद की किताबें पढ़ीं?',
  'कौन-सी पुस्तकें पढ़ीं?',
  'आपने कितनी देर श्रवण किया?',
];

var ENGLISH_KEYS = [
  'Date',
  'Sleeping Time',
  'Waking up Time',
  'Chanting Rounds',
  'Chanting Completed',
  'Book Reading',
  'Which Book ?',
  'Hearing',
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'SADHANA_NAMES') {
      var docNames = SpreadsheetApp.getActiveSpreadsheet();
      return jsonOut({ status: 'success', names: readUniqueNames(docNames) });
    }

    if (data.action === 'SADHANA_LOOKUP') {
      return jsonOut(handleLookup_(data));
    }

    if (data.action === 'SADHANA_CHANGE_PIN') {
      return jsonOut(handleChangePin_(data));
    }

    if (data.action === 'seeAllSadhanas') {
      return jsonOut(handleSeeAllSadhanas_(data));
    }

    if (data.action !== 'SADHANA_SUBMIT') {
      return jsonOut({ status: 'error', message: 'Unknown action', code: 'UNKNOWN_ACTION' });
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(RESPONSES_SHEET);
    if (!sheet) {
      sheet = doc.insertSheet(RESPONSES_SHEET);
    }

    var fieldOrder = data.fieldOrder || [];
    var responses = data.responses || {};
    var labels = data.labels || {};

    var headerLabels = fieldOrder.map(function (id) {
      return labels[id] || id;
    });
    var headerRow = ['Timestamp'].concat(headerLabels);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    }

    var row = [new Date()].concat(
      fieldOrder.map(function (id) {
        var v = responses[id];
        if (Object.prototype.toString.call(v) === '[object Array]') {
          return v.join('; ');
        }
        if (typeof v === 'boolean') {
          return v ? 'Yes' : 'No';
        }
        return v == null ? '' : String(v);
      })
    );

    sheet.appendRow(row);

    var rawName = responses[NAME_FIELD_ID];
    upsertDevoteeName(doc, rawName);
    appendLastSubmitToDevoteeTab_(doc, rawName, row);

    return jsonOut({ status: 'success' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err), code: 'SERVER_ERROR' });
  }
}

function normalizeName_(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function nameKey_(s) {
  return normalizeName_(s).toLowerCase();
}

var MAX_SHEET_TITLE_LEN = 31;

/**
 * Valid Google Sheet tab title for a devotee (max 31 chars, no \\ / ? * [ ]).
 * Used for incremental append and for manual syncNameSheets + SADHANA_LOOKUP per-tab read.
 */
function sheetTitleForDevotee_(name) {
  name = normalizeName_(name);
  if (!name) {
    return 'Devotee';
  }
  var t = name
    .replace(/[\\\/\?\*\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > MAX_SHEET_TITLE_LEN) {
    t = t.substring(0, MAX_SHEET_TITLE_LEN).trim();
  }
  if (!t) {
    return 'Devotee';
  }
  if (nameKey_(t) === nameKey_(RESPONSES_SHEET) || nameKey_(t) === nameKey_(UNIQUE_NAMES_SHEET)) {
    t = (t + '_').substring(0, MAX_SHEET_TITLE_LEN).trim() || 'Devotee_';
  }
  return t;
}

function padRowToHeaderWidth_(row, headerLen) {
  var out = [];
  var i;
  for (i = 0; i < headerLen; i++) {
    out.push(i < row.length ? row[i] : '');
  }
  return out;
}

/**
 * After each successful submit: add this row to the devotee’s own tab (create tab + header row if needed).
 * Failures are ignored so the main Sadhana Responses row always wins.
 */
function appendLastSubmitToDevoteeTab_(doc, rawName, appendedRow) {
  try {
    var name = normalizeName_(rawName);
    if (!name) {
      return;
    }
    var main = doc.getSheetByName(RESPONSES_SHEET);
    if (!main || main.getLastRow() < 1) {
      return;
    }
    var lastCol = main.getLastColumn();
    var headerRow = main.getRange(1, 1, 1, lastCol).getValues()[0];
    var row = padRowToHeaderWidth_(appendedRow, headerRow.length);
    var title = sheetTitleForDevotee_(name);
    var devSheet = doc.getSheetByName(title);
    if (!devSheet) {
      devSheet = doc.insertSheet(title);
    }
    if (devSheet.getLastRow() === 0) {
      devSheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    }
    devSheet.appendRow(row);
  } catch (ignore) {
    /* e.g. spreadsheet sheet limit; Responses row is already stored */
  }
}

function pinLen_(data) {
  var n = parseInt(data.pinLength, 10);
  if (isNaN(n) || n < 4 || n > 12) {
    return 4;
  }
  return n;
}

function validatePinFormat_(pin, len) {
  pin = String(pin || '').trim();
  if (pin.length !== len) {
    return false;
  }
  return /^[0-9]+$/.test(pin);
}

function ensurePinColumn_(sheet) {
  if (sheet.getLastColumn() < 2) {
    sheet.getRange(1, 2).setValue('PIN');
  } else {
    var h = sheet.getRange(1, 2).getValue();
    if (!String(h || '').trim()) {
      sheet.getRange(1, 2).setValue('PIN');
    }
  }
}

function ensureUniqueNamesSheet(doc) {
  var s = doc.getSheetByName(UNIQUE_NAMES_SHEET);
  if (!s) {
    s = doc.insertSheet(UNIQUE_NAMES_SHEET);
  }
  if (s.getLastRow() === 0) {
    s.getRange(1, 1, 1, 2).setValues([['Name', 'PIN']]);
  } else {
    ensurePinColumn_(s);
  }
  return s;
}

function findNameRowInUniqueSheet_(sheet, name) {
  var nk = nameKey_(name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }
  var values = sheet.getRange(2, 1, lastRow, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var cell = String(values[i][0] || '').trim();
    if (nameKey_(cell) === nk) {
      return i + 2;
    }
  }
  return -1;
}

function handleLookup_(data) {
  var len = pinLen_(data);
  var name = normalizeName_(data.name);
  var pin = String(data.pin || '').trim();
  if (!name) {
    return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
  }
  if (!validatePinFormat_(pin, len)) {
    return { status: 'error', message: 'Invalid PIN', code: 'INVALID_PIN' };
  }

  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureUniqueNamesSheet(doc);
  ensurePinColumn_(sheet);

  var row = findNameRowInUniqueSheet_(sheet, name);
  if (row < 0) {
    return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
  }

  var storedPin = String(sheet.getRange(row, 2).getValue() || '').trim();
  var effectivePin = storedPin ? storedPin : DEFAULT_PIN;

  if (pin !== effectivePin) {
    return { status: 'error', message: 'Wrong PIN', code: 'WRONG_PIN' };
  }

  if (!storedPin && pin === DEFAULT_PIN) {
    sheet.getRange(row, 2).setValue(DEFAULT_PIN);
  }

  var rows = filterResponseRowsForName_(doc, name);
  return { status: 'success', rows: rows };
}

function handleChangePin_(data) {
  var len = pinLen_(data);
  var name = normalizeName_(data.name);
  var oldPin = String(data.oldPin || '').trim();
  var newPin = String(data.newPin || '').trim();
  if (!name) {
    return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
  }
  if (!validatePinFormat_(oldPin, len) || !validatePinFormat_(newPin, len)) {
    return { status: 'error', message: 'Invalid PIN', code: 'INVALID_PIN' };
  }
  if (oldPin === newPin) {
    return { status: 'error', message: 'New PIN must differ', code: 'PIN_UNCHANGED' };
  }

  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ensureUniqueNamesSheet(doc);
  ensurePinColumn_(sheet);

  var row = findNameRowInUniqueSheet_(sheet, name);
  if (row < 0) {
    return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
  }

  var storedPin = String(sheet.getRange(row, 2).getValue() || '').trim();
  var effectivePin = storedPin ? storedPin : DEFAULT_PIN;

  if (oldPin !== effectivePin) {
    return { status: 'error', message: 'Wrong PIN', code: 'WRONG_PIN' };
  }

  sheet.getRange(row, 2).setValue(newPin);
  return { status: 'success' };
}

/**
 * Secret for `seeAllSadhanas`: tab `Sadhana Admin` (UNIQUE_NAMES_SHEET), cell **F2** (E2 can be a label e.g. "Admin key").
 * Cached ~2 min after first successful read. Change F2 in the sheet; wait for cache or re-deploy to pick up immediately.
 */
function getStoredAdminKey_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(ADMIN_KEY_CACHE_KEY);
  if (cached !== null && cached !== '') {
    return cached;
  }
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(UNIQUE_NAMES_SHEET);
  if (!sheet) {
    return '';
  }
  var key = String(sheet.getRange(2, 6).getValue() || '').trim();
  if (key) {
    cache.put(ADMIN_KEY_CACHE_KEY, key, ADMIN_KEY_CACHE_SECONDS);
  }
  return key;
}

/**
 * Admin: same name list or same row shape as SADHANA_LOOKUP, but PIN not required.
 * `mode`: "names" | "lookup"
 */
function handleSeeAllSadhanas_(data) {
  var key = String(data.adminKey || '').trim();
  var stored = getStoredAdminKey_();
  if (!stored || key !== stored) {
    return { status: 'error', message: 'Invalid admin key', code: 'FORBIDDEN' };
  }
  var mode = String(data.mode || '').trim();
  var doc = SpreadsheetApp.getActiveSpreadsheet();

  if (mode === 'names') {
    return { status: 'success', names: readUniqueNames(doc) };
  }

  if (mode === 'lookup') {
    var name = normalizeName_(data.name);
    if (!name) {
      return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
    }
    var sheet = ensureUniqueNamesSheet(doc);
    var row = findNameRowInUniqueSheet_(sheet, name);
    if (row < 0) {
      return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
    }
    var rows = filterResponseRowsForName_(doc, name);
    return { status: 'success', rows: rows };
  }

  return { status: 'error', message: 'Invalid mode', code: 'INVALID_MODE' };
}

/** Trim + collapse spaces so sheet headers still match if spacing differs */
function normalizeHeaderForMatch_(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function findColIndexByHeader_(headers, label) {
  var want = normalizeHeaderForMatch_(label);
  for (var c = 0; c < headers.length; c++) {
    if (normalizeHeaderForMatch_(headers[c]) === want) {
      return c;
    }
  }
  return -1;
}

/**
 * Form row layout from SADHANA_SUBMIT: col 0 = Timestamp, 1 = devotee_name, 2–9 = eight history fields in form order.
 * Used when Hindi header text does not match (Unicode variants, old sheets).
 */
var NAME_COLUMN_INDEX = 1;
var HISTORY_COLUMN_INDICES_FALLBACK = [2, 3, 4, 5, 6, 7, 8, 9];

function formatCellForDisplay_(val) {
  if (val == null || val === '') {
    return '';
  }
  if (Object.prototype.toString.call(val) === '[object Date]') {
    var d = val;
    if (isNaN(d.getTime())) {
      return String(val);
    }
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

function buildHistoryColMaps_(headers) {
  var colMaps = [];
  for (var h = 0; h < HINDI_LABELS_HISTORY.length; h++) {
    var byLabel = findColIndexByHeader_(headers, HINDI_LABELS_HISTORY[h]);
    var idx = byLabel;
    if (idx < 0 && HISTORY_COLUMN_INDICES_FALLBACK[h] < headers.length) {
      idx = HISTORY_COLUMN_INDICES_FALLBACK[h];
    }
    colMaps.push({
      out: ENGLISH_KEYS[h],
      idx: idx,
    });
  }
  return colMaps;
}

function rowTimestampMs_(row) {
  var c0 = row[0];
  if (Object.prototype.toString.call(c0) === '[object Date]') {
    var d = c0;
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  return 0;
}

function rowToHistoryObj_(row, colMaps) {
  var obj = {};
  for (var m = 0; m < colMaps.length; m++) {
    var idx2 = colMaps[m].idx;
    var val = idx2 >= 0 && idx2 < row.length ? row[idx2] : '';
    obj[colMaps[m].out] = formatCellForDisplay_(val);
  }
  obj._submissionTimeMs = rowTimestampMs_(row);
  return obj;
}

/** Sort key from `Date` column only (yyyy-MM-dd or parseable); empty / invalid → `Infinity` (handled in sort). */
function historyDateSortKeyFromString_(s) {
  s = String(s || '').trim();
  if (!s) {
    return Number.POSITIVE_INFINITY;
  }
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).getTime();
  }
  var t = Date.parse(s);
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Newest → oldest by **Date** field only. Same calendar date keeps sheet order (stable sort).
 * Empty dates last. Does not use `_submissionTimeMs`.
 */
function sortHistoryRowsByDateOnly_(rows) {
  if (!rows || rows.length < 2) {
    return rows;
  }
  var copy = rows.slice();
  copy.sort(function (a, b) {
    var ka = historyDateSortKeyFromString_(a.Date);
    var kb = historyDateSortKeyFromString_(b.Date);
    if (ka === Number.POSITIVE_INFINITY) ka = Number.NEGATIVE_INFINITY;
    if (kb === Number.POSITIVE_INFINITY) kb = Number.NEGATIVE_INFINITY;
    return kb - ka;
  });
  return copy;
}

/**
 * If a tab exists for this devotee (same title as sheetTitleForDevotee_ / syncNameSheets), read history from it.
 * Returns null if no tab or no data rows — caller may fall back to Sadhana Responses.
 */
function readHistoryFromPerDevoteeSheetIfExists_(doc, name) {
  var title = sheetTitleForDevotee_(name);
  var sheet = doc.getSheetByName(title);
  if (!sheet || sheet.getLastRow() < 2) {
    return null;
  }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return null;
  }
  var headers = data[0];
  var colMaps = buildHistoryColMaps_(headers);
  var out = [];
  for (var r = 1; r < data.length; r++) {
    out.push(rowToHistoryObj_(data[r], colMaps));
  }
  return out;
}

function filterResponseRowsFromMainSheet_(doc, name) {
  var sheet = doc.getSheetByName(RESPONSES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return [];
  }

  var headers = data[0];
  var nameCol = findColIndexByHeader_(headers, HINDI_NAME_HEADER);
  if (nameCol < 0 && headers.length > NAME_COLUMN_INDEX) {
    nameCol = NAME_COLUMN_INDEX;
  }
  if (nameCol < 0) {
    return [];
  }

  var colMaps = buildHistoryColMaps_(headers);
  var nk = nameKey_(name);
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (nameCol >= row.length) {
      continue;
    }
    if (nameKey_(row[nameCol]) !== nk) {
      continue;
    }
    out.push(rowToHistoryObj_(row, colMaps));
  }
  return out;
}

/**
 * Keep only the last N rows in **sheet order** (bottom of the sheet = most recently appended).
 */
function limitHistoryRowsToMax_(rows) {
  if (!rows || rows.length <= MAX_HISTORY_ROWS_RETURN) {
    return rows;
  }
  return rows.slice(-MAX_HISTORY_ROWS_RETURN);
}

function filterResponseRowsForName_(doc, name) {
  var fromTab = readHistoryFromPerDevoteeSheetIfExists_(doc, name);
  var combined;
  if (fromTab !== null && fromTab.length > 0) {
    combined = fromTab;
  } else {
    // Fallback when the devotee tab is missing — read from Sadhana Responses (scan top → bottom).
    combined = filterResponseRowsFromMainSheet_(doc, name);
  }
  var capped = limitHistoryRowsToMax_(combined);
  return sortHistoryRowsByDateOnly_(capped);
}

function upsertDevoteeName(doc, rawName) {
  var name = String(rawName || '').trim();
  if (!name) return;

  var sheet = ensureUniqueNamesSheet(doc);
  ensurePinColumn_(sheet);
  var lastRow = sheet.getLastRow();
  var seen = {};
  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var cell = String(values[i][0] || '').trim();
      if (cell) seen[cell.toLowerCase()] = true;
    }
  }
  if (seen[name.toLowerCase()]) return;
  sheet.appendRow([name, '']);
}

function readUniqueNames(doc) {
  var sheet = doc.getSheetByName(UNIQUE_NAMES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var last = sheet.getLastRow();
  var values = sheet.getRange(2, 1, last, 1).getValues();
  var out = [];
  var seen = {};
  for (var j = 0; j < values.length; j++) {
    var cell = String(values[j][0] || '').trim();
    if (!cell) continue;
    var k = cell.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    out.push(cell);
  }
  out.sort(function (a, b) {
    return String(a).localeCompare(String(b), 'hi');
  });
  if (out.length > MAX_NAMES_RETURN) {
    return out.slice(0, MAX_NAMES_RETURN);
  }
  return out;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manual / scheduled full rebuild: for each name in Sadhana Unique Names, recreate that devotee’s tab
 * from all matching rows in Sadhana Responses. Use after schema changes or to fix drift.
 * Incremental updates happen in appendLastSubmitToDevoteeTab_ on each submit.
 */
function syncNameSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName(RESPONSES_SHEET);
  if (!mainSheet || mainSheet.getLastRow() < 1) {
    return;
  }
  var uniqueSheet = ss.getSheetByName(UNIQUE_NAMES_SHEET);
  if (!uniqueSheet || uniqueSheet.getLastRow() < 2) {
    return;
  }

  var data = mainSheet.getDataRange().getValues();
  var headers = data[0];

  var uLast = uniqueSheet.getLastRow();
  var nameCells = uniqueSheet.getRange(2, 1, uLast, 1).getValues();

  for (var n = 0; n < nameCells.length; n++) {
    var raw = nameCells[n][0];
    if (raw == null || String(raw).trim() === '') {
      continue;
    }
    var name = String(raw).trim();
    var title = sheetTitleForDevotee_(name);
    var sheet = ss.getSheetByName(title);
    if (!sheet) {
      sheet = ss.insertSheet(title);
    }
    sheet.clearContents();
    sheet.appendRow(headers);

    var nk = nameKey_(name);
    var filtered = data.filter(function (row, i) {
      if (i === 0) {
        return true;
      }
      return nameKey_(row[1]) === nk;
    });

    if (filtered.length > 1) {
      sheet.getRange(2, 1, filtered.length - 1, filtered[0].length).setValues(filtered.slice(1));
    }
  }
}

function createTrigger() {
  ScriptApp.newTrigger('syncNameSheets')
    .timeBased()
    .everyMinutes(30) // you can change to 1, 10, etc.
    .create();
}
