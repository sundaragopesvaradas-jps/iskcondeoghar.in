import { getRowsContainer, isCosmosConfigured } from '@/lib/cosmos';
import type { NameGender } from './nameSearchTypes';
import type { NameRow } from './nameSearchLogic';
import { genderToTabId } from './nameSearchLogic';

const TABLE_ID = 'names';
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  loadedAt: number;
  rows: NameRow[];
};

const cache: Partial<Record<'Boy' | 'Girl', CacheEntry>> = {};

function cell(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export async function loadNameRowsForGender(gender: NameGender): Promise<NameRow[]> {
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }

  const tabId = genderToTabId(gender);
  const hit = cache[tabId];
  if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) {
    return hit.rows;
  }

  const container = getRowsContainer();
  const query = {
    query:
      'SELECT c.data FROM c WHERE c.tableId = @tableId AND c.tabId = @tabId',
    parameters: [
      { name: '@tableId', value: TABLE_ID },
      { name: '@tabId', value: tabId },
    ],
  };

  const rows: NameRow[] = [];
  const iterator = container.items.query<{ data: Record<string, unknown> }>(query);

  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const doc of resources || []) {
      const data = doc.data || {};
      const name = cell(data, 'Name', 'name');
      if (!name) continue;
      rows.push({
        name,
        meaning: cell(data, 'Meaning', 'meaning'),
      });
    }
  }

  cache[tabId] = { loadedAt: Date.now(), rows };
  return rows;
}

/** Test / admin helper */
export function clearNameRowsCache(): void {
  delete cache.Boy;
  delete cache.Girl;
}
