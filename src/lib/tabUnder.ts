export const DIRECT_LINK_URL =
  'https://asiaso.org/4/d7afdde7726388c479952a1f7b637033';

export const RATE_STORAGE_KEY = 'walkathawa_popunder_rate_v1';
export const STORY_COOLDOWN_KEY = 'walkathawa_story_popunder_last_ts_v1';
export const REOPENED_STORY_KEY = 'walkathawa_reopened_story';

interface TabUnderApi {
  DIRECT_LINK_URL: string;
  canTriggerHomepageSwap: () => boolean;
  canTriggerStorySwap: () => boolean;
  triggerHomepageSwap: (destPathOrUrl: string) => boolean;
  triggerStorySwap: (destPathOrUrl?: string, scrollY?: number) => boolean;
  isExcludedUserLinkUrl: (url: string) => boolean;
}

interface ReopenedStoryState {
  url: string;
  pathname: string;
  scrollY: number;
  timestamp: number;
}

declare global {
  interface Window {
    __walkathawaTabUnder?: TabUnderApi;
  }
}

export function isOfficialTelegramUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof window === 'undefined') return false;
  try {
    const parsed = new URL(rawUrl, window.location.href);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 't.me' ||
      host.endsWith('.t.me') ||
      host === 'telegram.me' ||
      host.endsWith('.telegram.me') ||
      host === 'telegram.dog'
    );
  } catch {
    return false;
  }
}

export function isSameOriginUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof window === 'undefined') return false;
  try {
    const parsed = new URL(rawUrl, window.location.href);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function isExcludedUserLink(anchor: HTMLAnchorElement | null): boolean {
  if (!anchor || typeof window === 'undefined') return false;
  const href = anchor.getAttribute('href') || anchor.href || '';
  if (!href || href.startsWith('#')) return true;
  if (isSameOriginUrl(href)) return true;
  if (isOfficialTelegramUrl(href)) return true;
  return false;
}

export function triggerHomepageTabUnder(destPathOrUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  const api = window.__walkathawaTabUnder;
  if (api && typeof api.triggerHomepageSwap === 'function') {
    return api.triggerHomepageSwap(destPathOrUrl);
  }
  return false;
}

export function triggerStoryReaderTabUnder(
  destPathOrUrl?: string,
  scrollY?: number
): boolean {
  if (typeof window === 'undefined') return false;
  const api = window.__walkathawaTabUnder;
  if (api && typeof api.triggerStorySwap === 'function') {
    return api.triggerStorySwap(
      destPathOrUrl || window.location.href,
      typeof scrollY === 'number' ? scrollY : window.scrollY
    );
  }
  return false;
}

export function peekReopenedStoryScroll(): ReopenedStoryState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REOPENED_STORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReopenedStoryState>;
    const ts = Number(parsed.timestamp || 0);
    const scrollY = Number(parsed.scrollY || 0);
    if (!ts || Date.now() - ts > 60000 || !isFinite(scrollY) || scrollY <= 0) {
      return null;
    }
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const savedPath = String(parsed.pathname || '').replace(/\/+$/, '') || '/';
    if (savedPath !== currentPath && parsed.url !== window.location.href) {
      return null;
    }
    return {
      url: String(parsed.url || window.location.href),
      pathname: savedPath,
      scrollY,
      timestamp: ts,
    };
  } catch {
    return null;
  }
}

export function consumeReopenedStoryScroll(): number | null {
  const match = peekReopenedStoryScroll();
  if (!match || typeof window === 'undefined') return null;
  try {
    window.localStorage.removeItem(REOPENED_STORY_KEY);
  } catch {
    // ignore
  }
  return match.scrollY;
}
