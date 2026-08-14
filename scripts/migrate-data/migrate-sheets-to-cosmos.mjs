/**
 * One-time: Google Sheet xlsx exports → Cosmos DB (tables + rows).
 *
 * Expects:
 *   tmp/sheet-export/names.xlsx
 *   tmp/sheet-export/sadhana.xlsx
 *   tmp/sheet-export/bv.xlsx
 *   scripts/migrate-data/.env (COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DB)
 *
 * Usage: node scripts/migrate-data/migrate-sheets-to-cosmos.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CosmosClient } from '@azure/cosmos';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function loadEnv() {
  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

function stableId(...parts) {
  return createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32);
}

function sheetToMatrix(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = (matrix[0] || []).map((h, i) => {
    const s = String(h ?? '').trim();
    return s || `Column_${i + 1}`;
  });
  // Drop trailing empty header names only at the end
  let last = headers.length - 1;
  while (last > 0 && /^Column_\d+$/.test(headers[last])) last--;
  const cols = headers.slice(0, last + 1);
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const raw = matrix[r] || [];
    const data = {};
    let any = false;
    for (let c = 0; c < cols.length; c++) {
      const v = raw[c] == null ? '' : String(raw[c]).trim();
      data[cols[c]] = v;
      if (v) any = true;
    }
    if (!any) continue;
    rows.push({ rowIndex: r + 1, data });
  }
  return { headers: cols, rows };
}

async function bulkUpsert(container, docs) {
  const BATCH = 50;
  let ok = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const chunk = docs.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((doc) =>
        container.items.upsert(doc).then(() => {
          ok++;
        })
      )
    );
    if ((i + BATCH) % 500 < BATCH || i + BATCH >= docs.length) {
      process.stdout.write(`  … ${Math.min(i + BATCH, docs.length)}/${docs.length}\n`);
    }
  }
  return ok;
}

async function migrateWorkbook({
  tablesContainer,
  rowsContainer,
  tableId,
  tableName,
  sourceSpreadsheetId,
  xlsxPath,
  migratedAt,
}) {
  const abs = resolve(ROOT, xlsxPath);
  if (!existsSync(abs)) throw new Error(`Missing export: ${abs}`);
  const workbook = XLSX.readFile(abs, { cellDates: true });
  const tabSummaries = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const { headers, rows } = sheetToMatrix(workbook, sheetName);
    const tabId = sheetName;
    tabSummaries.push({
      id: tabId,
      name: sheetName,
      columns: headers.map((name, order) => ({ id: name, name, type: 'text', order })),
      rowCount: rows.length,
    });

    const docs = rows.map(({ rowIndex, data }) => ({
      id: stableId(tableId, tabId, String(rowIndex)),
      tableId,
      tabId,
      rowIndex,
      data,
      updatedAt: migratedAt,
      updatedBy: 'migration',
      syncStatus: 'synced',
      source: {
        spreadsheetId: sourceSpreadsheetId,
        sheetName,
        rowIndex,
      },
    }));

    process.stdout.write(`\n[${tableId}] tab "${sheetName}": ${rows.length} rows, ${headers.length} cols\n`);
    if (docs.length) {
      await bulkUpsert(rowsContainer, docs);
      totalRows += docs.length;
    }
  }

  const tableDoc = {
    id: tableId,
    name: tableName,
    sourceSpreadsheetId,
    tabs: tabSummaries,
    migratedAt,
    updatedAt: migratedAt,
  };
  await tablesContainer.items.upsert(tableDoc);
  process.stdout.write(`[${tableId}] table metadata upserted (${tabSummaries.length} tabs, ${totalRows} rows)\n`);
  return { tabs: tabSummaries.length, rows: totalRows };
}

async function main() {
  loadEnv();
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const dbName = process.env.COSMOS_DB || 'iskcon';
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY required');

  const client = new CosmosClient({ endpoint, key });
  const db = client.database(dbName);
  const tablesContainer = db.container('tables');
  const rowsContainer = db.container('rows');
  const migratedAt = new Date().toISOString();

  const jobs = [
    {
      tableId: 'names',
      tableName: 'Name Search',
      sourceSpreadsheetId: '1uM23jtXmpbuBGoWdG93VGPUIVhXOlM-FLqUoPmeXQT4',
      xlsxPath: 'tmp/sheet-export/names.xlsx',
    },
    {
      tableId: 'sadhana',
      tableName: 'Sadhana',
      sourceSpreadsheetId: '1rrS4fzrloSUmzqaftidgkHK7NM9pVnE6ZjPi1b9Bv5o',
      xlsxPath: 'tmp/sheet-export/sadhana.xlsx',
    },
    {
      tableId: 'bv',
      tableName: 'BV / GITAMRTA',
      sourceSpreadsheetId: '1Lp9pJtgIx2QZ92FH3_HbqnCv5Dt2yMAr_TkYyNygkdg',
      xlsxPath: 'tmp/sheet-export/bv.xlsx',
    },
  ];

  const summary = [];
  for (const job of jobs) {
    const result = await migrateWorkbook({
      tablesContainer,
      rowsContainer,
      migratedAt,
      ...job,
    });
    summary.push({ tableId: job.tableId, ...result });
  }

  console.log('\n=== Migration summary ===');
  console.table(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
