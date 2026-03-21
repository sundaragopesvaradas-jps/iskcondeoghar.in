import type { SadhanaFieldDefinition } from './sadhanaFormConfig';

export function isFieldValueFilled(
  f: SadhanaFieldDefinition,
  v: string | boolean | string[] | undefined
): boolean {
  if (!f.required) return true;
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
  const required = fields.filter((f) => f.required);
  const total = required.length;
  let done = 0;
  required.forEach((f) => {
    if (isFieldValueFilled(f, values[f.id])) done += 1;
  });
  return { done, total };
}
