// lib/scaffold/toastTemplate.ts
// Static toast.js — injected as a shared asset in every HTML multi-page site.
// Replaces alert() / inline success-div patterns with a consistent toast UI.

export const TOAST_JS_TEMPLATE = `// toast.js — BuildFlow Toast Notifications
// Load BEFORE script.js. Provides: showToast(message, type, duration)
// type: 'success' | 'error' | 'info' | 'warning'
(function () {
  var _C = {
    success: { bg: '#dcfce7', border: '#86efac', text: '#166534', icon: '\\u2713' },
    error:   { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: '\\u2715' },
    info:    { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', icon: '\\u2139' },
    warning: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', icon: '\\u26a0' },
  };

  function _container() {
    var el = document.getElementById('_bf-toasts');
    if (!el) {
      el = document.createElement('div');
      el.id = '_bf-toasts';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'false');
      el.style.cssText = [
        'position:fixed', 'top:1rem', 'right:1rem', 'z-index:9999',
        'display:flex', 'flex-direction:column', 'gap:0.5rem',
        'max-width:360px', 'pointer-events:none',
      ].join(';');
      document.body.appendChild(el);
    }
    return el;
  }

  window.showToast = function (message, type, duration) {
    type = (type && _C[type]) ? type : 'info';
    duration = duration || 4000;
    var theme = _C[type];
    var toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'background:' + theme.bg,
      'border:1px solid ' + theme.border,
      'color:' + theme.text,
      'padding:0.75rem 1rem',
      'border-radius:0.625rem',
      'font-size:0.875rem',
      'font-family:inherit',
      'display:flex',
      'align-items:center',
      'gap:0.5rem',
      'pointer-events:auto',
      'box-shadow:0 2px 12px rgba(0,0,0,0.12)',
      'transition:opacity 0.3s ease,transform 0.3s ease',
      'opacity:0',
      'transform:translateX(1rem)',
    ].join(';');
    toast.innerHTML =
      '<span style="font-weight:700;flex-shrink:0">' + theme.icon + '</span>' +
      '<span>' + message + '</span>';

    _container().appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(1rem)';
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, duration);
  };
})();
`;
