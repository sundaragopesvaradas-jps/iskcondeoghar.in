/**
 * Sadhana allowed-values — Cosmos `tables/sadhana.columnSchemas` is the only source.
 * No in-app fallback option lists.
 */
import { getTablesContainer, isCosmosConfigured } from '@/lib/cosmos';
import type { ColumnSchema, TableMeta } from '@/admn/admnDataStore';
import {
  FIELD_ID_TO_COLUMN,
  HEARING_STORAGE_KEY,
  SADHANA_TABLE_ID,
  formatResponseValue,
} from './sadhanaLogic';
import {
  SADHANA_HISTORY_CHART_COLUMNS,
  type SadhanaFieldDefinition,
  type SadhanaHistoryChartColumnKey,
  sadhanaFormFieldDefs,
} from './sadhanaFormConfig';

const CACHE_TTL_MS = 30_000;

let cache: { at: number; schemas: ColumnSchema[] } | null = null;

export function clearSadhanaOptionsCache(): void {
  cache = null;
}

/** Chart Y-axis column → Responses storage key (where allowedValues live). */
export const CHART_COLUMN_TO_STORAGE_KEY: Record<
  SadhanaHistoryChartColumnKey,
  string
> = {
  'Sleeping Time': 'Sleeping Time',
  'Waking up Time': 'Waking up Time',
  'Chanting Rounds': 'Chanting Rounds',
  'Chanting Completed': 'Chanting Completed',
  'Book Reading': 'Book Reading',
  Hearing: HEARING_STORAGE_KEY,
};

async function readTable(): Promise<TableMeta> {
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }
  const { resource } = await getTablesContainer()
    .item(SADHANA_TABLE_ID, SADHANA_TABLE_ID)
    .read<TableMeta>();
  if (!resource) {
    throw new Error('Sadhana table metadata not found in Cosmos.');
  }
  return resource;
}

export async function getSadhanaColumnSchemas(): Promise<ColumnSchema[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.schemas;
  }
  const table = await readTable();
  const schemas = table.columnSchemas || [];
  cache = { at: now, schemas };
  return schemas;
}

function schemaByName(schemas: ColumnSchema[]): Map<string, ColumnSchema> {
  const m = new Map<string, ColumnSchema>();
  for (const s of schemas) {
    if (s?.name) m.set(s.name, s);
  }
  return m;
}

export function optionsForStorageColumn(
  schemas: ColumnSchema[],
  storageKey: string
): string[] {
  const s = schemaByName(schemas).get(storageKey);
  const vals = s?.allowedValues || [];
  if (vals.length === 0) {
    throw new Error(
      `No allowed values configured for column "${storageKey}". Set them in /admn → Allowed values.`
    );
  }
  return vals;
}

/** Merge static field defs with Cosmos allowed values (required for option fields). */
export function mergeFormFieldsWithSchemas(
  schemas: ColumnSchema[]
): SadhanaFieldDefinition[] {
  return sadhanaFormFieldDefs.map((f) => {
    if (f.type !== 'radio' && !(f.type === 'checkbox' && f.expectsOptions)) {
      return { ...f };
    }
    const col = FIELD_ID_TO_COLUMN[f.id];
    if (!col) {
      throw new Error(`No storage column mapped for field "${f.id}".`);
    }
    return {
      ...f,
      options: optionsForStorageColumn(schemas, col),
    };
  });
}

export async function getSadhanaFormFields(): Promise<SadhanaFieldDefinition[]> {
  const schemas = await getSadhanaColumnSchemas();
  return mergeFormFieldsWithSchemas(schemas);
}

export async function getChartOptionOrder(): Promise<
  Record<SadhanaHistoryChartColumnKey, string[]>
> {
  const schemas = await getSadhanaColumnSchemas();
  const out = {} as Record<SadhanaHistoryChartColumnKey, string[]>;
  for (const chartCol of SADHANA_HISTORY_CHART_COLUMNS) {
    const storageKey = CHART_COLUMN_TO_STORAGE_KEY[chartCol];
    out[chartCol] = optionsForStorageColumn(schemas, storageKey);
  }
  return out;
}

/** Reject submit values that are not in the current allowed list. */
export function validateResponsesAgainstSchemas(
  responses: Record<string, unknown> | undefined,
  schemas: ColumnSchema[]
): void {
  const map = schemaByName(schemas);
  for (const [fieldId, col] of Object.entries(FIELD_ID_TO_COLUMN)) {
    const schema = map.get(col);
    if (!schema?.allowedValues?.length) continue;
    const allowed = schema.allowedValues;
    const raw = responses?.[fieldId];
    if (raw == null || raw === '' || raw === false) continue;

    if (Array.isArray(raw)) {
      for (const item of raw) {
        const v = String(item).trim();
        if (v && !allowed.includes(v)) {
          throw new Error(
            `Invalid value for "${col}": "${v}". Allowed: ${allowed.join(', ')}`
          );
        }
      }
      continue;
    }

    const formatted = formatResponseValue(raw);
    // Multi-select stored as "a; b"
    if (formatted.includes(';')) {
      for (const part of formatted.split(';')) {
        const v = part.trim();
        if (v && !allowed.includes(v)) {
          throw new Error(
            `Invalid value for "${col}": "${v}". Allowed: ${allowed.join(', ')}`
          );
        }
      }
      continue;
    }

    if (formatted && !allowed.includes(formatted)) {
      throw new Error(
        `Invalid value for "${col}": "${formatted}". Allowed: ${allowed.join(', ')}`
      );
    }
  }
}
