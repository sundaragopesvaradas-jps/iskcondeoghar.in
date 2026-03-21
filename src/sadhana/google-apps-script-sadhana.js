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
 * - "Sadhana Unique Names" — one column "Name", unique devotee names (updated on each submit).
 *
 * Actions (POST JSON):
 * - { "action": "SADHANA_SUBMIT", ... } — append row + upsert name.
 * - { "action": "SADHANA_NAMES" } — return { names: string[] } for autocomplete.
 */

var UNIQUE_NAMES_SHEET = 'Sadhana Unique Names';
var RESPONSES_SHEET = 'Sadhana Responses';
var NAME_FIELD_ID = 'devotee_name';
var MAX_NAMES_RETURN = 2000;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'SADHANA_NAMES') {
      var docNames = SpreadsheetApp.getActiveSpreadsheet();
      return jsonOut({ status: 'success', names: readUniqueNames(docNames) });
    }

    if (data.action !== 'SADHANA_SUBMIT') {
      return jsonOut({ status: 'error', message: 'Unknown action' });
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

    return jsonOut({ status: 'success' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}

function ensureUniqueNamesSheet(doc) {
  var s = doc.getSheetByName(UNIQUE_NAMES_SHEET);
  if (!s) {
    s = doc.insertSheet(UNIQUE_NAMES_SHEET);
  }
  if (s.getLastRow() === 0) {
    s.getRange(1, 1).setValue('Name');
  }
  return s;
}

function upsertDevoteeName(doc, rawName) {
  var name = String(rawName || '').trim();
  if (!name) return;

  var sheet = ensureUniqueNamesSheet(doc);
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
  sheet.appendRow([name]);
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
