// lib/scaffold/blogScaffold.ts
// Shared JS module for blog / content / publication HTML sites.
// Injected when detectScaffoldType() returns 'blog'.
// Provides: client-side article search, category filtering,
//           reading time estimator, newsletter signup, and reading progress bar.

export const BLOG_JS_TEMPLATE = `// ============================================================
// blog.js — BuildFlow Blog Module
// Article search, category filtering, reading time,
// newsletter signup, and reading progress bar.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

var BLOG_API = '/api/public/data/BUILDFLOW_PROJECT_ID';
var NEWSLETTER_COLLECTION = 'newsletter_subscribers';

function _bHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Newsletter signup ─────────────────────────────────────────────────────────

/**
 * Subscribe an email address to the newsletter.
 * Deduplicates on the server.
 * @param {string} email
 * @returns {Promise<Object>}
 */
async function subscribeNewsletter(email) {
  var payload = {
    email: email.trim().toLowerCase(),
    subscribed_at: new Date().toISOString(),
  };
  var res = await fetch(BLOG_API, {
    method: 'POST',
    headers: _bHeaders(),
    body: JSON.stringify({ collection: NEWSLETTER_COLLECTION, data: payload }),
  });
  if (!res.ok) {
    var err = await res.json().catch(function() { return {}; });
    if (err.error && err.error.includes('duplicate')) return { duplicate: true };
    throw new Error(err.error || 'Signup failed');
  }
  var d = await res.json();
  return d.record ? d.record.data : d;
}

/**
 * Wire up the newsletter signup form.
 * Looks for: form#newsletter-form with input#newsletter-email.
 * Shows #newsletter-success on submission.
 */
function initNewsletterForm() {
  var form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var emailInput = document.getElementById('newsletter-email');
    var btn = form.querySelector('[type=submit]');
    var errEl = document.getElementById('newsletter-error');
    var successEl = document.getElementById('newsletter-success');

    if (!emailInput || !emailInput.value.trim()) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Subscribing...'; }
    if (errEl) errEl.style.display = 'none';

    try {
      await subscribeNewsletter(emailInput.value);
      if (form) form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
      localStorage.setItem('bf_newsletter_email', emailInput.value.trim());
    } catch(err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Subscribe'; }
      if (errEl) {
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
      }
    }
  });

  var btn = form.querySelector('[type=submit]');
  if (btn) btn.dataset.originalText = btn.textContent;

  // Pre-fill if already subscribed
  var saved = localStorage.getItem('bf_newsletter_email');
  var emailInput = document.getElementById('newsletter-email');
  if (saved && emailInput) emailInput.value = saved;
}

// ── Article search ────────────────────────────────────────────────────────────

/**
 * Initialise client-side article search.
 * Searches: data-title, data-excerpt, data-author, data-tags on .article-card elements.
 * Looks for: input#article-search
 * Shows/hides: .article-card elements
 * Updates: #search-result-count (optional)
 */
function initArticleSearch() {
  var input = document.getElementById('article-search');
  if (!input) return;

  var cards = Array.from(document.querySelectorAll('.article-card'));
  var countEl = document.getElementById('search-result-count');

  function updateCount(n) {
    if (!countEl) return;
    countEl.textContent = n === cards.length ? '' : n + ' result' + (n !== 1 ? 's' : '');
  }

  input.addEventListener('input', function() {
    var q = input.value.trim().toLowerCase();
    var visible = 0;
    cards.forEach(function(card) {
      var searchable = [
        card.dataset.title   || '',
        card.dataset.excerpt || '',
        card.dataset.author  || '',
        card.dataset.tags    || '',
        card.textContent     || '',
      ].join(' ').toLowerCase();

      var match = !q || searchable.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            card.style.transition = 'opacity .25s ease, transform .25s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        });
        visible++;
      }
    });
    updateCount(visible);

    // Show empty state
    var emptyEl = document.getElementById('search-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
  });
}

// ── Category filtering ────────────────────────────────────────────────────────

/**
 * Wire up category filter buttons.
 * Filter buttons: [data-category="slug"] (data-category="all" to reset)
 * Article cards:  [data-category="slug"] on .article-card
 */
function initCategoryFilter() {
  var buttons = document.querySelectorAll('[data-category]');
  if (!buttons.length) return;

  var cards = Array.from(document.querySelectorAll('.article-card'));

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cat = btn.dataset.category;

      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var visible = 0;
      cards.forEach(function(card) {
        var match = cat === 'all' || card.dataset.category === cat;
        card.style.display = match ? '' : 'none';
        if (match) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              card.style.transition = 'opacity .3s ease, transform .3s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          });
          visible++;
        }
      });

      var emptyEl = document.getElementById('category-empty');
      if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
    });
  });
}

// ── Reading time estimator ────────────────────────────────────────────────────

/**
 * Calculate and display estimated reading time for article pages.
 * Reads text from: #article-body (or selector passed as argument)
 * Writes to: .reading-time (all matching elements)
 * @param {string} [bodySelector='#article-body']
 * @param {number} [wpm=200]
 */
function initReadingTime(bodySelector, wpm) {
  bodySelector = bodySelector || '#article-body';
  wpm = wpm || 200;

  var body = document.querySelector(bodySelector);
  if (!body) return;

  var words = body.innerText.trim().split(/\\s+/).filter(Boolean).length;
  var minutes = Math.max(1, Math.round(words / wpm));
  var text = minutes + ' min read';

  document.querySelectorAll('.reading-time').forEach(function(el) {
    el.textContent = text;
  });
}

// ── Reading progress bar ──────────────────────────────────────────────────────

/**
 * Inject and update a thin reading progress bar at the top of the page.
 * Only active when #article-body is present on the page.
 */
function initReadingProgress() {
  if (!document.getElementById('article-body')) return;

  var bar = document.createElement('div');
  bar.id = 'bf-reading-progress';
  document.body.appendChild(bar);
  _injectProgressStyles();

  function update() {
    var el = document.documentElement;
    var pct = el.scrollHeight > el.clientHeight
      ? (window.scrollY / (el.scrollHeight - el.clientHeight)) * 100
      : 0;
    bar.style.width = Math.min(100, pct) + '%';
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function _injectProgressStyles() {
  if (document.getElementById('bf-progress-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-progress-styles';
  s.textContent = [
    '#bf-reading-progress{position:fixed;top:0;left:0;height:3px;',
      'background:linear-gradient(90deg,#6366f1,#8b5cf6);',
      'z-index:99999;transition:width .1s linear;border-radius:0 2px 2px 0}',
  ].join('');
  document.head.appendChild(s);
}

// ── Article card staggered reveal ─────────────────────────────────────────────

/**
 * Staggered entrance animation for article cards on scroll.
 */
function initArticleReveal() {
  var cards = document.querySelectorAll('.article-card');
  if (!cards.length) return;

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = (Array.from(cards).indexOf(entry.target) % 4) * 60;
        setTimeout(function() {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  cards.forEach(function(card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity .4s ease, transform .4s ease';
    obs.observe(card);
  });
}

// ── Estimated read-time on listing cards ─────────────────────────────────────

/**
 * Populate [data-words] spans with reading time.
 * Each .article-card can have data-words="1200" → auto-populated with "6 min read".
 */
function initCardReadingTimes() {
  document.querySelectorAll('.article-card[data-words]').forEach(function(card) {
    var words = parseInt(card.dataset.words || '0', 10);
    if (!words) return;
    var mins = Math.max(1, Math.round(words / 200));
    card.querySelectorAll('.reading-time').forEach(function(el) {
      el.textContent = mins + ' min read';
    });
  });
}

// ── Copy link button ──────────────────────────────────────────────────────────

/**
 * Wire up a "Copy link" button on article pages.
 * Looks for: button#copy-link-btn
 */
function initCopyLink() {
  var btn = document.getElementById('copy-link-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    navigator.clipboard.writeText(window.location.href).then(function() {
      var original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = original; }, 2000);
    });
  });
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initNewsletterForm();
  initArticleSearch();
  initCategoryFilter();
  initReadingTime();
  initReadingProgress();
  initArticleReveal();
  initCardReadingTimes();
  initCopyLink();
});
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const BLOG_HTML_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
📝 BLOG SCAFFOLD — APPLY FOR ALL BLOG / CONTENT / PUBLICATION SITES
════════════════════════════════════════════════════════════════════

When blog.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="blog.js"></script>    <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Newsletter form — EXACT structure:**
\`\`\`html
<form id="newsletter-form">
  <input type="email" id="newsletter-email" required placeholder="your@email.com">
  <p id="newsletter-error" style="display:none" class="error-msg"></p>
  <button type="submit">Subscribe</button>
</form>
<div id="newsletter-success" style="display:none">
  <p>✓ You're subscribed! New articles will land in your inbox.</p>
</div>
\`\`\`

**Article card (blog.html listing) — EXACT structure:**
\`\`\`html
<article class="article-card"
         data-title="Getting Started with Next.js 15"
         data-excerpt="Everything you need to know..."
         data-category="technology"
         data-author="Alex Morgan"
         data-tags="nextjs,react,webdev"
         data-words="1200">
  <a href="post.html">
    <div class="article-card__img">
      <img src="https://picsum.photos/seed/post1/800/450" alt="Post cover">
    </div>
    <div class="article-card__body">
      <span class="article-card__category">Technology</span>
      <h2 class="article-card__title">Getting Started with Next.js 15</h2>
      <p class="article-card__excerpt">Everything you need to know...</p>
      <div class="article-card__meta">
        <span>Alex Morgan</span>
        <span>·</span>
        <span>14 Mar 2026</span>
        <span>·</span>
        <span class="reading-time"></span>  <!-- populated by blog.js -->
      </div>
    </div>
  </a>
</article>
\`\`\`

**Category filter tabs:**
\`\`\`html
<nav class="category-tabs">
  <button class="category-tab active" data-category="all">All</button>
  <button class="category-tab" data-category="technology">Technology</button>
  <button class="category-tab" data-category="design">Design</button>
  <button class="category-tab" data-category="business">Business</button>
</nav>
\`\`\`

**Search input:**
\`\`\`html
<input type="search" id="article-search" placeholder="Search articles...">
<p id="search-result-count"></p>
<p id="search-empty" style="display:none">No articles found for your search.</p>
\`\`\`

**Article detail page (post.html) MUST include:**
\`\`\`html
<!-- Reading progress bar injected automatically when #article-body exists -->
<article id="article-body">
  <!-- full article HTML -->
</article>
<button id="copy-link-btn">Copy link</button>
\`\`\`

**Homepage (index.html) MUST include:**
- Hero: publication name, tagline, latest featured article (full-width card)
- Category navigation (data-category filter tabs)
- Article grid: minimum 6 .article-card elements with distinct categories
- Featured article gets a larger card at the top (variant: full-width, bigger image)
- Newsletter signup section: dark background, heading, form#newsletter-form
- "Most read" sidebar or section: 3 compact article links

**blog.html (listing page) MUST include:**
- Search input (id="article-search")
- Category filter tabs (data-category)
- Minimum 6 article cards across at least 3 categories
- Empty state for no search results (#search-empty)
- Pagination or "Load more" button (can be static)
- Newsletter form at the bottom

**VISUAL STANDARDS for blog sites:**
- Clean, editorial feel — generous whitespace and strong typography
- Featured article: large hero image (16:9), bold title, category pill, author line
- Article cards: consistent image ratio (16:9), category colour-coded, reading time shown
- Use a serif or semi-serif for article headlines (Georgia, Lora, etc.)
- Code blocks in post.html should use a monospace font with dark background
`;
