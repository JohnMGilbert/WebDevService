(() => {
  const analyticsKey = "truePageAnalyticsVisitorId";
  const sessionKey = "truePageAnalyticsSessionId";
  const ignoredPathPattern = /^\/(?:admin|client)(?:\/|$)/;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  const shouldSkip = () => {
    const doNotTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1";
    return doNotTrack || localHosts.has(window.location.hostname) || ignoredPathPattern.test(window.location.pathname);
  };

  const randomId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `tp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getStoredId = (storage, key) => {
    try {
      let value = storage.getItem(key);

      if (!value) {
        value = randomId();
        storage.setItem(key, value);
      }

      return value;
    } catch {
      return randomId();
    }
  };

  const referrerHost = () => {
    if (!document.referrer) {
      return "";
    }

    try {
      const referrerUrl = new URL(document.referrer);
      return referrerUrl.hostname === window.location.hostname ? "" : referrerUrl.hostname;
    } catch {
      return "";
    }
  };

  const buildEvent = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      visitorId: getStoredId(localStorage, analyticsKey),
      sessionId: getStoredId(sessionStorage, sessionKey),
      pagePath: `${window.location.pathname}${window.location.search}`,
      pageTitle: document.title,
      pageUrl: window.location.href,
      referrer: document.referrer,
      referrerHost: referrerHost(),
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmTerm: params.get("utm_term") || "",
      utmContent: params.get("utm_content") || "",
      userAgent: navigator.userAgent,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen?.width || null,
      screenHeight: window.screen?.height || null,
    };
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });

  const ensureDatabase = async () => {
    if (window.truePageDatabase?.isConfigured) {
      return window.truePageDatabase;
    }

    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    await loadScript("/config/supabase-config.js");
    await loadScript("/config/supabase-client.js");

    return window.truePageDatabase?.isConfigured ? window.truePageDatabase : null;
  };

  const sendPageView = async () => {
    if (shouldSkip()) {
      return;
    }

    try {
      const database = await ensureDatabase();

      if (!database) {
        return;
      }

      await database.trackPageView(buildEvent());
    } catch {
      // Analytics should never affect the page experience.
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendPageView, { once: true });
    return;
  }

  sendPageView();
})();
