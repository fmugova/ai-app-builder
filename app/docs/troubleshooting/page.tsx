import Link from 'next/link'

export const metadata = { title: 'Troubleshooting — BuildFlow AI Docs' }

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-800 pb-6 mb-6 last:border-0 last:mb-0">
      <h3 className="text-white font-semibold text-base mt-0 mb-2">{q}</h3>
      <div className="text-gray-400 text-sm space-y-2">{children}</div>
    </div>
  )
}

export default function TroubleshootingPage() {
  return (
    <article className="prose-docs">
      <h1>Troubleshooting</h1>
      <p className="lead">
        Common issues and how to fix them. If you&apos;re still stuck,{' '}
        <Link href="/contact">contact support</Link> — we typically reply within 24 hours.
      </p>

      <hr />
      <h2>Generation issues</h2>

      <Q q="The generated site has only one page, but I asked for multiple pages">
        <p>You need to explicitly list the pages in your prompt. BuildFlow looks for a <code className="code">Pages:</code> label or a list of page names like <em>&quot;Home, About, Services, Contact&quot;</em>.</p>
        <p>Try re-generating with: <em>&quot;Create a 4-page website. Pages: Home, About, Services, Contact&quot;</em></p>
      </Q>

      <Q q="The generation stopped halfway through / preview is blank">
        <p>This usually means the generation timed out. Try:</p>
        <ul>
          <li>Simplify your prompt (fewer sections per generation)</li>
          <li>Break it into steps: generate the basic structure first, then add sections with follow-up prompts</li>
          <li>Refresh the page and try again</li>
        </ul>
      </Q>

      <Q q="The site looks different from what I asked for">
        <p>AI generation isn&apos;t deterministic — the same prompt can produce slightly different results each time. Use follow-up prompts to correct specific details:</p>
        <ul>
          <li><em>&quot;Change the background to dark navy&quot;</em></li>
          <li><em>&quot;The hero section should have a full-width image, not a split layout&quot;</em></li>
          <li><em>&quot;Remove the testimonials section&quot;</em></li>
        </ul>
      </Q>

      <Q q="I've used all my monthly generations">
        <p>Free plan: 3 generations/month. Pro plan: 100 generations/month.</p>
        <p>Options:</p>
        <ul>
          <li><Link href="/pricing">Upgrade to Pro</Link> for 100 generations/month</li>
          <li>Purchase a <Link href="/pricing">credit pack</Link> for pay-as-you-go generations</li>
          <li>Wait for your monthly counter to reset (resets on your signup anniversary date)</li>
        </ul>
      </Q>

      <hr />
      <h2>Preview issues</h2>

      <Q q="The preview is showing 'File not found' or is blank">
        <p>Preview sessions expire after 20 minutes. If you left the tab idle:</p>
        <ol>
          <li>Click <strong>Generate</strong> again (this refreshes the preview session)</li>
          <li>Or click <strong>Refresh Preview</strong> in the toolbar</li>
        </ol>
      </Q>

      <Q q="Images in the preview are broken / not loading">
        <p>Placeholder images from external sources (like Unsplash or Lorem Picsum) may fail if they block the request. To fix:</p>
        <ul>
          <li>Upload your own images using the <strong>Images</strong> button in the toolbar</li>
          <li>Ask the AI to use a solid color background instead: <em>&quot;Replace broken images with solid gray placeholder boxes&quot;</em></li>
        </ul>
      </Q>

      <Q q="CSS/JavaScript from CDNs isn't loading in the preview">
        <p>The preview has a Content Security Policy (CSP) that allows scripts from common CDNs (unpkg, jsdelivr, cdnjs). If a library from an unlisted CDN doesn&apos;t load, ask the AI to use an allowed alternative:</p>
        <p><em>&quot;Use the jsdelivr CDN version of Chart.js instead&quot;</em></p>
      </Q>

      <hr />
      <h2>Deployment issues</h2>

      <Q q="Vercel deployment fails / 'Connect Vercel' doesn't work">
        <ul>
          <li>Make sure you&apos;re on the <strong>Pro or Business plan</strong> — Vercel deployment requires an upgrade.</li>
          <li>Disconnect and reconnect your Vercel account in <Link href="/dashboard/settings">Settings → Integrations</Link>.</li>
          <li>Check that your Vercel account has permission to create projects (not a read-only team member).</li>
        </ul>
      </Q>

      <Q q="Custom domain not resolving after adding DNS records">
        <p>DNS propagation can take up to 48 hours, though it&apos;s usually 5–30 minutes. Check:</p>
        <ul>
          <li>Use <a href="https://whatsmydns.net" target="_blank" rel="noopener noreferrer" className="text-blue-400">whatsmydns.net</a> to see if your records have propagated globally</li>
          <li>Make sure there are no conflicting A or CNAME records for the same hostname</li>
          <li>Clear your browser DNS cache: <code className="code">chrome://net-internals/#dns</code></li>
        </ul>
      </Q>

      <Q q="Published site shows the BuildFlow banner — how do I remove it?">
        <p>The banner is automatically removed for Pro and Business subscribers. <Link href="/pricing">Upgrade your plan</Link> and republish your site.</p>
      </Q>

      <hr />
      <h2>Account &amp; billing issues</h2>

      <Q q="I was charged but my plan didn't upgrade">
        <p>Stripe payments are processed instantly. If your plan didn&apos;t update:</p>
        <ol>
          <li>Refresh your dashboard and wait 1–2 minutes (webhooks can be slightly delayed)</li>
          <li>Check <Link href="/billing">Billing</Link> to confirm the payment was received</li>
          <li>If the issue persists after 10 minutes, <Link href="/contact">contact support</Link> with your Stripe payment ID</li>
        </ol>
      </Q>

      <Q q="I can't log in after resetting my password">
        <p>After a password reset:</p>
        <ul>
          <li>Clear your browser cookies and try again</li>
          <li>Make sure you&apos;re using the email address linked to your account (not an alias)</li>
          <li>If you signed up with Google or GitHub, you need to sign in with that provider — password reset won&apos;t work for OAuth accounts</li>
        </ul>
      </Q>

      <Q q="Email verification link expired">
        <p>Verification links expire after 1 hour. To get a new one:</p>
        <ol>
          <li>Go to <Link href="/auth/signin">Sign In</Link></li>
          <li>Sign in with your email and password</li>
          <li>You&apos;ll be prompted to resend the verification email</li>
        </ol>
      </Q>

      <hr />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 not-prose">
        <p className="text-white font-medium mb-1">Still stuck?</p>
        <p className="text-gray-400 text-sm mb-3">
          Our support team replies within 24 hours. Include your account email and a description of the issue.
        </p>
        <Link
          href="/contact"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Contact Support →
        </Link>
      </div>
    </article>
  )
}
