/**
 * Sadhana form structure (labels, types, conditionals).
 * Option lists live only in Cosmos: tables/sadhana.columnSchemas.allowedValues.
 */

export type SadhanaFieldType = 'text' | 'date' | 'checkbox' | 'radio';

export interface SadhanaFieldDefinition {
  id: string;
  type: SadhanaFieldType;
  label: string;
  description?: string;
  required?: boolean;
  /** Filled at runtime from Cosmos columnSchemas — never hardcoded here. */
  options?: string[];
  /** Checkbox that must load options from Cosmos (multi-select). */
  expectsOptions?: boolean;
  /**
   * When set: shown/required only if parent is set and ≠ skipWhenParentEquals.
   */
  conditionalRequired?: {
    parentFieldId: string;
    skipWhenParentEquals: string;
  };
}

/** Static field defs — no option arrays. */
export const sadhanaFormFieldDefs: SadhanaFieldDefinition[] = [
  {
    id: 'devotee_name',
    type: 'text',
    label: 'आपका नाम',
    description: 'यदि आपने पहले ‘साधना’ फ़ॉर्म भरा है, तो नाम टाइप करें और ड्रॉप-डाउन से चुनें।',
    required: true,
  },
  {
    id: 'sadhana_date',
    type: 'date',
    label: 'आप किस दिन का साधना भर रहे हैं?',
    required: true,
  },
  {
    id: 'sleep_time_range',
    type: 'radio',
    label: 'पिछली रात आप कितने बजे सोए थे?',
    required: true,
  },
  {
    id: 'wake_time_range',
    type: 'radio',
    label: 'आप कितने बजे सोकर उठे?',
    required: true,
  },
  {
    id: 'mala_count_range',
    type: 'radio',
    label: 'आपने कितने माला जप किए?',
    required: true,
  },
  {
    id: 'mala_completed_by_time',
    type: 'radio',
    label: 'आपने कितने बजे तक 16 (या न्यूनतम) माला जप किए?',
    required: true,
  },
  {
    id: 'sp_books_minutes',
    type: 'radio',
    label: 'आपने कितने मिनट श्रीला प्रभुपाद की किताबें पढ़ीं?',
    required: true,
  },
  {
    id: 'sp_books_which',
    type: 'checkbox',
    label: 'कौन-सी पुस्तकें पढ़ीं?',
    expectsOptions: true,
    conditionalRequired: {
      parentFieldId: 'sp_books_minutes',
      skipWhenParentEquals: '0',
    },
  },
  {
    id: 'sravanam_duration',
    type: 'radio',
    label: 'आपने कितनी देर श्रवण किया?',
    required: true,
  },
];

/** @deprecated Use sadhanaFormFieldDefs + Cosmos options. Kept name for fewer churn imports during migrate. */
export const sadhanaFormFields = sadhanaFormFieldDefs;

/** English table column keys used for trend charts (ordinal Y = option order in Cosmos). */
export const SADHANA_HISTORY_CHART_COLUMNS = [
  'Sleeping Time',
  'Waking up Time',
  'Chanting Rounds',
  'Chanting Completed',
  'Book Reading',
  'Hearing',
] as const;

export type SadhanaHistoryChartColumnKey = (typeof SADHANA_HISTORY_CHART_COLUMNS)[number];
