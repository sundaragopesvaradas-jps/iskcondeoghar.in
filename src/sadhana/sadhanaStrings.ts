/**
 * User-visible copy: mostly Hindi; **admin overview** (`admin*`, `adminRecordsError`, `adminCharts*`) is English.
 * Field labels live in `sadhanaFormConfig.ts`.
 */
export const sadhanaStrings = {
  documentTitle: 'दैनिक साधना भरें · इस्कॉन देवघर',
  heroTitle: 'दैनिक साधना भरें',
  heroSubtitle: '',

  submit: 'जमा करें',
  submitting: 'जमा हो रहा है…',
  checkboxYes: 'हाँ',

  /** नाम autocomplete सूची (स्क्रीन रीडर) */
  nameComboboxListHint: 'पहले से दर्ज नाम — चुनने के लिए',

  /** प्रगति — सिर्फ़ x/y */
  progressFilled: (done: number, total: number) => `${done}/${total} filled`,

  /** हरे कृष्ण महा-मंत्र (दाएँ-बाएँ पैनल) */
  hareKrishnaMahamantra:
    'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे\nहरे राम हरे राम राम राम हरे हरे',

  validateText: (label: string) => `कृपया "${label}" भरें।`,
  validateRadio: (label: string) => `कृपया "${label}" के लिए एक विकल्प चुनें।`,
  validateCheckboxMulti: (label: string) =>
    `कृपया "${label}" के लिए कम से कम एक विकल्प चुनें।`,
  validateCheckboxSingle: (label: string) => `कृपया "${label}" पर सहमति दें।`,

  notConfigured:
    'फॉर्म अभी सक्रिय नहीं है। डेवलपर को src/sadhana/sadhanaBackendConfig.ts में SADHANA_GOOGLE_SCRIPT_URL सेट करके साइट फिर से बिल्ड करनी होगी।',

  success: 'धन्यवाद — आपकी जानकारी दर्ज कर ली गई है।',
  genericError: 'कुछ गलत हो गया। कृपया कुछ देर बाद पुनः प्रयास करें।',

  devBannerBeforeCode: 'जब तक फ़ाइल',
  devBannerAfterCode:
    'में Google Apps Script का वेब ऐप URL नहीं जोड़ा जाता, जमा करना बंद रहेगा।',

  /** पिछली साधना रिकॉर्ड */
  recordsOpenButton: 'अपनी साधना रिकॉर्ड देखें',
  recordsDocumentTitle: 'पिछली साधना देखें · इस्कॉन देवघर',
  recordsBackToForm: 'फ़ॉर्म पर वापस',

  /** Admin overview — /sadhana/overview (English UI) */
  adminDocumentTitle: 'Sadhana overview · ISKCON Deoghar',
  adminPageTitle: "View all devotees' sadhana",
  adminKeyLabel: 'Admin key',
  adminKeyPlaceholder: 'Enter key',
  adminLoadNames: 'Load name list',
  adminBackToForm: 'Back to form',
  adminNamesHeading: 'Choose a devotee',
  adminBackToNames: 'All names',
  adminChangeKey: 'Change key',
  adminNotConfigured: 'Script URL is not set.',
  adminErrorForbidden: 'Invalid admin key.',
  adminErrorInvalidMode: 'Invalid request mode.',
  /** API errors on admin overview (English) */
  adminErrorGeneric: 'Something went wrong. Please try again.',
  adminRecordsError: (code: string | undefined) => {
    switch (code) {
      case 'WRONG_PIN':
        return 'Wrong PIN.';
      case 'NAME_NOT_FOUND':
        return 'This name is not in the list.';
      case 'INVALID_PIN':
        return 'PIN must be digits only, with the correct length.';
      case 'NAME_REQUIRED':
        return 'Name is required.';
      case 'PIN_UNCHANGED':
        return 'New PIN must differ from the old one.';
      case 'FORBIDDEN':
        return 'Access denied — invalid key.';
      case 'INVALID_MODE':
        return 'Invalid request.';
      case 'UNKNOWN_ACTION':
        return 'Unknown action.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
      default:
        return 'Request failed.';
    }
  },
  adminRecordsEmpty: 'No data yet.',
  adminChartsHeading: 'Trends (charts)',
  adminChartsHint:
    'X: time order, Y: option order. Same row cap as the table — set in Apps Script (see GOOGLE_SHEETS_SETUP.md).',
  adminChartNoData: 'Not enough points for this measure.',
  adminChartAria: (columnTitle: string) => `${columnTitle} — trend chart`,
  recordsTitle: 'पिछली साधना देखें',
  recordsNameLabel: 'नाम',
  recordsPinLabel: 'PIN',
  recordsSubmit: 'देखें',
  recordsClose: 'बंद करें',
  recordsDifferentName: 'दूसरे नाम से देखें',
  recordsLoading: 'लोड हो रहा है…',
  recordsEmpty: 'अभी कोई डेटा नहीं मिला।',
  recordsChangePinSection: 'PIN बदलें',
  recordsNewPin: 'नया PIN',
  recordsSavePin: 'नया PIN सहेजें',
  recordsPinSaved: 'नया PIN सहेज लिया गया। अगली बार से नया PIN उपयोग करें।',
  recordsChartsHeading: 'रुझान (ग्राफ़)',
  recordsChartsHint:
    'X: time order, Y: option order (lower = less, higher = more). Data volume is limited by the Apps Script (see GOOGLE_SHEETS_SETUP.md).',
  recordsChartNoData: 'इस माप के लिए पर्याप्त बिंदु नहीं।',
  recordsChartAria: (columnTitle: string) => `${columnTitle} — रुझान ग्राफ़`,
  recordsErrorGeneric: 'कुछ गलत हो गया। पुनः प्रयास करें।',
  recordsError: (code: string | undefined) => {
    switch (code) {
      case 'WRONG_PIN':
        return 'गलत PIN।';
      case 'NAME_NOT_FOUND':
        return 'यह नाम सूची में नहीं है। पहले फ़ॉर्म से नाम दर्ज करें।';
      case 'INVALID_PIN':
        return 'PIN केवल अंक और सही लंबाई में हो।';
      case 'NAME_REQUIRED':
        return 'नाम आवश्यक है।';
      case 'PIN_UNCHANGED':
        return 'नया PIN पुराने से अलग होना चाहिए।';
      case 'FORBIDDEN':
        return 'अनुमति नहीं — गलत कुंजी।';
      case 'INVALID_MODE':
        return 'अमान्य अनुरोध।';
      default:
        return 'अनुरोध असफल।';
    }
  },
} as const;
