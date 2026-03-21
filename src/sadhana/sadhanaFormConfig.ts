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
}

/** रेडियो विकल्प — समय सीमा (सोने / उठने) */
const SLEEP_TIME_OPTIONS = [
  '9 बजे से पहले',
  '9–10 बजे',
  '10–11 बजे',
  '11 बजे के बाद',
];

const WAKE_TIME_OPTIONS = [
  '4 बजे से पहले',
  '4–5 बजे',
  '5–6 बजे',
  '6 बजे के बाद',
];

/** माला संख्या */
const MALA_COUNT_OPTIONS = ['16', '17 से 20', '21 से 25', '26 से 32', '32 से ज़्यादा'];

/** 16 (या न्यूनतम) माला कब तक पूरी की */
const MALA_BY_TIME_OPTIONS = [
  'सुबह 6 बजे तक',
  'सुबह 9 बजे तक',
  'दोपहर 2 बजे तक',
  'शाम 6 बजे तक',
  'रात 9 बजे तक',
  'पूरी नहीं हुई',
];

/** मिनट — पढ़ाई / श्रवण */
const MINUTES_OPTIONS = [
  '0',
  '30 मिनट तक',
  '1 घंटे तक',
  '2 घंटे तक',
  '2 घंटे से अधिक',
];

export const sadhanaFormFields: SadhanaFieldDefinition[] = [
  {
    id: 'devotee_name',
    type: 'text',
    label: 'आपका नाम',
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
    id: 'sravanam_duration',
    type: 'radio',
    label: 'आपने कितनी देर श्रवण किया?',
    options: MINUTES_OPTIONS,
    required: true,
  },
];
