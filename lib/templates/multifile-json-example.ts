/**
 * MULTI-FILE (FULLSTACK NEXT.JS) JSON EXAMPLE
 *
 * Injected into Stage 1 and Stage 2 system prompts as a few-shot example.
 * Shows the exact JSON format, field order, and — critically — the correct
 * JSON escaping of TypeScript/React file content:
 *   \n  for newlines
 *   \"  for double quotes inside strings
 *   \\  for backslashes
 *
 * This is a minimal task-management app (5 files) demonstrating:
 *   - "dependencies" before "files" (prevents truncation from cutting deps)
 *   - package.json content with proper \n escaping
 *   - TypeScript file with imports, exports, JSX — all properly escaped
 *   - Tailwind className strings with escaped quotes
 *   - Template literals (backticks) replaced with regular string concatenation
 *     or escaped (backtick ` does not need escaping inside JSON double-quoted strings)
 */
export const MULTIFILE_JSON_EXAMPLE = `
\`\`\`json
{
  "projectName": "task-manager",
  "description": "A clean task management app with drag-and-drop boards, authentication, and real-time updates",
  "projectType": "fullstack",
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.14.0",
    "next-auth": "^4.24.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.6.0",
    "react-hook-form": "^7.52.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "prisma": "^5.14.0"
  },
  "envVars": [
    { "key": "DATABASE_URL", "description": "PostgreSQL connection string", "example": "postgresql://user:pass@localhost:5432/taskdb", "required": true },
    { "key": "NEXTAUTH_SECRET", "description": "Secret for NextAuth JWT signing", "example": "your-secret-here", "required": true },
    { "key": "NEXTAUTH_URL", "description": "Base URL of the app", "example": "http://localhost:3000", "required": true }
  ],
  "files": [
    {
      "path": "package.json",
      "content": "{\\n  \\"name\\": \\"task-manager\\",\\n  \\"version\\": \\"0.1.0\\",\\n  \\"private\\": true,\\n  \\"scripts\\": {\\n    \\"dev\\": \\"next dev\\",\\n    \\"build\\": \\"next build\\",\\n    \\"start\\": \\"next start\\",\\n    \\"lint\\": \\"next lint\\",\\n    \\"db:push\\": \\"prisma db push\\",\\n    \\"db:generate\\": \\"prisma generate\\"\\n  }\\n}"
    },
    {
      "path": "tsconfig.json",
      "content": "{\\n  \\"compilerOptions\\": {\\n    \\"target\\": \\"ES2017\\",\\n    \\"lib\\": [\\"dom\\", \\"dom.iterable\\", \\"esnext\\"],\\n    \\"allowJs\\": true,\\n    \\"skipLibCheck\\": true,\\n    \\"strict\\": true,\\n    \\"noEmit\\": true,\\n    \\"esModuleInterop\\": true,\\n    \\"module\\": \\"esnext\\",\\n    \\"moduleResolution\\": \\"bundler\\",\\n    \\"resolveJsonModule\\": true,\\n    \\"isolatedModules\\": true,\\n    \\"jsx\\": \\"preserve\\",\\n    \\"incremental\\": true,\\n    \\"plugins\\": [{ \\"name\\": \\"next\\" }],\\n    \\"paths\\": { \\"@/*\\": [\\"./*\\"] }\\n  },\\n  \\"include\\": [\\"next-env.d.ts\\", \\"**/*.ts\\", \\"**/*.tsx\\", \\".next/types/**/*.ts\\"],\\n  \\"exclude\\": [\\"node_modules\\"]\\n}"
    },
    {
      "path": "app/layout.tsx",
      "content": "import type { Metadata } from 'next'\\nimport { Inter } from 'next/font/google'\\nimport './globals.css'\\n\\nconst inter = Inter({ subsets: ['latin'] })\\n\\nexport const metadata: Metadata = {\\n  title: 'TaskFlow — Manage projects with clarity',\\n  description: 'Drag-and-drop task boards, team collaboration, and real-time updates. Free for up to 5 users.',\\n}\\n\\nexport default function RootLayout({\\n  children,\\n}: {\\n  children: React.ReactNode\\n}) {\\n  return (\\n    <html lang=\\"en\\">\\n      <body className={inter.className}>\\n        {children}\\n      </body>\\n    </html>\\n  )\\n}"
    },
    {
      "path": "app/globals.css",
      "content": "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;\\n\\n@layer base {\\n  :root {\\n    --background: 0 0% 100%;\\n    --foreground: 222.2 84% 4.9%;\\n    --card: 0 0% 100%;\\n    --card-foreground: 222.2 84% 4.9%;\\n    --primary: 221.2 83.2% 53.3%;\\n    --primary-foreground: 210 40% 98%;\\n    --secondary: 210 40% 96.1%;\\n    --secondary-foreground: 222.2 47.4% 11.2%;\\n    --muted: 210 40% 96.1%;\\n    --muted-foreground: 215.4 16.3% 46.9%;\\n    --accent: 210 40% 96.1%;\\n    --accent-foreground: 222.2 47.4% 11.2%;\\n    --border: 214.3 31.8% 91.4%;\\n    --radius: 0.5rem;\\n  }\\n  .dark {\\n    --background: 222.2 84% 4.9%;\\n    --foreground: 210 40% 98%;\\n    --card: 222.2 84% 4.9%;\\n    --card-foreground: 210 40% 98%;\\n    --primary: 217.2 91.2% 59.8%;\\n    --primary-foreground: 222.2 47.4% 11.2%;\\n    --border: 217.2 32.6% 17.5%;\\n  }\\n}\\n\\n@layer base {\\n  * { @apply border-border; }\\n  body { @apply bg-background text-foreground; }\\n}"
    },
    {
      "path": "app/page.tsx",
      "content": "import Link from 'next/link'\\nimport { CheckCircle, Zap, Users, BarChart3, ArrowRight, Star } from 'lucide-react'\\n\\nconst features = [\\n  { icon: CheckCircle, title: 'Smart Task Boards', description: 'Drag-and-drop Kanban boards with custom columns, labels, and due dates. Visualise your workflow at a glance.' },\\n  { icon: Zap, title: 'Real-Time Updates', description: 'Changes sync instantly across all team members. No more stale data or manual refreshes.' },\\n  { icon: Users, title: 'Team Collaboration', description: 'Assign tasks, leave comments, mention teammates, and track who is working on what — all in one place.' },\\n  { icon: BarChart3, title: 'Progress Analytics', description: 'Burndown charts, velocity tracking, and completion rates give your team actionable insights every sprint.' },\\n]\\n\\nconst testimonials = [\\n  { name: 'Sarah Chen', role: 'Product Manager at Vercel', quote: 'TaskFlow cut our sprint planning time in half. The board is so intuitive our engineers actually use it.', rating: 5 },\\n  { name: 'Marcus Webb', role: 'CTO at Foundry Labs', quote: 'We replaced three different tools with TaskFlow. The real-time sync is rock solid even with 40 people on at once.', rating: 5 },\\n  { name: 'Priya Sharma', role: 'Engineering Lead at Stripe', quote: 'The analytics helped us identify our bottlenecks within a week. Deployment frequency is up 30% since switching.', rating: 5 },\\n]\\n\\nexport default function HomePage() {\\n  return (\\n    <main className=\\"min-h-screen bg-white\\">\\n      {/* NAV */}\\n      <nav className=\\"fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100\\">\\n        <div className=\\"max-w-6xl mx-auto px-6 h-16 flex items-center justify-between\\">\\n          <span className=\\"font-bold text-xl text-blue-600\\">⚡ TaskFlow</span>\\n          <div className=\\"hidden md:flex items-center gap-8\\">\\n            <Link href=\\"#features\\" className=\\"text-sm text-gray-600 hover:text-blue-600 transition-colors\\">Features</Link>\\n            <Link href=\\"#pricing\\" className=\\"text-sm text-gray-600 hover:text-blue-600 transition-colors\\">Pricing</Link>\\n            <Link href=\\"/dashboard\\" className=\\"bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-700 transition-colors\\">Get Started Free</Link>\\n          </div>\\n        </div>\\n      </nav>\\n\\n      {/* HERO */}\\n      <section className=\\"pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50\\">\\n        <div className=\\"max-w-4xl mx-auto text-center\\">\\n          <div className=\\"inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6\\">\\n            <Star className=\\"w-4 h-4 fill-current\\" />\\n            Rated #1 Project Tool by 12,000+ teams\\n          </div>\\n          <h1 className=\\"text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6\\">\\n            Ship faster with<br />\\n            <span className=\\"text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600\\">crystal-clear tasks</span>\\n          </h1>\\n          <p className=\\"text-xl text-gray-500 max-w-2xl mx-auto mb-10\\">\\n            TaskFlow gives your team a single source of truth. Drag-and-drop boards, real-time collaboration, and analytics that actually surface what matters.\\n          </p>\\n          <div className=\\"flex flex-col sm:flex-row gap-4 justify-center\\">\\n            <Link href=\\"/dashboard\\" className=\\"bg-blue-600 text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-blue-200 shadow-lg\\">\\n              Start for Free\\n            </Link>\\n            <Link href=\\"#features\\" className=\\"border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-full text-lg hover:border-blue-300 transition-colors flex items-center gap-2\\">\\n              See how it works <ArrowRight className=\\"w-5 h-5\\" />\\n            </Link>\\n          </div>\\n          <p className=\\"text-sm text-gray-400 mt-4\\">No credit card required · Free for up to 5 users · Cancel anytime</p>\\n        </div>\\n      </section>\\n\\n      {/* FEATURES */}\\n      <section id=\\"features\\" className=\\"py-24 px-6 bg-gray-50\\">\\n        <div className=\\"max-w-6xl mx-auto\\">\\n          <div className=\\"text-center mb-16\\">\\n            <p className=\\"text-sm font-bold tracking-widest uppercase text-blue-600 mb-3\\">Why TaskFlow</p>\\n            <h2 className=\\"text-4xl font-extrabold text-gray-900 mb-4\\">Built for teams that ship</h2>\\n            <p className=\\"text-lg text-gray-500 max-w-xl mx-auto\\">Every feature is designed to reduce friction and keep your team focused on what matters.</p>\\n          </div>\\n          <div className=\\"grid md:grid-cols-2 lg:grid-cols-4 gap-6\\">\\n            {features.map((f) => (\\n              <div key={f.title} className=\\"bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all\\">\\n                <f.icon className=\\"w-8 h-8 text-blue-600 mb-4\\" />\\n                <h3 className=\\"font-bold text-gray-900 mb-2\\">{f.title}</h3>\\n                <p className=\\"text-sm text-gray-500 leading-relaxed\\">{f.description}</p>\\n              </div>\\n            ))}\\n          </div>\\n        </div>\\n      </section>\\n\\n      {/* TESTIMONIALS */}\\n      <section className=\\"py-24 px-6\\">\\n        <div className=\\"max-w-6xl mx-auto\\">\\n          <div className=\\"text-center mb-14\\">\\n            <h2 className=\\"text-4xl font-extrabold text-gray-900 mb-3\\">Trusted by 12,000+ teams</h2>\\n            <p className=\\"text-gray-500\\">From early-stage startups to engineering orgs at scale.</p>\\n          </div>\\n          <div className=\\"grid md:grid-cols-3 gap-6\\">\\n            {testimonials.map((t) => (\\n              <div key={t.name} className=\\"bg-white border border-gray-100 rounded-2xl p-6 shadow-sm\\">\\n                <div className=\\"text-yellow-400 text-sm mb-3\\">{'★'.repeat(t.rating)}</div>\\n                <p className=\\"text-gray-700 text-sm leading-relaxed mb-5 italic\\">\\"{t.quote}\\"</p>\\n                <div>\\n                  <div className=\\"font-semibold text-gray-900 text-sm\\">{t.name}</div>\\n                  <div className=\\"text-gray-400 text-xs\\">{t.role}</div>\\n                </div>\\n              </div>\\n            ))}\\n          </div>\\n        </div>\\n      </section>\\n\\n      {/* CTA */}\\n      <section className=\\"py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700\\">\\n        <div className=\\"max-w-3xl mx-auto text-center\\">\\n          <h2 className=\\"text-4xl font-extrabold text-white mb-4\\">Ready to ship faster?</h2>\\n          <p className=\\"text-blue-100 text-lg mb-8\\">Join 12,000+ teams who cut their project overhead by 40% in the first month.</p>\\n          <Link href=\\"/dashboard\\" className=\\"bg-white text-blue-600 font-bold px-10 py-4 rounded-full text-lg hover:bg-blue-50 transition-colors inline-block\\">\\n            Start Free — No Card Needed\\n          </Link>\\n        </div>\\n      </section>\\n\\n      {/* FOOTER */}\\n      <footer className=\\"bg-gray-950 text-gray-400 py-12 px-6\\">\\n        <div className=\\"max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6\\">\\n          <span className=\\"font-bold text-white text-lg\\">⚡ TaskFlow</span>\\n          <div className=\\"flex gap-8 text-sm\\">\\n            <Link href=\\"#\\" className=\\"hover:text-white transition-colors\\">Privacy</Link>\\n            <Link href=\\"#\\" className=\\"hover:text-white transition-colors\\">Terms</Link>\\n            <Link href=\\"#\\" className=\\"hover:text-white transition-colors\\">Blog</Link>\\n            <Link href=\\"#\\" className=\\"hover:text-white transition-colors\\">Contact</Link>\\n          </div>\\n          <span className=\\"text-sm\\">© 2025 TaskFlow Inc. All rights reserved.</span>\\n        </div>\\n      </footer>\\n    </main>\\n  )\\n}"
    }
  ]
}
\`\`\`
`
