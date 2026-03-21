/**
 * Google Apps Script — `action: SADHANA_NAMES` (google-apps-script-sadhana.js)
 */
export async function fetchSadhanaNameSuggestions(scriptUrl: string): Promise<string[]> {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
