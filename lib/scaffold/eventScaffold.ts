// lib/scaffold/eventScaffold.ts
// Shared JS module for event / conference / meetup HTML sites.
// Injected when detectScaffoldType() returns 'event'.
// Provides: live countdown timer, schedule/agenda filter,
//           speaker card reveal, registration form, and session bookmark.

export const EVENT_JS_TEMPLATE = `// ============================================================
// event.js — BuildFlow Event Module
// Countdown timer, schedule filter, speaker reveal,
// registration form, and session bookmarks.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

var EVENT_API = '/api/public/data/BUILDFLOW_PROJECT_ID';
var REGISTRATIONS_COLLECTION = 'event_registrations';

function _eHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Registration form ─────────────────────────────────────────────────────────

/**
 * Register for the event.
 * @param {Object} data - { name, email, ticket_type?, company?, dietary? }
 * @returns {Promise<Object>}
 */
async function registerForEvent(data) {
  data = Object.assign({}, data, { registered_at: new Date().toISOString() });
  var res = await fetch(EVENT_API, {
    method: 'POST',
    headers: _eHeaders(),
    body: JSON.stringify({ collection: REGISTRATIONS_COLLECTION, data: data }),
  });
  if (!res.ok) {
    var err = await res.json().catch(function() { return {}; });
    if (err.error && err.error.includes('duplicate')) return { duplicate: true };
    throw new Error(err.error || 'Registration failed');
  }
  var d = await res.json();
  return d.record ? d.record.data : d;
}

/**
 * Wire up the event registration form.
 * Looks for: form#registration-form
 * Shows #registration-success on submission.
 */
function initRegistrationForm() {
  var form = document.getElementById('registration-form');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    var errEl = document.getElementById('registration-error');
    var successEl = document.getElementById('registration-success');

    var data = {};
    new FormData(form).forEach(function(v, k) { data[k] = v.toString().trim(); });
    if (!data.email || !data.name) return;

    if (btn) { btn.disabled = true; btn.textContent = 'Registering...'; }
    if (errEl) errEl.style.display = 'none';

    try {
      var result = await registerForEvent(data);
      localStorage.setItem('bf_event_registered', data.email);
      localStorage.setItem('bf_event_ticket_type', data.ticket_type || 'general');

      if (result.duplicate) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Register'; }
        if (errEl) {
          errEl.textContent = "You're already registered with this email.";
          errEl.style.display = 'block';
        }
        return;
      }

      if (form) form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
      _updateRegistrationCTAs();
    } catch(err) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Register'; }
      if (errEl) {
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
      }
    }
  });

  var btn = form.querySelector('[type=submit]');
  if (btn) btn.dataset.originalText = btn.textContent;
}

function _updateRegistrationCTAs() {
  if (!localStorage.getItem('bf_event_registered')) return;
  document.querySelectorAll('[data-register-cta]').forEach(function(el) {
    el.textContent = "You're registered ✓";
    el.classList.add('cta--registered');
    el.setAttribute('disabled', 'true');
  });
}

// ── Countdown timer ───────────────────────────────────────────────────────────

/**
 * Start a live countdown to the event date.
 * Target element: #event-countdown (or a custom selector)
 * Child elements: [data-countdown="days"], [data-countdown="hours"],
 *                 [data-countdown="minutes"], [data-countdown="seconds"]
 * @param {string|Date} targetDate - ISO string or Date object
 * @param {string}      [selector='#event-countdown']
 */
function initCountdown(targetDate, selector) {
  selector = selector || '#event-countdown';
  var container = document.querySelector(selector);
  if (!container) return;

  var target = new Date(targetDate).getTime();
  if (isNaN(target)) {
    console.warn('bf:countdown — invalid date:', targetDate);
    return;
  }

  function update() {
    var now  = Date.now();
    var diff = target - now;

    if (diff <= 0) {
      // Event has started
      container.classList.add('countdown--started');
      var startedMsg = container.querySelector('[data-countdown-started]');
      if (startedMsg) startedMsg.style.display = 'block';
      container.querySelectorAll('[data-countdown]').forEach(function(el) {
        el.textContent = '0';
      });
      return;
    }

    var days    = Math.floor(diff / 86400000);
    var hours   = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000)  / 60000);
    var seconds = Math.floor((diff % 60000)    / 1000);

    var parts = { days: days, hours: hours, minutes: minutes, seconds: seconds };
    Object.keys(parts).forEach(function(unit) {
      var el = container.querySelector('[data-countdown="' + unit + '"]');
      if (el) el.textContent = String(parts[unit]).padStart(2, '0');
    });

    setTimeout(update, 1000);
  }

  update();
}

// ── Schedule / agenda filter ──────────────────────────────────────────────────

/**
 * Wire up schedule track/day filtering.
 * Filter buttons: [data-track="track-name"] or [data-day="day-name"]
 *                 (use data-track="all" or data-day="all" for reset)
 * Session cards:  .session-card[data-track="..."][data-day="..."]
 */
function initScheduleFilter() {
  var trackBtns = document.querySelectorAll('[data-track]');
  var dayBtns   = document.querySelectorAll('[data-day]');
  var sessions  = Array.from(document.querySelectorAll('.session-card'));
  if (!sessions.length) return;

  var activeTrack = 'all';
  var activeDay   = 'all';

  function applyFilter() {
    sessions.forEach(function(card) {
      var matchTrack = activeTrack === 'all' || card.dataset.track === activeTrack;
      var matchDay   = activeDay   === 'all' || card.dataset.day   === activeDay;
      var visible    = matchTrack && matchDay;
      card.style.display = visible ? '' : 'none';
      if (visible) {
        card.style.opacity = '0';
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            card.style.transition = 'opacity .25s ease';
            card.style.opacity = '1';
          });
        });
      }
    });
  }

  trackBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      trackBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeTrack = btn.dataset.track;
      applyFilter();
    });
  });

  dayBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      dayBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeDay = btn.dataset.day;
      applyFilter();
    });
  });
}

// ── Speaker card reveal ───────────────────────────────────────────────────────

/**
 * Staggered reveal animation for speaker cards on scroll.
 */
function initSpeakerReveal() {
  var cards = document.querySelectorAll('.speaker-card');
  if (!cards.length) return;

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = (Array.from(cards).indexOf(entry.target) % 4) * 80;
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

// ── Session bookmarks ─────────────────────────────────────────────────────────

/**
 * Toggle-bookmark sessions in the schedule.
 * Bookmark buttons: [data-bookmark-session="session-id"]
 * Saves to localStorage as bf_bookmarks (array of session IDs).
 */
function initSessionBookmarks() {
  var STORAGE_KEY = 'bf_event_bookmarks';

  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function saveBookmarks(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  var bookmarks = getBookmarks();

  document.querySelectorAll('[data-bookmark-session]').forEach(function(btn) {
    var id = btn.dataset.bookmarkSession;
    if (bookmarks.includes(id)) btn.classList.add('bookmarked');

    btn.addEventListener('click', function() {
      var current = getBookmarks();
      if (current.includes(id)) {
        saveBookmarks(current.filter(function(x) { return x !== id; }));
        btn.classList.remove('bookmarked');
        btn.setAttribute('aria-label', 'Bookmark session');
      } else {
        current.push(id);
        saveBookmarks(current);
        btn.classList.add('bookmarked');
        btn.setAttribute('aria-label', 'Remove bookmark');
      }
    });
  });
}

// ── Auto-init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initRegistrationForm();
  initScheduleFilter();
  initSpeakerReveal();
  initSessionBookmarks();
  _updateRegistrationCTAs();

  // Auto-start countdown if data-event-date attribute is on <body> or #event-countdown
  var countdownEl = document.getElementById('event-countdown');
  if (countdownEl && countdownEl.dataset.eventDate) {
    initCountdown(countdownEl.dataset.eventDate);
  } else if (document.body.dataset.eventDate) {
    initCountdown(document.body.dataset.eventDate);
  }
});
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const EVENT_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🎤 EVENT SCAFFOLD — APPLY FOR ALL EVENT / CONFERENCE / MEETUP SITES
════════════════════════════════════════════════════════════════════

When event.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="event.js"></script>   <!-- FIRST -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Countdown timer — EXACT structure:**
\`\`\`html
<!-- Set data-event-date on the element; event.js auto-starts on DOMContentLoaded -->
<div id="event-countdown" data-event-date="2026-09-15T09:00:00Z">
  <div class="countdown-unit">
    <span data-countdown="days">00</span>
    <label>Days</label>
  </div>
  <div class="countdown-unit">
    <span data-countdown="hours">00</span>
    <label>Hours</label>
  </div>
  <div class="countdown-unit">
    <span data-countdown="minutes">00</span>
    <label>Minutes</label>
  </div>
  <div class="countdown-unit">
    <span data-countdown="seconds">00</span>
    <label>Seconds</label>
  </div>
  <p data-countdown-started style="display:none">The event is live! 🎉</p>
</div>
\`\`\`

**Registration form — EXACT structure:**
\`\`\`html
<form id="registration-form">
  <input type="text"  name="name"        required placeholder="Full name">
  <input type="email" name="email"       required placeholder="your@email.com">
  <input type="text"  name="company"     placeholder="Company / organisation (optional)">
  <select name="ticket_type">
    <option value="general">General Admission — Free</option>
    <option value="workshop">Workshop Pass — £49</option>
    <option value="vip">VIP Pass — £149</option>
  </select>
  <select name="dietary">
    <option value="">Dietary requirements (optional)</option>
    <option value="none">None</option>
    <option value="vegetarian">Vegetarian</option>
    <option value="vegan">Vegan</option>
    <option value="gluten-free">Gluten-free</option>
  </select>
  <p id="registration-error" style="display:none" class="error-msg"></p>
  <button type="submit" data-register-cta>Register Now</button>
</form>
<div id="registration-success" style="display:none">
  <h3>🎉 You're registered!</h3>
  <p>Check your inbox for your confirmation email and event details.</p>
</div>
\`\`\`

**Schedule page (schedule.html) — EXACT structure:**
\`\`\`html
<!-- Day filter -->
<div class="day-tabs">
  <button class="day-tab active" data-day="all">All Days</button>
  <button class="day-tab" data-day="day-1">Day 1 — 15 Sep</button>
  <button class="day-tab" data-day="day-2">Day 2 — 16 Sep</button>
</div>

<!-- Track filter -->
<div class="track-tabs">
  <button class="track-tab active" data-track="all">All Tracks</button>
  <button class="track-tab" data-track="main-stage">Main Stage</button>
  <button class="track-tab" data-track="workshops">Workshops</button>
  <button class="track-tab" data-track="networking">Networking</button>
</div>

<!-- Sessions -->
<div class="schedule-grid">
  <div class="session-card" data-day="day-1" data-track="main-stage">
    <div class="session-card__time">09:00 — 09:45</div>
    <div class="session-card__body">
      <h3 class="session-card__title">Opening Keynote: The Future of AI</h3>
      <p class="session-card__speaker">Dr. Sarah Chen · CTO, Nexus Labs</p>
      <p class="session-card__desc">A look at where AI is headed over the next five years.</p>
      <button data-bookmark-session="session-001" aria-label="Bookmark session">★</button>
    </div>
  </div>
  <!-- Minimum 8 sessions across 2 days and 3 tracks -->
</div>
\`\`\`

**Speakers page (speakers.html) — EXACT structure:**
\`\`\`html
<div class="speakers-grid">
  <div class="speaker-card">
    <img src="https://picsum.photos/seed/spk1/400/400" alt="Dr. Sarah Chen" class="speaker-card__photo">
    <div class="speaker-card__body">
      <h3 class="speaker-card__name">Dr. Sarah Chen</h3>
      <p class="speaker-card__title">CTO, Nexus Labs</p>
      <p class="speaker-card__bio">Leading AI researcher with 15+ years in machine learning.</p>
      <div class="speaker-card__links">
        <a href="#" aria-label="LinkedIn">in</a>
        <a href="#" aria-label="Twitter/X">𝕏</a>
      </div>
    </div>
  </div>
  <!-- Minimum 6 speakers. Cards animate in on scroll via initSpeakerReveal() -->
</div>
\`\`\`

**Homepage (index.html) MUST include:**
- Hero: event name, date/location, bold tagline, countdown (#event-countdown + data-event-date)
- Registration CTA button with data-register-cta (disables after registration)
- Headline speakers: 3-4 speaker cards teasing the full lineup
- "Why attend" section: 3-4 benefit cards (icons + short descriptions)
- Schedule preview: 3-4 featured sessions from the full agenda
- Venue section: location name, address, embedded map placeholder, nearby hotels
- Sponsors/partners: logo strip (greyscale)
- Registration form (or link to register.html)

**VISUAL STANDARDS for event sites:**
- Bold, high-energy design — dark hero with vibrant accent (electric blue, neon green, or deep purple)
- Large countdown timer is a centrepiece — must be visually prominent
- Speaker cards: square headshots, consistent size, hover effect
- Countdown digits should use a monospace or tabular font
- Use the event date consistently everywhere (don't leave "TBD" placeholders)
`;
