import Link from 'next/link'

export const metadata = { title: 'Using Templates — BuildFlow AI Docs' }

export default function TemplatesPage() {
  return (
    <article className="prose-docs">
      <h1>Using Templates</h1>
      <p className="lead">
        Templates give you a professionally designed starting point that you can customise
        with AI in seconds. BuildFlow has two types of templates.
      </p>

      <hr />

      <h2>Prompt templates (in the builder)</h2>
      <p>
        Prompt templates are pre-written prompt structures — not finished sites.
        They&apos;re a fast way to write a complete, well-structured prompt.
      </p>
      <ol>
        <li>Open the <Link href="/chatbuilder">Chatbuilder</Link>.</li>
        <li>Click the <strong>Templates</strong> button (bottom toolbar).</li>
        <li>Choose a template category: <em>Landing Page</em>, <em>Portfolio</em>, <em>Dashboard</em>, etc.</li>
        <li>The prompt fills in automatically — edit the placeholders (business name, colors, etc.).</li>
        <li>Click <strong>Generate</strong>.</li>
      </ol>
      <p>
        The <strong>P.F.D.A. Starter</strong> template is the most versatile — it works
        for any type of site.
      </p>

      <hr />

      <h2>Marketplace templates</h2>
      <p>
        The Template Marketplace offers complete, ready-to-use site designs created by the
        BuildFlow community and team.
      </p>
      <ol>
        <li>Go to <Link href="/templates">buildflow-ai.app/templates</Link>.</li>
        <li>Browse by category or search by keyword.</li>
        <li><strong>Free templates</strong> — click <em>Use Template</em> to open it directly in the builder.</li>
        <li><strong>Pro templates</strong> — one-time purchase unlocks the template forever.</li>
        <li>Once loaded, modify it with follow-up prompts just like any other generation.</li>
      </ol>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4 text-sm text-gray-300">
        <strong className="text-white">Pro tip:</strong> After loading a marketplace template, try:
        <br /><em className="text-gray-400">&quot;Update this for a photography studio called Lens & Light, use black and gold colors&quot;</em>
      </div>

      <hr />

      <h2>Selling your own templates</h2>
      <p>
        Pro and Business subscribers can publish templates to the marketplace and earn
        revenue when others purchase them.
      </p>
      <ol>
        <li>Build a site in the Chatbuilder.</li>
        <li>Click <strong>Publish</strong> → <strong>List on Marketplace</strong>.</li>
        <li>Set a name, description, category, and price (or leave free).</li>
        <li>After review, your template appears in the marketplace.</li>
        <li>You earn <strong>70% of each sale</strong>. Payouts are processed monthly.</li>
      </ol>

      <hr />

      <h2>Template plan limits</h2>
      <table className="not-prose w-full text-sm border-collapse my-4">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 text-gray-400 font-medium">Plan</th>
            <th className="text-left py-2 text-gray-400 font-medium">Free templates</th>
            <th className="text-left py-2 text-gray-400 font-medium">Pro templates</th>
            <th className="text-left py-2 text-gray-400 font-medium">Can sell</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50 text-gray-300">
          <tr><td className="py-2">Free</td><td className="py-2">✓</td><td className="py-2">Purchase required</td><td className="py-2">✗</td></tr>
          <tr><td className="py-2">Pro</td><td className="py-2">✓</td><td className="py-2">Purchase required</td><td className="py-2">✓</td></tr>
          <tr><td className="py-2">Business</td><td className="py-2">✓</td><td className="py-2">Included</td><td className="py-2">✓</td></tr>
        </tbody>
      </table>

      <div className="not-prose mt-6">
        <Link href="/docs/generate" className="inline-block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">← Prompt tips</p>
          <p className="text-gray-500 text-xs">Get better results with better prompts.</p>
        </Link>
      </div>
    </article>
  )
}
