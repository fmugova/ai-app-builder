import {
  validateJavaScript,
  validateHTML,
  validateCSS,
  validateGeneratedCode,
  isCodeComplete,
} from './code-validator';

// ============================================================================
// JavaScript Validation Tests
// ============================================================================
describe('JavaScript Validation', () => {
  it('Valid JavaScript should pass', () => {
    const code = [
      'const greeting = "Hello World";',
      'console.log(greeting);',
      '',
      'function greet(name) {',
      '  return "Hello, " + name + "!";',
      '}',
    ].join('\n');
    const errors = validateJavaScript(code);
    expect(errors.length).toBe(0);
  });

  it('Incomplete function should fail', () => {
    const code = [
      'function greet() {',
      '  console.log("Hello");',
      '// Missing closing brace',
    ].join('\n');
    const errors = validateJavaScript(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Syntax error should fail', () => {
    const code = [
      'const x = 5',
      'const y = 10',
      'console.log(x y)',
    ].join('\n');
    const errors = validateJavaScript(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Unmatched brackets should fail', () => {
    const code = [
      'const arr = [1, 2, 3;',
      '// Wrong closing bracket',
    ].join('\n');
    const errors = validateJavaScript(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Empty JavaScript should pass', () => {
    const code = '';
    const errors = validateJavaScript(code);
    expect(errors.length).toBe(0);
  });
});

// ============================================================================
// HTML Validation Tests
// ============================================================================
describe('HTML Validation', () => {
  it('Valid HTML should pass', () => {
    const code = [
      '<div class="container">',
      '  <h1>Hello World</h1>',
      '  <p>This is a paragraph.</p>',
      '</div>',
    ].join('\n');
    const errors = validateHTML(code);
    expect(errors.length).toBe(0);
  });

  it('Empty HTML should fail', () => {
    const code = '';
    const errors = validateHTML(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Truncated HTML should fail', () => {
    const code = [
      '<div class="container">',
      '  <h1>Hello World</h1>',
      '  <p>This is a para',
    ].join('\n');
    const errors = validateHTML(code);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CSS Validation Tests
// ============================================================================
describe('CSS Validation', () => {
  it('Valid CSS should pass', () => {
    const code = [
      '.container {',
      '  max-width: 1200px;',
      '  margin: 0 auto;',
      '}',
      '',
      '.button {',
      '  background-color: blue;',
      '  color: white;',
      '}',
    ].join('\n');
    const errors = validateCSS(code);
    expect(errors.length).toBe(0);
  });

  it('Unmatched braces should fail', () => {
    const code = [
      '.container {',
      '  max-width: 1200px;',
      '// Missing closing brace',
    ].join('\n');
    const errors = validateCSS(code);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('Empty CSS should pass', () => {
    const code = '';
    const errors = validateCSS(code);
    expect(errors.length).toBe(0);
  });
});

// ============================================================================
// Complete Validation Tests
// ============================================================================
describe('Complete Validation', () => {
  it('Complete valid code should pass', () => {
    const code = {
      html: '<div><h1>Hello</h1></div>',
      css: '.container { padding: 20px; }',
      js: 'console.log("Hello");',
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBe(100);
  });

  it('Invalid JavaScript should fail complete validation', () => {
    const code = {
      html: '<div><h1>Hello</h1></div>',
      css: '.container { padding: 20px; }',
      js: 'function test() { console.log("test"',  // Missing closing
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Completeness Check Tests
// ============================================================================
describe('Completeness Check', () => {
  it('Complete HTML should pass', () => {
    const code = '<div><h1>Hello</h1></div>';
    const result = isCodeComplete(code, 'html');
    expect(result).toBe(true);
  });

  it('Incomplete HTML should fail', () => {
    const code = '<div><h1>Hello';
    const result = isCodeComplete(code, 'html');
    expect(result).toBe(false);
  });

  it('Complete JavaScript should pass', () => {
    const code = 'const x = 5; console.log(x);';
    const result = isCodeComplete(code, 'js');
    expect(result).toBe(true);
  });

  it('Incomplete JavaScript should fail', () => {
    const code = 'function test() { console.log("test")';
    const result = isCodeComplete(code, 'js');
    expect(result).toBe(false);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================
describe('Real-World Scenarios', () => {
  it('Wellness app with valid code', () => {
    const code = {
      html: [
        '<div class="wellness-app">',
        '  <header>',
        '    <h1>Wellness Tracker</h1>',
        '  </header>',
        '  <main>',
        '    <div class="tracker">',
        '      <h2>How are you feeling today?</h2>',
        '      <div class="emoji-picker">',
        '        <button>😊</button>',
        '        <button>😐</button>',
        '        <button>😔</button>',
        '      </div>',
        '    </div>',
        '  </main>',
        '</div>',
      ].join('\n'),
      css: [
        '.wellness-app {',
        '  max-width: 800px;',
        '  margin: 0 auto;',
        '  padding: 20px;',
        '}',
        '',
        '.emoji-picker button {',
        '  font-size: 32px;',
        '  padding: 10px;',
        '  margin: 5px;',
        '  border: none;',
        '  background: transparent;',
        '  cursor: pointer;',
        '}',
      ].join('\n'),
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:", button.textContent);',
        '  });',
        '});',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(true);
    expect(result.validationScore).toBeGreaterThanOrEqual(90);
  });

  it('Wellness app with incomplete JavaScript', () => {
    const code = {
      html: '<div class="wellness-app"><h1>Wellness Tracker</h1></div>',
      css: '.wellness-app { padding: 20px; }',
      js: [
        'document.querySelectorAll(".emoji-picker button").forEach(button => {',
        '  button.addEventListener("click", () => {',
        '    console.log("Mood selected:"',
      ].join('\n'),
    };
    const result = validateGeneratedCode(code);
    expect(result.validationPassed).toBe(false);
    expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    expect(result.validationScore).toBeLessThan(100);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================