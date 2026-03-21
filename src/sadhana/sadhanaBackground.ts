/**
 * Random full-page background from site imagery under /public/images.
 * SessionStorage keeps one image per tab session (same pattern as nabadwipparikrama).
 */
const SADHANA_BACKGROUND_IMAGES: string[] = [
  '/images/UpcomingEventBanner/event-photo.jpg',
  '/images/RecentEvents/snana2025.jpg',
  '/images/RecentEvents/gp2025.jpg',
  '/images/RecentEvents/nt2025.jpg',
  '/images/RecentEvents/snana2023.jpg',
  '/images/RecentEvents/ratha2022.jpg',
  '/images/RecentEvents/janmashtami.jpg',
  '/images/RecentEvents/gitayagya2024.jpg',
  '/images/WeeklyTemplePrograms/MorningChanting.jpg',
  '/images/WeeklyTemplePrograms/MangalaArati.jpg',
  '/images/WeeklyTemplePrograms/BGWeekly.jpg',
  '/images/WeeklyTemplePrograms/Khichdi2.jpg',
  '/images/WeeklyTemplePrograms/SundayClass2.jpg',
  '/images/WeeklyTemplePrograms/HouseProgram.jpg',
];

const STORAGE_KEY = 'iskconSadhanaBgImage';

export function getSadhanaBackgroundImageUrl(): string {
  if (typeof window === 'undefined') {
    return SADHANA_BACKGROUND_IMAGES[0];
  }
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached && SADHANA_BACKGROUND_IMAGES.indexOf(cached) !== -1) {
    return cached;
  }
  const i = Math.floor(Math.random() * SADHANA_BACKGROUND_IMAGES.length);
  const selected = SADHANA_BACKGROUND_IMAGES[i];
  sessionStorage.setItem(STORAGE_KEY, selected);
  return selected;
}
