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
 * The script appends one row per submission. Row 1 is headers: Timestamp + one column per field (labels).
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action !== 'SADHANA_SUBMIT') {
      return jsonOut({ status: 'error', message: 'Unknown action' });
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Sadhana Responses';
    var sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
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
    return jsonOut({ status: 'success' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
