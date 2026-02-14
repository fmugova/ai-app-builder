/**
 * Code Injector
 *
 * Post-processes AI-generated HTML to wire up BuildFlow backend services
 * automatically — no manual configuration required by the user.
 *
 * Injected features:
 * 1. Form handler  — intercepts <form> submits → /api/forms/submit
 * 2. Analytics     — page-view + click tracking → /api/analytics/track
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SinglePageSEO {
  title: string
  metaTitle: string
  metaDescription: string
  description: string
}

// ---------------------------------------------------------------------------
// SEO extraction for single-page apps
// ---------------------------------------------------------------------------

/**
 * Extracts SEO metadata from a single-page HTML document.
 * Used to auto-populate the Page record when multi-page parsing doesn't apply.
 */
export function extractSinglePageSEO(html: string): SinglePageSEO {
  // <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const rawTitle = titleMatch ? stripHTML(titleMatch[1]).trim() : ''

  // <meta name="description" content="...">
  const metaDescMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
  )
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : ''

  // <meta property="og:title" content="...">
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
  )
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : ''

  // First <h1> as fallback title
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1Text = h1Match ? stripHTML(h1Match[1]).trim() : ''

  // First <p> as description fallback
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const pText = pMatch ? stripHTML(pMatch[1]).trim().slice(0, 160) : ''

  const title = rawTitle || h1Text || 'Home'
  const metaTitle = ogTitle || rawTitle || h1Text || 'Home'
  const metaDescription = metaDesc || pText || ''
  const description = pText || metaDesc || ''

  return { title, metaTitle, metaDescription, description }
}

// ---------------------------------------------------------------------------
// Form handler injection
// ---------------------------------------------------------------------------

/**
 * Injects a small script that intercepts all <form> submits in the generated
 * HTML and POSTs the data to BuildFlow's /api/forms/submit endpoint.
 *
 * If the form already has an explicit action pointing elsewhere (not empty /
 * not "#"), it is left untouched so user-specified endpoints aren't broken.
 */
export function injectFormHandler(html: string, projectId: string): string {
  // Don't inject if there are no forms
  if (!/<form[\s>]/i.test(html)) return html

  // Don't inject twice
  if (html.includes('data-buildflow-forms')) return html

  const script = `
<!-- BuildFlow: form capture (auto-injected) -->
<script data-buildflow-forms="1">
(function () {
  var SITE_ID = ${JSON.stringify(projectId)};
  var ENDPOINT = '/api/forms/submit';
  function handleSubmit(e) {
    var form = e.target;
    var action = (form.getAttribute('action') || '').trim();
    // Skip forms that already point to an explicit external action
    if (action && action !== '#' && !action.startsWith('/api/forms')) return;
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    var formType = form.getAttribute('data-form-type') || form.id || 'contact';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: SITE_ID, formType: formType, formData: data }),
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        var successEl = form.querySelector('[data-success]') || form.querySelector('.success-message');
        if (successEl) { successEl.style.display = 'block'; }
        form.reset();
      })
      .catch(function (err) { console.error('BuildFlow form error:', err); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form').forEach(function (f) {
      f.addEventListener('submit', handleSubmit);
    });
  });
  // Also catch forms added after DOMContentLoaded (SPAs)
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.tagName === 'FORM') handleSubmit(e);
  });
})();
</script>`

  // Insert just before </body>; fall back to appending
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}\n</body>`)
  }
  return html + script
}

// ---------------------------------------------------------------------------
// Analytics injection
// ---------------------------------------------------------------------------

/**
 * Injects a lightweight page-view + click-tracking script that posts events
 * to BuildFlow's /api/analytics/track endpoint.
 */
export function injectAnalytics(html: string, projectId: string): string {
  // Don't inject twice
  if (html.includes('data-buildflow-analytics')) return html

  const script = `
<!-- BuildFlow: analytics (auto-injected) -->
<script data-buildflow-analytics="1">
(function () {
  var SITE_ID = ${JSON.stringify(projectId)};
  var ENDPOINT = '/api/analytics/track';
  function track(event, props) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: SITE_ID, event: event, properties: props || {} }),
    }).catch(function () {});
  }
  // Page view
  document.addEventListener('DOMContentLoaded', function () {
    track('page_view', { path: window.location.pathname, title: document.title });
  });
  // CTA / button clicks
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.closest('button') || el.closest('a'))) {
      var target = el.closest('button') || el.closest('a') || el;
      track('click', {
        text: (target.innerText || '').trim().slice(0, 80),
        href: target.href || null,
        id: target.id || null,
      });
    }
  }, true);
})();
</script>`

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}\n</body>`)
  }
  return html + script
}

// ---------------------------------------------------------------------------
// Inline event handler sanitizer
// ---------------------------------------------------------------------------

/**
 * List of inline event attributes that violate CSP `script-src-attr 'none'`.
 * We strip these from AI-generated HTML and rewrite them as addEventListener
 * calls so the output is CSP-compliant.
 */
const INLINE_EVENT_ATTRS = [
  'onclick', 'ondblclick', 'onsubmit', 'onchange', 'oninput',
  'onkeyup', 'onkeydown', 'onkeypress', 'onmouseover', 'onmouseout',
  'onmouseenter', 'onmouseleave', 'onfocus', 'onblur',
  'onreset', 'onscroll', 'oncontextmenu', 'ondragstart', 'ondrop',
]

/**
 * Strips inline event handlers from HTML (e.g. onclick="...", onsubmit="...")
 * and rewires them as addEventListener calls in a companion <script> block.
 *
 * Elements that already have an `id` keep it; others get a unique
 * `data-bf-id="N"` attribute for targeting.
 *
 * This makes the generated HTML compliant with `script-src-attr 'none'` CSP.
 */
export function sanitizeInlineHandlers(html: string): string {
  if (!html) return html
  // Fast exit if no inline handlers present
  if (!INLINE_EVENT_ATTRS.some(a => new RegExp(`\\s${a}\\s*=`, 'i').test(html))) return html

  let counter = 0
  const collected: Array<{ attr: string; event: string; code: string }> = []
  let result = html

  for (const attr of INLINE_EVENT_ATTRS) {
    const event = attr.slice(2) // strip 'on' prefix
    // Match: <tag ... onclick="code" ...> or onclick='code'
    result = result.replace(
      new RegExp(`(\\s)${attr}\\s*=\\s*(?:"([^"]*?)"|'([^']*?)')`, 'gi'),
      (_match, space, dq, sq) => {
        const code = (dq ?? sq ?? '').trim()
        if (!code) return space // empty handler — just remove attribute
        const id = `bf${counter++}`
        collected.push({ attr: `data-bf-id-${id}`, event, code })
        return `${space}data-bf-id-${id}="1"`
      }
    )
  }

  if (collected.length === 0) return result

  // Build companion script that wires up the handlers via addEventListener
  const wireups = collected.map(({ attr, event, code }) => {
    // Escape backticks/backslashes inside the handler code string
    const safeCode = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
    return `  document.querySelectorAll('[${attr}]').forEach(function(el){el.addEventListener('${event}',function(event){${safeCode}});});`
  }).join('\n')

  const script = `\n<!-- BuildFlow: rewired inline handlers (CSP-safe) -->\n<script data-buildflow-handlers="1">\ndocument.addEventListener('DOMContentLoaded',function(){\n${wireups}\n});\n</script>`

  return /<\/body>/i.test(result)
    ? result.replace(/<\/body>/i, `${script}\n</body>`)
    : result + script
}

// ---------------------------------------------------------------------------
// CSP meta tag
// ---------------------------------------------------------------------------

/**
 * Adds a Content-Security-Policy <meta> tag to the <head> of the document
 * if one is not already present.  The policy:
 *  - Restricts scripts to same-origin + known CDNs + unsafe-inline
 *    (unsafe-inline is required for BuildFlow injected scripts and any
 *     <script> blocks in the generated HTML; use nonce/hash for stricter needs)
 *  - Restricts styles to same-origin + Google Fonts + Tailwind CDN + unsafe-inline
 *  - Restricts fonts to same-origin + Google Fonts
 *  - Allows images from anywhere (https) and data URIs
 *  - Allows fetch/XHR to same-origin + https APIs
 */
const CSP_CONTENT = [
  "default-src 'self' data:",
  "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com unpkg.com cdn.jsdelivr.net cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com",
  "font-src 'self' fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
].join('; ')

const CSP_META = `  <meta http-equiv="Content-Security-Policy" content="${CSP_CONTENT}">`

export function addCspMetaTag(html: string): string {
  // Skip if already has a CSP meta tag
  if (/content-security-policy/i.test(html)) return html
  // Insert after opening <head> tag
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/(<head\b[^>]*>)/i, `$1\n${CSP_META}`)
  }
  return html
}

// ---------------------------------------------------------------------------
// Image URL sanitizer
// ---------------------------------------------------------------------------

/**
 * Fixes malformed image (and background-image) URLs produced by AI:
 *
 * 1. Extra leading/trailing quote inside the attribute value:
 *    src=""https://picsum.photos/..."  →  src="https://picsum.photos/..."
 *    src="'https://picsum.photos/..." →  src="https://picsum.photos/..."
 *
 * 2. Unresolved template-literal placeholders:
 *    src="{item.image}"  →  src="https://picsum.photos/seed/item/800/600"
 *    src="{product.photo}" → src="https://picsum.photos/seed/product/800/600"
 *
 * 3. Empty or hash-only src:
 *    src=""   →  src="https://picsum.photos/seed/placeholder/800/600"
 *    src="#"  →  src="https://picsum.photos/seed/placeholder/800/600"
 */
export function fixMalformedImageUrls(html: string): string {
  if (!html) return html

  let result = html

  // 1. Strip extra leading quote: src=""https:// or src="'https://
  result = result.replace(
    /(\bsrc=")(?:["'])(https?:\/\/[^"]+)(")/gi,
    '$1$2$3'
  )

  // 2. Unresolved template placeholders in src: {anything}
  result = result.replace(
    /\bsrc=["']\{([^}"']+)\}["']/gi,
    (_match, varName) => {
      const seed = varName.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'img'
      return `src="https://picsum.photos/seed/${seed}/800/600"`
    }
  )

  // 3. Empty or hash-only src on img tags
  result = result.replace(
    /(<img\b[^>]*)\bsrc=["'](?:|#)["']/gi,
    '$1src="https://picsum.photos/seed/placeholder/800/600"'
  )

  return result
}

// ---------------------------------------------------------------------------
// Critical HTML gaps auto-fixer
// ---------------------------------------------------------------------------

/**
 * Automatically patches the structural / accessibility / SEO gaps that the
 * CodeValidator flags as critical or high-severity errors.  Applied early in
 * the pipeline so downstream validators see clean HTML.
 *
 * Gaps fixed:
 *  1. Missing <!DOCTYPE html>
 *  2. Missing lang="en" on <html>
 *  3. Missing <meta charset="UTF-8">
 *  4. Missing <meta name="viewport" …>
 *  5. Missing <title> (derived from first <h1> or falls back to "App")
 *  6. Missing <meta name="description"> (derived from first <p>)
 *  7. Missing alt="" on <img> tags
 *  8. Missing <header> wrapper around top-level <nav> (when nav exists but
 *     there is no outer <header>)
 *  9. Missing <main> wrapper around page body content
 * 10. Ensure exactly one <h1> — if none found, promote first <h2> to <h1>
 * 11. Multiple <h1> elements — demote 2nd+ to <h2>
 * 12. Heading hierarchy jumps (e.g. h1 → h3) — insert bridging hidden heading
 * 13. External <a> tags missing rel="noopener noreferrer"
 * 14. <img> tags missing loading="lazy"
 * 15. Missing Open Graph meta tags (og:title, og:description, og:type)
 */
export function fixCriticalHtmlGaps(html: string): string {
  if (!html || !html.includes('<')) return html

  // Only operate on complete documents (not fragments)
  const isFullDoc = /<!DOCTYPE|<html\b/i.test(html)
  if (!isFullDoc) return html

  let result = html

  // 1. DOCTYPE
  if (!/<!DOCTYPE\s+html/i.test(result)) {
    result = '<!DOCTYPE html>\n' + result
  }

  // 2. lang attribute on <html>
  result = result.replace(
    /<html(?![^>]*\blang=)([^>]*)>/i,
    '<html lang="en"$1>'
  )

  // 3 & 4. Missing meta charset / viewport — inject after opening <head>
  if (/<head\b[^>]*>/i.test(result)) {
    const missingCharset = !/charset/i.test(result)
    const missingViewport = !/name=["']viewport["']/i.test(result)

    if (missingCharset || missingViewport) {
      const toInject = [
        missingCharset ? '  <meta charset="UTF-8">' : '',
        missingViewport ? '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' : '',
      ].filter(Boolean).join('\n')

      result = result.replace(/(<head\b[^>]*>)/i, `$1\n${toInject}`)
    }
  }

  // 5. Missing <title> — derive from first <h1> text or default
  if (!/<title\b[^>]*>[\s\S]*?<\/title>/i.test(result)) {
    const h1Match = result.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const derivedTitle = h1Match
      ? stripHTML(h1Match[1]).trim().slice(0, 60) || 'App'
      : 'App'
    const titleTag = `  <title>${derivedTitle}</title>`
    if (/<\/head>/i.test(result)) {
      result = result.replace(/<\/head>/i, `${titleTag}\n</head>`)
    }
  }

  // 6. Missing <meta name="description"> — derive from first <p>
  if (!/name=["']description["']/i.test(result)) {
    const pMatch = result.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    if (pMatch) {
      const desc = stripHTML(pMatch[1]).trim().replace(/\s+/g, ' ').slice(0, 160)
      if (desc) {
        const metaDesc = `  <meta name="description" content="${desc.replace(/"/g, '&quot;')}">`
        if (/<\/head>/i.test(result)) {
          result = result.replace(/<\/head>/i, `${metaDesc}\n</head>`)
        }
      }
    }
  }

  // 7. Add alt="" to <img> tags that are missing the attribute
  result = result.replace(
    /<img\b(?![^>]*\balt=)([^>]*?)(\s*\/?>)/gi,
    (_match, attrs, close) => `<img${attrs} alt=""${close}`
  )

  // 8. Wrap top-level <nav> in <header> if there is no <header> already
  if (/<nav\b/i.test(result) && !/<header\b/i.test(result)) {
    result = result.replace(
      /(<nav\b[\s\S]*?<\/nav>)/i,
      '<header>\n$1\n</header>'
    )
  }

  // 9. Wrap body content in <main> if missing
  //    Only when body has direct content and no <main> exists
  if (!/<main\b/i.test(result) && /<body\b[^>]*>/i.test(result)) {
    result = result.replace(
      /(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i,
      (_match, openBody, content, closeBody) => {
        // Skip wrapping if content is effectively empty or already has structural tags
        const hasStructural = /<(header|footer|section|article|aside)\b/i.test(content)
        if (hasStructural || content.trim().length < 20) return _match
        return `${openBody}\n<main>\n${content}\n</main>\n${closeBody}`
      }
    )
  }

  // 10. No <h1> at all — promote first <h2> to <h1>
  if (!/<h1\b/i.test(result) && /<h2\b/i.test(result)) {
    let promoted = false
    result = result.replace(/<(\/?)h2\b/gi, (_m, slash) => {
      if (!promoted) {
        if (slash === '/') { promoted = true }
        return `<${slash}h1`
      }
      return _m
    })
  }

  // 11. Multiple <h1> elements — demote 2nd+ to <h2>
  const h1Matches = [...result.matchAll(/<h1\b[^>]*>/gi)]
  if (h1Matches.length > 1) {
    let firstSeen = false
    result = result.replace(/(<\/?)h1(\b)/gi, (_m, slash, after) => {
      if (!firstSeen) {
        if (!slash.endsWith('/')) firstSeen = true   // opening tag
        return _m
      }
      return `${slash}h2${after}`
    })
  }

  // 12. Heading hierarchy — fix jumps (e.g. h1 → h3 inserts a synthetic h2)
  //     We fix the output tags so the DOM structure is valid; the inserted
  //     <h2> is hidden via inline style so it doesn't visually affect layout.
  const headingTagRe = /<h([1-6])\b[^>]*>/gi
  let lastLevel = 0
  const headingInserts: Array<{ index: number; tag: string }> = []
  let match: RegExpExecArray | null
  while ((match = headingTagRe.exec(result)) !== null) {
    const level = parseInt(match[1])
    if (lastLevel > 0 && level - lastLevel > 1) {
      // Insert a bridging heading just before this tag
      headingInserts.push({ index: match.index, tag: `<h${lastLevel + 1} style="display:none" aria-hidden="true"></h${lastLevel + 1}>` })
    }
    lastLevel = level
  }
  // Apply inserts in reverse so indices stay valid
  for (let i = headingInserts.length - 1; i >= 0; i--) {
    const { index, tag } = headingInserts[i]
    result = result.slice(0, index) + tag + result.slice(index)
  }

  // 13. Add rel="noopener noreferrer" to external <a> tags that are missing it
  result = result.replace(
    /<a\b([^>]*)\bhref=["'](https?:\/\/[^"']+)["']([^>]*)>/gi,
    (_m, before, href, after) => {
      const combined = before + after
      if (/\brel=/.test(combined)) return _m   // already has rel
      return `<a${before} href="${href}"${after} rel="noopener noreferrer">`
    }
  )

  // 14. Add loading="lazy" to <img> tags that are missing it
  result = result.replace(
    /<img\b(?![^>]*\bloading=)([^>]*?)(\s*\/?>)/gi,
    (_m, attrs, close) => `<img loading="lazy"${attrs}${close}`
  )

  // 15. Open Graph tags — add og:title + og:description if missing
  if (!result.includes('property="og:title"') && /<\/head>/i.test(result)) {
    const titleMatch = result.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const descMatch = result.match(/name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const ogTitle = titleMatch ? stripHTML(titleMatch[1]).trim() : ''
    const ogDesc = descMatch ? descMatch[1] : ''

    const ogTags = [
      ogTitle ? `  <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}">` : '',
      ogDesc ? `  <meta property="og:description" content="${ogDesc.replace(/"/g, '&quot;')}">` : '',
      `  <meta property="og:type" content="website">`,
    ].filter(Boolean).join('\n')

    if (ogTags) {
      result = result.replace(/<\/head>/i, `${ogTags}\n</head>`)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Active navigation highlighter
// ---------------------------------------------------------------------------

/**
 * Injects a small script that highlights the nav link matching the current
 * page filename (e.g. about.html → highlights the About nav link).
 *
 * Works by comparing each anchor's href basename against
 * window.location.pathname's basename.  Adds class="active" + inline
 * accent styles so it works without any CSS framework.
 */
export function injectActiveNavigation(html: string): string {
  if (!html) return html
  // Only inject if there's a <nav> with links
  if (!/<nav\b/i.test(html) || !/<a\b[^>]*href=/i.test(html)) return html
  // Don't inject twice
  if (html.includes('data-buildflow-activenav')) return html

  const script = `
<!-- BuildFlow: active nav highlight (auto-injected) -->
<script data-buildflow-activenav="1">
(function () {
  function setActiveNav() {
    var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!page || page === '') page = 'index.html';
    var links = document.querySelectorAll('nav a, header a, .nav-links a, .navbar a, .navigation a');
    links.forEach(function(link) {
      var href = (link.getAttribute('href') || '').toLowerCase().split('?')[0].split('#')[0];
      var base = href.split('/').pop() || 'index.html';
      if (base === '' || base === '.') base = 'index.html';
      var isActive = (base === page) || (page === 'index.html' && (base === '' || base === '/' || base === '.' || base === '#'));
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
        // Apply accent style only if no custom active style already exists
        if (!link.style.color) {
          link.style.color = 'var(--primary, var(--color-primary, #6366f1))';
          link.style.fontWeight = 'bold';
        }
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setActiveNav);
  } else {
    setActiveNav();
  }
  // Re-run on hash changes for SPAs
  window.addEventListener('hashchange', setActiveNav);
  window.addEventListener('popstate', setActiveNav);
})();
</script>`

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}\n</body>`)
  }
  return html + script
}

// ---------------------------------------------------------------------------
// Convenience: apply all injections at once
// ---------------------------------------------------------------------------

/**
 * Applies all BuildFlow backend injections to a generated HTML string.
 * Call this once when saving/updating project code.
 *
 * Order matters:
 * 1. fixCriticalHtmlGaps    — patch DOCTYPE, lang, charset, viewport, title,
 *                             description, alt attrs, header/main wrappers
 * 2. fixMalformedImageUrls  — fix broken/placeholder image src values
 * 3. sanitizeInlineHandlers — rewrite onclick/onsubmit etc. before we inject our scripts
 * 4. injectFormHandler      — wire up <form> submits
 * 5. injectAnalytics        — page-view + click tracking
 * 6. injectActiveNavigation — highlight current page in nav
 * 7. addCspMetaTag          — add CSP policy after all scripts are known
 */
export function applyBuildFlowInjections(html: string, projectId: string): string {
  let result = html
  result = fixCriticalHtmlGaps(result)
  result = fixMalformedImageUrls(result)
  result = sanitizeInlineHandlers(result)
  result = injectFormHandler(result, projectId)
  result = injectAnalytics(result, projectId)
  result = injectActiveNavigation(result)
  result = addCspMetaTag(result)
  return result
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function stripHTML(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}
