// lib/scaffold/appScaffold.ts
// Shared JS module for web app / tool / utility HTML sites.
// Injected when detectScaffoldType() returns 'app'.
// Provides: toast notifications, modal system, localStorage CRUD,
//           form validation, and a simple pub/sub event bus.

// ── app.js template ───────────────────────────────────────────────────────────

export const APP_JS_TEMPLATE = `// ============================================================
// app.js — BuildFlow Web App Module
// Toast notifications, modal system, localStorage CRUD,
// form validation helpers, and a lightweight event bus.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

// ── Toast notifications ───────────────────────────────────────────────────────

var _toastContainer = null;

function _getToastContainer() {
  if (_toastContainer) return _toastContainer;
  _toastContainer = document.createElement('div');
  _toastContainer.id = 'bf-toasts';
  _toastContainer.setAttribute('aria-live', 'polite');
  _toastContainer.setAttribute('aria-atomic', 'false');
  document.body.appendChild(_toastContainer);
  _injectToastStyles();
  return _toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} [type='info']
 * @param {number} [duration=3500] ms before auto-dismiss (0 = sticky)
 */
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration === undefined ? 3500 : duration;

  var container = _getToastContainer();
  var toast = document.createElement('div');
  toast.className = 'bf-toast bf-toast--' + type;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML =
    '<span class="bf-toast__icon">' + (icons[type] || 'ℹ') + '</span>' +
    '<span class="bf-toast__msg">' + _escapeHtml(message) + '</span>' +
    '<button class="bf-toast__close" aria-label="Dismiss">×</button>';

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { toast.classList.add('bf-toast--visible'); });
  });

  toast.querySelector('.bf-toast__close').addEventListener('click', function() {
    _dismissToast(toast);
  });

  if (duration > 0) {
    setTimeout(function() { _dismissToast(toast); }, duration);
  }

  return toast;
}

function _dismissToast(toast) {
  toast.classList.remove('bf-toast--visible');
  toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _injectToastStyles() {
  if (document.getElementById('bf-toast-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-toast-styles';
  s.textContent = [
    '#bf-toasts{position:fixed;bottom:1.25rem;right:1.25rem;z-index:99998;',
      'display:flex;flex-direction:column;gap:.5rem;pointer-events:none;max-width:360px}',
    '.bf-toast{display:flex;align-items:center;gap:.625rem;padding:.625rem .875rem;',
      'border-radius:.625rem;font-size:.875rem;line-height:1.4;pointer-events:all;',
      'background:#1f2937;color:#f9fafb;box-shadow:0 4px 14px rgba(0,0,0,.25);',
      'opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease}',
    '.bf-toast--visible{opacity:1;transform:translateY(0)}',
    '.bf-toast--success{background:#065f46;color:#d1fae5}',
    '.bf-toast--error{background:#7f1d1d;color:#fee2e2}',
    '.bf-toast--warning{background:#78350f;color:#fef3c7}',
    '.bf-toast__icon{font-size:1rem;line-height:1;shrink:0}',
    '.bf-toast__msg{flex:1}',
    '.bf-toast__close{background:transparent;border:none;cursor:pointer;',
      'color:inherit;opacity:.6;font-size:1.1rem;line-height:1;padding:0 0 0 .25rem}',
    '.bf-toast__close:hover{opacity:1}',
    '@media(max-width:480px){#bf-toasts{left:1rem;right:1rem;max-width:none}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Modal system ──────────────────────────────────────────────────────────────

/**
 * Open a modal by its ID.
 * The modal element must have: id="modal-{id}" and class="bf-modal"
 * The backdrop must have:       class="bf-modal-backdrop" inside the modal
 * A close button can have:      data-close-modal or class="bf-modal-close"
 */
function openModal(id) {
  var modal = document.getElementById('modal-' + id) || document.getElementById(id);
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _injectModalStyles();

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { modal.classList.add('bf-modal--open'); });
  });

  // Trap focus
  var focusable = modal.querySelectorAll(
    'button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length) focusable[0].focus();

  // Close on backdrop click
  modal.addEventListener('click', function handler(e) {
    if (e.target === modal || e.target.classList.contains('bf-modal-backdrop')) {
      closeModal(id);
      modal.removeEventListener('click', handler);
    }
  });
}

function closeModal(id) {
  var modal = document.getElementById('modal-' + id) || document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('bf-modal--open');
  modal.addEventListener('transitionend', function handler() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.removeEventListener('transitionend', handler);
  }, { once: true });
}

function _injectModalStyles() {
  if (document.getElementById('bf-modal-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-modal-styles';
  s.textContent = [
    '.bf-modal{display:none;position:fixed;inset:0;z-index:9999;',
      'align-items:center;justify-content:center}',
    '.bf-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6)}',
    '.bf-modal__panel{position:relative;z-index:1;background:#fff;border-radius:1rem;',
      'padding:1.5rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;',
      'box-shadow:0 20px 60px rgba(0,0,0,.3);',
      'opacity:0;transform:scale(.96) translateY(8px);',
      'transition:opacity .2s ease,transform .2s ease}',
    '.bf-modal--open .bf-modal__panel{opacity:1;transform:scale(1) translateY(0)}',
    '@media(prefers-color-scheme:dark){.bf-modal__panel{background:#1f2937;color:#f9fafb}}',
    '@media(max-width:540px){.bf-modal__panel{margin:1rem;max-width:calc(100vw - 2rem)}}',
  ].join('');
  document.head.appendChild(s);
}

// Close modals with data-close-modal buttons (delegated)
document.addEventListener('click', function(e) {
  if (e.target.matches('[data-close-modal]') || e.target.matches('.bf-modal-close')) {
    var modal = e.target.closest('.bf-modal');
    if (modal) closeModal(modal.id);
  }
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var open = document.querySelector('.bf-modal--open');
    if (open) closeModal(open.id);
  }
});

// ── localStorage CRUD helpers ─────────────────────────────────────────────────

/**
 * Get a value from localStorage (parsed JSON).
 * Returns defaultValue if key is missing or JSON is invalid.
 */
function lsGet(key, defaultValue) {
  try {
    var raw = localStorage.getItem(key);
    return raw === null ? (defaultValue !== undefined ? defaultValue : null) : JSON.parse(raw);
  } catch(e) { return defaultValue !== undefined ? defaultValue : null; }
}

/** Set a value in localStorage (serialised as JSON). */
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e) { return false; }
}

/** Remove a key from localStorage. */
function lsRemove(key) {
  localStorage.removeItem(key);
}

/** Clear all BuildFlow-prefixed keys (bf_*) from localStorage. */
function lsClear() {
  Object.keys(localStorage)
    .filter(function(k) { return k.startsWith('bf_'); })
    .forEach(function(k) { localStorage.removeItem(k); });
}

// ── Form validation ───────────────────────────────────────────────────────────

/**
 * Validate a form element.
 * Returns { valid: boolean, errors: { fieldName: errorMessage } }
 * Reads rules from data attributes on input/select/textarea elements:
 *   data-required="true"
 *   data-min-length="8"
 *   data-max-length="100"
 *   data-pattern="^[0-9]+$"
 *   data-match="otherFieldId"  (value must match another field's value)
 *   data-label="Email address" (used in error messages)
 */
function validateForm(form) {
  var errors = {};
  var fields = form.querySelectorAll('[name]');

  fields.forEach(function(field) {
    var name  = field.name;
    var value = field.value.trim();
    var label = field.dataset.label || name;

    if (field.dataset.required === 'true' && !value) {
      errors[name] = label + ' is required.';
      return;
    }
    if (!value) return; // skip further checks if empty and not required

    var minLen = parseInt(field.dataset.minLength || '0', 10);
    if (minLen && value.length < minLen) {
      errors[name] = label + ' must be at least ' + minLen + ' characters.';
      return;
    }

    var maxLen = parseInt(field.dataset.maxLength || '0', 10);
    if (maxLen && value.length > maxLen) {
      errors[name] = label + ' must be at most ' + maxLen + ' characters.';
      return;
    }

    if (field.dataset.pattern) {
      var re = new RegExp(field.dataset.pattern);
      if (!re.test(value)) {
        errors[name] = field.dataset.patternMessage || (label + ' format is invalid.');
        return;
      }
    }

    if (field.dataset.match) {
      var other = form.querySelector('#' + field.dataset.match);
      if (other && other.value !== field.value) {
        errors[name] = label + ' does not match.';
        return;
      }
    }
  });

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

/**
 * Show inline validation errors next to fields.
 * Looks for a sibling element with class "field-error" next to each input.
 * Creates one if it doesn't exist.
 */
function showFormErrors(form, errors) {
  // Clear previous errors
  form.querySelectorAll('.field-error').forEach(function(el) { el.textContent = ''; });

  Object.keys(errors).forEach(function(name) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) return;
    var errEl = field.parentElement
      ? field.parentElement.querySelector('.field-error')
      : null;
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'field-error';
      errEl.style.cssText = 'color:#ef4444;font-size:.8125rem;margin:.25rem 0 0;';
      field.insertAdjacentElement('afterend', errEl);
    }
    errEl.textContent = errors[name];
  });

  // Focus the first invalid field
  var firstName = Object.keys(errors)[0];
  if (firstName) {
    var first = form.querySelector('[name="' + firstName + '"]');
    if (first) first.focus();
  }
}

// ── Lightweight event bus ─────────────────────────────────────────────────────

var _listeners = {};

/** Subscribe to an event. Returns an unsubscribe function. */
function on(event, handler) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(handler);
  return function() {
    _listeners[event] = _listeners[event].filter(function(h) { return h !== handler; });
  };
}

/** Publish an event with optional data. */
function emit(event, data) {
  (_listeners[event] || []).forEach(function(h) {
    try { h(data); } catch(e) { console.error('bf:bus error', e); }
  });
}

/** Subscribe once — auto-unsubscribes after first call. */
function once(event, handler) {
  var unsub = on(event, function(data) {
    unsub();
    handler(data);
  });
  return unsub;
}

// ── Loading state helpers ─────────────────────────────────────────────────────

/**
 * Set a button into loading state.
 * Saves original text so restoreButton() can restore it.
 */
function setButtonLoading(btn, loadingText) {
  loadingText = loadingText || 'Loading...';
  btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  btn.classList.add('btn--loading');
}

/** Restore a button from loading state. */
function restoreButton(btn, newText) {
  btn.disabled = false;
  btn.textContent = newText || btn.dataset.originalText || 'Submit';
  btn.classList.remove('btn--loading');
  delete btn.dataset.originalText;
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
// Nothing to auto-init — all functions are utilities called by page scripts.
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const APP_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🛠  APP SCAFFOLD — APPLY FOR ALL WEB APP / TOOL / UTILITY SITES
════════════════════════════════════════════════════════════════════

When app.js is included, these utilities are available globally.
Pages MUST NOT redeclare any function defined here.

**Script load order:**
\`\`\`html
<script src="app.js"></script>     <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Toast notifications:**
\`\`\`javascript
showToast('Saved!', 'success');           // green
showToast('Something failed', 'error');   // red
showToast('Check your input', 'warning'); // amber
showToast('Item created', 'info');        // dark (default)
showToast('Sticky message', 'info', 0);  // 0 = never auto-dismiss
\`\`\`

**Modal system — HTML structure:**
\`\`\`html
<div id="modal-confirm" class="bf-modal" aria-hidden="true">
  <div class="bf-modal-backdrop"></div>
  <div class="bf-modal__panel" role="dialog" aria-modal="true">
    <h2>Confirm delete</h2>
    <p>Are you sure? This can't be undone.</p>
    <div class="modal-actions">
      <button data-close-modal>Cancel</button>
      <button id="confirm-delete-btn">Delete</button>
    </div>
  </div>
</div>
\`\`\`
\`\`\`javascript
openModal('confirm');   // opens #modal-confirm
closeModal('confirm');  // closes it
\`\`\`

**localStorage CRUD:**
\`\`\`javascript
lsSet('bf_tasks', tasks);         // save (JSON serialised)
var tasks = lsGet('bf_tasks', []); // load (default = [])
lsRemove('bf_tasks');              // delete one key
lsClear();                         // delete all bf_* keys
\`\`\`

**Form validation:**
\`\`\`html
<form id="my-form">
  <input name="email" data-required="true" data-label="Email"
         data-pattern="^[^@]+@[^@]+\\.[^@]+$" data-pattern-message="Enter a valid email">
  <input name="password" data-required="true" data-min-length="8" data-label="Password">
  <input name="confirm" data-match="password" data-label="Password confirmation">
</form>
\`\`\`
\`\`\`javascript
var result = validateForm(document.getElementById('my-form'));
if (!result.valid) {
  showFormErrors(document.getElementById('my-form'), result.errors);
  return;
}
// Proceed with valid data
\`\`\`

**Button loading state:**
\`\`\`javascript
var btn = document.getElementById('save-btn');
setButtonLoading(btn, 'Saving...');
// ... async work ...
restoreButton(btn, 'Saved!'); // or restoreButton(btn) to restore original text
\`\`\`

**Event bus (cross-component communication):**
\`\`\`javascript
var unsub = on('task:created', function(task) { renderTask(task); });
emit('task:created', { id: 1, title: 'New task' });
once('app:ready', function() { console.log('ready once'); });
unsub(); // stop listening
\`\`\`

**MANDATORY for app/tool pages:**
- Use showToast() for ALL user feedback (save, delete, error) — no alert()
- Use validateForm() on every form before submission
- Use lsSet/lsGet for all client-side persistence
- Use setButtonLoading/restoreButton on any async submit button
- Use openModal/closeModal for confirmation dialogs
`;
