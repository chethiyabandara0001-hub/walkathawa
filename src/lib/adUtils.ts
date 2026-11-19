export const POPUNDER_SCRIPT_SRC =
  'https://ahuramazda.org/1/cd7964982d4480e37f1acf703b21759d';
export const SOCIAL_BAR_SCRIPT_SRC =
  'https://brijmohan.org/14/8620570ee06989031f1fe9b1dcd8f15f';

export const MAX_ADS_PER_WINDOW = 2;
export const WINDOW_MS = 10000;
export const INTERACTION_WINDOW_MS = 2000;

export const CRAWLER_UA_PATTERN =
  /googlebot|google-inspectiontool|googleother|storebot-google|adsbot-google|mediapartners-google|google-extended|google-agent|bingbot|msnbot|adidxbot|bingpreview|yandex(?:bot|images|mobilebot|accessibilitybot)?|duckduckbot|baiduspider|slurp|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|slackbot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|chatgpt-user|claude-user|perplexitybot|perplexity-user|ccbot|meta-externalfetcher|firecrawlagent|mistralai-user|kimi-user|lighthouse|chrome-lighthouse|headlesschrome|phantomjs|selenium|puppeteer|playwright|crawler|spider|bot\b/i;

export function isCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA_PATTERN.test(String(userAgent));
}

export function isAdminRoute(pathname: string | null | undefined): boolean {
  const clean = String(pathname || '').trim().toLowerCase();
  return clean === '/admin' || clean.startsWith('/admin/');
}

export function shouldSuppressAds(params: {
  userAgent?: string | null;
  webdriver?: boolean;
  pathname?: string | null;
}): boolean {
  if (params.webdriver === true) return true;
  if (isAdminRoute(params.pathname)) return true;
  if (isCrawlerUserAgent(params.userAgent)) return true;
  return false;
}

export function isWithinTrustedInteraction(
  lastInteractionAt: number,
  now: number,
  windowMs: number = INTERACTION_WINDOW_MS
): boolean {
  if (!Number.isFinite(lastInteractionAt) || lastInteractionAt <= 0) return false;
  const delta = now - lastInteractionAt;
  return delta >= 0 && delta <= windowMs;
}

export function canTriggerPopunderInWindow(
  timestamps: number[],
  now: number,
  maxAds: number = MAX_ADS_PER_WINDOW,
  windowMs: number = WINDOW_MS
): { allowed: boolean; nextTimestamps: number[] } {
  const recent = (Array.isArray(timestamps) ? timestamps : []).filter(
    (ts) => Number.isFinite(ts) && now - ts >= 0 && now - ts < windowMs
  );
  if (recent.length >= maxAds) {
    return { allowed: false, nextTimestamps: recent };
  }
  return { allowed: true, nextTimestamps: [...recent, now] };
}

export function extractStorySlugFromUrl(
  rawUrl: string,
  origin: string = 'https://walkathawa.com'
): string | null {
  try {
    const parsed = new URL(rawUrl, origin);
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath.startsWith('/posts/')) return null;
    const slug = cleanPath.slice('/posts/'.length);
    if (!slug || slug.includes('/')) return null;
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}

export function ensureHumanAdScripts(doc?: Document): {
  popunderInjected: boolean;
  socialBarInjected: boolean;
} {
  const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
  if (!targetDoc || typeof window === 'undefined') {
    return { popunderInjected: false, socialBarInjected: false };
  }

  if (
    shouldSuppressAds({
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      webdriver: typeof navigator !== 'undefined' ? Boolean(navigator.webdriver) : false,
      pathname: window.location?.pathname || '/',
    })
  ) {
    return { popunderInjected: false, socialBarInjected: false };
  }

  let popunderInjected = false;
  let socialBarInjected = false;

  const existingPopunder = targetDoc.querySelector(
    `script[src="${POPUNDER_SCRIPT_SRC}"], script[data-ad-script="popunder"]`
  );
  if (!existingPopunder && targetDoc.head) {
    const script = targetDoc.createElement('script');
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-ad-script', 'popunder');
    script.src = POPUNDER_SCRIPT_SRC;
    script.async = true;
    targetDoc.head.appendChild(script);
    popunderInjected = true;
  }

  const existingSocialBar = targetDoc.querySelector(
    `script[src="${SOCIAL_BAR_SCRIPT_SRC}"], script[data-ad-script="social-bar"]`
  );
  if (!existingSocialBar && targetDoc.body) {
    const script = targetDoc.createElement('script');
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-ad-script', 'social-bar');
    script.src = SOCIAL_BAR_SCRIPT_SRC;
    script.async = true;
    targetDoc.body.appendChild(script);
    socialBarInjected = true;
  }

  return { popunderInjected, socialBarInjected };
}
