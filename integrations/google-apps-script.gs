/**
 * ChameleonDetailing v1.1.46 — Google Sheets report receiver
 * Bound spreadsheet:
 * https://docs.google.com/spreadsheets/d/1L8lF0A3SIQ06pmRDCq-7RwqNWvnRL9nomsMg0I7UxxM/edit
 *
 * 1) Replace WEBHOOK_SECRET below with a long random value.
 * 2) Run setup() once and approve Google permissions.
 * 3) Deploy -> New deployment -> Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 4) Copy the /exec URL into Cloudflare secret GOOGLE_SHEETS_WEBHOOK_URL.
 * 5) Put the SAME WEBHOOK_SECRET into Cloudflare secret GOOGLE_SHEETS_WEBHOOK_SECRET.
 */

const SPREADSHEET_ID = '1L8lF0A3SIQ06pmRDCq-7RwqNWvnRL9nomsMg0I7UxxM';
const WEBHOOK_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';
const REPORT_SHEETS = [
  'Users',
  'Orders',
  'Payments',
  'Revenue',
  'VIP',
  'Referrals',
  'Analytics',
  'Staff Activity',
  'Business Report',
];

function setup() {
  assertSecret_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  REPORT_SHEETS.forEach(name => {
    const sheet = getOrCreateSheet_(ss, name);
    sheet.setFrozenRows(1);
  });
  PropertiesService.getScriptProperties().setProperty('SETUP_AT', new Date().toISOString());
  Logger.log('ChameleonDetailing Google Sheets receiver is ready: ' + ss.getUrl());
}

function doGet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return json_({
    ok: true,
    service: 'ChameleonDetailing Google Sheets receiver',
    title: ss.getName(),
    sheetUrl: ss.getUrl(),
    lastSyncAt: PropertiesService.getScriptProperties().getProperty('LAST_SYNC_AT') || '',
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ok:false,error:'Another sync is already running'});
  try {
    assertSecret_();
    const body = parseBody_(e);
    if (!body || String(body.secret || '') !== WEBHOOK_SECRET) {
      return json_({ok:false,error:'Unauthorized'});
    }
    const action = String(body.action || '').toLowerCase();
    if (action === 'health') return health_();
    if (action === 'reset') return resetReports_();
    if (action === 'sync') return syncReports_(body.payload || {});
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message ? err.message : err)});
  } finally {
    lock.releaseLock();
  }
}

function health_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return json_({
    ok: true,
    title: ss.getName(),
    sheetUrl: ss.getUrl(),
    lastSyncAt: PropertiesService.getScriptProperties().getProperty('LAST_SYNC_AT') || '',
    reportSheets: REPORT_SHEETS,
  });
}

function syncReports_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = payload && payload.sheets ? payload.sheets : {};
  let writtenSheets = 0;
  let writtenRows = 0;

  REPORT_SHEETS.forEach(name => {
    const spec = sheets[name];
    if (!spec || !Array.isArray(spec.headers) || !Array.isArray(spec.rows)) return;
    const result = replaceSheet_(ss, name, spec.headers, spec.rows);
    writtenSheets += 1;
    writtenRows += result.rows;
  });

  const now = new Date().toISOString();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_SYNC_AT', now);
  props.setProperty('LAST_SYNC_TRIGGER', String(payload.trigger || 'unknown'));
  props.setProperty('LAST_SYNC_ROWS', String(writtenRows));

  return json_({
    ok: true,
    syncedAt: now,
    title: ss.getName(),
    sheetUrl: ss.getUrl(),
    writtenSheets: writtenSheets,
    writtenRows: writtenRows,
  });
}

function resetReports_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let cleared = 0;
  REPORT_SHEETS.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      cleared += lastRow - 1;
    }
  });
  const now = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty('LAST_RESET_AT', now);
  return json_({ok:true,resetAt:now,clearedRows:cleared,title:ss.getName(),sheetUrl:ss.getUrl()});
}

function replaceSheet_(ss, name, headers, sourceRows) {
  const sheet = getOrCreateSheet_(ss, name);
  const safeHeaders = headers.map(value => cell_(value));
  const width = Math.max(safeHeaders.length, 1);
  const rows = sourceRows.map(row => {
    const input = Array.isArray(row) ? row : [];
    const out = [];
    for (let i = 0; i < width; i++) out.push(cell_(input[i]));
    return out;
  });

  const existingRows = Math.max(sheet.getLastRow(), 1);
  const existingCols = Math.max(sheet.getLastColumn(), width);
  sheet.getRange(1, 1, existingRows, existingCols).clearContent();

  if (safeHeaders.length) {
    sheet.getRange(1, 1, 1, safeHeaders.length).setValues([safeHeaders]);
    sheet.getRange(1, 1, 1, safeHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1f2a20')
      .setFontColor('#ffffff');
  }
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
  sheet.setFrozenRows(1);

  // Auto-size only moderate reports; huge sheets stay fast.
  if (rows.length <= 2000 && width <= 24) sheet.autoResizeColumns(1, width);
  return {rows: rows.length};
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function parseBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) throw new Error('Empty request body');
  return JSON.parse(raw);
}

function cell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  // Avoid accidental spreadsheet formulas from user-generated text.
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function assertSecret_() {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET' || WEBHOOK_SECRET.length < 20) {
    throw new Error('Set WEBHOOK_SECRET to a random value of at least 20 characters before deployment.');
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
