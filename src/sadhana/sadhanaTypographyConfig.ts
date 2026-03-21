/**
 * साधना फ़ॉर्म — टाइपोग्राफ़ी (Google Fonts, Devanagari)
 *
 * नीचे `SADHANA_FONT_PRESET` में से **एक** id चुनें। बिल्ड के बाद बदलाव दिखेगा।
 */

export type SadhanaFontPresetId =
  | 'anek'
  | 'noto_sans_devanagari'
  | 'noto_serif_devanagari'
  | 'mukta_vaani'
  | 'mukta'
  | 'hind'
  | 'karma'
  | 'hind_madurai';

/** यहाँ अपनी पसंद की फ़ॉन्ट प्रीसेट id सेट करें */
export const SADHANA_FONT_PRESET: SadhanaFontPresetId = 'noto_serif_devanagari';

export interface SadhanaFontPreset {
  id: SadhanaFontPresetId;
  /** UI / डॉक के लिए संक्षिप्त विवरण (हिंदी) */
  label: string;
  /** CSS `font-family` का पहला नाम (Google Fonts जैसा) */
  cssFontFamily: string;
  /** एक ही stylesheet — weights 400–700 */
  googleFontsHref: string;
}

const PRESETS: Record<SadhanaFontPresetId, SadhanaFontPreset> = {
  anek: {
    id: 'anek',
    label: 'Anek Devanagari — मॉडर्न, वर्तमान डिफ़ॉल्ट',
    cssFontFamily: 'Anek Devanagari',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;500;600;700&display=swap',
  },
  noto_sans_devanagari: {
    id: 'noto_sans_devanagari',
    label: 'Noto Sans Devanagari — साफ़, पढ़ने में आसान',
    cssFontFamily: 'Noto Sans Devanagari',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
  },
  noto_serif_devanagari: {
    id: 'noto_serif_devanagari',
    label: 'Noto Serif Devanagari — सेरिफ़ / पारंपरिक झलक',
    cssFontFamily: 'Noto Serif Devanagari',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap',
  },
  mukta_vaani: {
    id: 'mukta_vaani',
    label: 'Mukta Vaani — हल्का गोल, अच्छी पठनीयता',
    cssFontFamily: 'Mukta Vaani',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Mukta+Vaani:wght@400;500;600;700&display=swap',
  },
  mukta: {
    id: 'mukta',
    label: 'Mukta — संतुलित UI टेक्स्ट',
    cssFontFamily: 'Mukta',
    googleFontsHref: 'https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap',
  },
  hind: {
    id: 'hind',
    label: 'Hind — स्पष्ट अक्षर',
    cssFontFamily: 'Hind',
    googleFontsHref: 'https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&display=swap',
  },
  karma: {
    id: 'karma',
    label: 'Karma — नरम, मित्रतापूर्ण',
    cssFontFamily: 'Karma',
    googleFontsHref: 'https://fonts.googleapis.com/css2?family=Karma:wght@400;500;600;700&display=swap',
  },
  hind_madurai: {
    id: 'hind_madurai',
    label: 'Hind Madurai — थोड़ा संकीर्ण / ज़्यादा टेक्स्ट',
    cssFontFamily: 'Hind Madurai',
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap',
  },
};

/** सभी विकल्प (ड्रॉपडाउन / डॉक के लिए) */
export const SADHANA_FONT_PRESET_OPTIONS: SadhanaFontPreset[] = Object.values(PRESETS);

export function getSadhanaFontPreset(): SadhanaFontPreset {
  const p = PRESETS[SADHANA_FONT_PRESET];
  return p ?? PRESETS.anek;
}
