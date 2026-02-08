# Single-File SPA vs Multi-File Projects

This document explains how BuildFlow AI determines whether to generate a **single-file SPA** (all pages in one HTML file) or **multi-file project** (separate HTML files).

## 🎯 Quick Decision Matrix

| User Request | Output Type | Example |
|-------------|-------------|---------|
| "Create a portfolio" | **Single-File SPA** ✅ | One HTML with home/about/contact sections |
| "Build a dashboard" | **Single-File SPA** ✅ | One HTML with sidebar navigation |
| "Make a restaurant site" | **Single-File SPA** ✅ | One HTML with menu/contact pages |
| "Create separate HTML files" | **Multi-File Project** 📄 | index.html, about.html, contact.html |
| "Generate index.html and about.html" | **Multi-File Project** 📄 | Separate files with links |

---

## 📋 Type A: Single-File SPA (Default)

**When used:**
- User doesn't mention file structure
- User says "on one HTML file", "in one file", "all in one"
- User says "NOT as separate files"
- **DEFAULT for 95% of requests**

**Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- Navigation -->
  <nav>
    <button class="nav-item" data-page="page-home">Home</button>
    <button class="nav-item" data-page="page-about">About</button>
    <button class="nav-item" data-page="page-contact">Contact</button>
  </nav>

  <!-- Page 1: Home -->
  <!-- PAGE: home -->
  <div id="page-home" class="page">
    <h1>Welcome Home</h1>
    <!-- Content -->
  </div>
  <!-- /PAGE -->

  <!-- Page 2: About -->
  <!-- PAGE: about -->
  <div id="page-about" class="page hidden">
    <h1>About Us</h1>
    <!-- Content -->
  </div>
  <!-- /PAGE -->

  <!-- Page 3: Contact -->
  <!-- PAGE: contact -->
  <div id="page-contact" class="page hidden">
    <h1>Contact</h1>
    <!-- Content -->
  </div>
  <!-- /PAGE -->

  <script>
    // JavaScript navigation - show/hide pages
    function showPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      document.getElementById(pageId).classList.remove('hidden');
    }
  </script>
</body>
</html>
```

**Features:**
- ✅ All pages in ONE HTML file
- ✅ JavaScript show/hide navigation
- ✅ Fast page switching (no reload)
- ✅ Shared navigation/footer/scripts
- ✅ Easier to deploy (single file)

**Detection Indicators:**
- Contains `<!-- PAGE: slug -->` delimiters
- Has `class="page"` divs with `id="page-*"`
- Includes `showPage()` function
- Multiple `.page.hidden` elements

---

## 📄 Type B: Multi-File Project (Explicit Request)

**When used:**
- User **explicitly** says "separate files", "multiple HTML files"
- User says "create index.html, about.html, contact.html"
- User wants "individual pages" or "as separate pages"

**Structure:**
```
## index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Home - My Site</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <nav>
    <a href="index.html" class="active">Home</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
  </nav>

  <main>
    <h1>Welcome Home</h1>
    <!-- Content -->
  </main>
</body>
</html>

## about.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>About - My Site</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <nav>
    <a href="index.html">Home</a>
    <a href="about.html" class="active">About</a>
    <a href="contact.html">Contact</a>
  </nav>

  <main>
    <h1>About Us</h1>
    <!-- Content -->
  </main>
</body>
</html>

## contact.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact - My Site</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <nav>
    <a href="index.html">Home</a>
    <a href="about.html">About</a>
    <a href="contact.html" class="active">Contact</a>
  </nav>

  <main>
    <h1>Contact Us</h1>
    <!-- Content -->
  </main>
</body>
</html>
```

**Features:**
- ✅ Each page is a complete HTML file
- ✅ Traditional HTML links (`<a href="*.html">`)
- ✅ Better for SEO (separate URLs)
- ✅ Standard web structure
- ❌ More files to manage
- ❌ Page reloads on navigation

**Detection Indicators:**
- Starts with `## filename.html`
- Contains links like `<a href="about.html">`
- Multiple complete HTML documents
- Multiple `<!DOCTYPE>` declarations

---

## 🔍 Auto-Detection Logic

### Parser Detection (`detectPageStructure()`)

The parser automatically detects the structure type:

```typescript
export function detectPageStructure(html: string): {
  type: 'SINGLE_FILE_SPA' | 'MULTI_FILE' | 'SINGLE_PAGE'
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
}
```

**Detection Process:**

1. **Check for Single-File SPA indicators:**
   - `<!-- PAGE: slug -->` comments
   - `<div id="page-*" class="page">` structure
   - `showPage()` function
   - `.page.hidden` classes

2. **Check for Multi-File indicators:**
   - `## filename.html` markers
   - `<a href="*.html">` links
   - Multiple `<html>` tags
   - Multiple complete documents

3. **Fallback to Single Page** if neither detected

### Prompt Analysis (`detectUserIntent()`)

Analyzes user's prompt to determine intent:

```typescript
export function detectUserIntent(prompt: string): {
  wantsSingleFile: boolean
  confidence: 'high' | 'medium' | 'low'
  keywords: string[]
}
```

**Keywords Detected:**

**Single-File SPA:**
- "on one html file"
- "in one file"
- "single file"
- "all in one"
- "not separate files"
- "keep in one"

**Multi-File:**
- "separate files"
- "separate html"
- "multiple files"
- "individual files"
- "as separate pages"

---

## 📝 Examples

### Example 1: Default Single-File SPA
**Prompt:** *"Create a developer portfolio with home, projects, about, and contact pages"*

**Detection:**
- No file structure keywords mentioned
- Defaults to **Single-File SPA**
- Generates one HTML with 4 page sections

---

### Example 2: Explicit Single-File Request
**Prompt:** *"Create a developer portfolio with home, projects, about, and contact pages on one HTML file"*

**Detection:**
- Keyword: "on one HTML file"
- Confidence: **High**
- Type: **Single-File SPA**

---

### Example 3: Explicit Multi-File Request
**Prompt:** *"Create separate HTML files for home, about, and contact pages"*

**Detection:**
- Keyword: "separate HTML files"
- Confidence: **High**
- Type: **Multi-File Project**
- Generates: index.html, about.html, contact.html

---

### Example 4: Ambiguous Request
**Prompt:** *"Build a restaurant website"*

**Detection:**
- No file keywords
- Defaults to **Single-File SPA**
- More common and easier to deploy

---

## 🛠️ Implementation Details

### System Prompt Enhancement

The system prompt now includes:
- Clear TYPE A vs TYPE B distinction
- Decision guide at the top
- Example prompts for each type
- Explicit default behavior

### Parser Enhancement

Enhanced `multi-page-parser.ts` with:
- `detectPageStructure()` - Auto-detect structure type
- `detectUserIntent()` - Analyze user's prompt
- `extractMultipleFiles()` - Parse multi-file format
- Backwards compatible with existing code

### Code Parser Integration

The code parser (`code-parser.ts`) remains unchanged and works with both types:
- Single-file SPA → Extracts pages from delimiters
- Multi-file → Extracts each complete HTML file

---

## ✅ Best Practices

### For Users

**Want a single-file app (default)?**
- Just describe your app: "Create a portfolio"
- Or be explicit: "Build a dashboard on one HTML file"

**Want separate HTML files?**
- Be explicit: "Create separate HTML files for each page"
- Or specific: "Generate index.html, about.html, and contact.html"

### For Developers

**Testing single-file SPA:**
```typescript
const result = parseMultiPageHTML(html)
// result.type = 'SINGLE_FILE_SPA'
// result.pages = [{slug: 'home', ...}, {slug: 'about', ...}]
```

**Testing multi-file:**
```typescript
const result = parseMultiPageHTML(html)
// result.type = 'MULTI_FILE'
// result.pages = [{slug: 'index', content: '<!DOCTYPE...'}, ...]
```

**Checking user intent:**
```typescript
const intent = detectUserIntent("create separate HTML files")
// intent.wantsSingleFile = false
// intent.confidence = 'high'
```

---

## 🚀 Migration Guide

### Existing Code

All existing code remains compatible:
- Old prompts default to single-file SPA
- Parser still detects `<!-- PAGE: -->` format
- No breaking changes

### New Features

Now supports:
- Multi-file project detection
- User intent analysis
- Clearer system prompt guidance
- Better error messages with detection info

---

## 📊 Statistics

**Typical Distribution:**
- 95% of requests → Single-File SPA (Type A)
- 5% of requests → Multi-File (Type B)

**Why Single-File is Default:**
- Easier to deploy (one file)
- Faster navigation (no reloads)
- Simpler to manage
- Better for prototypes/demos
- Works in sandboxed iframes

---

## 🔗 Related Files

- `lib/system-prompt.ts` - AI generation instructions
- `lib/multi-page-parser.ts` - Parser with auto-detection
- `lib/code-parser.ts` - Code extraction logic
- `MULTI_PAGE_GENERATION.md` - Multi-page documentation
