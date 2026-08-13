export type NameGender = 'Boy' | 'Girl';
export type NameWordCount = '1' | '2' | '3' | 'any';

export interface NameSearchItem {
  name: string;
  meaning?: string;
}

export interface NameSearchGroup {
  prefix: string;
  items: NameSearchItem[];
}

export interface NameSearchResult {
  includeMeaning: boolean;
  groups: NameSearchGroup[];
}

export interface NameSearchPayload {
  action: 'NAME_SEARCH';
  gender: NameGender;
  wordCount: NameWordCount;
  query: string;
}

/** Split on commas, trim, drop blanks, preserve first-seen order (case-insensitive unique). */
export function parseNameQueryPrefixes(query: string): string[] {
  const seen: Record<string, true> = {};
  const out: string[] = [];
  query.split(',').forEach((part) => {
    const p = part.trim();
    if (!p) return;
    const key = p.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(p);
  });
  return out;
}

export function hasSearchableNameQuery(query: string): boolean {
  return parseNameQueryPrefixes(query).length > 0;
}
