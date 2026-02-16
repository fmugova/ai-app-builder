import Link from 'next/link'

export const metadata = { title: 'API Reference — BuildFlow AI Docs' }

function Endpoint({
  method, path, desc, auth, body, response,
}: {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT'
  path: string
  desc: string
  auth?: string
  body?: { field: string; type: string; required?: boolean; desc: string }[]
  response?: string
}) {
  const colors: Record<string, string> = {
    GET: 'bg-green-900/50 text-green-400 border-green-700/50',
    POST: 'bg-blue-900/50 text-blue-400 border-blue-700/50',
    DELETE: 'bg-red-900/50 text-red-400 border-red-700/50',
    PUT: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50',
  }
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden my-6">
      <div className="bg-gray-900 px-5 py-4 flex items-start gap-3">
        <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded border ${colors[method]}`}>{method}</span>
        <div>
          <code className="text-white font-mono text-sm">{path}</code>
          <p className="text-gray-400 text-sm mt-0.5 mb-0">{desc}</p>
        </div>
      </div>
      {(auth || body || response) && (
        <div className="px-5 py-4 space-y-4 text-sm bg-gray-950">
          {auth && (
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Auth</p>
              <p className="text-gray-300">{auth}</p>
            </div>
          )}
          {body && (
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Request Body (JSON)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-1.5 pr-4 text-gray-500 font-medium">Field</th>
                    <th className="text-left py-1.5 pr-4 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-1.5 text-gray-500 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {body.map(f => (
                    <tr key={f.field}>
                      <td className="py-1.5 pr-4">
                        <code className="text-blue-300">{f.field}</code>
                        {f.required && <span className="text-red-400 ml-1">*</span>}
                      </td>
                      <td className="py-1.5 pr-4 text-gray-500">{f.type}</td>
                      <td className="py-1.5 text-gray-400">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-gray-600 text-xs mt-1"><span className="text-red-400">*</span> required</p>
            </div>
          )}
          {response && (
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Example Response</p>
              <pre className="bg-gray-900 rounded-lg p-3 text-green-300 text-xs overflow-x-auto">{response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ApiPage() {
  return (
    <article className="prose-docs">
      <h1>API Reference</h1>
      <p className="lead">
        BuildFlow exposes a REST API for programmatic access. API access is available on the
        <strong> Business plan</strong> and above.
      </p>

      <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4 my-4 text-sm text-amber-200 not-prose">
        <strong className="text-amber-400">Business plan required.</strong> API keys are available at{' '}
        <Link href="/dashboard/settings" className="text-amber-400 underline">Account Settings → API</Link>.{' '}
        <Link href="/pricing" className="text-amber-400 underline">Upgrade →</Link>
      </div>

      <hr />

      <h2>Authentication</h2>
      <p>
        All API requests must include your API key in the <code className="code">Authorization</code> header:
      </p>
      <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto not-prose my-4">{`Authorization: Bearer bf_live_xxxxxxxxxxxxxxxxxxxx`}</pre>
      <p>API keys start with <code className="code">bf_live_</code> for production and <code className="code">bf_test_</code> for testing.</p>

      <h2>Base URL</h2>
      <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 not-prose my-4">{`https://buildflow-ai.app/api`}</pre>

      <h2>Rate limits</h2>
      <table className="not-prose w-full text-sm border-collapse my-4">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 text-gray-400 font-medium">Endpoint</th>
            <th className="text-left py-2 text-gray-400 font-medium">Limit</th>
            <th className="text-left py-2 text-gray-400 font-medium">Window</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50 text-gray-300">
          <tr><td className="py-2">AI Generation</td><td className="py-2">10 requests</td><td className="py-2">1 minute</td></tr>
          <tr><td className="py-2">All other endpoints</td><td className="py-2">60 requests</td><td className="py-2">1 minute</td></tr>
          <tr><td className="py-2">Contact form</td><td className="py-2">3 requests</td><td className="py-2">10 minutes</td></tr>
        </tbody>
      </table>
      <p>
        Rate limit headers are returned on every response:
        <code className="code">X-RateLimit-Limit</code>, <code className="code">X-RateLimit-Remaining</code>, <code className="code">X-RateLimit-Reset</code>.
      </p>
      <p>Exceeded limits return <code className="code">HTTP 429 Too Many Requests</code>.</p>

      <hr />

      <h2>Health</h2>

      <Endpoint
        method="GET"
        path="/api/health"
        desc="Check service health. No auth required."
        response={`{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "responseTime": 42,
  "checks": {
    "database": { "status": "healthy", "responseTime": 12 },
    "redis": { "status": "healthy", "responseTime": 8 }
  }
}`}
      />

      <hr />

      <h2>Projects</h2>

      <Endpoint
        method="GET"
        path="/api/projects"
        desc="List all projects for the authenticated user."
        auth="Bearer token (session cookie or API key)"
        response={`{
  "projects": [
    {
      "id": "clx...",
      "name": "My Landing Page",
      "createdAt": "2025-01-10T09:00:00.000Z",
      "isPublished": false,
      "publicSlug": null
    }
  ]
}`}
      />

      <Endpoint
        method="POST"
        path="/api/projects"
        desc="Create a new project."
        auth="Bearer token"
        body={[
          { field: 'name', type: 'string', required: true, desc: 'Project name (max 100 chars)' },
          { field: 'code', type: 'string', desc: 'Initial HTML code' },
        ]}
        response={`{ "id": "clx...", "name": "My Project", "code": "..." }`}
      />

      <hr />

      <h2>Generation</h2>

      <Endpoint
        method="POST"
        path="/api/generate"
        desc="Generate HTML from a prompt. Returns a streaming response."
        auth="Bearer token"
        body={[
          { field: 'prompt', type: 'string', required: true, desc: 'Plain-English description of the site to generate' },
          { field: 'projectId', type: 'string', desc: 'Existing project ID to update (omit to create new)' },
          { field: 'mode', type: '"iterate" | "fresh"', desc: 'iterate = build on existing code; fresh = start over (default: iterate)' },
        ]}
        response={`// Streaming text/event-stream
// Each chunk is a fragment of the generated HTML
data: <!DOCTYPE html>\n
data: <html lang="en">\n
...
data: [DONE]`}
      />

      <hr />

      <h2>Publishing</h2>

      <Endpoint
        method="POST"
        path="/api/publish"
        desc="Publish a project to a public BuildFlow URL."
        auth="Bearer token"
        body={[
          { field: 'projectId', type: 'string', required: true, desc: 'Project to publish' },
          { field: 'slug', type: 'string', desc: 'Custom URL slug (auto-generated if omitted)' },
        ]}
        response={`{
  "url": "https://buildflow-ai.app/p/my-site",
  "slug": "my-site"
}`}
      />

      <hr />

      <h2>Error responses</h2>
      <p>All errors return JSON with an <code className="code">error</code> field:</p>
      <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm not-prose my-4">{`// HTTP 400
{ "error": "Validation failed", "details": { "prompt": ["Required"] } }

// HTTP 401
{ "error": "Unauthorized" }

// HTTP 403
{ "error": "CSRF check failed: unexpected origin" }

// HTTP 429
{ "error": "Too many requests", "resetIn": 42 }

// HTTP 500
{ "error": "Internal server error" }`}</pre>

      <hr />

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 not-prose">
        <p className="text-white font-medium mb-1">Need API support?</p>
        <p className="text-gray-400 text-sm mb-3">
          API access is currently in early access for Business plan subscribers.
          <Link href="/contact" className="text-blue-400 ml-1">Contact us</Link> for integration support or to discuss custom rate limits.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Upgrade to Business →
        </Link>
      </div>
    </article>
  )
}
