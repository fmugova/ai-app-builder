// lib/scaffold/blog-scaffold.ts
// Pre-built scaffold for Next.js blog / CMS / publication apps.
// Injected when selectScaffold() returns 'blog'.
// Provides: ArticleCard, CategoryPills, NewsletterForm, ReadingProgress
// + SQL migration for articles / categories / newsletter_subscribers tables.

import { getScaffoldFiles } from './nextjs-scaffold';

// ── ArticleCard ────────────────────────────────────────────────────────────────

const ARTICLE_CARD = `import Image from "next/image";
import Link from "next/link";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  categorySlug?: string;
  author?: string;
  authorAvatar?: string;
  publishedAt: string;
  readingTimeMin?: number;
  featured?: boolean;
}

export function ArticleCard({
  article,
  variant = "default",
}: {
  article: Article;
  variant?: "default" | "featured" | "compact";
}) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (variant === "compact") {
    return (
      <Link href={\`/blog/\${article.slug}\`} className="group flex gap-3 items-start">
        {article.coverImage && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {article.title}
          </p>
          <p className="text-xs text-gray-400 mt-1">{date}</p>
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link href={\`/blog/\${article.slug}\`} className="group block">
        {article.coverImage && (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {article.category && (
              <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white">
                {article.category}
              </span>
            )}
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2 line-clamp-2">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {article.authorAvatar && (
            <Image
              src={article.authorAvatar}
              alt={article.author ?? "Author"}
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          {article.author && <span>{article.author}</span>}
          <span>·</span>
          <span>{date}</span>
          {article.readingTimeMin && (
            <>
              <span>·</span>
              <span>{article.readingTimeMin} min read</span>
            </>
          )}
        </div>
      </Link>
    );
  }

  // default
  return (
    <Link href={\`/blog/\${article.slug}\`} className="group block">
      {article.coverImage && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div>
        {article.category && (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            {article.category}
          </span>
        )}
        <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2.5 text-xs text-gray-400">
          {article.author && <span>{article.author}</span>}
          {article.author && <span>·</span>}
          <span>{date}</span>
          {article.readingTimeMin && (
            <>
              <span>·</span>
              <span>{article.readingTimeMin} min read</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
`;

// ── CategoryPills ──────────────────────────────────────────────────────────────

const CATEGORY_PILLS = `"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface Category {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export function CategoryPills({
  categories,
  activeSlug,
  baseHref = "/blog",
}: {
  categories: Category[];
  activeSlug?: string;
  baseHref?: string;
}) {
  const all = [{ id: "all", name: "All", slug: "" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((cat) => {
        const isActive =
          cat.slug === "" ? !activeSlug : cat.slug === activeSlug;
        const href =
          cat.slug === "" ? baseHref : \`\${baseHref}?category=\${cat.slug}\`;
        return (
          <Link
            key={cat.id}
            href={href}
            className={
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors " +
              (isActive
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700")
            }
          >
            {cat.name}
            {cat.count !== undefined && (
              <span
                className={
                  "text-xs " +
                  (isActive
                    ? "text-indigo-200"
                    : "text-gray-400 dark:text-gray-500")
                }
              >
                {cat.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
`;

// ── NewsletterForm ─────────────────────────────────────────────────────────────

const NEWSLETTER_FORM = `"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2, Check } from "lucide-react";

export function NewsletterForm({
  heading = "Stay in the loop",
  subheading = "Get the latest articles delivered to your inbox. No spam, ever.",
  className,
}: {
  heading?: string;
  subheading?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        // Already subscribed — treat as success
        setStatus("success");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }
      return;
    }
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className={"flex flex-col items-center text-center gap-3 py-4 " + (className ?? "")}>
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check size={18} className="text-green-600 dark:text-green-400" />
        </div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          You&apos;re subscribed!
        </p>
        <p className="text-sm text-gray-500">
          We&apos;ll send you new articles as soon as they&apos;re published.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {(heading || subheading) && (
        <div className="mb-4 text-center">
          {heading && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {heading}
            </h3>
          )}
          {subheading && (
            <p className="text-sm text-gray-500 mt-1">{subheading}</p>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Subscribe"
          )}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-500 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
`;

// ── ReadingProgress ────────────────────────────────────────────────────────────

const READING_PROGRESS = `"use client";

import { useState, useEffect } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const el = document.documentElement;
      const scrollTop = window.scrollY;
      const docHeight = el.scrollHeight - el.clientHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    }
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 z-50"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-indigo-600 transition-[width] duration-100"
        style={{ width: \`\${progress}%\` }}
      />
    </div>
  );
}
`;

// ── SQL migration ──────────────────────────────────────────────────────────────

export const BLOG_MIGRATION = `-- ============================================================
-- Blog / CMS: article_categories, articles, newsletter_subscribers
-- ============================================================

-- Article categories
CREATE TABLE IF NOT EXISTS article_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  color      TEXT        NOT NULL DEFAULT 'indigo',
  sort_order INTEGER     NOT NULL DEFAULT 0
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  slug             TEXT        NOT NULL UNIQUE,
  excerpt          TEXT,
  content          TEXT        NOT NULL DEFAULT '',
  cover_image      TEXT,
  category_id      UUID        REFERENCES article_categories(id) ON DELETE SET NULL,
  author_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name      TEXT,
  author_avatar    TEXT,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'published', 'archived')),
  featured         BOOLEAN     NOT NULL DEFAULT false,
  reading_time_min INTEGER,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  seo_title        TEXT,
  seo_description  TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS articles_status_published_at
  ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_id
  ON articles (category_id);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  confirmed     BOOLEAN     NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE article_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers    ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "categories_public_select" ON article_categories FOR SELECT USING (true);

-- Articles: public can read published; author can read own drafts
CREATE POLICY "articles_public_select" ON articles FOR SELECT USING (
  status = 'published'
  OR author_id = auth.uid()
);

-- Articles: authenticated users can create
CREATE POLICY "articles_insert" ON articles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Articles: author can update/delete their own
CREATE POLICY "articles_update_own" ON articles FOR UPDATE
  USING (author_id = auth.uid());
CREATE POLICY "articles_delete_own" ON articles FOR DELETE
  USING (author_id = auth.uid());

-- Newsletter: anyone can subscribe (no auth needed)
CREATE POLICY "newsletter_insert" ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- ── Helper function ─────────────────────────────────────────────────────────

-- Auto-compute reading time (200 wpm) on insert/update
CREATE OR REPLACE FUNCTION compute_reading_time()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.reading_time_min := GREATEST(1, ROUND(
    array_length(regexp_split_to_array(trim(NEW.content), '\\s+'), 1)::NUMERIC / 200
  ));
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER articles_reading_time
  BEFORE INSERT OR UPDATE OF content ON articles
  FOR EACH ROW EXECUTE FUNCTION compute_reading_time();

-- ── Seed data ───────────────────────────────────────────────────────────────

INSERT INTO article_categories (id, name, slug, color, sort_order) VALUES
  ('bcat-001-0000-0000-0000-000000000001', 'Technology',  'technology',  'indigo', 1),
  ('bcat-001-0000-0000-0000-000000000002', 'Design',      'design',      'purple', 2),
  ('bcat-001-0000-0000-0000-000000000003', 'Business',    'business',    'blue',   3),
  ('bcat-001-0000-0000-0000-000000000004', 'Tutorial',    'tutorial',    'green',  4)
ON CONFLICT DO NOTHING;

INSERT INTO articles (
  id, title, slug, excerpt, cover_image, category_id,
  author_name, status, featured, published_at
) VALUES
  (
    'bart-001-0000-0000-0000-000000000001',
    'Getting Started with Next.js 15',
    'getting-started-nextjs-15',
    'Everything you need to know to build fast, modern web apps with the latest version of Next.js.',
    'https://picsum.photos/seed/blog1/1200/630',
    'bcat-001-0000-0000-0000-000000000001',
    'Alex Morgan', 'published', true, NOW() - INTERVAL '3 days'
  ),
  (
    'bart-001-0000-0000-0000-000000000002',
    'Design Systems That Scale',
    'design-systems-that-scale',
    'How to build a component library your whole team will actually use.',
    'https://picsum.photos/seed/blog2/1200/630',
    'bcat-001-0000-0000-0000-000000000002',
    'Jordan Lee', 'published', false, NOW() - INTERVAL '7 days'
  ),
  (
    'bart-001-0000-0000-0000-000000000003',
    'The Lean Content Strategy',
    'lean-content-strategy',
    'Publish less, but make every piece count. A practical guide to focused content.',
    'https://picsum.photos/seed/blog3/1200/630',
    'bcat-001-0000-0000-0000-000000000003',
    'Sam Rivera', 'published', false, NOW() - INTERVAL '14 days'
  )
ON CONFLICT DO NOTHING;
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const BLOG_NEXTJS_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
📝 BLOG / CMS SCAFFOLD — ALWAYS APPLY FOR BLOG / PUBLICATION APPS
════════════════════════════════════════════════════════════════════

Pre-built components already in the scaffold — USE THEM:

\`\`\`
components/blog/ArticleCard.tsx      → <ArticleCard article={…} variant="default|featured|compact" />
components/blog/CategoryPills.tsx    → <CategoryPills categories={…} activeSlug={…} />
components/blog/NewsletterForm.tsx   → <NewsletterForm heading="…" subheading="…" />
components/blog/ReadingProgress.tsx  → <ReadingProgress /> (fixed top progress bar)
\`\`\`

**Database schema (already in supabase/migrations/001_blog.sql):**
- \`article_categories\` — id, name, slug, color, sort_order
- \`articles\`           — id, title, slug, excerpt, content, cover_image, category_id, author_id, author_name, author_avatar, status (draft/published/archived), featured, reading_time_min (auto-computed), tags[], published_at
- \`newsletter_subscribers\` — id, email, confirmed, subscribed_at

**MANDATORY page structure:**

1. \`app/blog/page.tsx\` — Article listing
   \`\`\`tsx
   // Server Component — fetch published articles + categories
   const { data: articles } = await supabase
     .from("articles")
     .select("*, article_categories(name, slug)")
     .eq("status", "published")
     .order("published_at", { ascending: false });
   // Featured article uses variant="featured", rest use variant="default"
   \`\`\`

2. \`app/blog/[slug]/page.tsx\` — Article detail
   \`\`\`tsx
   import { ReadingProgress } from "@/components/blog/ReadingProgress";
   import { NewsletterForm } from "@/components/blog/NewsletterForm";
   // ReadingProgress at top of page
   // Render article.content — use dangerouslySetInnerHTML or a markdown renderer
   // NewsletterForm at bottom of article
   \`\`\`

3. \`app/page.tsx\` — Blog homepage
   - Hero with latest featured article (variant="featured")
   - CategoryPills for filtering
   - Grid of recent articles (variant="default")
   - NewsletterForm in a highlighted section

**Query pattern for category filtering (URL param):**
\`\`\`typescript
// app/blog/page.tsx accepts searchParams.category
let query = supabase.from("articles").select("*, article_categories(name,slug)")
  .eq("status","published").order("published_at", { ascending: false });
if (searchParams.category) {
  query = query.eq("article_categories.slug", searchParams.category);
}
\`\`\`

**Reading time:** Auto-computed by DB trigger on \`content\` field — never compute manually.

**VISUAL STANDARDS for blog sites:**
- Clean, readable typography — generous line-height, max-width prose column for articles
- Large cover images (16:9) at top of listing cards
- Featured article spans full width at top of listing page
- Article body: prose styles (Tailwind \`prose\` class or custom), code blocks highlighted
- Author byline with avatar on article detail
- Related articles section at bottom of each article
`;

// ── Scaffold file assembly ─────────────────────────────────────────────────────

export function getBlogScaffoldFiles(): Record<string, string> {
  return {
    ...getScaffoldFiles(),
    'components/blog/ArticleCard.tsx':     ARTICLE_CARD,
    'components/blog/CategoryPills.tsx':   CATEGORY_PILLS,
    'components/blog/NewsletterForm.tsx':  NEWSLETTER_FORM,
    'components/blog/ReadingProgress.tsx': READING_PROGRESS,
    'supabase/migrations/001_blog.sql':    BLOG_MIGRATION,
  };
}
