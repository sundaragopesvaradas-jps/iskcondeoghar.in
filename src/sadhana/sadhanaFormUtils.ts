import type { SadhanaFieldDefinition } from './sadhanaFormConfig';

/** Parent condition met → field is shown (and treated as required when `conditionalRequired` is set). */
export function isFieldVisible(
  f: SadhanaFieldDefinition,
  values: Record<string, string | boolean | string[]>
): boolean {
  if (!f.conditionalRequired) return true;
  const { parentFieldId, skipWhenParentEquals } = f.conditionalRequired;
  const pStr = values[parentFieldId] != null ? String(values[parentFieldId]) : '';
  if (pStr === '' || pStr === skipWhenParentEquals) return false;
  return true;
}

export function isFieldRequired(
  f: SadhanaFieldDefinition,
  values: Record<string, string | boolean | string[]>
): boolean {
  if (f.conditionalRequired) {
    return isFieldVisible(f, values);
  }
  return !!f.required;
}

export function isFieldValueFilled(
  f: SadhanaFieldDefinition,
  v: string | boolean | string[] | undefined,
  values: Record<string, string | boolean | string[]>
): boolean {
  if (!isFieldRequired(f, values)) return true;
  if (f.type === 'text' || f.type === 'date') {
    return !!(v != null && String(v).trim() !== '');
  }
  if (f.type === 'radio') {
    return !!(v != null && String(v).trim() !== '');
  }
  if (f.type === 'checkbox') {
    if (f.options && f.options.length > 0) {
      return Array.isArray(v) && v.length > 0;
    }
    return v === true;
  }
  return false;
}

export function countCompletedRequired(
  fields: SadhanaFieldDefinition[],
  values: Record<string, string | boolean | string[]>
): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const f of fields) {
    if (!isFieldRequired(f, values)) continue;
    total += 1;
    if (isFieldValueFilled(f, values[f.id], values)) done += 1;
  }
  return { done, total };
}
