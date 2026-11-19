import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {
  POPUNDER_SCRIPT_SRC,
  SOCIAL_BAR_SCRIPT_SRC,
  MAX_ADS_PER_WINDOW,
  WINDOW_MS,
  INTERACTION_WINDOW_MS,
  isCrawlerUserAgent,
  isAdminRoute,
  shouldSuppressAds,
  isWithinTrustedInteraction,
  canTriggerPopunderInWindow,
  extractStorySlugFromUrl,
} from './adUtils.ts';

const rootDir = path.resolve(import.meta.dirname, '../..');

test('adUtils crawler, admin, interaction-window, and rate-limiter helpers work accurately', () => {
  assert.equal(isCrawlerUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
  assert.equal(isCrawlerUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'), true);
  assert.equal(isCrawlerUserAgent('Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'), true);
  assert.equal(isCrawlerUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'), false);

  assert.equal(isAdminRoute('/admin'), true);
  assert.equal(isAdminRoute('/admin/posts'), true);
  assert.equal(isAdminRoute('/posts/janu-akka'), false);

  assert.equal(
    shouldSuppressAds({
      userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
      webdriver: true,
      pathname: '/',
    }),
    true
  );
  assert.equal(
    shouldSuppressAds({
      userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
      webdriver: false,
      pathname: '/admin',
    }),
    true
  );
  assert.equal(
    shouldSuppressAds({
      userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
      webdriver: false,
      pathname: '/posts/janu-akka',
    }),
    false
  );

  assert.equal(isWithinTrustedInteraction(1000, 2500, INTERACTION_WINDOW_MS), true);
  assert.equal(isWithinTrustedInteraction(1000, 3001, INTERACTION_WINDOW_MS), false);

  // Sliding window: 2 ads per 10 seconds
  const t0 = 100000;
  const r1 = canTriggerPopunderInWindow([], t0, MAX_ADS_PER_WINDOW, WINDOW_MS);
  assert.equal(r1.allowed, true);
  const r2 = canTriggerPopunderInWindow(r1.nextTimestamps, t0 + 2000, MAX_ADS_PER_WINDOW, WINDOW_MS);
  assert.equal(r2.allowed, true);
  const r3 = canTriggerPopunderInWindow(r2.nextTimestamps, t0 + 4000, MAX_ADS_PER_WINDOW, WINDOW_MS);
  assert.equal(r3.allowed, false);
  const r4 = canTriggerPopunderInWindow(r3.nextTimestamps, t0 + 10001, MAX_ADS_PER_WINDOW, WINDOW_MS);
  assert.equal(r4.allowed, true);

  assert.equal(extractStorySlugFromUrl('/posts/janu-akka'), 'janu-akka');
  assert.equal(extractStorySlugFromUrl('https://walkathawa.com/posts/janu-akka/'), 'janu-akka');
  assert.equal(extractStorySlugFromUrl('/categories/iskolee-mis'), null);
});

function createMockBrowserEnv(options: {
  pathname?: string;
  userAgent?: string;
  webdriver?: boolean;
  scrollY?: number;
  initialStorage?: Record<string, string>;
}) {
  const storageMap = new Map<string, string>(
    Object.entries(options.initialStorage || {})
  );
  const headChildren: any[] = [];
  const bodyChildren: any[] = [];
  const winListeners = new Map<string, Function[]>();
  const docListeners = new Map<string, Function[]>();
  const openedWindows: Array<{ url: string; target: string }> = [];
  const scrollCalls: Array<{ x: number; y: number }> = [];

  const locationObj = {
    origin: 'https://walkathawa.com',
    pathname: options.pathname || '/',
    href: `https://walkathawa.com${options.pathname || '/'}`,
  };

  const makeEl = (tag: string) => {
    const attrs: Record<string, string> = {};
    return {
      tagName: tag.toUpperCase(),
      src: '',
      async: false,
      attrs,
      setAttribute(k: string, v: string) {
        attrs[k] = v;
        if (k === 'src') this.src = v;
      },
      getAttribute(k: string) {
        return attrs[k] || null;
      },
    };
  };

  const documentObj: any = {
    readyState: 'complete',
    documentElement: { scrollTop: options.scrollY || 0 },
    head: {
      appendChild(el: any) {
        headChildren.push(el);
        return el;
      },
    },
    body: {
      appendChild(el: any) {
        bodyChildren.push(el);
        return el;
      },
    },
    createElement: makeEl,
    querySelector(selector: string) {
      const all = [...headChildren, ...bodyChildren];
      if (selector.includes('popunder') || selector.includes(POPUNDER_SCRIPT_SRC)) {
        return (
          all.find(
            (el) =>
              el.src === POPUNDER_SCRIPT_SRC || el.attrs['data-ad-script'] === 'popunder'
          ) || null
        );
      }
      if (selector.includes('social-bar') || selector.includes(SOCIAL_BAR_SCRIPT_SRC)) {
        return (
          all.find(
            (el) =>
              el.src === SOCIAL_BAR_SCRIPT_SRC ||
              el.attrs['data-ad-script'] === 'social-bar'
          ) || null
        );
      }
      return null;
    },
    addEventListener(name: string, fn: Function) {
      const list = docListeners.get(name) || [];
      list.push(fn);
      docListeners.set(name, list);
    },
  };

  const windowObj: any = {
    location: locationObj,
    document: documentObj,
    scrollY: options.scrollY || 0,
    pageYOffset: options.scrollY || 0,
    localStorage: {
      getItem: (k: string) => (storageMap.has(k) ? storageMap.get(k)! : null),
      setItem: (k: string, v: string) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
    },
    open(url: string, target = '_blank') {
      openedWindows.push({ url: String(url), target: String(target) });
      return { closed: false };
    },
    scrollTo(x: number, y: number) {
      scrollCalls.push({ x, y });
    },
    requestAnimationFrame(cb: Function) {
      cb();
    },
    addEventListener(name: string, fn: Function) {
      const list = winListeners.get(name) || [];
      list.push(fn);
      winListeners.set(name, list);
    },
  };

  const context = vm.createContext({
    window: windowObj,
    document: documentObj,
    navigator: {
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      webdriver: Boolean(options.webdriver),
    },
    URL,
    Date,
    JSON,
    Math,
    Array,
    Number,
    String,
    Boolean,
    isFinite,
    decodeURIComponent,
    setTimeout: (fn: Function) => {
      // keep swap reset synchronous only when invoked manually in test
      return fn;
    },
  });

  return {
    context,
    windowObj,
    documentObj,
    headChildren,
    bodyChildren,
    winListeners,
    docListeners,
    openedWindows,
    scrollCalls,
    storageMap,
  };
}

test('public/popunder-swap.js exits immediately for crawlers, webdriver, and /admin routes', async () => {
  const scriptCode = await fs.readFile(
    path.join(rootDir, 'public/popunder-swap.js'),
    'utf8'
  );

  for (const cfg of [
    {
      name: 'Googlebot UA',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      pathname: '/',
    },
    {
      name: 'navigator.webdriver',
      webdriver: true,
      pathname: '/posts/janu-akka',
    },
    {
      name: '/admin route',
      pathname: '/admin',
    },
  ]) {
    const env = createMockBrowserEnv(cfg);
    vm.runInContext(scriptCode, env.context);
    assert.equal(env.headChildren.length, 0, `${cfg.name} should not inject head script`);
    assert.equal(env.bodyChildren.length, 0, `${cfg.name} should not inject body script`);
  }
});

test('public/popunder-swap.js injects scripts once, swaps on trusted story click, enforces 2/10s cap, and restores scroll', async () => {
  const scriptCode = await fs.readFile(
    path.join(rootDir, 'public/popunder-swap.js'),
    'utf8'
  );

  // 1. Human visitor on homepage
  const env = createMockBrowserEnv({ pathname: '/', scrollY: 420 });
  vm.runInContext(scriptCode, env.context);

  assert.equal(env.headChildren.length, 1);
  assert.equal(env.headChildren[0].src, POPUNDER_SCRIPT_SRC);
  assert.equal(env.headChildren[0].attrs['data-cfasync'], 'false');
  assert.equal(env.bodyChildren.length, 1);
  assert.equal(env.bodyChildren[0].src, SOCIAL_BAR_SCRIPT_SRC);
  assert.equal(env.bodyChildren[0].attrs['data-cfasync'], 'false');

  // Simulate trusted pointerdown + click on a story card link
  const pointerHandlers = env.winListeners.get('pointerdown') || [];
  pointerHandlers.forEach((fn) => fn({ isTrusted: true }));

  const storyLinkEl = {
    getAttribute: (k: string) => (k === 'href' ? '/posts/janu-akka' : null),
    closest(selector: string) {
      if (selector === 'a[href]') return storyLinkEl;
      return null;
    },
  };

  let prevented = false;
  const docClickHandlers = env.docListeners.get('click') || [];
  docClickHandlers.forEach((fn) =>
    fn({
      isTrusted: true,
      defaultPrevented: false,
      button: 0,
      target: storyLinkEl,
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
    })
  );

  assert.equal(prevented, true, 'Trusted story card click should trigger popunder swap');
  assert.equal(env.openedWindows.length, 1);
  assert.equal(env.openedWindows[0].url, 'https://walkathawa.com/posts/janu-akka');
  assert.equal(env.openedWindows[0].target, '_blank');
  assert.equal(env.windowObj.location.href, POPUNDER_SCRIPT_SRC);

  const savedScrollRaw = env.storageMap.get('wk_popunder_scroll_v1');
  assert.ok(savedScrollRaw, 'Scroll state should be saved in localStorage');
  const savedScroll = JSON.parse(savedScrollRaw!);
  assert.equal(savedScroll.slug, 'janu-akka');

  // 2. Verify sliding-window rate limit (pre-seeded with 2 recent ads within 10s -> 3rd blocked)
  const now = Date.now();
  const rateLimitedEnv = createMockBrowserEnv({
    pathname: '/',
    initialStorage: {
      wk_popunder_window_v1: JSON.stringify([now - 1000, now - 500]),
    },
  });
  vm.runInContext(scriptCode, rateLimitedEnv.context);
  let blockedClickPrevented = false;
  (rateLimitedEnv.docListeners.get('click') || []).forEach((fn) =>
    fn({
      isTrusted: true,
      defaultPrevented: false,
      button: 0,
      target: storyLinkEl,
      preventDefault() {
        blockedClickPrevented = true;
      },
      stopPropagation() {},
    })
  );
  assert.equal(
    blockedClickPrevented,
    false,
    '3rd click within 10s must be rate-limited and allow normal navigation'
  );
  assert.equal(rateLimitedEnv.openedWindows.length, 0);

  // 3. Reopened story tab restores saved scroll position and clears localStorage entry
  const reopenEnv = createMockBrowserEnv({
    pathname: '/posts/janu-akka',
    initialStorage: {
      wk_popunder_scroll_v1: JSON.stringify({
        slug: 'janu-akka',
        path: '/posts/janu-akka',
        scrollY: 640,
        ts: Date.now(),
      }),
    },
  });
  vm.runInContext(scriptCode, reopenEnv.context);
  assert.ok(
    reopenEnv.scrollCalls.some((c) => c.x === 0 && c.y === 640),
    'Reopened story tab should restore scrollY=640'
  );
  assert.equal(
    reopenEnv.storageMap.has('wk_popunder_scroll_v1'),
    false,
    'Saved scroll state should be cleared after restoration'
  );
});
