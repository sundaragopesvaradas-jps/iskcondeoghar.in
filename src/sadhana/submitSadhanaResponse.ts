import { SADHANA_API_PATH } from './sadhanaBackendConfig';

export interface SadhanaSubmitPayload {
  action: 'SADHANA_SUBMIT';
  formId: string;
  fieldOrder: string[];
  labels: Record<string, string>;
  responses: Record<string, string | boolean | string[]>;
}

export async function submitSadhanaResponse(
  payload: SadhanaSubmitPayload
): Promise<void> {
  const res = await fetch(SADHANA_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: { status?: string; message?: string } = {};
  try {
    data = JSON.parse(text) as { status?: string; message?: string };
  } catch {
    throw new Error(text || 'Unexpected response from server');
  }

  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
}

/** @deprecated Prefer SADHANA_API_PATH; kept so old imports compile during migration. */
export function getSadhanaScriptUrl(): string {
  return SADHANA_API_PATH;
}
