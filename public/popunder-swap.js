(function () {
  'use strict';

  var POPUNDER_SCRIPT_SRC =
    'https://ahuramazda.org/1/cd7964982d4480e37f1acf703b21759d';
  var SOCIAL_BAR_SCRIPT_SRC =
    'https://brijmohan.org/14/8620570ee06989031f1fe9b1dcd8f15f';

  var MAX_ADS_PER_WINDOW = 2;
  var WINDOW_MS = 10000;
  var INTERACTION_WINDOW_MS = 2000;
  var SCROLL_RESTORE_TTL_MS = 5 * 60 * 1000;

  var RATE_LIMIT_KEY = 'wk_popunder_window_v1';
  var SCROLL_STATE_KEY = 'wk_popunder_scroll_v1';

  var CRAWLER_UA_REGEX =
    /googlebot|google-inspectiontool|googleother|storebot-google|adsbot-google|mediapartners-google|google-extended|google-agent|bingbot|msnbot|adidxbot|bingpreview|yandex(?:bot|images|mobilebot|accessibilitybot)?|duckduckbot|baiduspider|slurp|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|slackbot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|chatgpt-user|claude-user|perplexitybot|perplexity-user|ccbot|meta-externalfetcher|firecrawlagent|mistralai-user|kimi-user|lighthouse|chrome-lighthouse|headlesschrome|phantomjs|selenium|puppeteer|playwright|crawler|spider|bot\b/i;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  function isAdminPath(pathname) {
    var p = String(pathname || window.location.pathname || '').toLowerCase();
    return p === '/admin' || p.indexOf('/admin/') === 0;
  }

  function isCrawlerOrAutomated() {
    try {
      if (navigator && navigator.webdriver === true) return true;
      var ua = (navigator && navigator.userAgent) || '';
      if (CRAWLER_UA_REGEX.test(ua)) return true;
    } catch (_e) {
      // ignore navigator access errors
    }
    return false;
  }

  // Client-side gate: exit immediately for crawlers, webdriver, or /admin
  if (isCrawlerOrAutomated() || isAdminPath()) {
    return;
  }

  if (window.__wkPopunderSwapInitialized) {
    return;
  }
  window.__wkPopunderSwapInitialized = true;

  var nativeOpen =
    typeof window.open === 'function' ? window.open.bind(window) : null;
  var lastTrustedInteractionAt = 0;
  var lastCapturedAdUrl = '';
  var lastClickedStoryUrl = '';
  var swapInProgress = false;

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_e) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_e) {
      // ignore quota / private mode errors
    }
  }

  function safeRemoveStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_e) {
      // ignore
    }
  }

  function extractStorySlug(rawUrl) {
    try {
      var parsed = new URL(rawUrl || window.location.href, window.location.origin);
      var clean = parsed.pathname.replace(/\/+$/, '');
      if (clean.indexOf('/posts/') !== 0) return null;
      var slug = clean.slice('/posts/'.length);
      if (!slug || slug.indexOf('/') !== -1) return null;
      return decodeURIComponent(slug);
    } catch (_e) {
      return null;
    }
  }

  function isExternalHttpUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
      var parsed = new URL(rawUrl, window.location.origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      return parsed.origin !== window.location.origin;
    } catch (_e) {
      return false;
    }
  }

  function isWithinTrustedInteraction(now) {
    if (!lastTrustedInteractionAt) return false;
    var delta = now - lastTrustedInteractionAt;
    return delta >= 0 && delta <= INTERACTION_WINDOW_MS;
  }

  function consumeRateLimitSlot(now) {
    var list = [];
    var raw = safeGetStorage(RATE_LIMIT_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed.filter(function (ts) {
            return (
              typeof ts === 'number' &&
              isFinite(ts) &&
              now - ts >= 0 &&
              now - ts < WINDOW_MS
            );
          });
        }
      } catch (_e) {
        list = [];
      }
    }

    if (list.length >= MAX_ADS_PER_WINDOW) {
      safeSetStorage(RATE_LIMIT_KEY, JSON.stringify(list));
      return false;
    }

    list.push(now);
    safeSetStorage(RATE_LIMIT_KEY, JSON.stringify(list));
    return true;
  }

  function saveScrollState(storyUrl) {
    var currentSlug = extractStorySlug(window.location.href);
    var targetSlug = extractStorySlug(storyUrl);
    var slugToSave = targetSlug || currentSlug || '';
    var scrollY =
      targetSlug && currentSlug && targetSlug !== currentSlug
        ? 0
        : Math.max(
            0,
            Math.round(
              window.scrollY ||
                window.pageYOffset ||
                (document.documentElement && document.documentElement.scrollTop) ||
                0
            )
          );

    var payload = {
      slug: slugToSave,
      path: (function () {
        try {
          return new URL(storyUrl || window.location.href, window.location.origin)
            .pathname;
        } catch (_e) {
          return window.location.pathname;
        }
      })(),
      scrollY: scrollY,
      ts: Date.now(),
    };
    safeSetStorage(SCROLL_STATE_KEY, JSON.stringify(payload));
  }

  function restoreSavedScrollIfMatching() {
    if (isAdminPath()) return;
    var raw = safeGetStorage(SCROLL_STATE_KEY);
    if (!raw) return;
    var saved = null;
    try {
      saved = JSON.parse(raw);
    } catch (_e) {
      safeRemoveStorage(SCROLL_STATE_KEY);
      return;
    }
    if (!saved || typeof saved.scrollY !== 'number') {
      safeRemoveStorage(SCROLL_STATE_KEY);
      return;
    }
    if (!saved.ts || Date.now() - saved.ts > SCROLL_RESTORE_TTL_MS) {
      safeRemoveStorage(SCROLL_STATE_KEY);
      return;
    }

    var currentSlug = extractStorySlug(window.location.href);
    var currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    var savedPath = String(saved.path || '').replace(/\/+$/, '') || '/';
    var slugMatches = Boolean(saved.slug && currentSlug && saved.slug === currentSlug);
    var pathMatches = savedPath === currentPath;

    if (!slugMatches && !pathMatches) return;

    var targetY = Math.max(0, Math.round(saved.scrollY));
    safeRemoveStorage(SCROLL_STATE_KEY);
    if (targetY <= 0) return;

    var applyScroll = function () {
      try {
        window.scrollTo(0, targetY);
      } catch (_e) {
        // ignore
      }
    };

    applyScroll();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(applyScroll);
    }
    setTimeout(applyScroll, 120);
    setTimeout(applyScroll, 450);
  }

  function injectAdScriptsOnce() {
    if (isAdminPath() || isCrawlerOrAutomated()) return;

    if (
      document.head &&
      !document.querySelector(
        'script[src="' + POPUNDER_SCRIPT_SRC + '"], script[data-ad-script="popunder"]'
      )
    ) {
      var popScript = document.createElement('script');
      popScript.setAttribute('data-cfasync', 'false');
      popScript.setAttribute('data-ad-script', 'popunder');
      popScript.src = POPUNDER_SCRIPT_SRC;
      popScript.async = true;
      document.head.appendChild(popScript);
    }

    var injectSocialBar = function () {
      if (isAdminPath() || isCrawlerOrAutomated() || !document.body) return;
      if (
        !document.querySelector(
          'script[src="' +
            SOCIAL_BAR_SCRIPT_SRC +
            '"], script[data-ad-script="social-bar"]'
        )
      ) {
        var socialScript = document.createElement('script');
        socialScript.setAttribute('data-cfasync', 'false');
        socialScript.setAttribute('data-ad-script', 'social-bar');
        socialScript.src = SOCIAL_BAR_SCRIPT_SRC;
        socialScript.async = true;
        document.body.appendChild(socialScript);
      }
    };

    if (document.body) {
      injectSocialBar();
    } else {
      document.addEventListener('DOMContentLoaded', injectSocialBar, { once: true });
    }
  }

  function executePopunderSwap(storyUrl, adUrl) {
    if (swapInProgress || isAdminPath() || isCrawlerOrAutomated()) {
      return false;
    }

    var now = Date.now();
    if (!isWithinTrustedInteraction(now)) {
      return false;
    }

    if (!consumeRateLimitSlot(now)) {
      return false;
    }

    var targetStoryUrl = storyUrl || window.location.href;
    var targetAdUrl = adUrl || lastCapturedAdUrl || POPUNDER_SCRIPT_SRC;

    swapInProgress = true;
    saveScrollState(targetStoryUrl);

    var opened = null;
    try {
      if (nativeOpen) {
        opened = nativeOpen(targetStoryUrl, '_blank');
      }
    } catch (_e) {
      opened = null;
    }

    try {
      window.location.href = targetAdUrl;
    } catch (_e) {
      // ignore navigation error
    }

    setTimeout(function () {
      swapInProgress = false;
    }, 300);

    return Boolean(opened || true);
  }

  // Record trusted user interactions within the last 2 seconds
  var TRUSTED_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];
  TRUSTED_EVENTS.forEach(function (evtName) {
    window.addEventListener(
      evtName,
      function (ev) {
        if (ev && ev.isTrusted) {
          lastTrustedInteractionAt = Date.now();
        }
      },
      true
    );
  });

  // Intercept external popup attempts from the ad network and perform tab swap
  if (nativeOpen) {
    try {
      window.open = function (url, target, features) {
        if (
          !isAdminPath() &&
          !isCrawlerOrAutomated() &&
          isExternalHttpUrl(url)
        ) {
          lastCapturedAdUrl = url;
          var now = Date.now();
          if (isWithinTrustedInteraction(now)) {
            var storyTarget = lastClickedStoryUrl || window.location.href;
            var swapped = executePopunderSwap(storyTarget, url);
            if (swapped) {
              return null;
            }
          }
          // Block unprompted or rate-limited external popups
          return null;
        }
        return nativeOpen(url, target, features);
      };
    } catch (_e) {
      // ignore if window.open is non-writable
    }
  }

  // Trigger swap on story card clicks or story reader clicks
  document.addEventListener(
    'click',
    function (event) {
      if (!event || !event.isTrusted) return;
      if (event.defaultPrevented) return;
      if (event.button && event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (isAdminPath() || isCrawlerOrAutomated()) return;

      var targetEl = event.target;
      if (!targetEl || typeof targetEl.closest !== 'function') return;

      // Never hijack form controls, header nav controls, or admin links
      if (
        targetEl.closest(
          'header, footer, nav, form, input, textarea, select, [data-no-popunder="true"]'
        )
      ) {
        return;
      }

      var link = targetEl.closest('a[href]');
      if (link) {
        var href = link.getAttribute('href') || '';
        if (isAdminPath(href)) return;

        var linkedSlug = extractStorySlug(href);
        if (linkedSlug) {
          var fullStoryUrl = new URL(href, window.location.origin).href;
          lastClickedStoryUrl = fullStoryUrl;
          lastTrustedInteractionAt = Date.now();
          if (executePopunderSwap(fullStoryUrl, lastCapturedAdUrl || POPUNDER_SCRIPT_SRC)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
        return;
      }

      // Reader click inside an active story page (/posts/:slug)
      var currentSlug = extractStorySlug(window.location.href);
      if (currentSlug && targetEl.closest('article') && !targetEl.closest('button')) {
        var currentStoryUrl = window.location.href;
        lastClickedStoryUrl = currentStoryUrl;
        lastTrustedInteractionAt = Date.now();
        executePopunderSwap(currentStoryUrl, lastCapturedAdUrl || POPUNDER_SCRIPT_SRC);
      }
    },
    true
  );

  // Restore scroll position on load and after SPA navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSavedScrollIfMatching, {
      once: true,
    });
  } else {
    restoreSavedScrollIfMatching();
  }
  window.addEventListener('load', restoreSavedScrollIfMatching, { once: true });
  window.addEventListener('popstate', restoreSavedScrollIfMatching);

  // Inject Popunder (<head>) + Social Bar (<body>) once per public page
  injectAdScriptsOnce();
})();
