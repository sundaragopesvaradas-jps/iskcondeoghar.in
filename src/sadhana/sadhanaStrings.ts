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
    'X: तारीख (नई बाएँ), Y: विकल्प क्रम (नीचे = कम, ऊपर = अधिक)। आज छोड़ा गया। अधिकतम ३० दिन।',
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
      default:
        return 'अनुरोध असफल।';
    }
  },
} as const;
