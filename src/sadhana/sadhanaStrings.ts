/**
 * सभी यूज़र-दिखने वाले टेक्स्ट (हिंदी)। फ़ील्ड के लेबल `sadhanaFormConfig.ts` में हैं।
 */
export const sadhanaStrings = {
  documentTitle: 'दैनिक साधना भरें · इस्कॉन देवघर',
  heroTitle: 'दैनिक साधना भरें',
  heroSubtitle: '',

  submit: 'जमा करें',
  submitting: 'जमा हो रहा है…',
  checkboxYes: 'हाँ',

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
} as const;
