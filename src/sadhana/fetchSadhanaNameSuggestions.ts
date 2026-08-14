import { SADHANA_API_PATH } from './sadhanaBackendConfig';

/** `action: SADHANA_NAMES` */
export async function fetchSadhanaNameSuggestions(): Promise<string[]> {
  const res = await fetch(SADHANA_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'SADHANA_NAMES' }),
  });

  const text = await res.text();
  let data: { status?: string; message?: string; names?: unknown } = {};
  try {
    data = JSON.parse(text) as { status?: string; message?: string; names?: unknown };
  } catch {
    throw new Error(text || 'Unexpected response from server');
  }

  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  if (!Array.isArray(data.names)) {
    return [];
  }

  return data.names.filter((n): n is string => typeof n === 'string' && n.trim() !== '');
}
