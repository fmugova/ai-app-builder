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
  {
    label: '☕ Coffee Shop',
    prompt: `Create a multi-page website for a coffee shop called "Brew & Bean" with these SEPARATE pages:

1. Home page — hero banner, featured drinks (3 cards), customer testimonials, newsletter signup
2. Services page — full menu (hot drinks, cold drinks, pastries) with prices and images
3. About page — brand story, team photos, our values section
4. Contact page — contact form (name, email, message), store hours, Google Maps placeholder
5. Basket page — shopping cart with items, quantities, subtotal, checkout button (requires login)

Authentication:
- Email/password login and signup
- Protected basket/checkout pages (redirect to login if not authenticated)
- User account dropdown in nav showing name when logged in

Design: warm browns, creams, orange accents. Cozy, modern café aesthetic.
Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, Tailwind CSS, TypeScript`,
    type: 'full-stack-app',
  },
  {
    label: '✅ Task Manager',
    prompt: `Build a full-stack task management app with:

Pages: Landing (public), Login/Signup, Dashboard, Task List, Task Detail, Profile

Features:
- Email/password auth with protected routes
- Create, edit, delete tasks with title, description, status (todo/in-progress/done), due date, priority
- Filter by status and priority, search by title, sort by due date
- Dashboard showing task stats (total, completed, overdue)

Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, TypeScript, Tailwind CSS + shadcn/ui`,
    type: 'full-stack-app',
  },
  {
    label: '💼 Portfolio',
    prompt: `Create a professional developer portfolio website with 4 separate pages:

1. Home page — animated hero with name/tagline, tech stack grid, 3 featured project cards, CTA to contact
2. Projects page — filterable grid of 6 project cards (each with title, description, tech badges, live/GitHub links)
3. About page — professional bio, work experience timeline, education, downloadable CV button
4. Contact page — contact form (name, email, subject, message), social media links, email display

Design: dark theme, electric blue/purple accents, smooth scroll animations, glassmorphism cards
Tech: separate HTML pages with shared CSS, vanilla JS for animations and form validation`,
    type: 'simple-website',
  },
  {
    label: '🏋️ AI Fitness Coach',
    prompt: `Build a full-stack AI Fitness & Nutrition Coach app — personalized plans driven by AI.

Pages: Landing, Login/Signup, Onboarding (goals + preferences wizard), Dashboard, Workout Plan, Meal Plan, Progress Tracker, AI Chat Coach, Settings, Subscription/Billing

Core Features:
- AI-generated workout plans based on goal (weight loss / muscle gain / endurance), fitness level, available equipment
- AI-generated 7-day meal plans matching calorie/macro targets
- Habit reminders (push notification opt-in)
- Progress tracker with weight, measurements, workout completion charts (Recharts)
- AI Chat Coach — conversational interface powered by Claude API for motivation, plan tweaks, questions
- Wearable sync placeholder (Fitbit / Apple Health API connection UI)

Monetization:
- Stripe subscription: Free (basic plan), Pro £9.99/mo (AI chat + custom plans), Elite £19.99/mo (all features)
- Feature gates based on plan tier

Tech: Next.js 14 App Router, NextAuth.js (Google + email), Prisma + PostgreSQL, Stripe, Anthropic Claude API (claude-sonnet-4-5-20250929), Tailwind CSS + shadcn/ui, Recharts, TypeScript

Database: Users, WorkoutPlans, MealPlans, ProgressEntries, ChatMessages, Subscriptions`,
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
- Multi-step Stripe checkout
- Order tracking
- Admin: manage products, orders, customers, sales analytics

Tech: Next.js 14 App Router, NextAuth.js, Prisma + PostgreSQL, Stripe, TypeScript, Tailwind CSS`,
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

      {/* Quick template buttons */}
      <div className="grid grid-cols-2 gap-2">
        {QUICK_TEMPLATES.map((template) => (
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
    </Card>
  );
}
