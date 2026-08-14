import { randomUUID } from 'node:crypto';
import { getRowsContainer, getTablesContainer, isCosmosConfigured } from '@/lib/cosmos';

export type TableMeta = {
  id: string;
  name: string;
  tabs: Array<{
    id: string;
    name: string;
    columns: Array<{ id: string; name: string; type?: string; order?: number }>;
    rowCount?: number;
  }>;
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
    tabs: [
      {
        id: tabName,
        name: tabName,
        columns: [],
        rowCount: 0,
      },
    ],
    updatedAt: now,
  };
  await getTablesContainer().items.create(doc);
  return doc;
}

export async function createTab(
  tableId: string,
  tabName: string
): Promise<TableMeta> {
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

export async function listRows(input: {
  tableId: string;
  tabId: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: RowDoc[]; total: number; columns: string[] }> {
  requireCosmos();
  const tableId = input.tableId;
  const tabId = input.tabId;
  const offset = Math.max(0, input.offset || 0);
  const limit = Math.min(200, Math.max(1, input.limit || 50));

  const container = getRowsContainer();
  const countQ = {
    query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tableId=@t AND c.tabId=@tab',
    parameters: [
      { name: '@t', value: tableId },
      { name: '@tab', value: tabId },
    ],
  };
  const { resources: counts } = await container.items.query<number>(countQ).fetchAll();
  const total = counts[0] || 0;

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
    for (const r of resources || []) all.push(r);
  }
  all.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));

  const page = all.slice(offset, offset + limit);
  const colSet = new Set<string>();
  const table = await getTable(tableId);
  const tab = table?.tabs.find((t) => t.id === tabId || t.name === tabId);
  for (const c of tab?.columns || []) {
    if (c.name) colSet.add(c.name);
  }
  for (const r of page) {
    for (const k of Object.keys(r.data || {})) colSet.add(k);
  }
  return { rows: page, total, columns: Array.from(colSet) };
}

export async function upsertRow(input: {
  tableId: string;
  tabId: string;
  id?: string;
  data: Record<string, string>;
  username: string;
}): Promise<RowDoc> {
  requireCosmos();
  const id = input.id || randomUUID().replace(/-/g, '');
  let rowIndex = 0;
  if (!input.id) {
    const { total } = await listRows({
      tableId: input.tableId,
      tabId: input.tabId,
      offset: 0,
      limit: 1,
    });
    rowIndex = total + 2; // mimic sheet row numbers loosely
  } else {
    try {
      const { resource } = await getRowsContainer()
        .item(id, input.tableId)
        .read<RowDoc>();
      rowIndex = resource?.rowIndex || 0;
    } catch {
      rowIndex = 0;
    }
  }
  const doc: RowDoc = {
    id,
    tableId: input.tableId,
    tabId: input.tabId,
    rowIndex,
    data: input.data,
    updatedAt: new Date().toISOString(),
    updatedBy: input.username,
  };
  await getRowsContainer().items.upsert(doc);
  return doc;
}

export async function deleteRow(tableId: string, rowId: string): Promise<void> {
  requireCosmos();
  await getRowsContainer().item(rowId, tableId).delete();
}
