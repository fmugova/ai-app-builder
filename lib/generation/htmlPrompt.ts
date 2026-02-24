// lib/generation/htmlPrompt.ts
// The correct system + user prompts for plain HTML multi-page generation.
// The JSX-in-HTML bug (rendering <Hero /> as literal text) is caused by
// using a React-oriented system prompt for HTML output. This fixes that entirely.

import type { DetectedPage } from "@/lib/generation/detectOutputMode";

export interface HtmlGenerationSpec {
  siteName: string;
  prompt: string;
  pages: DetectedPage[];
  designNotes?: string;
  colorScheme?: string;
}

export const HTML_SYSTEM_PROMPT = `You are an expert frontend developer generating production-ready multi-page websites using HTML, Tailwind CSS (CDN), and vanilla JavaScript.

## ABSOLUTE RULES -- VIOLATIONS CAUSE BROKEN PREVIEWS

### Never use React or JSX syntax
- NEVER write component tags like <Hero />, <NavBar />, <Footer />, <ServicesPreview />
- NEVER write JSX expressions like {items.map(...)} or {condition && <div>}
- NEVER import from 'react' or use React.createElement
- NEVER write "use client" or React hooks
- NEVER write TypeScript -- only plain JavaScript

### HTML output requirements
- Every HTML file must be a complete, standalone document: <!DOCTYPE html> → <html lang="en"> → <head> → <body>
- Include Tailwind CDN in EVERY page <head>: <script src="https://cdn.tailwindcss.com"></script>
- Navigation between pages uses plain <a href="about.html"> links (no router)
- Every page must have REAL, COMPLETE content — no empty sections, no placeholder divs

### Styling with Tailwind CDN
- Use Tailwind utility classes directly on HTML elements for ALL layout and styling
- Keep style.css for CSS custom properties and any complex animations only
- Use a Tailwind config block for brand colors:
  <script>tailwind.config = { theme: { extend: { colors: { brand: '#YOUR_COLOR' } } } }</script>
- Prefer Tailwind's built-in responsive prefixes (sm:, md:, lg:) over custom media queries

### Visual quality -- CRITICAL for competitive output
- Hero sections: full-width gradient or image background, large bold headline, compelling sub-copy, 2 CTA buttons
- Cards: drop-shadow, rounded-2xl, hover:shadow-xl hover:-translate-y-1 transition
- Images: use <img src="https://picsum.photos/seed/{UNIQUE_SEED}/{W}/{H}" alt="..."> for every image placeholder
  - Always use a unique seed per image (e.g. "hero1", "team2", "product3")
  - Standard sizes: hero 1200×600, cards 600×400, team 300×300, thumbnails 400×300
- Color: rich gradient CTAs (bg-gradient-to-r from-indigo-600 to-purple-600), not flat single-color buttons

### Content requirements -- this is critical
- Every section must have actual text content — never an empty <section> or <div>
- Hero sections: real headline, real subheading, real CTA button with text
- Card grids: at least 3–6 cards with real titles, descriptions, images, and details
- Contact forms: name, email, subject, message fields + submit button
- Footers: real links, copyright, social media icons

### Working form submissions (no backend needed)
For ALL contact/inquiry forms:
- Show a success message on submit instead of navigating away:
  <form id="contact-form" onsubmit="handleFormSubmit(event)">...</form>
  Then in script.js:
  function handleFormSubmit(e) {
    e.preventDefault();
    document.getElementById('contact-form').style.display='none';
    document.getElementById('form-success').style.display='block';
  }
- Include a hidden success div: <div id="form-success" style="display:none">✓ Message sent!</div>

### JavaScript
- Vanilla JS only — addEventListener, querySelector, fetch for APIs
- Animations: CSS transitions + IntersectionObserver for scroll reveal
- Mobile nav: hamburger toggle for small screens
- NO import/export statements at the module level unless using type="module"

Every HTML file must be 100% renderable by a browser immediately. No build step required.`;

/**
 * Build the user-facing generation prompt for HTML sites
 */
export function buildHtmlGenerationPrompt(spec: HtmlGenerationSpec): string {
  const pageList = spec.pages.map((p, i) => {
    const filename = p.slug === "index" ? "index.html" : `${p.slug}.html`;
    return `${i + 1}. ${filename} -- ${p.name} page${p.description ? `\n   Content: ${p.description}` : ""}`;
  }).join("\n");

  const navLinks = spec.pages.map((p) => {
    const filename = p.slug === "index" ? "index.html" : `${p.slug}.html`;
    return `<a href="${filename}">${p.name}</a>`;
  }).join(" | ");

  return `Generate a complete multi-page website for "${spec.siteName}".

## User's specification
${spec.prompt}

## Pages to generate (ALL required -- do not skip any)
${pageList}

## Design requirements
${spec.designNotes ?? "Modern, professional design matching the brand"}
${spec.colorScheme ? `Color scheme: ${spec.colorScheme}` : ""}

## Files to generate
You MUST generate ALL of these files:
${spec.pages.map((p) => `- ${p.slug === "index" ? "index.html" : `${p.slug}.html`}`).join("\n")}
- style.css (shared across all pages)
- script.js (shared animations and interactions)

## Navigation
Every page must have the same navigation bar with links to all pages:
${navLinks}

## Critical content requirements per page
${spec.pages.map((p) => buildPageContentSpec(p, spec.siteName)).join("\n\n")}

## Output format
Return ONLY a valid JSON object:
{
  "index.html": "<!DOCTYPE html>...",
  "${spec.pages.find(p => p.slug !== "index")?.slug ?? "about"}.html": "<!DOCTYPE html>...",
  "style.css": "...",
  "script.js": "..."
}

CRITICAL: Every HTML file value must start with <!DOCTYPE html> and be a complete, working HTML page with full content. No empty pages. No JSX. No React components.`;
}

/**
 * Generate detailed content specification per page type
 * This prevents blank pages by telling Claude exactly what content to create
 */
function buildPageContentSpec(page: DetectedPage, siteName: string): string {
  const slug = page.slug.toLowerCase();

  const specs: Record<string, string> = {
    index: `HOME PAGE (index.html) -- must include:
  - Hero section: large headline, compelling subheading, 2 CTA buttons, hero image/graphic
  - Featured highlights (3+ cards/items) showcasing key services or products
  - Brief "about" teaser with link to full about page
  - Testimonials or social proof section
  - Footer with navigation, contact info, copyright`,

    about: `ABOUT PAGE (about.html) -- must include:
  - About hero with page title
  - Main bio/story text (3+ paragraphs of real content)
  - Team section or founder info with roles
  - Values or mission section (3+ items)
  - Timeline or milestones if applicable
  - CTA to contact page`,

    services: `SERVICES PAGE (services.html) -- must include:
  - Services hero with headline
  - Grid of service cards (minimum 4) each with: name, description, price/detail, icon/image
  - How it works section (3 steps)
  - FAQ section (3+ questions)
  - CTA section to book/contact`,

    contact: `CONTACT PAGE (contact.html) -- must include:
  - Page hero with title
  - Working HTML contact form: name (required), email (required), subject, message (required), submit button
  - Form validation feedback messages
  - Contact details section: address, phone, email, hours
  - Map placeholder or directions
  - Social media links`,

    projects: `PROJECTS PAGE (projects.html) -- must include:
  - Page hero
  - Filter buttons for categories
  - Grid of 6 project cards each with: title, description, tech tags, image placeholder, links
  - Each card must have real project names and descriptions`,

    products: `PRODUCTS PAGE (products.html) -- must include:
  - Page hero with "Products" or store name
  - Filter/sort bar
  - Product grid (6+ items) each with: product name, image placeholder, price, "Add to cart" button, brief description
  - Real product names and prices -- no empty cards`,

    blog: `BLOG PAGE (blog.html) -- must include:
  - Page hero
  - Featured post (large) with real title, excerpt, date, author
  - Grid of 5+ blog post cards with real titles and excerpts
  - Category filter sidebar or tags`,

    menu: `MENU PAGE (menu.html) -- must include:
  - Page hero
  - Category sections (Starters, Mains, Desserts, Drinks, etc.)
  - Each item: name, description, price in correct currency
  - At least 4 items per category`,

    pricing: `PRICING PAGE (pricing.html) -- must include:
  - Page hero
  - 3 pricing tiers (e.g. Basic, Pro, Enterprise) with features list
  - Toggle monthly/annual if relevant
  - FAQ section
  - CTA buttons for each tier`,

    onboarding: `ONBOARDING PAGE (onboarding.html) -- must include:
  - Multi-step wizard UI (steps 1, 2, 3 visible)
  - Step 1: user goals selection (clickable option cards)
  - Step 2: preferences/settings form
  - Step 3: confirmation/completion
  - Progress bar showing current step
  - Next/Back navigation buttons`,

    dashboard: `DASHBOARD PAGE (dashboard.html) -- must include:
  - Sidebar navigation with all main sections
  - Stats cards (4 metrics with numbers and labels)
  - Chart placeholder or data table
  - Recent activity list
  - Quick action buttons`,

    login: `LOGIN PAGE (login.html) -- must include:
  - Centered login card
  - Email + password fields
  - "Remember me" checkbox
  - "Forgot password" link
  - Submit button
  - Link to signup page`,

    signup: `SIGNUP PAGE (signup.html) -- must include:
  - Centered signup card
  - Name, email, password, confirm password fields
  - Terms checkbox
  - Submit button
  - Link to login page`,
  };

  const specific = specs[slug];
  if (specific) return specific;

  // Generic fallback for any page
  return `${page.name.toUpperCase()} PAGE (${page.slug}.html) -- must include:
  - Page hero with real title and subheading relevant to ${siteName}
  - Main content section with at least 3 subsections
  - At least one interactive element (form, filter, or expandable)
  - CTA section linking to related pages
  - Same shared navigation and footer as all other pages`;
}
