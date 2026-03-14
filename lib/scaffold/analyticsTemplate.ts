// lib/scaffold/analyticsTemplate.ts
// Optional analytics module — injected only when an AnalyticsConfig is present.
// Supports Plausible and Fathom (both cookieless, no EU consent required when
// used without fingerprinting). Respects consent.js if present on the page.

export interface AnalyticsConfig {
  provider: 'plausible' | 'fathom'
  domain: string        // e.g. 'mycakesite.com'
  fathomSiteId?: string // required for Fathom, e.g. 'ABCDEFGH'
}

// Template variables substituted by buildAnalyticsJs():
//   __ANALYTICS_PROVIDER__  → 'plausible' | 'fathom'
//   __ANALYTICS_DOMAIN__    → e.g. 'mycakesite.com'
//   __FATHOM_SITE_ID__      → e.g. 'ABCDEFGH'
export const ANALYTICS_JS_TEMPLATE = `// analytics.js \u2014 BuildFlow Analytics Module
(function() {
  'use strict';
  var PROVIDER  = '__ANALYTICS_PROVIDER__';
  var DOMAIN    = '__ANALYTICS_DOMAIN__';
  var FATHOM_ID = '__FATHOM_SITE_ID__';
  var _loaded = false;
  var _queue  = [];

  window.BFAnalytics = {
    track: function(name, props) {
      if (!_loaded) { _queue.push({ name: name, props: props }); return; }
      _trackEvent(name, props);
    },
    isLoaded: function() { return _loaded; },
  };

  function loadPlausible() {
    if (document.querySelector('script[data-domain="' + DOMAIN + '"]')) return;
    var s = document.createElement('script');
    s.defer = true; s.setAttribute('data-domain', DOMAIN);
    s.src = 'https://plausible.io/js/script.js';
    s.onload = _onLoad; document.head.appendChild(s);
  }
  function loadFathom() {
    if (document.getElementById('fathom-script')) return;
    var s = document.createElement('script');
    s.id = 'fathom-script'; s.defer = true; s.setAttribute('data-site', FATHOM_ID);
    s.src = 'https://cdn.usefathom.com/script.js';
    s.onload = _onLoad; document.head.appendChild(s);
  }
  function _onLoad() {
    _loaded = true;
    _queue.forEach(function(e) { _trackEvent(e.name, e.props); });
    _queue = [];
  }
  function _trackEvent(name, props) {
    try {
      if (PROVIDER === 'plausible' && window.plausible) {
        window.plausible(name, props ? { props: props } : undefined);
      } else if (PROVIDER === 'fathom' && window.fathom) {
        window.fathom.trackEvent(name);
      }
    } catch(e) {}
  }
  function activate() {
    if (_loaded) return;
    if (PROVIDER === 'plausible') loadPlausible();
    else if (PROVIDER === 'fathom') loadFathom();
  }
  function init() {
    var consentPresent = !!(window.BFConsent);
    if (consentPresent) {
      if (window.BFConsent.analyticsAllowed()) activate();
      document.addEventListener('consent:accepted', function(e) { if (e.detail && e.detail.analytics) activate(); });
    } else {
      activate();
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
`;

/** Substitutes the three template placeholders with real config values. */
export function buildAnalyticsJs(config: AnalyticsConfig): string {
  return ANALYTICS_JS_TEMPLATE
    .replace("'__ANALYTICS_PROVIDER__'", `'${config.provider}'`)
    .replace("'__ANALYTICS_DOMAIN__'",   `'${config.domain}'`)
    .replace("'__FATHOM_SITE_ID__'",     `'${config.fathomSiteId ?? ''}'`)
}
