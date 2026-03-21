/**
 * Scroll-driven background (blur / overlay / image opacity), same tuning as nabadwipparikrama config.
 */
export const SADHANA_BACKGROUND_CONFIG = {
  blur: {
    initial: 10,
    final: 0,
  },
  overlay: {
    initial: 0.75,
    final: 0.1,
  },
  imageOpacity: {
    initial: 1.0,
    final: 1.0,
  },
  scrollEasingMultiplier: 0.5,
} as const;
