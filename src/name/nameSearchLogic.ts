/**
 * Name search rules — ported from archived `docs/archive/google-apps-script-name.js` (parity).
 */
import type {
  NameGender,
  NameSearchGroup,
  NameSearchItem,
  NameWordCount,
} from './nameSearchTypes';
import { parseNameQueryPrefixes } from './nameSearchTypes';

export type NameRow = {
  name: string;
  meaning: string;
  /** First-letter index from sheet `Letter` column (optional). */
  letter?: string;
};

export function wordCountOfName(name: string): number {
  const cleaned = (name || '').toString().trim().replace(/\s+/g, ' ');
  if (!cleaned) return 0;
  return cleaned.split(' ').length;
}

export function matchesWordCount(name: string, wordCount: NameWordCount): boolean {
  if (wordCount === 'any') return true;
  const n = wordCountOfName(name);
  if (wordCount === '1') return n === 1;
  if (wordCount === '2') return n === 2;
  if (wordCount === '3') return n === 3;
  return true;
}

export function filterForPrefix(
  rows: NameRow[],
  prefix: string,
  wordCount: NameWordCount,
  includeMeaning: boolean
): NameSearchItem[] {
  const prefixLower = prefix.toLowerCase();
  const seen: Record<string, true> = {};
  const items: NameSearchItem[] = [];

  for (const row of rows) {
    const name = row.name;
    const nameLower = name.toLowerCase();
    if (!nameLower.startsWith(prefixLower)) continue;
    if (!matchesWordCount(name, wordCount)) continue;
    if (seen[nameLower]) continue;
    seen[nameLower] = true;

    if (includeMeaning) {
      items.push({ name, meaning: row.meaning });
    } else {
      items.push({ name });
    }
  }

  items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return items;
}

export type NameSearchOk = {
  status: 'ok';
  includeMeaning: boolean;
  gender: NameGender;
  wordCount: NameWordCount;
  groups: NameSearchGroup[];
};

export type NameSearchErr = {
  status: 'error';
  message: string;
};

export function runNameSearch(
  rows: NameRow[],
  input: {
    gender: string;
    wordCount: string;
    query: string;
  }
): NameSearchOk | NameSearchErr {
  const gender = (input.gender || '').toString().trim();
  const wordCount = (input.wordCount || '').toString().trim().toLowerCase();
  const query = (input.query || '').toString();

  if (gender !== 'Boy' && gender !== 'Girl') {
    return { status: 'error', message: 'gender must be Boy or Girl' };
  }

  if (!['1', '2', '3', 'any'].includes(wordCount)) {
    return { status: 'error', message: 'wordCount must be 1, 2, 3, or any' };
  }

  const prefixes = parseNameQueryPrefixes(query);
  if (prefixes.length === 0) {
    return { status: 'error', message: 'query must include at least one prefix' };
  }

  const includeMeaning = wordCount === 'any';
  const groups: NameSearchGroup[] = prefixes.map((prefix) => ({
    prefix,
    items: filterForPrefix(rows, prefix, wordCount as NameWordCount, includeMeaning),
  }));

  return {
    status: 'ok',
    includeMeaning,
    gender: gender as NameGender,
    wordCount: wordCount as NameWordCount,
    groups,
  };
}

export function genderToTabId(gender: NameGender): 'Boy' | 'Girl' {
  return gender === 'Boy' ? 'Boy' : 'Girl';
}
