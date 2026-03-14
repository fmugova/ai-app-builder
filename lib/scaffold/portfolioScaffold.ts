// lib/scaffold/portfolioScaffold.ts
// Full portfolio / agency / creative scaffold.
// Injected when detectScaffoldType() returns 'portfolio'.

// ── gallery.js template ───────────────────────────────────────────────────────

export const PORTFOLIO_GALLERY_JS_TEMPLATE = `// ============================================================
// gallery.js — BuildFlow Portfolio Gallery Module
// Lightbox, project grid filtering, case study transitions.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

// ── Lightbox ──────────────────────────────────────────────────────────────────

var _lightboxOpen   = false;
var _lightboxImages = [];
var _lightboxIndex  = 0;

/**
 * Open the lightbox at a given index within a named gallery.
 * @param {string} galleryId - data-gallery="galleryId" on img/figure elements
 * @param {number} index     - 0-based index within that gallery
 */
function openLightbox(galleryId, index) {
  var images = Array.from(document.querySelectorAll('[data-gallery="' + galleryId + '"]'));
  if (!images.length) return;
  _lightboxImages = images.map(function(el) {
    var img = el.tagName === 'IMG' ? el : el.querySelector('img');
    return {
      src:     img ? (img.dataset.full || img.src) : '',
      alt:     img ? img.alt : '',
      caption: el.dataset.caption || (img ? img.alt : ''),
    };
  });
  _lightboxIndex = Math.max(0, Math.min(index, _lightboxImages.length - 1));
  _renderLightbox();
  _lightboxOpen = true;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  var lb = document.getElementById('bf-lightbox');
  if (lb) lb.remove();
  _lightboxOpen = false;
  document.body.style.overflow = '';
}

function _renderLightbox() {
  var existing = document.getElementById('bf-lightbox');
  if (existing) existing.remove();

  var item  = _lightboxImages[_lightboxIndex];
  var total = _lightboxImages.length;

  var lb = document.createElement('div');
  lb.id = 'bf-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image ' + (_lightboxIndex + 1) + ' of ' + total);
  lb.innerHTML = [
    '<div class="lb-overlay"></div>',
    '<div class="lb-container">',
      '<button class="lb-close" aria-label="Close lightbox">\\u00D7</button>',
      total > 1 ? '<button class="lb-prev" aria-label="Previous image">\\u2039</button>' : '',
      total > 1 ? '<button class="lb-next" aria-label="Next image">\\u203A</button>' : '',
      '<div class="lb-img-wrap">',
        '<img src="' + item.src + '" alt="' + item.alt + '" class="lb-img">',
      '</div>',
      item.caption ? '<p class="lb-caption">' + item.caption + '</p>' : '',
      total > 1 ? '<p class="lb-counter">' + (_lightboxIndex + 1) + ' / ' + total + '</p>' : '',
    '</div>',
  ].join('');

  document.body.appendChild(lb);

  lb.querySelector('.lb-overlay').addEventListener('click', closeLightbox);
  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  var prev = lb.querySelector('.lb-prev');
  var next = lb.querySelector('.lb-next');
  if (prev) prev.addEventListener('click', function() { _navigate(-1); });
  if (next) next.addEventListener('click', function() { _navigate(1); });

  lb.querySelector('.lb-close').focus();
  _injectLightboxStyles();
}

function _navigate(dir) {
  _lightboxIndex = (_lightboxIndex + dir + _lightboxImages.length) % _lightboxImages.length;
  _renderLightbox();
}

document.addEventListener('keydown', function(e) {
  if (!_lightboxOpen) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  _navigate(-1);
  if (e.key === 'ArrowRight') _navigate(1);
});

function _injectLightboxStyles() {
  if (document.getElementById('bf-lightbox-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-lightbox-styles';
  s.textContent = [
    '#bf-lightbox{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center}',
    '.lb-overlay{position:absolute;inset:0;background:rgba(0,0,0,.92);cursor:pointer}',
    '.lb-container{position:relative;z-index:1;max-width:92vw;max-height:92vh;display:flex;flex-direction:column;align-items:center}',
    '.lb-img-wrap{display:flex;align-items:center;justify-content:center;max-height:80vh}',
    '.lb-img{max-width:92vw;max-height:80vh;object-fit:contain;border-radius:4px;display:block}',
    '.lb-caption{color:#e5e7eb;font-size:.875rem;text-align:center;margin:.75rem 0 0;max-width:640px;line-height:1.5}',
    '.lb-counter{color:#6b7280;font-size:.8125rem;margin:.4rem 0 0;text-align:center}',
    '.lb-close{position:fixed;top:1.25rem;right:1.25rem;background:rgba(255,255,255,.12);',
      'border:none;color:#fff;font-size:1.5rem;line-height:1;width:40px;height:40px;',
      'border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}',
    '.lb-close:hover{background:rgba(255,255,255,.22)}',
    '.lb-prev,.lb-next{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);',
      'border:none;color:#fff;font-size:2rem;line-height:1;width:48px;height:64px;',
      'border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}',
    '.lb-prev{left:1rem}.lb-next{right:1rem}',
    '.lb-prev:hover,.lb-next:hover{background:rgba(255,255,255,.22)}',
    '@media(max-width:640px){.lb-prev{left:.25rem}.lb-next{right:.25rem}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Project grid filtering ────────────────────────────────────────────────────

/**
 * Initialise project grid filtering.
 * Expects:
 *   - Filter buttons: [data-filter="branding"] (data-filter="all" for reset)
 *   - Project cards:  [data-tags="branding,identity"] (comma-separated)
 *   - Container:      #project-grid
 */
function initProjectFilter() {
  var grid = document.getElementById('project-grid');
  if (!grid) return;

  var cards = Array.from(grid.querySelectorAll('[data-tags]'));

  document.querySelectorAll('[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filter = btn.dataset.filter;

      document.querySelectorAll('[data-filter]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      cards.forEach(function(card) {
        var tags    = (card.dataset.tags || '').split(',').map(function(t) { return t.trim(); });
        var visible = filter === 'all' || tags.includes(filter);
        card.style.display = visible ? '' : 'none';
        if (visible) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(12px)';
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              card.style.transition = 'opacity .3s ease, transform .3s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          });
        }
      });
    });
  });
}

/**
 * Wire up lightbox on all gallery images.
 * Call once after DOM is ready.
 */
function initGallery() {
  var groups = {};
  document.querySelectorAll('[data-gallery]').forEach(function(el) {
    var gid = el.dataset.gallery;
    if (!groups[gid]) groups[gid] = [];
    var idx = groups[gid].length;
    groups[gid].push(el);
    el.style.cursor = 'pointer';
    el.addEventListener('click', (function(galleryId, index) {
      return function() { openLightbox(galleryId, index); };
    })(gid, idx));
  });
}

// ── Scroll-based project card reveal ─────────────────────────────────────────

/**
 * Staggered entrance animation for project cards.
 */
function initProjectReveal() {
  var cards = document.querySelectorAll('.project-card');
  if (!cards.length) return;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = (Array.from(cards).indexOf(entry.target) % 3) * 80;
        setTimeout(function() {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  cards.forEach(function(card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity .4s ease, transform .4s ease';
    obs.observe(card);
  });
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initGallery();
  initProjectFilter();
  initProjectReveal();
});
`;

// ── System prompt section ─────────────────────────────────────────────────────

export const PORTFOLIO_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🎨 PORTFOLIO SCAFFOLD — APPLY FOR ALL PORTFOLIO/AGENCY/CREATIVE SITES
════════════════════════════════════════════════════════════════════

When gallery.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="gallery.js"></script>    <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Project grid (work.html) — EXACT structure:**
\`\`\`html
<!-- Filter tabs -->
<div class="filter-tabs">
  <button class="filter-btn active" data-filter="all">All Work</button>
  <button class="filter-btn" data-filter="branding">Branding</button>
  <button class="filter-btn" data-filter="web">Web</button>
  <button class="filter-btn" data-filter="print">Print</button>
  <button class="filter-btn" data-filter="motion">Motion</button>
</div>

<!-- Project grid -->
<div id="project-grid" class="project-grid">
  <div class="project-card" data-tags="branding,identity">
    <div class="project-card__img" data-gallery="project-1">
      <img src="https://picsum.photos/seed/proj-brand-1/800/600"
           alt="Brand identity for Acme Corp"
           data-full="https://picsum.photos/seed/proj-brand-1/1600/1200"
           data-caption="Brand identity system — Acme Corp, 2024">
    </div>
    <div class="project-card__body">
      <h3 class="project-card__title">Acme Corp Rebrand</h3>
      <p class="project-card__client">Acme Corp &middot; Branding &middot; 2024</p>
      <a href="work.html#acme-corp" class="project-card__link">View case study &rarr;</a>
    </div>
  </div>
  <!-- Repeat for 6-8 projects minimum -->
</div>
\`\`\`

**Lightbox — triggered automatically by gallery.js on [data-gallery] clicks.**
No extra HTML needed. Add data-gallery="unique-id" to each image or wrapper.
For multi-image case studies, use the same gallery id on all images in that project.
Add data-full="..." for the full-resolution version shown in the lightbox.

**Homepage (index.html) MUST include:**
- Full-viewport hero: bold name/agency name, one-line descriptor, reel or hero image
- Selected work: 3-4 featured project cards (use data-gallery for lightbox)
- Services overview: 3-4 service tiles with icons and brief descriptions
- About/intro section: 2-column, photo on right, bio + key skills on left
- Client logos OR awards: 6-8 recognisable names in greyscale
- Contact CTA: dark section with headline and email/contact button

**work.html MUST include:**
- Filter buttons (data-filter) wired to project cards (data-tags)
- Minimum 6 project cards with distinct tags
- Each project has a cover image, title, client name, and category
- At least 2 projects have multiple gallery images (for lightbox nav demo)
- Case study link on each card points to a section anchor

**about.html MUST include:**
- Professional headshot (use picsum with consistent seed)
- Detailed bio: background, specialisms, years of experience
- Skills/tools section: logos or text pills for design tools
- Experience timeline: 3-5 roles with company, title, dates, key projects
- Testimonials: 2-3 client quotes with name, title, company
- Downloadable CV button (links to #, styled as real button)
- Social links: Behance, Dribbble, LinkedIn, Instagram as appropriate

**VISUAL QUALITY for portfolio sites:**
- Use a DARK or neutral colour scheme — not default light/white
- Typography should be distinctive: a large serif or display font for headings
- Generous whitespace — portfolio sites breathe
- Project cards MUST have hover effects: slight scale, overlay with title
- Use consistent image aspect ratios in the project grid (16:9 or 4:3)
- NO stock business imagery — all images should look like real project outputs
`;
