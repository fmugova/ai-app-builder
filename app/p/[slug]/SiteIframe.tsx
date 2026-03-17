'use client'

// Thin client wrapper — just renders the sandboxed iframe.
// All data fetching and sanitization happen server-side in page.tsx,
// so the iframe content is ready on first paint (no loading waterfall).
export default function SiteIframe({ code, title }: { code: string; title: string }) {
  return (
    <iframe
      srcDoc={code}
      className="w-full h-full border-0"
      style={{ marginTop: '40px', height: 'calc(100vh - 40px)' }}
      sandbox="allow-scripts allow-forms allow-popups"
      title={title}
    />
  )
}
