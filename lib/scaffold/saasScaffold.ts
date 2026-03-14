// lib/scaffold/saasScaffold.ts
// Full SaaS / startup scaffold.
// Injected when detectScaffoldType() returns 'saas'.

// ── waitlist.js template ──────────────────────────────────────────────────────

export const SAAS_WAITLIST_JS_TEMPLATE = `// ============================================================
// waitlist.js — BuildFlow SaaS Data Layer
// Waitlist signups, lead capture, feature voting.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

var WAITLIST_API = '/api/public/data/BUILDFLOW_PROJECT_ID';
var WAITLIST_COLLECTION = 'waitlist_signups';
var VOTES_COLLECTION    = 'feature_votes';

function _wHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Waitlist ──────────────────────────────────────────────────────────────────

/**
 * Add an email to the waitlist.
 * Deduplicates on the server — safe to call multiple times with same email.
 * @param {string} email
 * @param {Object} [meta] - optional extra fields e.g. { role, company, plan_interest }
 * @returns {Promise<Object>} created record
 */
async function joinWaitlist(email, meta) {
  meta = meta || {};
  var payload = Object.assign({ email: email.trim().toLowerCase(), joined_at: new Date().toISOString() }, meta);
  var res = await fetch(WAITLIST_API, {
    method: 'POST',
    headers: _wHeaders(),
    body: JSON.stringify({ collection: WAITLIST_COLLECTION, data: payload }),
  });
  if (!res.ok) {
    var err = await res.json().catch(function() { return {}; });
    if (err.error && err.error.includes('duplicate')) return { email: email, duplicate: true };
    throw new Error(err.error || 'Signup failed');
  }
  var d = await res.json();
  return d.record ? d.record.data : d;
}

/**
 * Get the current waitlist count (shown as social proof).
 * Returns 0 on error — never breaks the page.
 * @returns {Promise<number>}
 */
async function getWaitlistCount() {
  try {
    var res = await fetch(WAITLIST_API + '?collection=' + WAITLIST_COLLECTION, { headers: _wHeaders() });
    var d = await res.json();
    return (d.records || []).length;
  } catch(e) { return 0; }
}

/**
 * Update all [data-waitlist-count] elements with the current count.
 * Adds a realistic-looking buffer so early signups don't show "3 people".
 */
async function updateWaitlistCountDisplay() {
  var count = await getWaitlistCount();
  var displayed = count + 247; // social proof buffer
  document.querySelectorAll('[data-waitlist-count]').forEach(function(el) {
    el.textContent = displayed.toLocaleString() + '+ people';
  });
}

// ── Lead capture forms ────────────────────────────────────────────────────────

/**
 * Wire up any waitlist form on the page.
 * Looks for: form#waitlist-form with input#waitlist-email.
 * Shows #waitlist-success on submission.
 */
function initWaitlistForm() {
  var form = document.getElementById('waitlist-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var emailInput = document.getElementById('waitlist-email');
    var btn = form.querySelector('[type=submit]');
    var errEl = document.getElementById('waitlist-error');
    var successEl = document.getElementById('waitlist-success');

    if (!emailInput || !emailInput.value.trim()) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }
    if (errEl) errEl.style.display = 'none';

    try {
      var meta = {};
      var roleInput    = document.getElementById('waitlist-role');
      var companyInput = document.getElementById('waitlist-company');
      var planInput    = document.getElementById('waitlist-plan');
      if (roleInput)    meta.role          = roleInput.value;
      if (companyInput) meta.company       = companyInput.value;
      if (planInput)    meta.plan_interest = planInput.value;

      await joinWaitlist(emailInput.value, meta);
      localStorage.setItem('bf_waitlist_email', emailInput.value.trim());

      if (form) form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
      updateWaitlistCountDisplay();
    } catch(err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Join Waitlist'; }
      if (errEl) { errEl.textContent = err.message || 'Something went wrong. Please try again.'; errEl.style.display = 'block'; }
    }
  });

  var btn = form.querySelector('[type=submit]');
  if (btn) btn.dataset.originalText = btn.textContent;
}

// ── Pricing toggle ────────────────────────────────────────────────────────────

/**
 * Wire up monthly/annual billing toggle on the pricing page.
 * Looks for: input#billing-toggle (checkbox).
 * Updates all [data-monthly-price] and [data-annual-price] elements.
 */
function initPricingToggle() {
  var toggle = document.getElementById('billing-toggle');
  if (!toggle) return;

  function updatePrices() {
    var annual = toggle.checked;
    document.querySelectorAll('[data-monthly-price]').forEach(function(el) {
      var monthly = el.dataset.monthlyPrice;
      var ann     = el.dataset.annualPrice || (parseFloat(monthly) * 10).toFixed(0);
      el.textContent = annual ? ann : monthly;
    });
    document.querySelectorAll('[data-billing-label]').forEach(function(el) {
      el.textContent = annual ? '/year' : '/month';
    });
    document.querySelectorAll('[data-annual-saving]').forEach(function(el) {
      el.style.display = annual ? 'inline-block' : 'none';
    });
  }

  toggle.addEventListener('change', updatePrices);
  updatePrices();
}

// ── Feature vote / upvote ─────────────────────────────────────────────────────

/**
 * Vote for a feature. One vote per feature per browser session.
 * @param {string} featureId
 * @param {string} featureName
 */
async function voteForFeature(featureId, featureName) {
  var storageKey = 'bf_voted_' + featureId;
  if (localStorage.getItem(storageKey)) return { alreadyVoted: true };
  try {
    var res = await fetch(WAITLIST_API, {
      method: 'POST',
      headers: _wHeaders(),
      body: JSON.stringify({
        collection: VOTES_COLLECTION,
        data: { feature_id: featureId, feature_name: featureName, voted_at: new Date().toISOString() },
      }),
    });
    if (res.ok) {
      localStorage.setItem(storageKey, '1');
      return { success: true };
    }
  } catch(e) { /* fail silently */ }
  return { success: false };
}

// ── Personalisation ───────────────────────────────────────────────────────────

/** Returns the stored waitlist email, or null. */
function getWaitlistEmail() {
  return localStorage.getItem('bf_waitlist_email');
}

/** Returns true if the user has already joined the waitlist in this browser. */
function hasJoinedWaitlist() {
  return !!getWaitlistEmail();
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initWaitlistForm();
  initPricingToggle();
  updateWaitlistCountDisplay();

  if (hasJoinedWaitlist()) {
    document.querySelectorAll('[data-waitlist-cta]').forEach(function(el) {
      el.textContent = "You're on the list ✓";
      el.classList.add('cta--joined');
      el.setAttribute('disabled', 'true');
    });
  }
});
`;

// ── System prompt section ─────────────────────────────────────────────────────

export const SAAS_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🚀 SAAS SCAFFOLD — APPLY FOR ALL SAAS/STARTUP/PLATFORM SITES
════════════════════════════════════════════════════════════════════

When waitlist.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="waitlist.js"></script>   <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Social proof counter — add to hero and pricing CTA sections:**
\`\`\`html
<span data-waitlist-count>Loading...</span> already waiting
\`\`\`

**Waitlist form — EXACT structure (any page with a CTA):**
\`\`\`html
<form id="waitlist-form">
  <input type="email" id="waitlist-email" required placeholder="you@company.com">
  <select id="waitlist-plan">
    <option value="">Plan interest (optional)</option>
    <option value="starter">Starter</option>
    <option value="pro">Pro</option>
    <option value="enterprise">Enterprise</option>
  </select>
  <div id="waitlist-error" style="display:none" class="error-msg"></div>
  <button type="submit" data-waitlist-cta>Join the Waitlist</button>
</form>
<div id="waitlist-success" style="display:none">
  <h3>🎉 You're on the list!</h3>
  <p>We'll email you as soon as we launch. You can skip the queue by referring a friend.</p>
</div>
\`\`\`

**Pricing page (pricing.html) — MANDATORY structure:**

1. Billing toggle at top:
\`\`\`html
<div class="billing-toggle">
  <span>Monthly</span>
  <label class="toggle-switch">
    <input type="checkbox" id="billing-toggle">
    <span class="toggle-track"></span>
  </label>
  <span>Annual <span class="saving-badge" data-annual-saving style="display:none">Save 17%</span></span>
</div>
\`\`\`

2. Three pricing tiers — middle tier is "Most Popular":
\`\`\`html
<div class="pricing-grid">
  <div class="pricing-card">
    <h3>Starter</h3>
    <p class="price">&pound;<span data-monthly-price="29" data-annual-price="290">29</span><span data-billing-label>/month</span></p>
    <ul class="feature-list">...</ul>
    <a href="#waitlist-form" class="btn-secondary">Get Started</a>
  </div>
  <div class="pricing-card pricing-card--featured">
    <span class="popular-badge">Most Popular</span>
    <h3>Pro</h3>
    <p class="price">&pound;<span data-monthly-price="79" data-annual-price="790">79</span><span data-billing-label>/month</span></p>
    <ul class="feature-list">...</ul>
    <a href="#waitlist-form" class="btn-primary" data-waitlist-cta>Join Waitlist</a>
  </div>
  <div class="pricing-card">
    <h3>Enterprise</h3>
    <p class="price">Custom</p>
    <ul class="feature-list">...</ul>
    <a href="contact.html" class="btn-secondary">Talk to Sales</a>
  </div>
</div>
\`\`\`

3. Feature comparison table below the cards — use a real HTML table with tick/cross cells.

**Homepage (index.html) MUST include:**
- Hero: bold headline + subheadline + waitlist form (NOT a "learn more" link — the form goes IN the hero)
- Social proof row: logos of well-known companies OR metrics ("10,000+ teams", "99.9% uptime", "< 200ms")
- Problem → Solution section: 2-column, "Before [Product]" vs "After [Product]"
- Feature grid: 6 cards, each with an SVG icon (inline, not emoji), feature name, 2-sentence benefit
- How it works: 3-step numbered sequence with screenshots or mockup images
- Testimonials: 3 cards, real-looking names and company names
- Pricing preview: condensed version linking to pricing.html
- Final CTA section: dark/gradient background, headline, waitlist form repeated

**index.html hero MUST NOT have a "Coming Soon" placeholder.
Write actual compelling copy about what the product does.**

**CONTENT RULES for SaaS sites:**
- Headlines: outcome-focused ("Ship 10× faster", not "Our great platform")
- Feature names: specific verbs ("Automate your workflows", not "Automation")
- Pricing: use realistic GBP prices — Starter £19-29, Pro £49-99, Enterprise "Custom"
- Testimonials: include company name and job title for credibility
- Social proof: use realistic logos (text-based, grey, equal size)
- Call-to-actions: use the waitlist form — NEVER a placeholder "Sign Up" button with no backend
`;

// ── Pricing page script ───────────────────────────────────────────────────────

export const SAAS_PRICING_PAGE_SCRIPT = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Pricing toggle is initialised by waitlist.js initPricingToggle()
  document.querySelectorAll('[data-vote-feature]').forEach(function(btn) {
    var featureId   = btn.dataset.voteFeature;
    var featureName = btn.dataset.featureName || featureId;
    var storageKey  = 'bf_voted_' + featureId;
    if (localStorage.getItem(storageKey)) {
      btn.textContent = '✓ Voted';
      btn.disabled = true;
    }
    btn.addEventListener('click', async function() {
      var result = await voteForFeature(featureId, featureName);
      if (result.success || result.alreadyVoted) {
        btn.textContent = '✓ Voted';
        btn.disabled = true;
        var card = btn.closest('[data-feature-card]');
        if (card) {
          var countEl = card.querySelector('[data-vote-count]');
          if (countEl && !result.alreadyVoted) {
            countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
          }
        }
      }
    });
  });
});
</script>`;
