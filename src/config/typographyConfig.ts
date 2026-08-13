/**
 * साइट टाइपोग्राफ़ी — पूरी वेबसाइट का एक ही फ़ॉन्ट स्टैक
 *
 * Source Serif 4 में देवनागरी ग्लिफ़ नहीं हैं, इसलिए हिंदी टेक्स्ट के लिए
 * Noto Serif Devanagari स्टैक में अगला फ़ॉन्ट है। ब्राउज़र प्रति-अक्षर
 * fallback करता है: लैटिन → Source Serif 4, देवनागरी → Noto Serif Devanagari.
 */

/** लैटिन / अंकों के लिए मुख्य फ़ॉन्ट */
export const SITE_FONT_FAMILY = 'Source Serif 4';

/** देवनागरी के लिए फ़ॉन्ट (Source Serif 4 में ये अक्षर नहीं हैं) */
export const SITE_DEVANAGARI_FONT_FAMILY = 'Noto Serif Devanagari';

/** पूरी साइट का `font-family` — CSS और inline style दोनों के लिए */
export const SITE_FONT_STACK = `'${SITE_FONT_FAMILY}', '${SITE_DEVANAGARI_FONT_FAMILY}', 'Iowan Old Style', 'Palatino Linotype', Palatino, serif`;

/** मोनोस्पेस (code / PIN जैसे फ़ील्ड) */
export const SITE_MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/**
 * दोनों फ़ॉन्ट एक ही stylesheet में — `public/index.html` में स्टैटिक रूप से
 * लोड होता है, इसलिए किसी पेज को रनटाइम पर लिंक इंजेक्ट करने की ज़रूरत नहीं।
 */
export const SITE_GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap';
