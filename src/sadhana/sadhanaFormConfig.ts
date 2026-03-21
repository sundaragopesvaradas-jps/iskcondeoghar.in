/**
 * मॉड्यूलर साधना फ़ॉर्म — फ़ील्ड यहीं जोड़ें/बदलें।
 * स्प्रेडशीट में कॉलम लेबल (हिंदी) इन्हीं `label` से बनते हैं।
 */

export type SadhanaFieldType = 'text' | 'date' | 'checkbox' | 'radio';

export interface SadhanaFieldDefinition {
  id: string;
  type: SadhanaFieldType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  /**
   * When set: this field is shown and required only if the parent field is set
   * and its value is not `skipWhenParentEquals` (e.g. show "which books" when reading minutes ≠ "0").
   */
  conditionalRequired?: {
    parentFieldId: string;
    skipWhenParentEquals: string;
  };
}

/** रेडियो विकल्प — समय सीमा (सोने / उठने) */
const SLEEP_TIME_OPTIONS = [
  'रात 9 बजे से पहले',
  'रात 9–10 बजे',
  'रात 10–11 बजे',
  'रात 11 बजे के बाद'
];

const WAKE_TIME_OPTIONS = [
  'सुबह 4 बजे से पहले',
  'सुबह 4–5 बजे',
  'सुबह 5–6 बजे',
  'सुबह 6 बजे के बाद'
];

/** माला संख्या */
const MALA_COUNT_OPTIONS = ['16 माला', '17 से 20 माला', '21 से 25 माला', '26 से 32 माला', '32 से ज़्यादा माला'];

/** 16 (या न्यूनतम) माला कब तक पूरी की */
const MALA_BY_TIME_OPTIONS = [
  'सुबह 7 बजे तक',
  'सुबह 9 बजे तक',
  'दोपहर 2 बजे तक',
  'शाम 6 बजे तक',
  'रात 9 बजे तक',
  'पूरी नहीं हुई',
];

/** मिनट — पढ़ाई / श्रवण */
const MINUTES_OPTIONS = [
  '0',
  'आधे घंटे तक',
  '1 घंटे तक',
  '2 घंटे तक',
  '2 घंटे से अधिक',
];

/** श्रील प्रभुपाद की पुस्तकें — कौन-सी पढ़ीं (केवल जब पढ़ने का समय > 0) */
const SP_BOOKS_WHICH_OPTIONS = [
  'भगवद्-गीता',
  'श्रीमद् भागवतम्',
  'श्रील प्रभुपाद की छोटी पुस्तकें',
  'अन्य',
];

export const sadhanaFormFields: SadhanaFieldDefinition[] = [
  {
    id: 'devotee_name',
    type: 'text',
    label: 'आपका नाम',
    description: 'नाम टाइप करना शुरू करें, ऑटोफ़िल आएगा।',
    required: true,
  },
  {
    id: 'sadhana_date',
    type: 'date',
    label: 'आप किस दिन का साधना भर रहे हैं?',
    //description: 'कैलेंडर से तारीख चुनें',
    required: true,
  },
  {
    id: 'sleep_time_range',
    type: 'radio',
    label: 'पिछली रात आप कितने बजे सोए थे?',
    options: SLEEP_TIME_OPTIONS,
    required: true,
  },
  {
    id: 'wake_time_range',
    type: 'radio',
    label: 'आप कितने बजे सोकर उठे?',
    options: WAKE_TIME_OPTIONS,
    required: true,
  },
  {
    id: 'mala_count_range',
    type: 'radio',
    label: 'आपने कितने माला जप किए?',
    options: MALA_COUNT_OPTIONS,
    required: true,
  },
  {
    id: 'mala_completed_by_time',
    type: 'radio',
    label: 'आपने कितने बजे तक 16 (या न्यूनतम) माला जप किए?',
    options: MALA_BY_TIME_OPTIONS,
    required: true,
  },
  {
    id: 'sp_books_minutes',
    type: 'radio',
    label: 'आपने कितने मिनट श्रीला प्रभुपाद की किताबें पढ़ीं?',
    options: MINUTES_OPTIONS,
    required: true,
  },
  {
    id: 'sp_books_which',
    type: 'checkbox',
    label: 'कौन-सी पुस्तकें पढ़ीं?',
    options: SP_BOOKS_WHICH_OPTIONS,
    conditionalRequired: {
      parentFieldId: 'sp_books_minutes',
      skipWhenParentEquals: '0',
    },
  },
  {
    id: 'sravanam_duration',
    type: 'radio',
    label: 'आपने कितनी देर श्रवण किया?',
    options: MINUTES_OPTIONS,
    required: true,
  },
];
