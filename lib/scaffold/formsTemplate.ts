// lib/scaffold/formsTemplate.ts
// Static forms.js — injected as a shared asset in every HTML multi-page site.
// Provides inline field validation, preventing silent failures on contact/auth forms.

export const FORMS_JS_TEMPLATE = `// forms.js — BuildFlow Form Validation Helpers
// Load BEFORE script.js. Provides: validateField, showFieldError, clearFieldError, validateForm.
(function () {
  window.showFieldError = function (input, message) {
    window.clearFieldError(input);
    input.classList.add('border-red-500', 'ring-1', 'ring-red-500');
    input.classList.remove('border-gray-300');
    var err = document.createElement('p');
    err.className = '_bf-ferr text-red-500 text-xs mt-1';
    err.textContent = message;
    input.insertAdjacentElement('afterend', err);
  };

  window.clearFieldError = function (input) {
    input.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
    input.classList.add('border-gray-300');
    var next = input.nextElementSibling;
    if (next && next.classList.contains('_bf-ferr')) next.remove();
  };

  window.validateField = function (input) {
    window.clearFieldError(input);
    var val = input.value.trim();
    if (input.required && !val) {
      window.showFieldError(input, input.dataset.errorRequired || 'This field is required.');
      return false;
    }
    if (input.type === 'email' && val && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val)) {
      window.showFieldError(input, 'Please enter a valid email address.');
      return false;
    }
    if (input.minLength > 0 && val && val.length < input.minLength) {
      window.showFieldError(input, 'Must be at least ' + input.minLength + ' characters.');
      return false;
    }
    if (input.type === 'password' && input.dataset.minLength) {
      var min = parseInt(input.dataset.minLength, 10);
      if (val.length < min) {
        window.showFieldError(input, 'Password must be at least ' + min + ' characters.');
        return false;
      }
    }
    return true;
  };

  // Returns true if every required/typed field in the form passes
  window.validateForm = function (form) {
    var fields = Array.from(form.querySelectorAll('input, textarea, select'));
    return fields.map(function (f) {
      return (f.required || f.type === 'email') ? window.validateField(f) : true;
    }).every(Boolean);
  };

  // Live validation: validate on blur so errors appear as the user leaves each field
  document.addEventListener('blur', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
      if (t.closest('form') && (t.required || t.type === 'email')) window.validateField(t);
    }
  }, true);
})();
`;
