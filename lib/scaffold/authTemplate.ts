// lib/scaffold/authTemplate.ts
// Static auth.js — emitted as a shared asset in every HTML multi-page site.
// Pages load this BEFORE script.js to get getAuthToken, requireAuth, logout,
// updateNavForAuth, and a delegated [data-action="logout"] click handler.

export const AUTH_JS_TEMPLATE = `// auth.js — BuildFlow Shared Auth Helpers
// Load BEFORE script.js on every page.
(function () {
  function _getToken() { return localStorage.getItem('auth_token'); }
  function _getUser() {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch (e) { return null; }
  }
  function _isExpired() {
    var t = _getToken();
    if (!t) return true;
    try {
      var parts = t.split('.');
      if (parts.length < 2) return false;
      var payload = JSON.parse(atob(parts[1]));
      return !!payload.exp && (Date.now() / 1000 > payload.exp);
    } catch (e) { return false; }
  }

  window.getAuthToken = _getToken;
  window.getAuthUser = _getUser;

  window.requireAuth = function (redirect) {
    if (!_getToken() || _isExpired()) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = redirect || 'login.html';
      return false;
    }
    return true;
  };

  window.logout = function () {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = 'index.html';
  };

  window.updateNavForAuth = function () {
    var user = _getUser();
    document.querySelectorAll('[data-auth="guest"]').forEach(function (el) {
      el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('[data-auth="user"]').forEach(function (el) {
      el.style.display = user ? '' : 'none';
    });
    var nameEl = document.getElementById('nav-user-name');
    if (nameEl && user) nameEl.textContent = user.name || user.email || '';
  };

  // Sync JWT expiry + Supabase session (if _sb is available on the page)
  async function _refreshSession() {
    if (typeof window._sb !== 'undefined') {
      try {
        var result = await window._sb.auth.getSession();
        var session = result && result.data && result.data.session;
        if (session) {
          localStorage.setItem('auth_token', session.access_token);
          localStorage.setItem('auth_user', JSON.stringify(session.user));
        }
      } catch (e) { /* ignore */ }
    }
    // Evict expired JWT regardless of source
    if (_isExpired()) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    window.updateNavForAuth();
  }

  document.addEventListener('DOMContentLoaded', _refreshSession);

  // Re-check on tab focus — handles multi-tab login/logout and token expiry
  window.addEventListener('focus', _refreshSession);

  // Delegated logout button handler — any element with data-action="logout"
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-action="logout"]');
    if (btn) window.logout();
  });
})();
`;
