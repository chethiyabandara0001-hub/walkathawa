(function () {
  if (typeof window === 'undefined') return;
  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var COOLDOWN_KEY = 'walkathawa_story_popunder_last_ts_v1';
  var SCROLL_KEY = 'walkathawa_reopened_story';
  var CAPTURED_AD_URL_KEY = 'walkathawa_last_ad_url_v1';
  var COOLDOWN_MS = 10000; // 1 popunder trigger per every 10 seconds
  var FALLBACK_AD_URL = 'https://asiaso.org/4/d7afdde7726388c479952a1f7b637033';

  var origWindowOpen = window.open;
  var origAnchorClick = HTMLAnchorElement.prototype.click;
  var origDispatchEvent = EventTarget.prototype.dispatchEvent;

  window.__origWindowOpen = origWindowOpen;

  var lastClickedInternalUrl = null;
  var lastClickedInternalTs = 0;
  var swapInProgress = false;

  function getLastTriggerTs() {
    try {
      var raw = localStorage.getItem(COOLDOWN_KEY);
      var parsed = raw ? parseInt(raw, 10) : 0;
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      return 0;
    }
  }

  function setLastTriggerTs(ts) {
    try {
      localStorage.setItem(COOLDOWN_KEY, String(ts));
    } catch (e) {
      // ignore storage errors
    }
  }

  function isCooldownReady() {
    var now = Date.now();
    var last = getLastTriggerTs();
    return now - last >= COOLDOWN_MS;
  }

  function saveCapturedAdUrl(url) {
    if (!url || typeof url !== 'string') return;
    window.__lastCapturedAdUrl = url;
    try {
      localStorage.setItem(CAPTURED_AD_URL_KEY, url);
    } catch (e) {
      // ignore
    }
  }

  function getBestAdUrl(candidateUrl) {
    if (candidateUrl && isExternalAdUrl(candidateUrl)) {
      saveCapturedAdUrl(candidateUrl);
      return candidateUrl;
    }
    if (window.__lastCapturedAdUrl && isExternalAdUrl(window.__lastCapturedAdUrl)) {
      return window.__lastCapturedAdUrl;
    }
    try {
      var saved = localStorage.getItem(CAPTURED_AD_URL_KEY);
      if (saved && isExternalAdUrl(saved)) return saved;
    } catch (e) {
      // ignore
    }
    return FALLBACK_AD_URL;
  }

  function isExternalAdUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    var trimmed = rawUrl.trim();
    if (!trimmed || trimmed === 'about:blank' || trimmed.indexOf('javascript:') === 0) {
      return false;
    }
    try {
      var parsed = new URL(trimmed, window.location.origin);
      if (parsed.origin === window.location.origin) return false;
      var host = parsed.hostname.toLowerCase();
      // Exclude official user-facing links or Google Auth popups
      if (
        host === 't.me' ||
        host === 'telegram.me' ||
        host.endsWith('.t.me') ||
        host.endsWith('google.com') ||
        host.endsWith('googleapis.com') ||
        host.endsWith('firebaseapp.com')
      ) {
        return false;
      }
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function resolveInternalDestinationUrl(explicitDest) {
    if (explicitDest && typeof explicitDest === 'string') {
      try {
        return new URL(explicitDest, window.location.origin).href;
      } catch (e) {
        // fallback below
      }
    }
    if (lastClickedInternalUrl && Date.now() - lastClickedInternalTs < 1200) {
      return lastClickedInternalUrl;
    }
    return window.location.href;
  }

  function saveScrollPositionForReopen(targetUrl, explicitScrollY) {
    try {
      var targetPath = new URL(targetUrl, window.location.origin).pathname;
      var currentPath = window.location.pathname;
      var scrollY =
        typeof explicitScrollY === 'number'
          ? explicitScrollY
          : targetPath === currentPath
          ? window.scrollY || 0
          : 0;
      localStorage.setItem(
        SCROLL_KEY,
        JSON.stringify({
          path: targetPath,
          scrollY: scrollY,
          ts: Date.now(),
        })
      );
    } catch (e) {
      // ignore storage errors
    }
  }

  function executeTabUnderSwap(adUrl, explicitSiteDestUrl, explicitScrollY) {
    if (swapInProgress) return false;
    if (!isCooldownReady()) return false;

    var finalAdUrl = getBestAdUrl(adUrl);
    if (!finalAdUrl) return false;

    var siteDestUrl = resolveInternalDestinationUrl(explicitSiteDestUrl);
    var now = Date.now();

    // Save scroll position and timestamp before opening new tab so the new tab inherits both
    saveScrollPositionForReopen(siteDestUrl, explicitScrollY);
    setLastTriggerTs(now);

    // 1. Open the site back in a new foreground browser tab
    var newTab = null;
    try {
      newTab = origWindowOpen.call(window, siteDestUrl, '_blank');
    } catch (e) {
      newTab = null;
    }

    if (!newTab) {
      // If window.open was blocked (e.g. non-gesture timer), revert cooldown so the next touch/click fires immediately
      setLastTriggerTs(now - COOLDOWN_MS);
      return false;
    }

    swapInProgress = true;

    // 2. Redirect the current/same site tab to the popunder ad link
    setTimeout(function () {
      try {
        window.location.assign(finalAdUrl);
      } catch (e) {
        window.location.href = finalAdUrl;
      }
    }, 15);

    return true;
  }

  // Expose helper for React components (StoryCard / PostDetailPage)
  window.__triggerWalkathawaTabUnder = function (destPathOrUrl, scrollY) {
    if (!isCooldownReady()) return false;
    return executeTabUnderSwap(null, destPathOrUrl, scrollY);
  };

  // Track internal link clicks so if Adsterra intercepts the click first, we know which page the user wanted to open in the new tab
  document.addEventListener(
    'click',
    function (e) {
      var target = e.target;
      while (target && target !== document && target.tagName !== 'A') {
        target = target.parentNode;
      }
      if (target && target.tagName === 'A' && target.href) {
        try {
          var parsed = new URL(target.href, window.location.origin);
          if (parsed.origin === window.location.origin) {
            lastClickedInternalUrl = parsed.href;
            lastClickedInternalTs = Date.now();
          }
        } catch (err) {
          // ignore
        }
      }
    },
    true
  );

  function createFakePopupProxy() {
    var proxyLoc = {
      _href: 'about:blank',
      assign: function (u) {
        if (isExternalAdUrl(u)) {
          saveCapturedAdUrl(u);
          executeTabUnderSwap(u);
        }
      },
      replace: function (u) {
        if (isExternalAdUrl(u)) {
          saveCapturedAdUrl(u);
          executeTabUnderSwap(u);
        }
      },
    };
    Object.defineProperty(proxyLoc, 'href', {
      get: function () {
        return this._href;
      },
      set: function (u) {
        this._href = u;
        if (isExternalAdUrl(u)) {
          saveCapturedAdUrl(u);
          executeTabUnderSwap(u);
        }
      },
    });

    return {
      closed: false,
      focus: function () {},
      blur: function () {},
      close: function () {
        this.closed = true;
      },
      location: proxyLoc,
      document: {
        open: function () {},
        write: function (html) {
          if (typeof html === 'string') {
            var m = html.match(/https?:\/\/[^\s"'<>]+/i);
            if (m && isExternalAdUrl(m[0])) {
              saveCapturedAdUrl(m[0]);
              executeTabUnderSwap(m[0]);
            }
          }
        },
        close: function () {},
      },
    };
  }

  // Wrap window.open to intercept Adsterra popunder calls
  window.open = function (url, target, features) {
    var strUrl = url ? String(url) : '';

    // Allow Firebase / Google OAuth popups to work normally
    if (
      strUrl.indexOf('accounts.google.com') !== -1 ||
      strUrl.indexOf('firebaseapp.com/__/auth') !== -1 ||
      (target && String(target).indexOf('firebase') !== -1)
    ) {
      return origWindowOpen.apply(window, arguments);
    }

    if (isExternalAdUrl(strUrl)) {
      saveCapturedAdUrl(strUrl);
      executeTabUnderSwap(strUrl);
      return createFakePopupProxy();
    }

    if (!strUrl || strUrl === 'about:blank') {
      return createFakePopupProxy();
    }

    return origWindowOpen.apply(window, arguments);
  };

  // Wrap HTMLAnchorElement.prototype.click to intercept synthetic ad link clicks
  HTMLAnchorElement.prototype.click = function () {
    var href = this.href ? String(this.href) : '';
    if (isExternalAdUrl(href)) {
      saveCapturedAdUrl(href);
      executeTabUnderSwap(href);
      return;
    }
    return origAnchorClick.apply(this, arguments);
  };

  // Wrap EventTarget.prototype.dispatchEvent to intercept synthetic MouseEvents on external ad anchors
  EventTarget.prototype.dispatchEvent = function (evt) {
    if (
      this &&
      this.tagName === 'A' &&
      this.href &&
      evt &&
      (evt.type === 'click' || evt.type === 'mousedown' || evt.type === 'mouseup')
    ) {
      var href = String(this.href);
      if (isExternalAdUrl(href)) {
        saveCapturedAdUrl(href);
        executeTabUnderSwap(href);
        return true;
      }
    }
    return origDispatchEvent.apply(this, arguments);
  };
})();
