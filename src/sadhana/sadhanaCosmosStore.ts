/**
 * Sadhana Cosmos operations — Apps Script action parity (no HTTP layer yet).
 */
import { createHash, randomUUID } from 'node:crypto';
import { getRowsContainer, isCosmosConfigured } from '@/lib/cosmos';
import { SADHANA_DEFAULT_PIN } from './sadhanaPinConfig';
import {
  SADHANA_TABLE_ID,
  RESPONSES_TAB,
  UNIQUE_NAMES_TAB,
  MAX_NAMES_RETURN,
  buildResponseData,
  dataToHistoryObj,
  effectivePin,
  limitHistoryRowsToMax,
  nameKey,
  normalizeName,
  pinLen,
  sheetTitleForDevotee,
  sortHistoryRowsByDateOnly,
  validatePinFormat,
  type SadhanaHistoryObj,
} from './sadhanaLogic';

type RowDoc = {
  id: string;
  tableId: string;
  tabId: string;
  rowIndex?: number;
  data: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
  syncStatus?: string;
};

export type SadhanaResult =
  | { status: 'success'; names?: string[]; rows?: SadhanaHistoryObj[] }
  | {
      status: 'error';
      message: string;
      code:
        | 'NAME_REQUIRED'
        | 'INVALID_PIN'
        | 'NAME_NOT_FOUND'
        | 'WRONG_PIN'
        | 'PIN_UNCHANGED'
        | 'FORBIDDEN'
        | 'INVALID_MODE'
        | 'UNKNOWN_ACTION'
        | 'SERVER_ERROR'
        | 'NOT_CONFIGURED';
    };

function requireCosmos(): SadhanaResult | null {
  if (!isCosmosConfigured()) {
    return {
      status: 'error',
      message: 'Cosmos DB is not configured.',
      code: 'NOT_CONFIGURED',
    };
  }
  return null;
}

function stableId(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32);
}

async function queryTabRows(tabId: string): Promise<RowDoc[]> {
  const container = getRowsContainer();
  const out: RowDoc[] = [];
  const iterator = container.items.query<RowDoc>({
    query: 'SELECT * FROM c WHERE c.tableId = @tableId AND c.tabId = @tabId',
    parameters: [
      { name: '@tableId', value: SADHANA_TABLE_ID },
      { name: '@tabId', value: tabId },
    ],
  });
  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const r of resources || []) out.push(r);
  }
  // Cosmos may not support ORDER BY without composite index — sort in memory
  out.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
  return out;
}

async function nextRowIndex(tabId: string): Promise<number> {
  const rows = await queryTabRows(tabId);
  let max = 1;
  for (const r of rows) {
    if (typeof r.rowIndex === 'number' && r.rowIndex > max) max = r.rowIndex;
  }
  return max + 1;
}

async function findUniqueNameDoc(name: string): Promise<RowDoc | null> {
  const nk = nameKey(name);
  const rows = await queryTabRows(UNIQUE_NAMES_TAB);
  for (const r of rows) {
    if (nameKey(r.data?.Name) === nk) return r;
  }
  return null;
}

export async function sadhanaListNames(): Promise<SadhanaResult> {
  const cfg = requireCosmos();
  if (cfg) return cfg;
  try {
    const rows = await queryTabRows(UNIQUE_NAMES_TAB);
    const out: string[] = [];
    const seen: Record<string, true> = {};
    for (const r of rows) {
      const cell = normalizeName(r.data?.Name);
      if (!cell) continue;
      const k = cell.toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(cell);
    }
    out.sort((a, b) => a.localeCompare(b, 'hi'));
    return {
      status: 'success',
      names: out.length > MAX_NAMES_RETURN ? out.slice(0, MAX_NAMES_RETURN) : out,
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      code: 'SERVER_ERROR',
    };
  }
}

async function historyForName(name: string): Promise<SadhanaHistoryObj[]> {
  const title = sheetTitleForDevotee(name);
  const fromTab = await queryTabRows(title);
  let combined: SadhanaHistoryObj[];

  if (fromTab.length > 0) {
    combined = fromTab.map((r) => dataToHistoryObj(r.data || {}));
  } else {
    const nk = nameKey(name);
    const main = await queryTabRows(RESPONSES_TAB);
    combined = [];
    for (const r of main) {
      if (nameKey(r.data?.Name) !== nk) continue;
      combined.push(dataToHistoryObj(r.data || {}));
    }
  }

  return sortHistoryRowsByDateOnly(limitHistoryRowsToMax(combined));
}

export async function sadhanaLookup(input: {
  name?: string;
  pin?: string;
  pinLength?: unknown;
}): Promise<SadhanaResult> {
  const cfg = requireCosmos();
  if (cfg) return cfg;
  try {
    const len = pinLen(input);
    const name = normalizeName(input.name);
    const pin = String(input.pin || '').trim();
    if (!name) {
      return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
    }
    if (!validatePinFormat(pin, len)) {
      return { status: 'error', message: 'Invalid PIN', code: 'INVALID_PIN' };
    }

    const doc = await findUniqueNameDoc(name);
    if (!doc) {
      return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
    }

    const storedPin = String(doc.data?.PIN || '').trim();
    const eff = effectivePin(storedPin);
    if (pin !== eff) {
      return { status: 'error', message: 'Wrong PIN', code: 'WRONG_PIN' };
    }

    if (!storedPin && pin === SADHANA_DEFAULT_PIN) {
      await getRowsContainer().items.upsert({
        ...doc,
        data: { ...doc.data, PIN: SADHANA_DEFAULT_PIN },
        updatedAt: new Date().toISOString(),
        updatedBy: 'app',
      });
    }

    const rows = await historyForName(name);
    return { status: 'success', rows };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      code: 'SERVER_ERROR',
    };
  }
}

export async function sadhanaChangePin(input: {
  name?: string;
  oldPin?: string;
  newPin?: string;
  pinLength?: unknown;
}): Promise<SadhanaResult> {
  const cfg = requireCosmos();
  if (cfg) return cfg;
  try {
    const len = pinLen(input);
    const name = normalizeName(input.name);
    const oldPin = String(input.oldPin || '').trim();
    const newPin = String(input.newPin || '').trim();
    if (!name) {
      return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
    }
    if (!validatePinFormat(oldPin, len) || !validatePinFormat(newPin, len)) {
      return { status: 'error', message: 'Invalid PIN', code: 'INVALID_PIN' };
    }
    if (oldPin === newPin) {
      return { status: 'error', message: 'New PIN must differ', code: 'PIN_UNCHANGED' };
    }

    const doc = await findUniqueNameDoc(name);
    if (!doc) {
      return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
    }

    const storedPin = String(doc.data?.PIN || '').trim();
    if (oldPin !== effectivePin(storedPin)) {
      return { status: 'error', message: 'Wrong PIN', code: 'WRONG_PIN' };
    }

    await getRowsContainer().items.upsert({
      ...doc,
      data: { ...doc.data, Name: doc.data.Name || name, PIN: newPin },
      updatedAt: new Date().toISOString(),
      updatedBy: 'app',
      syncStatus: 'synced',
    });
    return { status: 'success' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      code: 'SERVER_ERROR',
    };
  }
}

function getAdminKeyExpected(): string {
  return (process.env.SADHANA_ADMIN_KEY || '').trim();
}

export async function sadhanaSeeAll(input: {
  adminKey?: string;
  mode?: string;
  name?: string;
}): Promise<SadhanaResult> {
  const cfg = requireCosmos();
  if (cfg) return cfg;
  try {
    const key = String(input.adminKey || '').trim();
    const stored = getAdminKeyExpected();
    if (!stored || key !== stored) {
      return { status: 'error', message: 'Invalid admin key', code: 'FORBIDDEN' };
    }
    const mode = String(input.mode || '').trim();
    if (mode === 'names') {
      return sadhanaListNames();
    }
    if (mode === 'lookup') {
      const name = normalizeName(input.name);
      if (!name) {
        return { status: 'error', message: 'Name required', code: 'NAME_REQUIRED' };
      }
      const doc = await findUniqueNameDoc(name);
      if (!doc) {
        return { status: 'error', message: 'Name not found in list', code: 'NAME_NOT_FOUND' };
      }
      const rows = await historyForName(name);
      return { status: 'success', rows };
    }
    return { status: 'error', message: 'Invalid mode', code: 'INVALID_MODE' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      code: 'SERVER_ERROR',
    };
  }
}

async function upsertDevoteeName(rawName: unknown): Promise<void> {
  const name = normalizeName(rawName);
  if (!name) return;
  const existing = await findUniqueNameDoc(name);
  if (existing) return;

  const rowIndex = await nextRowIndex(UNIQUE_NAMES_TAB);
  const now = new Date().toISOString();
  await getRowsContainer().items.upsert({
    id: stableId(SADHANA_TABLE_ID, UNIQUE_NAMES_TAB, nameKey(name)),
    tableId: SADHANA_TABLE_ID,
    tabId: UNIQUE_NAMES_TAB,
    rowIndex,
    data: { Name: name, PIN: '' },
    updatedAt: now,
    updatedBy: 'app',
    syncStatus: 'synced',
  });
}

async function appendDevoteeTab(rawName: unknown, data: Record<string, string>): Promise<void> {
  try {
    const name = normalizeName(rawName);
    if (!name) return;
    const tabId = sheetTitleForDevotee(name);
    const rowIndex = await nextRowIndex(tabId);
    const now = new Date().toISOString();
    await getRowsContainer().items.upsert({
      id: randomUUID().replace(/-/g, ''),
      tableId: SADHANA_TABLE_ID,
      tabId,
      rowIndex,
      data,
      updatedAt: now,
      updatedBy: 'app',
      syncStatus: 'synced',
    });
  } catch {
    /* devotee tab failure must not fail main submit */
  }
}

export async function sadhanaSubmit(input: {
  fieldOrder?: string[];
  labels?: Record<string, string>;
  responses?: Record<string, unknown>;
}): Promise<SadhanaResult> {
  const cfg = requireCosmos();
  if (cfg) return cfg;
  try {
    const data = buildResponseData(input);
    const rowIndex = await nextRowIndex(RESPONSES_TAB);
    const now = new Date().toISOString();
    await getRowsContainer().items.upsert({
      id: randomUUID().replace(/-/g, ''),
      tableId: SADHANA_TABLE_ID,
      tabId: RESPONSES_TAB,
      rowIndex,
      data,
      updatedAt: now,
      updatedBy: 'app',
      syncStatus: 'synced',
    });

    const rawName = input.responses?.devotee_name ?? data.Name;
    await upsertDevoteeName(rawName);
    await appendDevoteeTab(rawName, data);

    return { status: 'success' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      code: 'SERVER_ERROR',
    };
  }
}

/** Dispatch by Apps Script action name — for 3.1 smoke / later API. */
export async function runSadhanaAction(
  body: Record<string, unknown>
): Promise<SadhanaResult> {
  const action = String(body.action || '').trim();
  if (action === 'SADHANA_NAMES') return sadhanaListNames();
  if (action === 'SADHANA_LOOKUP') {
    return sadhanaLookup({
      name: body.name as string,
      pin: body.pin as string,
      pinLength: body.pinLength,
    });
  }
  if (action === 'SADHANA_CHANGE_PIN') {
    return sadhanaChangePin({
      name: body.name as string,
      oldPin: body.oldPin as string,
      newPin: body.newPin as string,
      pinLength: body.pinLength,
    });
  }
  if (action === 'seeAllSadhanas') {
    return sadhanaSeeAll({
      adminKey: body.adminKey as string,
      mode: body.mode as string,
      name: body.name as string,
    });
  }
  if (action === 'SADHANA_SUBMIT') {
    return sadhanaSubmit({
      fieldOrder: body.fieldOrder as string[] | undefined,
      labels: body.labels as Record<string, string> | undefined,
      responses: body.responses as Record<string, unknown> | undefined,
    });
  }
  return { status: 'error', message: 'Unknown action', code: 'UNKNOWN_ACTION' };
}
