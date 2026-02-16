import Link from 'next/link'

export const metadata = { title: 'Deploy to Vercel — BuildFlow AI Docs' }

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-6">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <h3 className="text-white font-semibold text-base mt-0 mb-1">{title}</h3>
        <div className="text-gray-400 text-sm space-y-1">{children}</div>
      </div>
    </div>
  )
}

export default function DeployPage() {
  return (
    <article className="prose-docs">
      <h1>Deploy to Vercel</h1>
      <p className="lead">
        Go from a generated site to a live public URL — with HTTPS and a custom domain —
        in under a minute.
      </p>

      <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4 my-4 text-sm text-amber-200">
        <strong className="text-amber-400">Pro plan required.</strong> One-click Vercel deployment
        is available on Pro ($19/mo) and Business ($49/mo) plans.{' '}
        <Link href="/pricing" className="text-amber-400 underline">Upgrade →</Link>
      </div>

      <hr />

      <h2>Option A — Deploy directly from the builder</h2>
      <p>The fastest path: deploy without leaving BuildFlow.</p>

      <Step n={1} title="Connect your Vercel account">
        <p>Go to <Link href="/dashboard/settings">Account Settings</Link> → <strong>Integrations</strong> → click <strong>Connect Vercel</strong>.
        You&apos;ll be redirected to Vercel to authorise BuildFlow.</p>
      </Step>
      <Step n={2} title="Generate your site">
        <p>Build your site in the <Link href="/chatbuilder">Chatbuilder</Link> as normal.</p>
      </Step>
      <Step n={3} title="Click Deploy">
        <p>In the top-right toolbar, click the <strong>Deploy</strong> button → choose <strong>Vercel</strong>.</p>
        <p>BuildFlow creates a new Vercel project, uploads the generated files, and triggers a deployment.</p>
      </Step>
      <Step n={4} title="Get your URL">
        <p>In 20–40 seconds, you&apos;ll receive a <code className="code">*.vercel.app</code> URL.
        Share it immediately or add a custom domain.</p>
      </Step>

      <hr />

      <h2>Option B — Download and deploy manually</h2>
      <p>Use this if you prefer full control, or if you&apos;re on the Free plan.</p>

      <Step n={1} title="Download the ZIP">
        <p>In the builder toolbar, click <strong>Export</strong> → <strong>Download ZIP</strong>.</p>
      </Step>
      <Step n={2} title="Create a Vercel project">
        <p>Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-blue-400">vercel.com/new</a> → drag and drop the ZIP, or push to a GitHub repo and import.</p>
      </Step>
      <Step n={3} title="Configure (optional)">
        <p>For a static HTML site, no build command is needed. Set the output directory to <code className="code">./</code> or leave as default.</p>
      </Step>
      <Step n={4} title="Deploy">
        <p>Click <strong>Deploy</strong>. Vercel builds and serves your site globally via CDN.</p>
      </Step>

      <hr />

      <h2>Adding a custom domain</h2>
      <ol>
        <li>In your Vercel project dashboard, go to <strong>Settings → Domains</strong>.</li>
        <li>Enter your domain (e.g. <code className="code">mysite.com</code>) and click <strong>Add</strong>.</li>
        <li>
          Add the DNS records Vercel shows you:
          <ul>
            <li>For an apex domain (<code className="code">mysite.com</code>): add an <strong>A record</strong> pointing to <code className="code">76.76.21.21</code></li>
            <li>For a subdomain (<code className="code">www.mysite.com</code>): add a <strong>CNAME</strong> pointing to <code className="code">cname.vercel-dns.com</code></li>
          </ul>
        </li>
        <li>DNS propagation takes 5 min – 48 hours. Vercel will show a green checkmark when it&apos;s live.</li>
        <li>HTTPS is provisioned automatically — no action required.</li>
      </ol>

      <hr />

      <h2>Publish on BuildFlow (free alternative)</h2>
      <p>
        Don&apos;t have a Vercel account? You can publish directly on BuildFlow for free:
      </p>
      <ol>
        <li>In the builder, click <strong>Publish</strong> → <strong>Publish on BuildFlow</strong>.</li>
        <li>Choose a slug for your URL: <code className="code">buildflow-ai.app/p/your-slug</code>.</li>
        <li>Your site is live instantly with a shareable link.</li>
      </ol>
      <p>
        Published sites include the BuildFlow banner. Remove it by upgrading to Pro.
      </p>

      <hr />

      <h2>Re-deploying after changes</h2>
      <p>
        After editing your site with follow-up prompts, click <strong>Deploy</strong> again.
        BuildFlow pushes the updated files to the same Vercel project — your URL stays the same.
      </p>

      <div className="not-prose mt-6">
        <Link href="/docs/troubleshooting" className="inline-block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-4 transition-colors">
          <p className="text-white font-medium text-sm mb-1">Deployment not working? →</p>
          <p className="text-gray-500 text-xs">See common deployment issues and fixes.</p>
        </Link>
      </div>
    </article>
  )
}
