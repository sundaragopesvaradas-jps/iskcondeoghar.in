import { SADHANA_AUTO_SCROLL_DURATION_MS } from './sadhanaAutoScrollConfig';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * तत्व को viewport में लगभग केंद्र में लाते हुए smooth scroll (अवधि कॉन्फ़िगर करने योग्य)।
 */
export function smoothScrollElementIntoViewCenter(
  el: HTMLElement,
  durationMs: number = SADHANA_AUTO_SCROLL_DURATION_MS
): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    window.scrollTo({ top: window.scrollY, left: 0 });
    return;
  }

  const rect = el.getBoundingClientRect();
  const absTop = rect.top + window.scrollY;
  const elHeight = rect.height;
  const viewportH = window.innerHeight;
  const rawTarget = absTop - (viewportH - elHeight) / 2;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetY = Math.min(maxScroll, Math.max(0, rawTarget));
  const startY = window.scrollY;
  const delta = targetY - startY;

  if (Math.abs(delta) < 0.5) {
    return;
  }

  const start = performance.now();

  function frame(now: number) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeInOutCubic(t);
    window.scrollTo({ top: startY + delta * eased, left: 0, behavior: 'auto' });
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      window.scrollTo({ top: startY + delta, left: 0, behavior: 'auto' });
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: window.scrollY, left: 0, behavior: 'auto' });
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
      });
    }
  }

  requestAnimationFrame(frame);
}
