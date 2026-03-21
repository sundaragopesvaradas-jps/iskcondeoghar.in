/** `sadhanaFormConfig` में नाम फ़ील्ड की id — स्क्रिप्ट व UI दोनों इसी से मेल खाते हैं */
export const SADHANA_NAME_FIELD_ID = 'devotee_name' as const;

export const SADHANA_NAMES_SESSION_KEY = 'sadhana_unique_names_v1';

/** जमा करते समय: अगल-बगल व अंदर की extra spaces हटाएँ */
export function normalizeDevoteeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}
