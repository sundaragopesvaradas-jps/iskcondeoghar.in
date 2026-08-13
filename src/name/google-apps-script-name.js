/**
 * Google Apps Script — Baby / devotee name search
 *
 * Sheet tabs (exact names): Boy, Girl
 * Columns: Name | Meaning | Letter | Gender
 *
 * Setup:
 * 1. Create a Google Sheet with Boy and Girl tabs (headers in row 1).
 * 2. Extensions → Apps Script → paste this file (replace default code).
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL into src/name/nameBackendConfig.ts
 *    (see GOOGLE_SHEETS_SETUP.md)
 *
 * Request (POST, text/plain JSON body):
 * {
 *   "action": "NAME_SEARCH",
 *   "gender": "Boy" | "Girl",
 *   "wordCount": "1" | "2" | "3" | "any",
 *   "query": "sa,hi,k,to"
 * }
 */

var BOY_TAB = 'Boy';
var GIRL_TAB = 'Girl';
var COL_NAME = 0;
var COL_MEANING = 1;

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function parsePrefixes_(query) {
  var raw = (query || '').toString();
  var parts = raw.split(',');
  var out = [];
  var seen = {};
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].replace(/^\s+|\s+$/g, '');
    if (!p) continue;
    var key = p.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(p);
  }
  return out;
}

/**
 * Word count: split on whitespace after collapsing spaces.
 * Hyphenated tokens count as one word (e.g. "Anupama-Gaurangi" → 1).
 */
function wordCountOfName_(name) {
  var cleaned = (name || '')
    .toString()
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
  if (!cleaned) return 0;
  return cleaned.split(' ').length;
}

function matchesWordCount_(name, wordCount) {
  if (wordCount === 'any') return true;
  var n = wordCountOfName_(name);
  if (wordCount === '1') return n === 1;
  if (wordCount === '2') return n === 2;
  if (wordCount === '3') return n === 3;
  return true;
}

function readNameRows_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values = sheet.getRange(2, 1, lastRow, Math.max(lastCol, 2)).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var name = (values[i][COL_NAME] || '').toString().replace(/^\s+|\s+$/g, '');
    if (!name) continue;
    var meaning = (values[i][COL_MEANING] || '').toString();
    rows.push({ name: name, meaning: meaning });
  }
  return rows;
}

function filterForPrefix_(rows, prefix, wordCount, includeMeaning) {
  var prefixLower = prefix.toLowerCase();
  var seen = {};
  var items = [];

  for (var i = 0; i < rows.length; i++) {
    var name = rows[i].name;
    var nameLower = name.toLowerCase();
    if (nameLower.indexOf(prefixLower) !== 0) continue;
    if (!matchesWordCount_(name, wordCount)) continue;

    var uniqKey = nameLower;
    if (seen[uniqKey]) continue;
    seen[uniqKey] = true;

    if (includeMeaning) {
      items.push({ name: name, meaning: rows[i].meaning });
    } else {
      items.push({ name: name });
    }
  }

  items.sort(function (a, b) {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return items;
}

function handleNameSearch_(data) {
  var gender = (data.gender || '').toString().trim();
  var wordCount = (data.wordCount || '').toString().trim().toLowerCase();
  var query = (data.query || '').toString();

  if (gender !== 'Boy' && gender !== 'Girl') {
    return jsonResponse_({
      status: 'error',
      message: 'gender must be Boy or Girl',
    });
  }

  if (['1', '2', '3', 'any'].indexOf(wordCount) === -1) {
    return jsonResponse_({
      status: 'error',
      message: 'wordCount must be 1, 2, 3, or any',
    });
  }

  var prefixes = parsePrefixes_(query);
  if (prefixes.length === 0) {
    return jsonResponse_({
      status: 'error',
      message: 'query must include at least one prefix',
    });
  }

  var tabName = gender === 'Boy' ? BOY_TAB : GIRL_TAB;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
  if (!sheet) {
    return jsonResponse_({
      status: 'error',
      message: 'Sheet tab not found: ' + tabName,
    });
  }

  var includeMeaning = wordCount === 'any';
  var rows = readNameRows_(sheet);
  var groups = [];

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    groups.push({
      prefix: prefix,
      items: filterForPrefix_(rows, prefix, wordCount, includeMeaning),
    });
  }

  return jsonResponse_({
    status: 'ok',
    includeMeaning: includeMeaning,
    gender: gender,
    wordCount: wordCount,
    groups: groups,
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = (data.action || '').toString().trim();
    if (action === 'NAME_SEARCH') {
      return handleNameSearch_(data);
    }
    return jsonResponse_({
      status: 'error',
      message: 'Invalid action. Use NAME_SEARCH.',
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.message });
  }
}

function doGet() {
  return jsonResponse_({ status: 'ok', message: 'Name search API is running' });
}
