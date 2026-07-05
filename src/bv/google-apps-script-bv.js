/**
 * Google Apps Script for GITAMRTA (Bhagavad Gita in 18 Days) Registration
 *
 * Setup:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Lp9pJtgIx2QZ92FH3_HbqnCv5Dt2yMAr_TkYyNygkdg/edit
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code
 * 4. Click Deploy > New deployment
 * 5. Select type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Deploy and copy the URL
 * 9. Replace SCRIPT_URL in BvPage.tsx with the deployment URL
 */

const SHEET_NAME = 'BvRegistrations';
const HEADERS = [
  'Timestamp',
  'RegistrationId',
  'Name',
  'Age',
  'Mobile',
  'Gender',
  'Location',
  'PaymentStatus',
  'PaymentId',
  'PaymentTime',
  'PaymentAmount',
  'RazorpaySignature',
];

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet not found');
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsUpdate = HEADERS.some((header, index) => currentHeaders[index] !== header);
  if (needsUpdate) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function generateRegistrationId() {
  return 'BV-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function handleRegister(sheet, data) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const registrationId = generateRegistrationId();

  sheet.appendRow([
    timestamp,
    registrationId,
    data.name || '',
    data.age || '',
    data.mobile || '',
    data.gender || '',
    data.location || '',
    'Unpaid',
    '',
    '',
    '',
    '',
  ]);

  return jsonResponse({ success: true, registrationId, paymentStatus: 'Unpaid' });
}

function findRowByRegistrationId(sheet, registrationId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const registrationIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < registrationIds.length; i++) {
    if (registrationIds[i][0] === registrationId) {
      return i + 2;
    }
  }
  return -1;
}

function handleMarkPaid(sheet, data) {
  const registrationId = (data.registrationId || '').toString().trim();
  if (!registrationId) {
    return jsonResponse({ success: false, error: 'registrationId is required' });
  }

  const row = findRowByRegistrationId(sheet, registrationId);
  if (row === -1) {
    return jsonResponse({ success: false, error: 'Registration not found' });
  }

  const paymentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  sheet.getRange(row, 8, 1, 5).setValues([[
    'Paid',
    data.razorpay_payment_id || data.paymentId || '',
    paymentTime,
    data.amount || '',
    data.razorpay_signature || '',
  ]]);

  return jsonResponse({ success: true, registrationId, paymentStatus: 'Paid' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = (data.action || '').toString().trim();
    const sheet = getSheet();
    ensureHeaders(sheet);

    if (action === 'register') {
      return handleRegister(sheet, data);
    }
    if (action === 'markPaid') {
      return handleMarkPaid(sheet, data);
    }
    return jsonResponse({ success: false, error: 'Invalid action. Use register or markPaid.' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({ status: 'Bv Registration + Payment API is running' });
}
