// script.js - fallback for invalid JS
window.addEventListener('DOMContentLoaded', function() {
  const msg = document.createElement('div');
  msg.style.background = '#fee2e2';
  msg.style.color = '#b91c1c';
  msg.style.padding = '1.2em 2em';
  msg.style.borderRadius = '8px';
  msg.style.margin = '2em auto';
  msg.style.maxWidth = '600px';
  msg.style.fontWeight = 'bold';
  msg.style.fontSize = '1.1em';
  msg.style.textAlign = 'center';
  msg.textContent = '⚠️ This app\'s JavaScript failed to generate correctly and is not running. Please try regenerating or contact support.';
  document.body.prepend(msg);
});
