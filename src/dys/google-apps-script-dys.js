/**
 * Google Apps Script for DYS (Bhagavad Gita in 18 Days) Registration
 *
 * Setup:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1J_1tRGYSyrEL96Vi7XFBFQLe7EYABwx-VhsQxEMk3So/edit
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code
 * 4. Click Deploy > New deployment
 * 5. Select type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Deploy and copy the URL
 * 9. Replace SCRIPT_URL in DysPage.tsx with the deployment URL
 */

const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Sheet not found' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Add headers if first row is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Age', 'Mobile', 'Gender', 'Location']);
    }

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    sheet.appendRow([
      timestamp,
      data.name || '',
      data.age || '',
      data.mobile || '',
      data.gender || '',
      data.location || '',
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'DYS Registration API is running' })
  ).setMimeType(ContentService.MimeType.JSON);
}
