// lib/scaffold/consentTemplate.ts
// Static consent.js — GDPR / UK ICO compliant cookie consent banner.
// Auto-injected on ecommerce sites and any site with analytics configured.
// Fires 'consent:accepted' / 'consent:declined' events for analytics.js.

export const CONSENT_JS_TEMPLATE = `// consent.js \u2014 BuildFlow Cookie Consent Module
(function() {
  'use strict';
  var STORAGE_KEY = 'bf_consent';
  var BANNER_ID   = 'bf-consent-banner';
  var MODAL_ID    = 'bf-consent-modal';

  var DEFAULT_PREFS = { necessary: true, analytics: false, marketing: false, decided: false };

  function getPrefs() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return stored ? Object.assign({}, DEFAULT_PREFS, stored) : Object.assign({}, DEFAULT_PREFS);
    } catch(e) { return Object.assign({}, DEFAULT_PREFS); }
  }
  function savePrefs(prefs) { prefs.decided = true; localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }
  function hasDecided() { return getPrefs().decided === true; }
  function dispatch(type, prefs) {
    document.dispatchEvent(new CustomEvent('consent:' + type, { detail: prefs }));
    document.dispatchEvent(new CustomEvent('consent:updated', { detail: prefs }));
  }

  window.BFConsent = {
    getPrefs: getPrefs,
    analyticsAllowed: function() { return getPrefs().analytics === true; },
    marketingAllowed: function() { return getPrefs().marketing === true; },
    openModal: openModal,
    reset: function() { localStorage.removeItem(STORAGE_KEY); renderBanner(); },
  };

  function injectStyles() {
    if (document.getElementById('bf-consent-styles')) return;
    var s = document.createElement('style'); s.id = 'bf-consent-styles';
    s.textContent = '#' + BANNER_ID + '{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -4px 24px rgba(0,0,0,.1);padding:1.25rem 1.5rem;display:flex;flex-wrap:wrap;gap:1rem;align-items:center;font-family:system-ui,-apple-system,sans-serif;font-size:.875rem;line-height:1.5;color:#374151;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)}'
      + '#' + BANNER_ID + '.bf-visible{transform:translateY(0)}'
      + '#' + BANNER_ID + ' .bf-text{flex:1;min-width:220px}'
      + '#' + BANNER_ID + ' .bf-text strong{display:block;font-size:.9375rem;font-weight:600;color:#111827;margin-bottom:.25rem}'
      + '#' + BANNER_ID + ' .bf-text a{color:#6366f1;text-decoration:underline;cursor:pointer}'
      + '#' + BANNER_ID + ' .bf-actions{display:flex;gap:.5rem;flex-wrap:wrap;flex-shrink:0}'
      + '.bf-btn{padding:.5rem 1.125rem;border-radius:9999px;font-size:.8125rem;font-weight:600;cursor:pointer;border:none;transition:.15s ease;white-space:nowrap}'
      + '.bf-btn-accept{background:#6366f1;color:#fff}.bf-btn-accept:hover{background:#4f46e5}'
      + '.bf-btn-decline{background:transparent;color:#6b7280;border:1.5px solid #d1d5db}.bf-btn-decline:hover{border-color:#9ca3af;color:#374151}'
      + '.bf-btn-manage{background:transparent;color:#6366f1;border:1.5px solid #a5b4fc}.bf-btn-manage:hover{background:#eef2ff}'
      + '#' + MODAL_ID + '-overlay{display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:1rem}'
      + '#' + MODAL_ID + '-overlay.bf-open{display:flex}'
      + '#' + MODAL_ID + '{background:#fff;border-radius:16px;max-width:480px;width:100%;padding:1.75rem;font-family:system-ui,-apple-system,sans-serif;font-size:.875rem;color:#374151;line-height:1.6;max-height:90vh;overflow-y:auto}'
      + '#' + MODAL_ID + ' h2{font-size:1.125rem;font-weight:700;color:#111827;margin-bottom:.5rem}'
      + '#' + MODAL_ID + ' p{margin-bottom:1.25rem;color:#6b7280}'
      + '#' + MODAL_ID + ' .bf-category{border:1px solid #e5e7eb;border-radius:10px;padding:1rem;margin-bottom:.75rem}'
      + '#' + MODAL_ID + ' .bf-category-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem}'
      + '#' + MODAL_ID + ' .bf-category-header strong{font-weight:600;color:#111827;font-size:.9375rem}'
      + '#' + MODAL_ID + ' .bf-category p{font-size:.8125rem;margin:0;color:#9ca3af}'
      + '.bf-toggle{position:relative;width:38px;height:22px;flex-shrink:0}'
      + '.bf-toggle input{opacity:0;width:0;height:0;position:absolute}'
      + '.bf-toggle-track{position:absolute;inset:0;background:#d1d5db;border-radius:9999px;transition:.2s;cursor:pointer}'
      + '.bf-toggle input:checked + .bf-toggle-track{background:#6366f1}'
      + '.bf-toggle input:disabled + .bf-toggle-track{opacity:.5;cursor:not-allowed}'
      + '.bf-toggle-track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}'
      + '.bf-toggle input:checked + .bf-toggle-track::after{transform:translateX(16px)}'
      + '#' + MODAL_ID + ' .bf-modal-footer{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.25rem;flex-wrap:wrap}'
      + '.bf-cookie-settings-link{color:#6366f1;text-decoration:underline;cursor:pointer;font-size:.8125rem;background:none;border:none;padding:0;font-family:inherit}'
      + '.bf-btn:focus-visible,.bf-toggle input:focus-visible + .bf-toggle-track,.bf-cookie-settings-link:focus-visible{outline:2px solid #6366f1;outline-offset:2px}';
    document.head.appendChild(s);
  }

  function renderBanner() {
    removeBanner(); injectStyles();
    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = '<div class="bf-text"><strong>\uD83C\uDF6A We use cookies</strong>We use essential cookies to make our site work. With your consent, we also use analytics cookies to improve your experience. <a onclick="window.BFConsent&&window.BFConsent.openModal()" tabindex="0" role="button">Manage preferences</a>.</div>'
      + '<div class="bf-actions"><button class="bf-btn bf-btn-manage" id="bf-btn-manage">Manage</button><button class="bf-btn bf-btn-decline" id="bf-btn-decline">Decline</button><button class="bf-btn bf-btn-accept" id="bf-btn-accept">Accept all</button></div>';
    document.body.appendChild(banner);
    requestAnimationFrame(function() { requestAnimationFrame(function() { banner.classList.add('bf-visible'); }); });
    banner.querySelector('#bf-btn-accept').addEventListener('click', acceptAll);
    banner.querySelector('#bf-btn-decline').addEventListener('click', declineAll);
    banner.querySelector('#bf-btn-manage').addEventListener('click', openModal);
  }
  function removeBanner() { var el = document.getElementById(BANNER_ID); if (el) el.remove(); }
  function hideBanner() {
    var b = document.getElementById(BANNER_ID); if (!b) return;
    b.classList.remove('bf-visible');
    setTimeout(function() { if (b.parentNode) b.remove(); }, 400);
  }

  function openModal() {
    if (document.getElementById(MODAL_ID + '-overlay')) {
      document.getElementById(MODAL_ID + '-overlay').classList.add('bf-open'); return;
    }
    injectStyles();
    var prefs = getPrefs();
    var overlay = document.createElement('div');
    overlay.id = MODAL_ID + '-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bf-modal-title');
    overlay.innerHTML = '<div id="' + MODAL_ID + '">'
      + '<h2 id="bf-modal-title">Cookie preferences</h2>'
      + '<p>Choose which cookies you allow. You can change your choice at any time via the Cookie settings link in the footer.</p>'
      + '<div class="bf-category"><div class="bf-category-header"><strong>Strictly necessary</strong><label class="bf-toggle" title="Always active"><input type="checkbox" checked disabled aria-label="Always active"><span class="bf-toggle-track"></span></label></div><p>Required for the site to function. Cannot be disabled.</p></div>'
      + '<div class="bf-category"><div class="bf-category-header"><strong>Analytics</strong><label class="bf-toggle"><input type="checkbox" id="bf-toggle-analytics"' + (prefs.analytics ? ' checked' : '') + ' aria-label="Analytics cookies"><span class="bf-toggle-track"></span></label></div><p>Help us understand how visitors use the site. No personal data shared with third parties.</p></div>'
      + '<div class="bf-category"><div class="bf-category-header"><strong>Marketing</strong><label class="bf-toggle"><input type="checkbox" id="bf-toggle-marketing"' + (prefs.marketing ? ' checked' : '') + ' aria-label="Marketing cookies"><span class="bf-toggle-track"></span></label></div><p>Allow us to show relevant advertising on other sites.</p></div>'
      + '<div class="bf-modal-footer"><button class="bf-btn bf-btn-decline" id="bf-modal-decline">Decline all</button><button class="bf-btn bf-btn-accept" id="bf-modal-save">Save preferences</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('bf-open'); });
    var firstFocus = overlay.querySelector('button, input');
    if (firstFocus) firstFocus.focus();
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', _escModal);
    overlay.querySelector('#bf-modal-decline').addEventListener('click', function() { declineAll(); closeModal(); });
    overlay.querySelector('#bf-modal-save').addEventListener('click', function() {
      var updated = { necessary: true,
        analytics: overlay.querySelector('#bf-toggle-analytics').checked,
        marketing: overlay.querySelector('#bf-toggle-marketing').checked };
      savePrefs(updated);
      dispatch(updated.analytics || updated.marketing ? 'accepted' : 'declined', updated);
      hideBanner(); closeModal();
    });
  }
  function closeModal() {
    var el = document.getElementById(MODAL_ID + '-overlay'); if (el) el.remove();
    document.removeEventListener('keydown', _escModal);
  }
  function _escModal(e) { if (e.key === 'Escape') closeModal(); }

  function acceptAll() {
    var p = { necessary: true, analytics: true, marketing: true };
    savePrefs(p); dispatch('accepted', p); hideBanner();
  }
  function declineAll() {
    var p = { necessary: true, analytics: false, marketing: false };
    savePrefs(p); dispatch('declined', p); hideBanner();
  }

  function injectSettingsLink() {
    var footer = document.querySelector('footer');
    if (!footer || footer.querySelector('.bf-cookie-settings-link')) return;
    var p = footer.querySelector('p');
    var link = document.createElement('button');
    link.className = 'bf-cookie-settings-link'; link.textContent = 'Cookie settings';
    link.setAttribute('aria-label', 'Open cookie preferences');
    link.addEventListener('click', function() { window.BFConsent.openModal(); });
    if (p) { p.appendChild(document.createTextNode(' \u00B7 ')); p.appendChild(link); }
    else { var np = document.createElement('p'); np.style.cssText = 'text-align:center;margin-top:.75rem'; np.appendChild(link); footer.appendChild(np); }
  }

  document.addEventListener('DOMContentLoaded', function() {
    injectSettingsLink();
    if (hasDecided()) {
      var p = getPrefs();
      if (p.analytics || p.marketing) dispatch('accepted', p);
      return;
    }
    setTimeout(renderBanner, 600);
  });
})();
`;
