const COOLDOWN_KEY = 'walkathawa_story_popunder_last_ts_v1';
const SCROLL_KEY = 'walkathawa_reopened_story';
const CAPTURED_AD_URL_KEY = 'walkathawa_last_ad_url_v1';
const COOLDOWN_MS = 5000; // 1 popunder trigger per every 5 seconds
const FALLBACK_AD_URL = 'https://asiaso.org/4/d7afdde7726388c479952a1f7b637033';

declare global {
  interface Window {
    __triggerWalkathawaTabUnder?: (
      destPathOrUrl?: string,
      scrollY?: number
    ) => boolean;
    __origWindowOpen?: typeof window.open;
    __lastCapturedAdUrl?: string;
  }
}

export interface ReopenedStoryState {
  path: string;
  scrollY: number;
  ts: number;
}

export function getLastTriggerTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function isPopunderCooldownReady(): boolean {
  if (typeof window === 'undefined') return false;
  return Date.now() - getLastTriggerTimestamp() >= COOLDOWN_MS;
}

function recordTriggerTimestamp(ts: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOLDOWN_KEY, String(ts));
  } catch {
    // ignore storage errors
  }
}

function getActiveAdUrl(): string {
  if (typeof window === 'undefined') return FALLBACK_AD_URL;
  if (window.__lastCapturedAdUrl) return window.__lastCapturedAdUrl;
  try {
    const saved = localStorage.getItem(CAPTURED_AD_URL_KEY);
    if (saved && /^https?:\/\//i.test(saved)) return saved;
  } catch {
    // ignore
  }
  return FALLBACK_AD_URL;
}

export function isExcludedUserLink(anchor: HTMLAnchorElement | null): boolean {
  if (!anchor || !anchor.href) return false;
  try {
    const parsed = new URL(anchor.href, window.location.origin);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 't.me' ||
      host === 'telegram.me' ||
      host.endsWith('.t.me')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function executeFallbackTabUnder(destUrl: string, scrollY = 0): boolean {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  const last = getLastTriggerTimestamp();
  if (now - last < COOLDOWN_MS) return false;

  try {
    const targetPath = new URL(destUrl, window.location.origin).pathname;
    localStorage.setItem(
      SCROLL_KEY,
      JSON.stringify({
        path: targetPath,
        scrollY,
        ts: now,
      })
    );
  } catch {
    // ignore
  }

  recordTriggerTimestamp(now);

  const openFn = window.__origWindowOpen || window.open;
  let newTab: Window | null = null;
  try {
    newTab = openFn.call(window, destUrl, '_blank');
  } catch {
    newTab = null;
  }

  if (!newTab) {
    recordTriggerTimestamp(now - COOLDOWN_MS);
    return false;
  }

  const adUrl = getActiveAdUrl();
  setTimeout(() => {
    try {
      window.location.assign(adUrl);
    } catch {
      window.location.href = adUrl;
    }
  }, 15);

  return true;
}

/**
 * Triggers a tab-under swap when clicking a story card or link (max 1 per 10 seconds):
 * Opens the target site page in a new browser tab and redirects the current tab to the popunder ad link.
 */
export function triggerHomepageTabUnder(destPathOrUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isPopunderCooldownReady()) {
    return false;
  }

  const fullDestUrl = new URL(destPathOrUrl, window.location.origin).href;
  if (typeof window.__triggerWalkathawaTabUnder === 'function') {
    return window.__triggerWalkathawaTabUnder(fullDestUrl, 0);
  }
  return executeFallbackTabUnder(fullDestUrl, 0);
}

/**
 * Triggers a tab-under swap inside the story reader page (max 1 per 10 seconds):
 * Saves scroll position, reopens the story in a new browser tab, and redirects the current tab to the popunder ad link.
 */
export function triggerStoryReaderTabUnder(
  destPathOrUrl?: string,
  scrollY?: number
): boolean {
  if (typeof window === 'undefined') return false;
  if (!isPopunderCooldownReady()) {
    return false;
  }

  const targetUrl = destPathOrUrl
    ? new URL(destPathOrUrl, window.location.origin).href
    : window.location.href;
  const currentScroll =
    typeof scrollY === 'number' ? scrollY : window.scrollY || 0;

  if (typeof window.__triggerWalkathawaTabUnder === 'function') {
    return window.__triggerWalkathawaTabUnder(targetUrl, currentScroll);
  }
  return executeFallbackTabUnder(targetUrl, currentScroll);
}

export function peekReopenedStoryScroll(): ReopenedStoryState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReopenedStoryState;
    if (
      parsed &&
      typeof parsed.scrollY === 'number' &&
      typeof parsed.ts === 'number' &&
      Date.now() - parsed.ts < 30000
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function consumeReopenedStoryScroll(): ReopenedStoryState | null {
  const state = peekReopenedStoryScroll();
  if (state && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SCROLL_KEY);
    } catch {
      // ignore
    }
  }
  return state;
}
