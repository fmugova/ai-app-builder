'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Quick Start Templates</h3>
        <a
          href="/templates"
          className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-medium"
        >
          Browse all →
        </a>
      </div>
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
