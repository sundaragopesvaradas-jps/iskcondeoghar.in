import type { SadhanaFieldDefinition } from './sadhanaFormConfig';
import type { SadhanaHistoryChartColumnKey } from './sadhanaFormConfig';

export type SadhanaFormConfigResponse = {
  status: string;
  message?: string;
  fields?: SadhanaFieldDefinition[];
  optionOrderByChartColumn?: Record<SadhanaHistoryChartColumnKey, string[]>;
};

export async function fetchSadhanaFormConfig(): Promise<{
  fields: SadhanaFieldDefinition[];
  optionOrderByChartColumn: Record<SadhanaHistoryChartColumnKey, string[]>;
}> {
  const res = await fetch('/api/sadhana/form');
  const data = (await res.json()) as SadhanaFormConfigResponse;
  if (!res.ok || data.status === 'error' || !data.fields) {
    throw new Error(data.message || 'Failed to load form options');
  }
  return {
    fields: data.fields,
    optionOrderByChartColumn: data.optionOrderByChartColumn || ({} as Record<SadhanaHistoryChartColumnKey, string[]>),
  };
}
