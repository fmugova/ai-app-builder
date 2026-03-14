// lib/scaffold/professionalScaffold.ts
// Shared JS module for professional services HTML sites.
// Injected when detectScaffoldType() returns 'professional'.
// Provides: booking/enquiry form, testimonials carousel, accordion FAQ,
//           credential badge reveal, and sticky CTA banner.

export const PROFESSIONAL_JS_TEMPLATE = `// ============================================================
// professional.js — BuildFlow Professional Services Module
// Booking forms, testimonials carousel, accordion FAQ,
// credential reveal, and sticky contact CTA.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

var PROF_API = '/api/public/data/BUILDFLOW_PROJECT_ID';
var ENQUIRIES_COLLECTION = 'enquiries';

function _pHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Enquiry / booking form ─────────────────────────────────────────────────────

/**
 * Submit an enquiry to the data API.
 * @param {Object} data - { name, email, phone?, service?, message, preferred_date? }
 * @returns {Promise<Object>}
 */
async function submitEnquiry(data) {
  data = Object.assign({}, data, { submitted_at: new Date().toISOString() });
  var res = await fetch(PROF_API, {
    method: 'POST',
    headers: _pHeaders(),
    body: JSON.stringify({ collection: ENQUIRIES_COLLECTION, data: data }),
  });
  if (!res.ok) {
    var err = await res.json().catch(function() { return {}; });
    throw new Error(err.error || 'Submission failed');
  }
  var d = await res.json();
  return d.record ? d.record.data : d;
}

/**
 * Wire up the enquiry/contact form.
 * Looks for: form#enquiry-form with named inputs.
 * Shows #enquiry-success on submission.
 */
function initEnquiryForm() {
  var form = document.getElementById('enquiry-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    var errEl = document.getElementById('enquiry-error');
    var successEl = document.getElementById('enquiry-success');

    var data = {};
    new FormData(form).forEach(function(v, k) { data[k] = v.toString().trim(); });
    if (!data.email || !data.name) return;

    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    if (errEl) errEl.style.display = 'none';

    try {
      await submitEnquiry(data);
      if (form) form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
    } catch(err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Send Enquiry'; }
      if (errEl) {
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
      }
    }
  });

  var btn = form.querySelector('[type=submit]');
  if (btn) btn.dataset.originalText = btn.textContent;
}

// ── Testimonials carousel ─────────────────────────────────────────────────────

/**
 * Auto-rotating testimonials carousel.
 * Container: #testimonials-carousel
 * Slides: .testimonial-slide
 * Dots: .carousel-dot (optional — auto-created if absent)
 * @param {number} [interval=5000] ms between auto-advance
 */
function initTestimonialsCarousel(interval) {
  interval = interval || 5000;
  var carousel = document.getElementById('testimonials-carousel');
  if (!carousel) return;

  var slides = Array.from(carousel.querySelectorAll('.testimonial-slide'));
  if (slides.length < 2) return;

  var current = 0;
  var timer = null;

  // Auto-create dots if not present
  var dotsContainer = carousel.querySelector('.carousel-dots');
  if (!dotsContainer) {
    dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    carousel.appendChild(dotsContainer);
    _injectCarouselStyles();
  }
  if (!dotsContainer.children.length) {
    slides.forEach(function(_, i) {
      var dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' carousel-dot--active' : '');
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.addEventListener('click', function() { goTo(i); });
      dotsContainer.appendChild(dot);
    });
  }

  function goTo(index) {
    slides[current].classList.remove('testimonial-slide--active');
    dotsContainer.children[current].classList.remove('carousel-dot--active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('testimonial-slide--active');
    dotsContainer.children[current].classList.add('carousel-dot--active');
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(function() { goTo(current + 1); }, interval);
  }

  // Init first slide
  slides.forEach(function(s) { s.classList.remove('testimonial-slide--active'); });
  slides[0].classList.add('testimonial-slide--active');

  // Prev/next buttons
  var prev = carousel.querySelector('.carousel-prev');
  var next = carousel.querySelector('.carousel-next');
  if (prev) prev.addEventListener('click', function() { goTo(current - 1); });
  if (next) next.addEventListener('click', function() { goTo(current + 1); });

  // Pause on hover
  carousel.addEventListener('mouseenter', function() { clearInterval(timer); });
  carousel.addEventListener('mouseleave', resetTimer);

  // Keyboard
  carousel.setAttribute('tabindex', '0');
  carousel.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  resetTimer();
}

function _injectCarouselStyles() {
  if (document.getElementById('bf-carousel-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-carousel-styles';
  s.textContent = [
    '.testimonial-slide{display:none}',
    '.testimonial-slide--active{display:block}',
    '.carousel-dots{display:flex;justify-content:center;gap:.5rem;margin-top:1.25rem}',
    '.carousel-dot{width:8px;height:8px;border-radius:50%;border:none;',
      'background:#d1d5db;cursor:pointer;transition:background .2s,transform .2s}',
    '.carousel-dot--active{background:#6366f1;transform:scale(1.3)}',
  ].join('');
  document.head.appendChild(s);
}

// ── Accordion FAQ ─────────────────────────────────────────────────────────────

/**
 * Wire up accordion FAQ.
 * Structure:
 *   <div class="faq-item">
 *     <button class="faq-question">Question text</button>
 *     <div class="faq-answer"><p>Answer text</p></div>
 *   </div>
 * @param {boolean} [allowMultiple=false] — if true, multiple can be open at once
 */
function initAccordionFAQ(allowMultiple) {
  allowMultiple = !!allowMultiple;
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  _injectAccordionStyles();

  items.forEach(function(item) {
    var btn = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.setAttribute('aria-expanded', 'false');
    answer.style.maxHeight = '0';
    answer.style.overflow = 'hidden';
    answer.style.transition = 'max-height .3s ease';

    btn.addEventListener('click', function() {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (!allowMultiple) {
        // Close all others
        items.forEach(function(other) {
          var otherBtn = other.querySelector('.faq-question');
          var otherAns = other.querySelector('.faq-answer');
          if (otherBtn && otherAns && other !== item) {
            otherBtn.setAttribute('aria-expanded', 'false');
            otherBtn.classList.remove('faq-question--open');
            otherAns.style.maxHeight = '0';
          }
        });
      }

      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('faq-question--open');
        answer.style.maxHeight = '0';
      } else {
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('faq-question--open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

function _injectAccordionStyles() {
  if (document.getElementById('bf-accordion-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-accordion-styles';
  s.textContent = [
    '.faq-question{width:100%;text-align:left;cursor:pointer;',
      'display:flex;justify-content:space-between;align-items:center;',
      'background:none;border:none;font-size:inherit;font-weight:600;padding:.875rem 0}',
    '.faq-question::after{content:"+"',
      ';font-size:1.25rem;line-height:1;color:#6366f1;',
      'transition:transform .25s ease;flex-shrink:0;margin-left:.75rem}',
    '.faq-question--open::after{content:"−"}',
    '.faq-answer{overflow:hidden;transition:max-height .3s ease}',
    '.faq-answer p{padding-bottom:.875rem;color:#4b5563;line-height:1.7}',
  ].join('');
  document.head.appendChild(s);
}

// ── Credential / award badge reveal ───────────────────────────────────────────

/**
 * Staggered reveal animation for credential/award badges.
 * Target elements: .credential-badge
 */
function initCredentialReveal() {
  var badges = document.querySelectorAll('.credential-badge');
  if (!badges.length) return;

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = Array.from(badges).indexOf(entry.target) * 80;
        setTimeout(function() {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0) scale(1)';
        }, delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  badges.forEach(function(b) {
    b.style.opacity = '0';
    b.style.transform = 'translateY(16px) scale(.95)';
    b.style.transition = 'opacity .4s ease, transform .4s ease';
    obs.observe(b);
  });
}

// ── Sticky contact CTA banner ─────────────────────────────────────────────────

/**
 * Show a sticky "Book a consultation" banner after scrolling past the hero.
 * The banner links to #enquiry-form or a custom href.
 * @param {string} [ctaText]
 * @param {string} [ctaHref]
 * @param {number} [showAfterPx=400]
 */
function initStickyCTA(ctaText, ctaHref, showAfterPx) {
  ctaText    = ctaText    || 'Book a free consultation';
  ctaHref    = ctaHref    || '#enquiry-form';
  showAfterPx = showAfterPx || 400;

  var banner = document.createElement('div');
  banner.id = 'bf-sticky-cta';
  banner.innerHTML =
    '<span class="bf-sticky-cta__text"></span>' +
    '<a class="bf-sticky-cta__btn" href="' + ctaHref + '">' + ctaText + '</a>' +
    '<button class="bf-sticky-cta__dismiss" aria-label="Dismiss">×</button>';
  document.body.appendChild(banner);
  _injectStickyCTAStyles();

  var dismissed = false;
  banner.querySelector('.bf-sticky-cta__dismiss').addEventListener('click', function() {
    dismissed = true;
    banner.classList.remove('bf-sticky-cta--visible');
  });

  window.addEventListener('scroll', function() {
    if (dismissed) return;
    if (window.scrollY > showAfterPx) {
      banner.classList.add('bf-sticky-cta--visible');
    } else {
      banner.classList.remove('bf-sticky-cta--visible');
    }
  }, { passive: true });
}

function _injectStickyCTAStyles() {
  if (document.getElementById('bf-sticky-cta-styles')) return;
  var s = document.createElement('style');
  s.id = 'bf-sticky-cta-styles';
  s.textContent = [
    '#bf-sticky-cta{position:fixed;bottom:0;left:0;right:0;z-index:9990;',
      'background:#fff;border-top:1px solid #e5e7eb;',
      'display:flex;align-items:center;justify-content:center;gap:1rem;',
      'padding:.875rem 1.25rem;',
      'transform:translateY(100%);transition:transform .3s ease;',
      'box-shadow:0 -4px 24px rgba(0,0,0,.08)}',
    '#bf-sticky-cta.bf-sticky-cta--visible{transform:translateY(0)}',
    '.bf-sticky-cta__text{font-size:.875rem;color:#6b7280;flex:1;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bf-sticky-cta__btn{background:#6366f1;color:#fff;border:none;border-radius:.5rem;',
      'padding:.5rem 1.25rem;font-size:.875rem;font-weight:600;cursor:pointer;',
      'white-space:nowrap;text-decoration:none;transition:background .15s}',
    '.bf-sticky-cta__btn:hover{background:#4f46e5}',
    '.bf-sticky-cta__dismiss{background:none;border:none;cursor:pointer;',
      'color:#9ca3af;font-size:1.25rem;line-height:1;padding:.25rem}',
    '@media(max-width:480px){.bf-sticky-cta__text{display:none}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initEnquiryForm();
  initTestimonialsCarousel();
  initAccordionFAQ();
  initCredentialReveal();
});
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const PROFESSIONAL_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
⚖  PROFESSIONAL SERVICES SCAFFOLD — APPLY FOR LAW / ACCOUNTANCY /
   CONSULTANCY / CLINIC / RECRUITMENT / FINANCIAL SERVICES SITES
════════════════════════════════════════════════════════════════════

When professional.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="professional.js"></script>  <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Enquiry / booking form — EXACT structure:**
\`\`\`html
<form id="enquiry-form">
  <input type="text"   name="name"    required placeholder="Your full name" data-label="Name">
  <input type="email"  name="email"   required placeholder="your@email.com" data-label="Email">
  <input type="tel"    name="phone"   placeholder="Phone number (optional)">
  <select name="service">
    <option value="">Area of interest (optional)</option>
    <option value="commercial">Commercial Law</option>
    <option value="employment">Employment Law</option>
    <option value="dispute">Dispute Resolution</option>
  </select>
  <select name="preferred_date">
    <option value="">Preferred availability</option>
    <option value="asap">As soon as possible</option>
    <option value="this_week">This week</option>
    <option value="next_week">Next week</option>
  </select>
  <textarea name="message" rows="4" placeholder="Brief description of your matter"></textarea>
  <p id="enquiry-error" style="display:none" class="error-msg"></p>
  <button type="submit">Send Enquiry</button>
</form>
<div id="enquiry-success" style="display:none">
  <h3>Thank you — we'll be in touch within 24 hours.</h3>
  <p>A member of our team will contact you to arrange a free initial consultation.</p>
</div>
\`\`\`

**Testimonials carousel — EXACT structure:**
\`\`\`html
<div id="testimonials-carousel">
  <div class="testimonial-slide">
    <blockquote>
      <p>"Exceptional service — resolved our dispute in half the expected time."</p>
      <footer>
        <strong>Sarah Mitchell</strong>
        <span>CEO, Meridian Group</span>
      </footer>
    </blockquote>
  </div>
  <div class="testimonial-slide"><!-- repeat --></div>
  <!-- carousel-dots and prev/next buttons are auto-created -->
</div>
\`\`\`

**FAQ accordion — EXACT structure:**
\`\`\`html
<div class="faq-item">
  <button class="faq-question">What does a free consultation include?</button>
  <div class="faq-answer">
    <p>Our free 30-minute consultation covers an overview of your situation,
       initial advice, and a clear outline of our fees if you choose to proceed.</p>
  </div>
</div>
\`\`\`

**Credential badges — add to about/team sections:**
\`\`\`html
<div class="credentials-grid">
  <div class="credential-badge">
    <img src="..." alt="Law Society Accredited">
    <span>Law Society Accredited</span>
  </div>
  <!-- badges animate in on scroll via initCredentialReveal() -->
</div>
\`\`\`

**Sticky CTA — call in page script after DOMContentLoaded:**
\`\`\`javascript
initStickyCTA('Book a free consultation', '#enquiry-form');
\`\`\`

**Homepage (index.html) MUST include:**
- Credibility hero: professional photography, headline about specialism, trust signals (years exp, clients, cases)
- Services overview: 3-6 cards with icon, service name, 2-line description, "Learn more" link
- Why choose us: 3-column differentiators (response time, success rate, accreditations)
- Team preview: 2-3 headshots with name, role, and 1-line bio
- Testimonials carousel (3+ testimonials from real-sounding clients)
- Credential/award badges (4-6 recognitions, greyscale until hover)
- Enquiry form with service selector
- Trust footer: accreditation logos, regulatory body statement

**services.html or services pages MUST include:**
- Each service as a full section: H2 title, detailed description, who it's for, process steps, typical fees (or "contact for quote")
- FAQ accordion for that service
- CTA to contact/book

**team.html MUST include:**
- Individual cards: professional headshot, full name, title, qualifications, bio paragraph, contact email
- At least 3 team members

**VISUAL STANDARDS for professional services:**
- Conservative, trust-building palette: navy, charcoal, white — NOT bright/playful colours
- Serif headings (Georgia, Playfair Display, or similar) project authority
- Generous whitespace, no clutter
- Professional photography style (use picsum with consistent seeds)
- NO stock-photo clichés — handshakes, gavels — use abstract or architectural imagery
`;
