import Link from 'next/link'

export const metadata = { title: 'Generate Your First Site — BuildFlow AI Docs' }

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-4 my-4 text-sm text-blue-200">
      <strong className="text-blue-400">Tip: </strong>{children}
    </div>
  )
}
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4 my-4 text-sm text-amber-200">
      <strong className="text-amber-400">Note: </strong>{children}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <article className="prose-docs">
      <h1>Generate Your First Site</h1>
      <p className="lead">
        The quality of your output depends heavily on your prompt. This guide shows you how
        to write prompts that produce exactly what you have in mind.
      </p>

      <hr />

      <h2>Anatomy of a great prompt</h2>
      <p>
        The best prompts answer four questions:
      </p>
      <ol>
        <li><strong>What type of site?</strong> (landing page, portfolio, dashboard, e-commerce, etc.)</li>
        <li><strong>Who is it for?</strong> (the business name, audience, industry)</li>
        <li><strong>What sections/pages?</strong> (hero, pricing, about, contact…)</li>
        <li><strong>What look and feel?</strong> (colors, fonts, style keywords)</li>
      </ol>

      <h3>Example — Weak prompt</h3>
      <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-4 my-2">
        <p className="text-red-300 text-sm font-mono m-0">&quot;Make me a website for a coffee shop&quot;</p>
      </div>
      <p className="text-sm text-gray-500">Works, but produces a generic result.</p>

      <h3>Example — Strong prompt</h3>
      <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-4 my-2">
        <p className="text-green-300 text-sm font-mono m-0">
          &quot;A landing page for Brew &amp; Bloom, an artisan coffee shop in Brooklyn.
          Include: hero with tagline, our story section, menu highlights (3 cards),
          Instagram-style photo grid, and a location/hours footer.
          Style: warm cream and espresso brown tones, serif headings, cosy and premium feel.&quot;
        </p>
      </div>

      <Tip>
        You don&apos;t need perfect English. Bullet points, fragments, and stream-of-consciousness
        all work fine. The AI is very good at inferring intent.
      </Tip>

      <hr />

      <h2>Multi-page sites</h2>
      <p>
        BuildFlow supports multi-page HTML generation. To get separate pages, explicitly list them:
      </p>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4">
        <p className="text-gray-300 text-sm font-mono m-0">
          &quot;A 4-page website for a law firm:<br />
          Pages: Home, Services, Our Team, Contact<br />
          Style: professional navy and gold, clean and authoritative&quot;
        </p>
      </div>
      <p>
        Each page becomes a separate HTML file in the generated project, with navigation
        links automatically wired together.
      </p>

      <Warning>
        If you want separate pages, list them explicitly. Without this, BuildFlow may
        generate a single-page site with anchor navigation instead.
      </Warning>

      <hr />

      <h2>Iterating on a design</h2>
      <p>
        After the first generation, use natural follow-up prompts to refine:
      </p>
      <ul>
        <li><strong>Change layout:</strong> <em>&quot;Move the CTA button above the fold&quot;</em></li>
        <li><strong>Change content:</strong> <em>&quot;Replace the placeholder text with real copy about a fitness studio&quot;</em></li>
        <li><strong>Add features:</strong> <em>&quot;Add a FAQ section with 5 questions about delivery&quot;</em></li>
        <li><strong>Fix style:</strong> <em>&quot;The font is too small on mobile, increase it&quot;</em></li>
        <li><strong>Change colors:</strong> <em>&quot;Use a dark navy background instead of white&quot;</em></li>
      </ul>

      <Tip>
        Use <strong>Iterate mode</strong> (the default) to build on the current version.
        Switch to <strong>Fresh</strong> to start over with a clean slate from your new prompt.
      </Tip>

      <hr />

      <h2>Using the P.F.D.A. template</h2>
      <p>
        Click the <strong>Templates</strong> button in the builder to load the P.F.D.A. starter —
        a fill-in-the-blanks format that covers:
      </p>
      <ul>
        <li><strong>P</strong>urpose — what the site does</li>
        <li><strong>F</strong>eatures — key sections and functionality</li>
        <li><strong>D</strong>esign — colors, style, feel</li>
        <li><strong>A</strong>udience — who is it for</li>
      </ul>
      <p>
        Fill in the template and hit Generate for consistently great first-draft results.
      </p>

      <hr />

      <h2>Using images in your site</h2>
      <p>
        Click the <strong>Images</strong> button in the builder toolbar to open the Media Library.
        Upload images, then click any thumbnail to insert the hosted URL into your prompt:
      </p>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4">
        <p className="text-gray-300 text-sm font-mono m-0">
          &quot;Use this image as the hero background: https://blobs.vercel-storage.com/assets/…&quot;
        </p>
      </div>
      <p>BuildFlow will use the real URL in the generated <code className="code">&lt;img&gt;</code> tags.</p>

      <hr />

      <div className="grid sm:grid-cols-2 gap-3 not-prose mt-6">
        <Link href="/docs/templates" className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">Use a template →</p>
          <p className="text-gray-500 text-xs">Start from a pre-built design instead.</p>
        </Link>
        <Link href="/docs/deploy" className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">Deploy your site →</p>
          <p className="text-gray-500 text-xs">Publish live in 30 seconds.</p>
        </Link>
      </div>
    </article>
  )
}
