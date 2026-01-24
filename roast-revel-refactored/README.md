# Roast & Revel Refactored

## Structure

- `index.html`: Clean, semantic HTML. No inline event handlers or styles. CSP-compliant.
- `styles.css`: Comprehensive, accessible, and responsive CSS. Includes utility classes, animation, and reduced motion support.
- `script.js`: Modular JavaScript using classes for state, UI, and controllers. No global scope pollution. All event handling, validation, and rendering is secure and enterprise-grade.

## Features
- Enterprise-grade security (CSP, XSS prevention, no inline JS/styles)
- Accessibility (ARIA, keyboard navigation, reduced motion)
- Modern architecture (class-based, modular, event delegation)
- Resilient error handling and user feedback (toasts, loading states)
- Performance optimizations (debounced search, lazy event binding)

## Usage
Open `index.html` in a browser. All logic and styles are loaded from `script.js` and `styles.css`.

---

*This project is a reference implementation for enterprise web app standards.*
