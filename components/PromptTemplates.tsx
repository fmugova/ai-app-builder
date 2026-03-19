'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

// P.F.D.A. starter template — fills the prompt with structured placeholders
const PFDA_STARTER = `[P] Persona & Purpose:
App for: [who is it for? e.g. "a freelance project manager"]
Goal: [what's the big win? e.g. "to track billable hours and invoice clients"]

[F] Features & Logic:
Must-haves:
- [feature 1, e.g. "User login / signup"]
- [feature 2, e.g. "Project dashboard with time tracker"]
- [feature 3, e.g. "Invoice generator with PDF export"]
Logic: [how do things flow? e.g. "User starts timer → stops it → hours added to project total"]

[D] Data & Tech Stack:
Stack: [e.g. "Next.js + Supabase" or "leave blank for best choice"]
Store: [what gets saved? e.g. "users, projects, time entries, invoices"]

[A] Aesthetics & Feel:
Style: [e.g. "Clean and minimal, dark sidebar"]
Pages: [list the separate pages, e.g. "Home, About, Services, Contact"]
Layout: [e.g. "Sidebar navigation, card-based dashboard, data tables"]`;

const QUICK_TEMPLATES = [
  // ── Simple single-file HTML ───────────────────────────────────────────────
  {
    label: '🔢 Calculator',
    prompt: `Build a beautiful calculator as a single HTML file.

Features:
- Standard arithmetic: add, subtract, multiply, divide
- Percentage (%) and sign-toggle (+/-) buttons
- Decimal point support, keyboard input
- Calculation history log (last 5 results shown below display)
- Smooth button press animations

Design: dark charcoal background, electric orange accent buttons, large clear display, modern rounded layout. No dependencies — pure HTML + CSS + JavaScript in one file.`,
    type: 'single-html',
  },
  {
    label: '🌤️ Weather Card',
    prompt: `Create a beautiful weather dashboard widget as a single HTML file.

Features:
- City search input that fetches live weather from the Open-Meteo API (free, no key needed)
- Current conditions: temperature, feels-like, humidity, wind speed, UV index
- 5-day forecast strip with icons
- Dynamic background gradient that changes with weather (sunny/cloudy/rainy/night)
- Animated weather icons using CSS (sun rays rotate, rain drops fall)

Design: glassmorphism card on a sky-blue gradient, clean sans-serif typography, smooth transitions. Pure HTML + CSS + JavaScript, no libraries.`,
    type: 'single-html',
  },

  // ── Multi-page HTML (no backend) ─────────────────────────────────────────
  {
    label: '☕ Coffee Shop',
    prompt: `Create a multi-page website for a coffee shop called "Brew & Bean" with these SEPARATE pages:

1. Home — hero banner with call-to-action, 3 featured drink cards, customer testimonials carousel, newsletter signup form
2. Menu — full menu grid (hot drinks, cold drinks, pastries) with prices, descriptions, and placeholder images
3. About — brand story section, meet-the-team cards (3 people), "our values" icons strip
4. Contact — contact form (name, email, message), opening hours table, embedded Google Maps placeholder

Design: warm browns (#4a2c17), creams (#fdf6ec), orange accents (#e07b39). Cozy, modern café aesthetic. Smooth scroll, sticky nav, hover animations.
Tech: 4 separate HTML files with shared CSS file and shared nav/footer. Vanilla JavaScript for the carousel and form validation. No backend, no database.`,
    type: 'simple-website',
  },
  {
    label: '💼 Portfolio',
    prompt: `Create a professional developer portfolio website with 4 separate pages:

1. Home — animated hero with name/tagline, tech stack icon grid, 3 featured project cards, CTA to contact
2. Projects — filterable grid of 6 project cards (title, description, tech badges, live/GitHub links), filter by category
3. About — professional bio, work experience timeline, education, skills bars, downloadable CV button
4. Contact — contact form (name, email, subject, message), social media links, email display

Design: dark theme (#0d1117), electric blue (#58a6ff) and purple (#a371f7) accents, smooth scroll animations, glassmorphism cards, subtle particle background on hero.
Tech: 4 separate HTML files with shared CSS, vanilla JS for animations, filter logic, and form validation.`,
    type: 'simple-website',
  },
  {
    label: '🎨 Creative Agency',
    prompt: `Build a multi-page website for a creative design agency called "Pixel & Craft" with these SEPARATE pages:

1. Home — full-screen video hero (placeholder), services overview strip (branding, web, motion), client logos marquee, awards counter
2. Work — masonry portfolio grid of 8 case study cards, filterable by type (branding/web/motion), each opens a lightbox
3. Services — 3 service sections (each with icon, description, process steps 1–4, example outputs)
4. Contact — split layout: contact form left, office address + map placeholder right, team availability indicator

Design: bold black and white with a single electric yellow (#FFE03B) accent. Oversized typography, asymmetric layouts, hover distortion effects. Clean and editorial.
Tech: 4 separate HTML files, shared CSS with custom properties, vanilla JS for lightbox, filter, and counter animations.`,
    type: 'simple-website',
  },

  // ── Full-stack multi-file ────────────────────────────────────────────────
  {
    label: '✅ Task Manager',
    prompt: `Build a full-stack task management app with:

Pages: Landing (public), Login/Signup, Dashboard, Task List, Task Detail, Profile

Features:
- Email/password auth with protected routes
- Create, edit, delete tasks with title, description, status (todo/in-progress/done), due date, priority
- Filter by status and priority, search by title, sort by due date
- Dashboard showing task stats (total, completed, overdue) with a simple bar chart

Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, TypeScript, Tailwind CSS + shadcn/ui`,
    type: 'full-stack-app',
  },
  {
    label: '📝 Blog CMS',
    prompt: `Build a blog CMS with public site and admin dashboard:

Public site: Home (featured posts), Blog list (pagination + search), Post detail (rich content, reading time, related posts), Category pages, Author pages

Admin dashboard (protected): Post editor with rich text (TipTap), Media library, Categories + Tags management, Draft/Publish/Schedule workflow, SEO settings per post, Comment moderation

Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, TipTap editor, Cloudinary for media, TypeScript, Tailwind CSS`,
    type: 'full-stack-app',
  },
  {
    label: '🛒 E-commerce Store',
    prompt: `Build a full e-commerce store:

Pages: Home, Product listing (filters + search), Product detail (gallery, reviews), Cart, Checkout, Order confirmation, Order history, User profile, Admin dashboard

Features:
- Product catalog with categories, price filter, ratings
- Cart persisted to database for logged-in users
- Multi-step Stripe checkout (card details, shipping, confirmation)
- Order tracking with status updates
- Admin: manage products, orders, customers, sales analytics chart

Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, Stripe, TypeScript, Tailwind CSS`,
    type: 'full-stack-app',
  },
  {
    label: '🏋️ AI Fitness Coach',
    prompt: `Build a full-stack AI Fitness & Nutrition Coach app — personalized plans driven by AI.

Pages: Landing, Login/Signup, Onboarding (goals + preferences wizard), Dashboard, Workout Plan, Meal Plan, Progress Tracker, AI Chat Coach, Settings, Subscription/Billing

Core Features:
- AI-generated workout plans based on goal (weight loss / muscle gain / endurance), fitness level, available equipment
- AI-generated 7-day meal plans matching calorie/macro targets
- Progress tracker with weight, measurements, workout completion charts (Recharts)
- AI Chat Coach — conversational interface powered by Claude API for motivation, plan tweaks, questions

Monetization:
- Stripe subscription: Free (basic plan), Pro £9.99/mo (AI chat + custom plans), Elite £19.99/mo (all features)
- Feature gates based on plan tier

Tech: Next.js 14 App Router, NextAuth.js (Google + email), Prisma + PostgreSQL, Stripe, Anthropic Claude API (claude-sonnet-4-6), Tailwind CSS + shadcn/ui, Recharts, TypeScript

Database: Users, WorkoutPlans, MealPlans, ProgressEntries, ChatMessages, Subscriptions`,
    type: 'full-stack-app',
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string, type: string) => void;
}

export default function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <Card className="p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Quick Start Templates</h3>
        <a
          href="/templates"
          className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-medium"
        >
          Browse all →
        </a>
      </div>

      {/* P.F.D.A. Formula button */}
      <button
        onClick={() => setShowFormula(!showFormula)}
        className="w-full mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-purple-700">Ultra-Prompt Formula (P.F.D.A.)</span>
          <span className="text-xs text-purple-500 hidden sm:inline">— get better results first time</span>
        </div>
        {showFormula
          ? <ChevronUp className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
        }
      </button>

      {/* Collapsible formula content */}
      {showFormula && (
        <div className="mb-3 rounded-xl border border-purple-100 bg-white overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-gray-100">
            {[
              { letter: 'P', label: 'Persona & Purpose', color: 'text-purple-700 bg-purple-50', hint: 'Who is it for? What\u2019s the big win?' },
              { letter: 'F', label: 'Features & Logic',  color: 'text-blue-700 bg-blue-50',   hint: 'List 3–4 must-haves + how they flow' },
              { letter: 'D', label: 'Data & Tech Stack', color: 'text-green-700 bg-green-50', hint: 'What gets saved? Preferred stack?' },
              { letter: 'A', label: 'Aesthetics & Feel', color: 'text-pink-700 bg-pink-50',   hint: 'Style, mood, UI layout' },
            ].map((p) => (
              <div key={p.letter} className={`p-2.5 ${p.color}`}>
                <span className="font-bold text-sm">[{p.letter}]</span>
                <span className="font-semibold text-xs ml-1">{p.label}</span>
                <p className="text-xs opacity-70 mt-0.5 leading-tight">{p.hint}</p>
              </div>
            ))}
          </div>
          <div className="p-2.5 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Example:</span> &ldquo;A pet sitting platform for busy owners.
              Features: map search, booking calendar, photo feed.
              Stack: React + Firebase. Style: friendly pastels, card layout.&rdquo;
            </p>
          </div>
          <div className="px-2.5 pb-2.5">
            <Button
              size="sm"
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
              onClick={() => {
                onSelect(PFDA_STARTER, 'single-html');
                setShowFormula(false);
              }}
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              Use Formula as Prompt Template
            </Button>
          </div>
        </div>
      )}

      {/* Quick template buttons — grouped by complexity */}
      {[
        {
          heading: 'Single-page HTML',
          badge: 'No setup',
          badgeColor: 'bg-green-100 text-green-700',
          types: ['single-html'],
        },
        {
          heading: 'Multi-page HTML',
          badge: 'No setup',
          badgeColor: 'bg-green-100 text-green-700',
          types: ['simple-website'],
        },
        {
          heading: 'Full-stack app',
          badge: 'Needs DB + env vars',
          badgeColor: 'bg-amber-100 text-amber-700',
          types: ['full-stack-app'],
        },
      ].map((group) => {
        const items = QUICK_TEMPLATES.filter((t) => group.types.includes(t.type));
        return (
          <div key={group.heading} className="mt-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.heading}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${group.badgeColor}`}>{group.badge}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((template) => (
                <Button
                  key={template.label}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(template.prompt, template.type)}
                  className="justify-start text-left h-auto py-2"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
