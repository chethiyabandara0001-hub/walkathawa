(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__walkathawaTabUnderInstalled) return;
  window.__walkathawaTabUnderInstalled = true;

  var DIRECT_LINK_URL = 'https://asiaso.org/4/d7afdde7726388c479952a1f7b637033';
  var RATE_STORAGE_KEY = 'walkathawa_popunder_rate_v1';
  var STORY_COOLDOWN_KEY = 'walkathawa_story_popunder_last_ts_v1';
  var REOPENED_STORY_KEY = 'walkathawa_reopened_story';

  var RATE_WINDOW_MS = 60000; // 1 minute rolling window
  var RATE_MAX_TRIGGERS = 2; // Max 2 per 1 minute on Homepage & Gallery
  var STORY_COOLDOWN_MS = 10000; // Max 1 per 10 seconds on Story Reader
  var REDIRECT_DELAY_MS = 15; // 15ms delay before redirecting old tab to ad
  var CAPTURED_AD_TTL_MS = 3000;

  var nativeWindowOpen =
    typeof window.open === 'function' ? window.open.bind(window) : null;
  var nativeAnchorClick =
    typeof HTMLAnchorElement !== 'undefined' && HTMLAnchorElement.prototype.click
      ? HTMLAnchorElement.prototype.click
      : null;
  var nativeDispatchEvent =
    typeof EventTarget !== 'undefined' && EventTarget.prototype.dispatchEvent
      ? EventTarget.prototype.dispatchEvent
      : null;

  var isPerformingSwap = false;
  var activeSwap = null;
  var lastCapturedAdUrl = '';
  var lastCapturedAdTs = 0;

  var lastInteractionContext = {
    ts: 0,
    cardHref: '',
    inStoryReader: false,
    isExcludedLink: false,
  };

  function isAdminRoute() {
    try {
      return window.location.pathname.indexOf('/admin') === 0;
    } catch (e) {
      return false;
    }
  }

  function isExcludedHostname(hostname) {
    var host = String(hostname || '').toLowerCase();
    return (
      host === 't.me' ||
      host.slice(-5) === '.t.me' ||
      host === 'telegram.me' ||
      host.slice(-12) === '.telegram.me' ||
      host === 'telegram.dog' ||
      host === 'accounts.google.com'
    );
  }

  function isExternalAdCandidate(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    var trimmed = rawUrl.trim();
    if (
      !trimmed ||
      trimmed === 'about:blank' ||
      trimmed.charAt(0) === '#' ||
      /^javascript:/i.test(trimmed) ||
      /^mailto:/i.test(trimmed) ||
      /^tel:/i.test(trimmed) ||
      /^data:/i.test(trimmed) ||
      /^blob:/i.test(trimmed)
    ) {
      return false;
    }
    try {
      var parsed = new URL(trimmed, window.location.href);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      if (parsed.origin === window.location.origin) {
        return false;
      }
      if (isExcludedHostname(parsed.hostname)) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function isExcludedUserLinkUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return true;
    var trimmed = rawUrl.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return true;
    try {
      var parsed = new URL(trimmed, window.location.href);
      if (parsed.origin === window.location.origin) return true;
      if (isExcludedHostname(parsed.hostname)) return true;
      return false;
    } catch (e) {
      return true;
    }
  }

  function readStorageJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    } catch (e) {
      // ignore storage quota / private mode errors
    }
  }

  function getRecentHomepageTimestamps(now) {
    var raw = readStorageJson(RATE_STORAGE_KEY, []);
    if (!Array.isArray(raw)) return [];
    var filtered = [];
    for (var i = 0; i < raw.length; i++) {
      var ts = Number(raw[i]);
      if (isFinite(ts) && ts > 0 && now - ts < RATE_WINDOW_MS && ts <= now + 5000) {
        filtered.push(ts);
      }
    }
    return filtered;
  }

  function canTriggerHomepageSwap() {
    if (isAdminRoute()) return false;
    var now = Date.now();
    var recent = getRecentHomepageTimestamps(now);
    return recent.length < RATE_MAX_TRIGGERS;
  }

  function recordHomepageTrigger(now) {
    var recent = getRecentHomepageTimestamps(now);
    recent.push(now);
    writeStorage(RATE_STORAGE_KEY, recent);
    // Also initialize the 10-second story cooldown so the newly opened story tab does not immediately fire again
    writeStorage(STORY_COOLDOWN_KEY, String(now));
  }

  function canTriggerStorySwap() {
    if (isAdminRoute()) return false;
    var now = Date.now();
    try {
      var raw = window.localStorage.getItem(STORY_COOLDOWN_KEY);
      if (!raw) return true;
      var lastTs = Number(raw);
      if (!isFinite(lastTs) || lastTs <= 0) return true;
      return now - lastTs >= STORY_COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function recordStoryTrigger(now) {
    writeStorage(STORY_COOLDOWN_KEY, String(now));
  }

  function saveReopenedStoryScroll(destUrl, scrollY, now) {
    var targetScroll =
      typeof scrollY === 'number' && isFinite(scrollY)
        ? scrollY
        : window.scrollY || window.pageYOffset || 0;
    writeStorage(REOPENED_STORY_KEY, {
      url: destUrl,
      pathname: window.location.pathname,
      scrollY: targetScroll,
      timestamp: now,
    });
  }

  function recordCapturedAdUrl(adUrl) {
    if (!isExternalAdCandidate(adUrl)) return;
    lastCapturedAdUrl = adUrl;
    lastCapturedAdTs = Date.now();
    if (activeSwap && !activeSwap.resolved) {
      activeSwap.adUrl = adUrl;
    }
  }

  function consumeFreshCapturedAdUrl() {
    if (
      lastCapturedAdUrl &&
      Date.now() - lastCapturedAdTs <= CAPTURED_AD_TTL_MS
    ) {
      var url = lastCapturedAdUrl;
      lastCapturedAdUrl = '';
      lastCapturedAdTs = 0;
      return url;
    }
    return '';
  }

  function extractUrlFromWrittenHtml(html) {
    if (!html || typeof html !== 'string') return '';
    var patterns = [
      /http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'\s>]+)/i,
      /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
      /location\.(?:replace|assign)\(\s*["']([^"']+)["']\s*\)/i,
      /<a[^>]+href=["']([^"']+)["']/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = html.match(patterns[i]);
      if (m && m[1] && isExternalAdCandidate(m[1])) {
        return m[1];
      }
    }
    var urlMatches = html.match(/https?:\/\/[^\s"'<>\\)]+/gi);
    if (urlMatches) {
      for (var j = 0; j < urlMatches.length; j++) {
        if (isExternalAdCandidate(urlMatches[j])) {
          return urlMatches[j];
        }
      }
    }
    return '';
  }

  function createVirtualPopupProxy(onAdUrl) {
    var htmlBuffer = '';
    var currentHref = 'about:blank';

    var fakeLocation = {
      get href() {
        return currentHref;
      },
      set href(val) {
        currentHref = String(val || '');
        if (isExternalAdCandidate(currentHref)) {
          onAdUrl(currentHref);
        }
      },
      assign: function (val) {
        this.href = val;
      },
      replace: function (val) {
        this.href = val;
      },
      toString: function () {
        return currentHref;
      },
    };

    var fakeDocument = {
      open: function () {
        htmlBuffer = '';
        return fakeDocument;
      },
      write: function (chunk) {
        htmlBuffer += String(chunk || '');
        var extracted = extractUrlFromWrittenHtml(htmlBuffer);
        if (extracted) onAdUrl(extracted);
      },
      writeln: function (chunk) {
        this.write(String(chunk || '') + '\n');
      },
      close: function () {
        var extracted = extractUrlFromWrittenHtml(htmlBuffer);
        if (extracted) onAdUrl(extracted);
      },
      get location() {
        return fakeLocation;
      },
      set location(val) {
        fakeLocation.href = val;
      },
      createElement: function (tag) {
        return document.createElement(tag);
      },
      body: {
        appendChild: function () {},
      },
    };

    var proxy = {
      closed: false,
      opener: window,
      document: fakeDocument,
      focus: function () {},
      blur: function () {},
      close: function () {
        this.closed = true;
      },
      postMessage: function () {},
    };

    try {
      Object.defineProperty(proxy, 'location', {
        get: function () {
          return fakeLocation;
        },
        set: function (val) {
          fakeLocation.href = val;
        },
      });
    } catch (e) {
      proxy.location = fakeLocation;
    }

    return proxy;
  }

  function executeTabUnderSwap(destUrl, explicitAdUrl) {
    if (!nativeWindowOpen || isAdminRoute()) return false;

    var resolvedDest = destUrl || window.location.href;
    try {
      resolvedDest = new URL(resolvedDest, window.location.href).href;
    } catch (e) {
      resolvedDest = window.location.href;
    }

    var swapState = {
      resolved: false,
      adUrl:
        explicitAdUrl && isExternalAdCandidate(explicitAdUrl)
          ? explicitAdUrl
          : consumeFreshCapturedAdUrl(),
    };
    activeSwap = swapState;

    var openedTab = null;
    isPerformingSwap = true;
    try {
      openedTab = nativeWindowOpen(resolvedDest, '_blank');
      if (openedTab && typeof openedTab.focus === 'function') {
        try {
          openedTab.focus();
        } catch (e) {
          // ignore cross-origin/browser focus error
        }
      }
    } catch (e) {
      openedTab = null;
    } finally {
      isPerformingSwap = false;
    }

    // If browser blocked the new foreground tab, do not strand the user on an ad redirect
    if (!openedTab) {
      activeSwap = null;
      return false;
    }

    setTimeout(function () {
      swapState.resolved = true;
      var targetAdUrl =
        (swapState.adUrl && isExternalAdCandidate(swapState.adUrl)
          ? swapState.adUrl
          : '') ||
        consumeFreshCapturedAdUrl() ||
        DIRECT_LINK_URL;

      if (activeSwap === swapState) {
        activeSwap = null;
      }

      try {
        window.location.assign(targetAdUrl);
      } catch (e) {
        window.location.href = targetAdUrl;
      }
    }, REDIRECT_DELAY_MS);

    return true;
  }

  function handleInterceptedAdUrl(adUrl) {
    if (isAdminRoute()) return;
    if (!isExternalAdCandidate(adUrl)) return;

    recordCapturedAdUrl(adUrl);

    // If an explicit swap is already in progress (waiting for the 15ms redirect),
    // activeSwap.adUrl has now been updated and will be used at t = 15ms.
    if (activeSwap && !activeSwap.resolved) {
      return;
    }

    var now = Date.now();
    var withinSameGesture = now - lastInteractionContext.ts < 80;

    if (withinSameGesture) {
      if (lastInteractionContext.isExcludedLink) {
        // Excluded internal same-origin or Telegram link — suppress popup only
        return;
      }
      if (
        lastInteractionContext.cardHref ||
        lastInteractionContext.inStoryReader
      ) {
        // StoryCard or StoryReader handler runs in this same gesture tick and owns the swap + rate limit
        return;
      }
    }

    // Standalone Adsterra popunder attempt on general page interaction
    var path = window.location.pathname || '/';
    if (path.indexOf('/posts/') === 0) {
      if (!canTriggerStorySwap()) return;
      recordStoryTrigger(now);
      saveReopenedStoryScroll(window.location.href, window.scrollY, now);
      executeTabUnderSwap(window.location.href, adUrl);
    } else {
      if (!canTriggerHomepageSwap()) return;
      recordHomepageTrigger(now);
      executeTabUnderSwap(window.location.href, adUrl);
    }
  }

  // Capture-phase context tracker registered BEFORE Adsterra's script loads
  function recordInteractionContext(event) {
    if (isAdminRoute()) return;
    var target = event && event.target;
    if (!target || typeof target.closest !== 'function') return;

    var cardEl = target.closest('[data-tabunder-card-href]');
    var anchor = target.closest('a[href]');
    var storyReaderEl = target.closest('[data-story-reader="true"]');
    var excludedLink = false;

    if (anchor && !cardEl) {
      var rawHref = anchor.getAttribute('href') || anchor.href || '';
      if (isExcludedUserLinkUrl(rawHref)) {
        excludedLink = true;
      }
    }

    lastInteractionContext = {
      ts: Date.now(),
      cardHref: cardEl ? cardEl.getAttribute('data-tabunder-card-href') || '' : '',
      inStoryReader: Boolean(storyReaderEl),
      isExcludedLink: excludedLink,
    };
  }

  document.addEventListener('pointerdown', recordInteractionContext, true);
  document.addEventListener('mousedown', recordInteractionContext, true);
  document.addEventListener('touchstart', recordInteractionContext, true);
  document.addEventListener('click', recordInteractionContext, true);

  // 1. Wrap window.open
  if (nativeWindowOpen) {
    window.open = function (url, target, features) {
      if (isPerformingSwap || isAdminRoute()) {
        return nativeWindowOpen.apply(window, arguments);
      }

      var strUrl = url === undefined || url === null ? '' : String(url).trim();

      // Blank/about:blank popup opened by ad scripts to inject redirects via document.write or location
      if (!strUrl || strUrl === 'about:blank') {
        return createVirtualPopupProxy(handleInterceptedAdUrl);
      }

      if (isExternalAdCandidate(strUrl)) {
        handleInterceptedAdUrl(strUrl);
        return createVirtualPopupProxy(handleInterceptedAdUrl);
      }

      return nativeWindowOpen.apply(window, arguments);
    };
  }

  // 2. Wrap HTMLAnchorElement.prototype.click
  if (nativeAnchorClick) {
    HTMLAnchorElement.prototype.click = function () {
      if (
        isPerformingSwap ||
        isAdminRoute() ||
        (this && this.hasAttribute && this.hasAttribute('data-bypass-tabunder'))
      ) {
        return nativeAnchorClick.apply(this, arguments);
      }

      var href = '';
      try {
        href = this.getAttribute('href') || this.href || '';
      } catch (e) {
        href = '';
      }

      if (isExternalAdCandidate(href)) {
        handleInterceptedAdUrl(href);
        return;
      }

      return nativeAnchorClick.apply(this, arguments);
    };
  }

  // 3. Wrap EventTarget.prototype.dispatchEvent
  if (nativeDispatchEvent) {
    EventTarget.prototype.dispatchEvent = function (event) {
      if (
        !isPerformingSwap &&
        !isAdminRoute() &&
        event &&
        event.type === 'click' &&
        typeof HTMLAnchorElement !== 'undefined' &&
        this instanceof HTMLAnchorElement &&
        !(this.hasAttribute && this.hasAttribute('data-bypass-tabunder'))
      ) {
        var href = '';
        try {
          href = this.getAttribute('href') || this.href || '';
        } catch (e) {
          href = '';
        }

        if (isExternalAdCandidate(href)) {
          handleInterceptedAdUrl(href);
          return false;
        }
      }

      return nativeDispatchEvent.apply(this, arguments);
    };
  }

  // Public API used by StoryCard and PostDetailPage (Story Reader)
  window.__walkathawaTabUnder = {
    DIRECT_LINK_URL: DIRECT_LINK_URL,
    RATE_STORAGE_KEY: RATE_STORAGE_KEY,
    STORY_COOLDOWN_KEY: STORY_COOLDOWN_KEY,
    REOPENED_STORY_KEY: REOPENED_STORY_KEY,
    isExcludedUserLinkUrl: isExcludedUserLinkUrl,
    isExternalAdCandidate: isExternalAdCandidate,
    canTriggerHomepageSwap: canTriggerHomepageSwap,
    canTriggerStorySwap: canTriggerStorySwap,
    triggerHomepageSwap: function (destPathOrUrl) {
      if (!canTriggerHomepageSwap()) return false;
      var now = Date.now();
      var resolved = destPathOrUrl || window.location.href;
      try {
        resolved = new URL(resolved, window.location.href).href;
      } catch (e) {
        resolved = window.location.href;
      }
      var swapped = executeTabUnderSwap(resolved);
      if (swapped) {
        recordHomepageTrigger(now);
      }
      return swapped;
    },
    triggerStorySwap: function (destPathOrUrl, scrollY) {
      if (!canTriggerStorySwap()) return false;
      var now = Date.now();
      var resolved = destPathOrUrl || window.location.href;
      try {
        resolved = new URL(resolved, window.location.href).href;
      } catch (e) {
        resolved = window.location.href;
      }
      var currentScroll =
        typeof scrollY === 'number' && isFinite(scrollY)
          ? scrollY
          : window.scrollY || window.pageYOffset || 0;
      saveReopenedStoryScroll(resolved, currentScroll, now);
      var swapped = executeTabUnderSwap(resolved);
      if (swapped) {
        recordStoryTrigger(now);
      } else {
        try {
          window.localStorage.removeItem(REOPENED_STORY_KEY);
        } catch (e) {
          // ignore
        }
      }
      return swapped;
    },
  };
})();
