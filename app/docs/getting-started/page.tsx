import Link from 'next/link'

export const metadata = { title: 'Quick Start — BuildFlow AI Docs' }

export default function GettingStartedPage() {
  return (
    <article className="prose-docs">
      <h1>Quick Start</h1>
      <p className="lead">
        BuildFlow AI turns a plain-English description into a complete website in seconds.
        This guide gets you from zero to a live site in under 5 minutes.
      </p>

      <hr />

      <h2>Step 1 — Create an account</h2>
      <ol>
        <li>Go to <Link href="/auth/signup">buildflow-ai.app/auth/signup</Link>.</li>
        <li>Sign up with your email, or continue with Google or GitHub.</li>
        <li>If you signed up with email, check your inbox and click the verification link.</li>
      </ol>
      <p>
        The <strong>Free plan</strong> gives you 3 projects and 3 AI generations per month —
        no credit card required.
      </p>

      <h2>Step 2 — Open the builder</h2>
      <p>
        After signing in, click <strong>New Project</strong> in the dashboard, or go directly
        to <Link href="/chatbuilder">buildflow-ai.app/chatbuilder</Link>.
      </p>

      <h2>Step 3 — Describe your site</h2>
      <p>
        Type what you want in the prompt box. Be as specific or as vague as you like:
      </p>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4">
        <p className="text-gray-300 text-sm font-mono m-0">
          &quot;A modern landing page for a yoga studio called Serenity Flow.
          Include a hero section, class schedule, instructor bios, and a booking CTA.
          Use a calm green and white color palette.&quot;
        </p>
      </div>
      <p>
        Then click <strong>Generate</strong> (or press <kbd className="kbd">Ctrl+Enter</kbd>).
      </p>

      <h2>Step 4 — Refine with follow-up prompts</h2>
      <p>
        The builder is conversational. After the first generation, keep describing changes:
      </p>
      <ul>
        <li><em>&quot;Make the hero section taller with a background image&quot;</em></li>
        <li><em>&quot;Change the primary color to deep purple&quot;</em></li>
        <li><em>&quot;Add a testimonials section with 3 cards&quot;</em></li>
        <li><em>&quot;Add a contact form at the bottom&quot;</em></li>
      </ul>
      <p>Each follow-up updates only the part you asked about.</p>

      <h2>Step 5 — Export or deploy</h2>
      <p>Once you&apos;re happy with the result:</p>
      <ul>
        <li><strong>Download HTML</strong> — single-file HTML you can host anywhere.</li>
        <li><strong>Download ZIP</strong> — multi-file project with separate CSS/JS.</li>
        <li><strong>Deploy to Vercel</strong> — live URL in 30 seconds (Pro plan).</li>
        <li><strong>Push to GitHub</strong> — save to a repository (Pro plan).</li>
        <li><strong>Publish on BuildFlow</strong> — free public URL at <code>buildflow-ai.app/p/your-slug</code>.</li>
      </ul>

      <hr />

      <h2>What&apos;s next?</h2>
      <div className="grid sm:grid-cols-2 gap-3 not-prose mt-4">
        <Link href="/docs/generate" className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">Write better prompts →</p>
          <p className="text-gray-500 text-xs">Tips and examples for getting the best results.</p>
        </Link>
        <Link href="/docs/deploy" className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">Deploy to Vercel →</p>
          <p className="text-xs text-gray-500">Publish with a custom domain in one click.</p>
        </Link>
      </div>
    </article>
  )
}
