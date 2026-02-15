'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, Eye, Home, RefreshCw, Loader2 } from 'lucide-react'

interface Page {
  id: string
  slug: string
  title: string
  content: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  isHomepage: boolean
  order: number
  isPublished: boolean
}

interface PreviewFrameMultiPageProps {
  pages: Page[]
  sharedHTML?: string
  sharedCSS?: string
  sharedJS?: string
}

export default function PreviewFrameMultiPage({
  pages,
  sharedCSS = '',
  sharedJS = '',
}: PreviewFrameMultiPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPath, setCurrentPath] = useState('index.html')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Build individual HTML files for each page
  const buildPageFile = useCallback((page: Page): string => {
    // Build a nav that links to other pages as real .html files
    const navLinks = pages.map(p => {
      const filename = p.isHomepage ? 'index.html' : `${p.slug}.html`
      return `<a href="${filename}" class="nav-link${p.slug === page.slug ? ' active' : ''}">${p.isHomepage ? '🏠 ' : ''}${p.title}</a>`
    }).join('\n      ')

    // If the page content already contains full HTML, inject nav + shared CSS
    const hasFullHTML = /<!doctype|<html/i.test(page.content)

    if (hasFullHTML) {
      // Inject shared CSS and a minimal nav bar into existing full HTML
      const injectedStyle = `
<style>
  .__bf-nav { position:fixed;top:0;left:0;right:0;z-index:9999;background:#1e1b4b;padding:0.5rem 1rem;display:flex;gap:1rem;font-family:system-ui,sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  .__bf-nav a { color:#c4b5fd;text-decoration:none;padding:4px 10px;border-radius:6px;transition:background .15s; }
  .__bf-nav a:hover { background:rgba(255,255,255,.12); }
  .__bf-nav a.active { background:#7c3aed;color:#fff;font-weight:600; }
  body { padding-top:40px!important; }
  ${sharedCSS}
</style>`
      const nav = `<div class="__bf-nav">${pages.map(p => {
        const filename = p.isHomepage ? 'index.html' : `${p.slug}.html`
        return `<a href="${filename}"${p.slug === page.slug ? ' class="active"' : ''}>${p.isHomepage ? '🏠 ' : ''}${p.title}</a>`
      }).join('')}</div>`
      const navScript = `<script>${sharedJS}</script>`

      return page.content
        .replace(/<head>/i, `<head>${injectedStyle}`)
        .replace(/<body[^>]*>/i, match => `${match}\n${nav}`)
        .replace(/<\/body>/i, `${navScript}\n</body>`)
    }

    // Otherwise wrap in full HTML shell
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.metaTitle || page.title}</title>
  <meta name="description" content="${page.metaDescription || page.description || ''}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .nav-bar { position:fixed;top:0;left:0;right:0;z-index:9999;background:#1e1b4b;padding:0.5rem 1rem;display:flex;gap:1rem;font-family:system-ui,sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.3); }
    .nav-link { color:#c4b5fd;text-decoration:none;padding:4px 10px;border-radius:6px;transition:background .15s; }
    .nav-link:hover { background:rgba(255,255,255,.12); }
    .nav-link.active { background:#7c3aed;color:#fff;font-weight:600; }
    body { padding-top:42px; }
    ${sharedCSS}
  </style>
</head>
<body>
  <nav class="nav-bar">
    ${navLinks}
  </nav>
  <main>
    ${page.content}
  </main>
  <script>${sharedJS}</script>
</body>
</html>`
  }, [pages, sharedCSS, sharedJS])

  // Upload all page files to the preview session server
  const createPreviewSession = useCallback(async () => {
    if (!pages || pages.length === 0) return
    setLoading(true)
    try {
      const files = pages.map(page => ({
        filename: page.isHomepage ? 'index.html' : `${page.slug}.html`,
        content: buildPageFile(page),
        mimeType: 'text/html',
      }))

      const res = await fetch('/api/preview-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })

      if (!res.ok) throw new Error('Failed to create preview session')
      const { sessionId: id } = await res.json()
      setSessionId(id)
      setCurrentPath('index.html')
    } catch {
      setSessionId(null)
    } finally {
      setLoading(false)
    }
  }, [pages, buildPageFile])

  useEffect(() => {
    createPreviewSession()
  }, [createPreviewSession])

  // Track current path in the iframe via navigation events
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !sessionId) return
    const handleLoad = () => {
      try {
        const src = iframe.contentWindow?.location?.pathname ?? ''
        // Extract the filename portion after /preview/[sessionId]/
        const match = src.match(/\/preview\/[^/]+\/(.+)$/)
        if (match) setCurrentPath(match[1])
      } catch {
        // cross-origin guard — ignore
      }
    }
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [sessionId])

  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pages Available</h3>
          <p className="text-sm text-gray-600">Generate pages to see a live preview here.</p>
        </div>
      </div>
    )
  }

  const iframeSrc = sessionId
    ? `/preview/${sessionId}/index.html`
    : undefined

  const currentPageInfo = pages.find(p => {
    const filename = p.isHomepage ? 'index.html' : `${p.slug}.html`
    return filename === currentPath
  })

  return (
    <div className="h-full flex flex-col">
      {/* Browser-style toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-400">
          <Eye className="w-3.5 h-3.5" />
        </div>

        {/* Fake address bar */}
        <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-600 font-mono truncate flex items-center gap-1.5">
          <span className="text-gray-400">preview /</span>
          <span className="text-gray-700">{currentPath}</span>
          {currentPageInfo && (
            <span className="text-purple-600 ml-1">— {currentPageInfo.title}</span>
          )}
        </div>

        {/* Page count */}
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {pages.length} page{pages.length !== 1 ? 's' : ''}
        </span>

        {/* Reload */}
        <button
          onClick={createPreviewSession}
          disabled={loading}
          title="Reload preview"
          className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Page navigation tabs */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 flex items-center gap-0.5 overflow-x-auto">
        {pages.map(page => {
          const filename = page.isHomepage ? 'index.html' : `${page.slug}.html`
          const isActive = currentPath === filename
          return (
            <button
              key={page.id}
              onClick={() => {
                if (iframeRef.current && sessionId) {
                  iframeRef.current.src = `/preview/${sessionId}/${filename}`
                  setCurrentPath(filename)
                }
              }}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-t border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-purple-500 text-purple-700 bg-white font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {page.isHomepage && <Home className="w-3 h-3" />}
              {page.title}
            </button>
          )
        })}
      </div>

      {/* Preview iframe — real src, real navigation */}
      {loading && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Starting preview…</p>
          </div>
        </div>
      )}
      {!loading && iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="flex-1 w-full h-full border-0"
          title="Multi-Page Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}
      {!loading && !iframeSrc && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">Preview unavailable</p>
            <button
              onClick={createPreviewSession}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
