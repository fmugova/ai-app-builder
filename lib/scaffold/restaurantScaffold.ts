// lib/scaffold/restaurantScaffold.ts
// Full restaurant/hospitality scaffold.
// Injected when detectScaffoldType() returns 'restaurant'.

import Anthropic from '@anthropic-ai/sdk';

// ── Default opening hours ────────────────────────────────────────────────────
// Used as a fallback if the SQL migration hasn't run yet.
export const DEFAULT_OPENING_HOURS = {
  monday:    '12:00–15:00, 18:00–22:00',
  tuesday:   '12:00–15:00, 18:00–22:00',
  wednesday: '12:00–15:00, 18:00–22:00',
  thursday:  '12:00–15:00, 18:00–22:30',
  friday:    '12:00–15:00, 18:00–23:00',
  saturday:  '12:00–23:00',
  sunday:    '12:00–21:00',
};

// ── menu.js template ─────────────────────────────────────────────────────────

export const RESTAURANT_MENU_JS_TEMPLATE = `// ============================================================
// menu.js — BuildFlow Restaurant Data Layer
// Menu items, categories, dietary filters, reservations.
// Pages MUST NOT redeclare any function defined here.
// ============================================================

var MENU_SUPABASE_URL = '__SUPABASE_URL__';
var MENU_SUPABASE_KEY = '__SUPABASE_ANON_KEY__';

var _mh = {
  'apikey': MENU_SUPABASE_KEY,
  'Authorization': 'Bearer ' + MENU_SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function _mQuery(table, params) {
  params = params || '';
  var res = await fetch(MENU_SUPABASE_URL + '/rest/v1/' + table + params, { headers: _mh });
  if (!res.ok) throw new Error('Menu DB error: ' + res.statusText);
  return res.json();
}
async function _mInsert(table, body) {
  var res = await fetch(MENU_SUPABASE_URL + '/rest/v1/' + table, { method: 'POST', headers: _mh, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Menu DB insert error: ' + res.statusText);
  return res.json();
}

// ── Menu data ─────────────────────────────────────────────────────────────────

/** Fetch all active menu items, optionally filtered by category slug */
async function getMenuItems(category) {
  var params = '?active=eq.true&order=sort_order.asc,name.asc';
  if (category) params += '&category=eq.' + encodeURIComponent(category);
  return _mQuery('menu_items', params);
}

/** Fetch all menu categories in display order */
async function getMenuCategories() {
  return _mQuery('menu_categories', '?active=eq.true&order=sort_order.asc');
}

/** Fetch featured items (shown on homepage) */
async function getFeaturedDishes(limit) {
  limit = limit || 6;
  return _mQuery('menu_items', '?featured=eq.true&active=eq.true&order=sort_order.asc&limit=' + limit);
}

/**
 * Render menu items into a container.
 * @param {HTMLElement} container
 * @param {Object[]} items - array from getMenuItems()
 * @param {string[]} dietaryFilters - e.g. ['vegetarian', 'gluten-free']
 */
function renderMenuItems(container, items, dietaryFilters) {
  dietaryFilters = dietaryFilters || [];
  var filtered = dietaryFilters.length
    ? items.filter(function(item) {
        return dietaryFilters.every(function(f) {
          return item.dietary_flags && item.dietary_flags.includes(f);
        });
      })
    : items;

  if (!filtered.length) {
    container.innerHTML = '<p class="menu-empty">No dishes match your filters.</p>';
    return;
  }

  container.innerHTML = filtered.map(function(item) {
    var flags = (item.dietary_flags || []).map(function(f) {
      return '<span class="dietary-badge dietary-' + f.replace(/\\s+/g, '-') + '">' + _dietaryIcon(f) + ' ' + f + '</span>';
    }).join('');
    var img = item.image_url
      ? '<img src="' + item.image_url + '" alt="' + item.name + '" loading="lazy">'
      : '<img src="https://picsum.photos/seed/dish-' + item.id.slice(0,6) + '/400/300" alt="' + item.name + '" loading="lazy">';
    return '<div class="menu-item' + (item.featured ? ' menu-item--featured' : '') + '" data-id="' + item.id + '">' +
      '<div class="menu-item__img">' + img + '</div>' +
      '<div class="menu-item__body">' +
        '<div class="menu-item__header">' +
          '<h3 class="menu-item__name">' + item.name + '</h3>' +
          '<span class="menu-item__price">\\u00A3' + parseFloat(item.price).toFixed(2) + '</span>' +
        '</div>' +
        (item.description ? '<p class="menu-item__desc">' + item.description + '</p>' : '') +
        (flags ? '<div class="menu-item__flags">' + flags + '</div>' : '') +
        (item.allergens ? '<p class="menu-item__allergens">Contains: ' + item.allergens + '</p>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function _dietaryIcon(flag) {
  var icons = {
    'vegetarian': '\\u{1F33F}',
    'vegan': '\\u{1F331}',
    'gluten-free': '\\u{1F33E}',
    'dairy-free': '\\u{1F95B}',
    'nut-free': '\\u{1F95C}',
    'halal': '\\u{1F54A}',
    'kosher': '\\u2721'
  };
  return icons[flag.toLowerCase()] || '\\u2022';
}

/**
 * Set up dietary filter buttons.
 * Expects buttons with data-filter="vegetarian" etc.
 * @param {Object[]} allItems - full unfiltered item array from getMenuItems()
 */
function initDietaryFilters(allItems) {
  var active = [];
  document.querySelectorAll('[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var f = btn.dataset.filter;
      var idx = active.indexOf(f);
      if (idx === -1) { active.push(f); btn.classList.add('active'); }
      else { active.splice(idx, 1); btn.classList.remove('active'); }
      var grid = document.getElementById('menu-grid');
      if (grid) renderMenuItems(grid, allItems, active);
    });
  });
}

/**
 * Set up category tab navigation.
 * Expects tabs with data-category="starters" etc.
 */
function initCategoryTabs() {
  document.querySelectorAll('[data-category]').forEach(function(tab) {
    tab.addEventListener('click', async function() {
      document.querySelectorAll('[data-category]').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var grid = document.getElementById('menu-grid');
      if (!grid) return;
      grid.innerHTML = '<div class="menu-loading">Loading...</div>';
      var items = await getMenuItems(tab.dataset.category === 'all' ? null : tab.dataset.category);
      renderMenuItems(grid, items, []);
    });
  });
}

// ── Reservations ──────────────────────────────────────────────────────────────

/**
 * Submit a reservation to the database.
 * @param {Object} data - { name, email, phone, date, time, party_size, notes }
 * @returns {Promise<Object>} created reservation record
 */
async function createReservation(data) {
  var reservation = {
    customer_name:    data.name,
    customer_email:   data.email,
    customer_phone:   data.phone || '',
    reservation_date: data.date,
    reservation_time: data.time,
    party_size:       parseInt(data.party_size) || 2,
    special_notes:    data.notes || '',
    status: 'pending',
  };
  var result = await _mInsert('reservations', reservation);
  return Array.isArray(result) ? result[0] : result;
}

// ── Opening hours helpers ─────────────────────────────────────────────────────

var OPENING_HOURS = '__OPENING_HOURS_JSON__';

/**
 * Returns today's opening hours string, or "Closed" if closed today.
 */
function getTodayHours() {
  try {
    var hours = typeof OPENING_HOURS === 'string' ? JSON.parse(OPENING_HOURS) : OPENING_HOURS;
    var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    var today = days[new Date().getDay()];
    return hours[today] || 'See website for hours';
  } catch(e) { return 'See website for hours'; }
}

/** Returns true if the restaurant is currently open based on OPENING_HOURS. */
function isOpenNow() {
  try {
    var hours = typeof OPENING_HOURS === 'string' ? JSON.parse(OPENING_HOURS) : OPENING_HOURS;
    var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    var today = days[new Date().getDay()];
    var todayHours = hours[today];
    if (!todayHours || todayHours.toLowerCase() === 'closed') return false;
    var parts = todayHours.split(/[\\u2013\\-]/);
    if (parts.length < 2) return false;
    var now = new Date();
    var nowMins = now.getHours() * 60 + now.getMinutes();
    var openMins = _parseMins(parts[0].trim());
    var closeMins = _parseMins(parts[1].trim());
    return nowMins >= openMins && nowMins < closeMins;
  } catch(e) { return false; }
}

function _parseMins(timeStr) {
  var m = timeStr.match(/(\\d+):(\\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

/** Update all [data-today-hours] and [data-open-status] elements. */
function updateOpenStatus() {
  var hours = getTodayHours();
  var open  = isOpenNow();
  document.querySelectorAll('[data-today-hours]').forEach(function(el) { el.textContent = hours; });
  document.querySelectorAll('[data-open-status]').forEach(function(el) {
    el.textContent = open ? 'Open now' : 'Closed';
    el.className = el.className.replace(/\\b(open|closed)\\b/g, '') + (open ? ' open' : ' closed');
  });
}

document.addEventListener('DOMContentLoaded', updateOpenStatus);
`;

// ── SQL migration generator ───────────────────────────────────────────────────

const anthropic = new Anthropic();

export async function generateRestaurantMigration(
  siteName: string,
  userPrompt: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3500,
    system: `You are generating a Supabase SQL migration for a restaurant website.
Output ONLY valid SQL — no markdown, no code fences, no explanation.

The SQL must:
1. Create these tables (IF NOT EXISTS):
   CREATE TABLE IF NOT EXISTS menu_categories (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
     sort_order INT DEFAULT 0, active BOOLEAN DEFAULT true
   );
   CREATE TABLE IF NOT EXISTS menu_items (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     category TEXT NOT NULL REFERENCES menu_categories(slug),
     name TEXT NOT NULL, description TEXT, price DECIMAL(8,2) NOT NULL,
     image_url TEXT, dietary_flags TEXT[] DEFAULT '{}',
     allergens TEXT, featured BOOLEAN DEFAULT false,
     active BOOLEAN DEFAULT true, sort_order INT DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE TABLE IF NOT EXISTS reservations (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
     customer_phone TEXT, reservation_date DATE NOT NULL,
     reservation_time TIME NOT NULL, party_size INT NOT NULL,
     special_notes TEXT, status TEXT DEFAULT 'pending',
     created_at TIMESTAMPTZ DEFAULT now()
   );

2. Enable RLS + public policies:
   ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
   CREATE POLICY IF NOT EXISTS "Public read categories" ON menu_categories FOR SELECT USING (true);
   CREATE POLICY IF NOT EXISTS "Public read menu" ON menu_items FOR SELECT USING (true);
   CREATE POLICY IF NOT EXISTS "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);

3. INSERT 4-6 realistic menu categories matching the restaurant type.
   Each with a slug (lowercase-hyphenated), e.g. 'starters', 'mains', 'desserts', 'drinks'.

4. INSERT 16-24 realistic menu items spread across the categories.
   - Include real dish names, appetising descriptions, realistic UK prices (6-28 GBP)
   - Set dietary_flags to arrays like ARRAY['vegetarian'] or ARRAY['vegan','gluten-free']
   - Set featured=true on 4-6 most popular dishes
   - image_url: use NULL (menu.js generates picsum URLs)
   - allergens: e.g. 'gluten, dairy' or NULL

5. INSERT a realistic opening_hours record:
   CREATE TABLE IF NOT EXISTS opening_hours (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     day TEXT NOT NULL, hours TEXT NOT NULL
   );
   ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
   CREATE POLICY IF NOT EXISTS "Public read hours" ON opening_hours FOR SELECT USING (true);
   Then INSERT 7 rows (monday through sunday) with realistic hours for the restaurant type.`,
    messages: [
      {
        role: 'user',
        content: `Generate the SQL migration for: "${siteName}"\n\nRestaurant description: ${userPrompt}`,
      },
    ],
  } as Parameters<typeof anthropic.messages.create>[0]) as Anthropic.Message;

  const raw = (response.content[0] as { type: string; text: string })?.text ?? '';
  return raw.replace(/^```(?:sql)?\n?/m, '').replace(/\n?```$/m, '').trim();
}

// ── System prompt section ─────────────────────────────────────────────────────

export const RESTAURANT_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🍽️ RESTAURANT SCAFFOLD — APPLY FOR ALL RESTAURANT/FOOD SITES
════════════════════════════════════════════════════════════════════

When menu.js is included, these patterns are MANDATORY.

**Script load order:**
\`\`\`html
<script src="menu.js"></script>    <!-- FIRST — defines all menu functions -->
<script src="auth.js"></script>
<script src="script.js"></script>
<script>/* page inline script */</script>
\`\`\`

**Opening hours widget (every page):**
Add to the nav or hero section — updates automatically from menu.js:
\`\`\`html
<span data-open-status class="status-badge">Open now</span>
<span data-today-hours>Loading...</span>
\`\`\`

**Menu page (menu.html) — EXACT structure required:**
\`\`\`html
<!-- Category tabs -->
<div class="menu-tabs">
  <button class="menu-tab active" data-category="all">All</button>
  <!-- Additional tabs rendered by JS from getMenuCategories() -->
</div>
<!-- Dietary filter buttons -->
<div class="dietary-filters">
  <button class="filter-btn" data-filter="vegetarian">🌿 Vegetarian</button>
  <button class="filter-btn" data-filter="vegan">🌱 Vegan</button>
  <button class="filter-btn" data-filter="gluten-free">🌾 Gluten-Free</button>
</div>
<!-- Menu grid — populated by renderMenuItems() -->
<div id="menu-grid" class="menu-grid"></div>
\`\`\`

**Menu page inline script:**
\`\`\`javascript
document.addEventListener('DOMContentLoaded', async function() {
  var allItems = await getMenuItems();
  renderMenuItems(document.getElementById('menu-grid'), allItems, []);
  initDietaryFilters(allItems);

  var categories = await getMenuCategories();
  var tabContainer = document.querySelector('.menu-tabs');
  categories.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'menu-tab';
    btn.dataset.category = cat.slug;
    btn.textContent = cat.name;
    tabContainer.appendChild(btn);
  });
  initCategoryTabs();
});
\`\`\`

**Reservations page (reservations.html) — EXACT form + script:**
Form fields: name, email, phone, date, time (select from slots), party_size, notes.
\`\`\`javascript
document.addEventListener('DOMContentLoaded', function() {
  var timeSelect = document.getElementById('res-time');
  var slots = ['12:00','12:30','13:00','13:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'];
  slots.forEach(function(t) {
    var opt = document.createElement('option'); opt.value = t; opt.textContent = t; timeSelect.appendChild(opt);
  });
  document.getElementById('res-date').min = new Date().toISOString().split('T')[0];

  var form = document.getElementById('reservation-form');
  var successEl = document.getElementById('res-success');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Booking...';
    try {
      await createReservation({
        name: document.getElementById('res-name').value,
        email: document.getElementById('res-email').value,
        phone: document.getElementById('res-phone').value,
        date: document.getElementById('res-date').value,
        time: document.getElementById('res-time').value,
        party_size: document.getElementById('res-party').value,
        notes: document.getElementById('res-notes').value,
      });
      form.style.display = 'none';
      successEl.style.display = 'block';
    } catch(err) {
      btn.disabled = false; btn.textContent = 'Book Table';
      alert('Booking failed. Please call us directly.');
    }
  });
});
\`\`\`

**Homepage featured dishes — use getFeaturedDishes():**
\`\`\`javascript
document.addEventListener('DOMContentLoaded', async function() {
  var dishes = await getFeaturedDishes(6);
  var container = document.getElementById('featured-dishes');
  if (container) renderMenuItems(container, dishes, []);
});
\`\`\`

**CONTENT REQUIREMENTS for restaurant sites:**
- hero: Full-width hero with appetising atmosphere image, opening hours badge, "Book a Table" + "View Menu" CTAs
- index.html: Featured dishes grid, today's specials callout, testimonials, location preview
- menu.html: Category tabs + dietary filters + menu grid (NO static hardcoded dishes)
- reservations.html: Form + map + parking info + what to expect
- ALWAYS include: phone number, address, postcode on every page (in footer at minimum)
- NEVER use generic food images — use picsum with food-specific seeds: https://picsum.photos/seed/{restaurant-name}-dish-1/800/500
`;

// ── Per-page reservation script ───────────────────────────────────────────────

export const RESERVATION_PAGE_SCRIPT = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  var timeSelect = document.getElementById('res-time');
  if (timeSelect) {
    var slots = ['12:00','12:30','13:00','13:30','14:00','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'];
    slots.forEach(function(t) {
      var opt = document.createElement('option'); opt.value = t; opt.textContent = t; timeSelect.appendChild(opt);
    });
  }
  var dateInput = document.getElementById('res-date');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
  var form = document.getElementById('reservation-form');
  var successEl = document.getElementById('res-success');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      if (btn) { btn.disabled = true; btn.textContent = 'Booking...'; }
      try {
        await createReservation({
          name:       (document.getElementById('res-name')  || {}).value || '',
          email:      (document.getElementById('res-email') || {}).value || '',
          phone:      (document.getElementById('res-phone') || {}).value || '',
          date:       (document.getElementById('res-date')  || {}).value || '',
          time:       (document.getElementById('res-time')  || {}).value || '',
          party_size: (document.getElementById('res-party') || {}).value || '2',
          notes:      (document.getElementById('res-notes') || {}).value || '',
        });
        if (form) form.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
      } catch(err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Book Table'; }
        alert('Booking failed — please call us directly.');
      }
    });
  }
});
</script>`;
