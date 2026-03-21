import { SADHANA_GOOGLE_SCRIPT_URL } from './sadhanaBackendConfig';

export interface SadhanaSubmitPayload {
  action: 'SADHANA_SUBMIT';
  formId: string;
  fieldOrder: string[];
  labels: Record<string, string>;
  responses: Record<string, string | boolean | string[]>;
}

export async function submitSadhanaResponse(
  scriptUrl: string,
  payload: SadhanaSubmitPayload
): Promise<void> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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

export function getSadhanaScriptUrl(): string {
  return (SADHANA_GOOGLE_SCRIPT_URL || '').trim();
}
