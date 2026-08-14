import { randomUUID } from 'node:crypto';
import { getRowsContainer, getTablesContainer, isCosmosConfigured } from '@/lib/cosmos';
import { clearSadhanaOptionsCache } from '@/sadhana/sadhanaOptionsStore';
import { SADHANA_TABLE_ID } from '@/sadhana/sadhanaLogic';

export type ColumnSchema = {
  name: string;
  /** When set, cell editors show a dropdown of these values only. */
  allowedValues?: string[];
  /**
   * Points per allowed value (same keys as allowedValues).
   * Used for sadhana last-30-days leaderboard scoring.
   */
  allowedValuePoints?: Record<string, number>;
};

export type TabMeta = {
  id: string;
  name: string;
  columns: Array<{ id: string; name: string; type?: string; order?: number }>;
  rowCount?: number;
};

export type TableMeta = {
  id: string;
  name: string;
  tabs: TabMeta[];
  /** Shared column rules for this table (allowed values live here only). */
  columnSchemas?: ColumnSchema[];
  /**
   * Overview / seeAll secret for this table (e.g. sadhana `/sadhana/overview`).
   * Managed only via /admn — not env.
   */
  adminKey?: string;
  updatedAt?: string;
};

export type RowDoc = {
  id: string;
  tableId: string;
  tabId: string;
  rowIndex?: number;
  data: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
  syncStatus?: string;
};

export type ColumnView = {
  name: string;
  allowedValues?: string[];
};

function requireCosmos() {
  if (!isCosmosConfigured()) throw new Error('Cosmos DB is not configured.');
}

export async function listTables(): Promise<TableMeta[]> {
  requireCosmos();
  const { resources } = await getTablesContainer().items.readAll<TableMeta>().fetchAll();
  return (resources || []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTable(tableId: string): Promise<TableMeta | null> {
  requireCosmos();
  try {
    const { resource } = await getTablesContainer().item(tableId, tableId).read<TableMeta>();
    return resource || null;
  } catch {
    return null;
  }
}

export async function createTable(input: {
  id: string;
  name: string;
  firstTabName?: string;
}): Promise<TableMeta> {
  requireCosmos();
  const id = String(input.id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  if (!id) throw new Error('table id required');
  const existing = await getTable(id);
  if (existing) throw new Error('table already exists');
  const tabName = (input.firstTabName || 'Sheet1').trim() || 'Sheet1';
  const now = new Date().toISOString();
  const doc: TableMeta = {
    id,
    name: (input.name || id).trim(),
    tabs: [{ id: tabName, name: tabName, columns: [], rowCount: 0 }],
    columnSchemas: [],
    updatedAt: now,
  };
  await getTablesContainer().items.create(doc);
  return doc;
}

export async function createTab(tableId: string, tabName: string): Promise<TableMeta> {
  requireCosmos();
  const table = await getTable(tableId);
  if (!table) throw new Error('table not found');
  const name = tabName.trim();
  if (!name) throw new Error('tab name required');
  if (table.tabs.some((t) => t.id === name || t.name === name)) {
    throw new Error('tab already exists');
  }
  table.tabs.push({ id: name, name, columns: [], rowCount: 0 });
  table.updatedAt = new Date().toISOString();
  await getTablesContainer().items.upsert(table);
  return table;
}

/** Upsert shared column schema (allowed values + optional points) for a table. */
export async function upsertColumnSchema(
  tableId: string,
  schema: ColumnSchema
): Promise<TableMeta> {
  requireCosmos();
  const table = await getTable(tableId);
  if (!table) throw new Error('table not found');
  const name = String(schema.name || '').trim();
  if (!name) throw new Error('column name required');
  const allowedValues = Array.isArray(schema.allowedValues)
    ? schema.allowedValues.map((v) => String(v).trim()).filter(Boolean)
    : undefined;

  let allowedValuePoints: Record<string, number> | undefined;
  if (schema.allowedValuePoints && typeof schema.allowedValuePoints === 'object') {
    allowedValuePoints = {};
    for (const [k, v] of Object.entries(schema.allowedValuePoints)) {
      const key = String(k).trim();
      if (!key) continue;
      if (allowedValues && allowedValues.length > 0 && !allowedValues.includes(key)) {
        continue;
      }
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      allowedValuePoints[key] = n;
    }
    if (Object.keys(allowedValuePoints).length === 0) allowedValuePoints = undefined;
  }

  const next: ColumnSchema = {
    name,
    ...(allowedValues && allowedValues.length > 0 ? { allowedValues } : {}),
    ...(allowedValuePoints ? { allowedValuePoints } : {}),
  };
  const list = [...(table.columnSchemas || [])];
  const idx = list.findIndex((c) => c.name === name);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  table.columnSchemas = list;
  table.updatedAt = new Date().toISOString();
  await getTablesContainer().items.upsert(table);
  if (tableId === SADHANA_TABLE_ID) clearSadhanaOptionsCache();
  return table;
}

/** Add a column header to a tab (metadata only — no row backfill). */
export async function addColumn(input: {
  tableId: string;
  tabId: string;
  name: string;
}): Promise<TableMeta> {
  requireCosmos();
  const table = await getTable(input.tableId);
  if (!table) throw new Error('table not found');
  const name = String(input.name || '').trim();
  if (!name) throw new Error('column name required');
  const tab = table.tabs.find((t) => t.id === input.tabId || t.name === input.tabId);
  if (!tab) throw new Error('tab not found');
  if (!tab.columns) tab.columns = [];
  if (tab.columns.some((c) => c.name === name)) {
    throw new Error('column already exists on this tab');
  }
  tab.columns.push({
    id: name,
    name,
    order: tab.columns.length,
  });
  table.updatedAt = new Date().toISOString();
  await getTablesContainer().items.upsert(table);
  return table;
}

/** Set / clear overview admin key on a table (managed in /admn only). */
export async function updateTableAdminKey(
  tableId: string,
  adminKey: string
): Promise<TableMeta> {
  requireCosmos();
  const table = await getTable(tableId);
  if (!table) throw new Error('table not found');
  const key = String(adminKey || '').trim();
  if (!key) {
    delete table.adminKey;
  } else {
    if (!/^\d{4}$/.test(key)) {
      throw new Error('Admin key must be exactly 4 digits.');
    }
    table.adminKey = key;
  }
  table.updatedAt = new Date().toISOString();
  await getTablesContainer().items.upsert(table);
  return table;
}

/**
 * Keep only the given tab ids; delete all other tabs' rows + metadata.
 * Used to remove legacy per-devotee sadhana tabs.
 */
export async function deleteTabsExcept(input: {
  tableId: string;
  keepTabIds: string[];
}): Promise<{ removedTabs: string[]; deletedRows: number }> {
  requireCosmos();
  const table = await getTable(input.tableId);
  if (!table) throw new Error('table not found');
  const keep = new Set(input.keepTabIds.map((t) => t.trim()).filter(Boolean));
  const removeTabs = (table.tabs || []).filter((t) => !keep.has(t.id) && !keep.has(t.name));
  if (!removeTabs.length) {
    return { removedTabs: [], deletedRows: 0 };
  }

  const container = getRowsContainer();
  let deletedRows = 0;
  for (const tab of removeTabs) {
    const tabId = tab.id;
    const iterator = container.items.query<RowDoc>({
      query: 'SELECT c.id FROM c WHERE c.tableId=@t AND c.tabId=@tab',
      parameters: [
        { name: '@t', value: input.tableId },
        { name: '@tab', value: tabId },
      ],
    });
    while (iterator.hasMoreResults()) {
      const { resources } = await iterator.fetchNext();
      for (const r of resources || []) {
        await container.item(r.id, input.tableId).delete();
        deletedRows += 1;
      }
    }
  }

  table.tabs = (table.tabs || []).filter((t) => keep.has(t.id) || keep.has(t.name));
  table.updatedAt = new Date().toISOString();
  await getTablesContainer().items.upsert(table);
  return {
    removedTabs: removeTabs.map((t) => t.id),
    deletedRows,
  };
}

function schemaMap(table: TableMeta | null): Map<string, ColumnSchema> {
  const m = new Map<string, ColumnSchema>();
  for (const c of table?.columnSchemas || []) {
    if (c?.name) m.set(c.name, c);
  }
  return m;
}

function buildColumnViews(
  table: TableMeta | null,
  tabId: string,
  pageRows: RowDoc[]
): ColumnView[] {
  const colSet = new Set<string>();
  const tab = table?.tabs.find((t) => t.id === tabId || t.name === tabId);
  for (const c of tab?.columns || []) {
    if (c.name) colSet.add(c.name);
  }
  for (const r of pageRows) {
    for (const k of Object.keys(r.data || {})) colSet.add(k);
  }
  // Do not inject every table columnSchema into every tab — schemas only
  // attach allowedValues when the column already exists on this tab/page.
  const schemas = schemaMap(table);
  return Array.from(colSet).map((name) => {
    const s = schemas.get(name);
    return {
      name,
      ...(s?.allowedValues && s.allowedValues.length > 0
        ? { allowedValues: s.allowedValues }
        : {}),
    };
  });
}

function validateAgainstSchemas(
  data: Record<string, string>,
  schemas: Map<string, ColumnSchema>
) {
  for (const [key, value] of Object.entries(data || {})) {
    const s = schemas.get(key);
    if (!s?.allowedValues || s.allowedValues.length === 0) continue;
    if (value === '') continue;
    if (!s.allowedValues.includes(value)) {
      throw new Error(
        `Invalid value for "${key}": "${value}". Allowed: ${s.allowedValues.join(', ')}`
      );
    }
  }
}

export async function listRows(input: {
  tableId: string;
  tabId: string;
  offset?: number;
  limit?: number;
  /** When set, keep rows whose `Name` equals this (case-insensitive trim). */
  nameEquals?: string;
}): Promise<{ rows: RowDoc[]; total: number; columns: string[]; columnViews: ColumnView[] }> {
  requireCosmos();
  const tableId = input.tableId;
  const tabId = input.tabId;
  const offset = Math.max(0, input.offset || 0);
  const limit = Math.min(5000, Math.max(1, input.limit || 50));
  const nameFilter = String(input.nameEquals || '')
    .trim()
    .toLowerCase();

  const container = getRowsContainer();
  const all: RowDoc[] = [];
  const iterator = container.items.query<RowDoc>({
    query: 'SELECT * FROM c WHERE c.tableId=@t AND c.tabId=@tab',
    parameters: [
      { name: '@t', value: tableId },
      { name: '@tab', value: tabId },
    ],
  });
  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const r of resources || []) {
      if (nameFilter) {
        const n = String(r.data?.Name || '')
          .trim()
          .toLowerCase();
        if (n !== nameFilter) continue;
      }
      all.push(r);
    }
  }
  all.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));

  const total = all.length;
  const page = all.slice(offset, offset + limit);
  const table = await getTable(tableId);
  const columnViews = buildColumnViews(table, tabId, page);
  return {
    rows: page,
    total,
    columns: columnViews.map((c) => c.name),
    columnViews,
  };
}

export async function upsertRow(input: {
  tableId: string;
  tabId: string;
  id?: string;
  data: Record<string, string>;
  username: string;
}): Promise<RowDoc> {
  requireCosmos();
  const table = await getTable(input.tableId);
  validateAgainstSchemas(input.data, schemaMap(table));

  const id = input.id || randomUUID().replace(/-/g, '');
  let rowIndex = 0;
  let existing: RowDoc | null = null;
  if (input.id) {
    try {
      const { resource } = await getRowsContainer()
        .item(id, input.tableId)
        .read<RowDoc>();
      existing = resource || null;
      rowIndex = existing?.rowIndex || 0;
    } catch {
      rowIndex = 0;
    }
  } else {
    const { total } = await listRows({
      tableId: input.tableId,
      tabId: input.tabId,
      offset: 0,
      limit: 1,
    });
    rowIndex = total + 2;
  }

  const doc: RowDoc = {
    ...(existing || {}),
    id,
    tableId: input.tableId,
    tabId: input.tabId,
    rowIndex,
    data: input.data,
    updatedAt: new Date().toISOString(),
    updatedBy: input.username,
    syncStatus: 'synced',
  };
  await getRowsContainer().items.upsert(doc);
  return doc;
}

/**
 * Atomic multi-row update (same partition / tableId).
 * Cosmos transactional batch limit: 100 ops — all succeed or all fail.
 */
export async function batchUpsertRows(input: {
  tableId: string;
  tabId: string;
  updates: Array<{ id: string; data: Record<string, string> }>;
  username: string;
}): Promise<{ updated: number }> {
  requireCosmos();
  if (!input.updates.length) return { updated: 0 };
  if (input.updates.length > 100) {
    throw new Error('At most 100 rows can be updated in one atomic batch.');
  }

  const table = await getTable(input.tableId);
  const schemas = schemaMap(table);
  for (const u of input.updates) {
    if (!u.id) throw new Error('Each update requires a row id.');
    validateAgainstSchemas(u.data || {}, schemas);
  }

  const container = getRowsContainer();
  const now = new Date().toISOString();
  const docs: RowDoc[] = [];

  for (const u of input.updates) {
    const { resource } = await container.item(u.id, input.tableId).read<RowDoc>();
    if (!resource) throw new Error(`Row not found: ${u.id}`);
    if (resource.tabId !== input.tabId) {
      throw new Error(`Row ${u.id} is not in this tab.`);
    }
    docs.push({
      ...resource,
      data: u.data,
      updatedAt: now,
      updatedBy: input.username,
      syncStatus: 'synced',
    });
  }

  const { result } = await container.items.batch(
    docs.map((doc) => ({
      operationType: 'Upsert' as const,
      resourceBody: doc,
    })),
    input.tableId
  );

  const failed = (result || []).find((r) => (r.statusCode || 0) >= 400);
  if (failed) {
    throw new Error('Atomic batch update failed; no rows were partially applied.');
  }

  return { updated: docs.length };
}

export async function deleteRow(tableId: string, rowId: string): Promise<void> {
  requireCosmos();
  await getRowsContainer().item(rowId, tableId).delete();
}

/** Delete many rows (same table). Continues best-effort; returns counts. */
export async function batchDeleteRows(
  tableId: string,
  ids: string[]
): Promise<{ deleted: number; failed: number }> {
  requireCosmos();
  const unique = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  if (unique.length > 500) {
    throw new Error('At most 500 rows can be deleted at once.');
  }
  let deleted = 0;
  let failed = 0;
  for (const id of unique) {
    try {
      await getRowsContainer().item(id, tableId).delete();
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
}
