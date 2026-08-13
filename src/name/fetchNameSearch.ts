import { NAME_GOOGLE_SCRIPT_URL } from './nameBackendConfig';
import {
  NameSearchPayload,
  NameSearchResult,
  NameSearchGroup,
  NameSearchItem,
} from './nameSearchTypes';

export function getNameScriptUrl(): string {
  return (NAME_GOOGLE_SCRIPT_URL || '').trim();
}

function isItem(value: unknown): value is NameSearchItem {
  if (!value || typeof value !== 'object') return false;
  const name = (value as NameSearchItem).name;
  return typeof name === 'string' && name.trim() !== '';
}

function normalizeGroups(raw: unknown, includeMeaning: boolean): NameSearchGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((g) => {
      if (!g || typeof g !== 'object') return null;
      const prefix = typeof (g as NameSearchGroup).prefix === 'string'
        ? (g as NameSearchGroup).prefix
        : '';
      if (!prefix) return null;
      const itemsRaw = (g as NameSearchGroup).items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.filter(isItem).map((item) => {
            if (includeMeaning) {
              return {
                name: item.name,
                meaning: typeof item.meaning === 'string' ? item.meaning : '',
              };
            }
            return { name: item.name };
          })
        : [];
      return { prefix, items };
    })
    .filter((g): g is NameSearchGroup => g !== null);
}

export async function fetchNameSearch(
  scriptUrl: string,
  payload: NameSearchPayload
): Promise<NameSearchResult> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: {
    status?: string;
    message?: string;
    includeMeaning?: boolean;
    groups?: unknown;
  } = {};

  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(text || 'Unexpected response from server');
  }

  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  const includeMeaning = Boolean(data.includeMeaning);
  return {
    includeMeaning,
    groups: normalizeGroups(data.groups, includeMeaning),
  };
}
