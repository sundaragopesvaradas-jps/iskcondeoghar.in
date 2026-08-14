/**
 * Name rows from Cosmos — letter-bucket cache + STARTSWITH queries (no full-tab scan).
 */
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

/** Cache key: `${tabId}:${LETTER}` e.g. Boy:A */
const cache = new Map<string, CacheEntry>();

function cell(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function letterKey(prefix: string): string {
  const ch = Array.from((prefix || '').trim())[0] || '';
  return ch.toUpperCase();
}

function cacheKey(tabId: string, letter: string): string {
  return `${tabId}:${letter}`;
}

function rowFromData(data: Record<string, unknown>): NameRow | null {
  const name = cell(data, 'Name', 'name');
  if (!name) return null;
  return {
    name,
    meaning: cell(data, 'Meaning', 'meaning'),
    letter: cell(data, 'Letter', 'letter') || name.charAt(0).toUpperCase(),
  };
}

/**
 * Load names for one first-letter bucket (Letter column or Name STARTSWITH).
 */
export async function loadNameRowsForLetter(
  gender: NameGender,
  letter: string
): Promise<NameRow[]> {
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }
  const L = letterKey(letter);
  if (!L) return [];

  const tabId = genderToTabId(gender);
  const key = cacheKey(tabId, L);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) {
    return hit.rows;
  }

  const container = getRowsContainer();
  // Prefer Letter equality; also catch rows missing Letter via Name STARTSWITH.
  const query = {
    query: `
      SELECT c.data FROM c
      WHERE c.tableId = @tableId AND c.tabId = @tabId
        AND (
          c.data.Letter = @letter
          OR STARTSWITH(UPPER(c.data.Name), @letter)
        )
    `,
    parameters: [
      { name: '@tableId', value: TABLE_ID },
      { name: '@tabId', value: tabId },
      { name: '@letter', value: L },
    ],
  };

  const rows: NameRow[] = [];
  const seen: Record<string, true> = {};
  const iterator = container.items.query<{ data: Record<string, unknown> }>(query);

  while (iterator.hasMoreResults()) {
    const { resources } = await iterator.fetchNext();
    for (const doc of resources || []) {
      const row = rowFromData(doc.data || {});
      if (!row) continue;
      const k = row.name.toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      rows.push(row);
    }
  }

  cache.set(key, { loadedAt: Date.now(), rows });
  return rows;
}

/** Load union of letter buckets needed for the given prefixes. */
export async function loadNameRowsForPrefixes(
  gender: NameGender,
  prefixes: string[]
): Promise<NameRow[]> {
  const letters = Array.from(
    new Set(prefixes.map((p) => letterKey(p)).filter(Boolean))
  );
  const chunks = await Promise.all(
    letters.map((L) => loadNameRowsForLetter(gender, L))
  );
  const seen: Record<string, true> = {};
  const out: NameRow[] = [];
  for (const chunk of chunks) {
    for (const row of chunk) {
      const k = row.name.toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(row);
    }
  }
  return out;
}

/** @deprecated Prefer loadNameRowsForPrefixes — kept for smoke/tests that need a full gender load. */
export async function loadNameRowsForGender(gender: NameGender): Promise<NameRow[]> {
  // A–Z + common Devanagari first chars are not enumerated; scan via broad query once.
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }
  const tabId = genderToTabId(gender);
  const container = getRowsContainer();
  const query = {
    query: 'SELECT c.data FROM c WHERE c.tableId = @tableId AND c.tabId = @tabId',
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
      const row = rowFromData(doc.data || {});
      if (row) rows.push(row);
    }
  }
  return rows;
}

export function clearNameRowsCache(): void {
  cache.clear();
}
