'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Eye, Home } from 'lucide-react'

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
  sharedHTML?: string // Header, footer, navigation
  sharedCSS?: string
  sharedJS?: string
}

export default function PreviewFrameMultiPage({
  pages,
  sharedHTML = '',
  sharedCSS = '',
  sharedJS = ''
}: PreviewFrameMultiPageProps) {
  // Compute initial page slug from pages prop
  const getInitialPageSlug = () => {
    const homepage = pages.find(p => p.isHomepage)
    const firstPage = pages[0]
    return homepage?.slug || firstPage?.slug || ''
  }
  
  const [currentPageSlug, setCurrentPageSlug] = useState<string>(getInitialPageSlug)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const currentPage = pages.find(p => p.slug === currentPageSlug) || pages[0]

  // Build full HTML with routing
  const fullHTML = useMemo(() => {
    if (!pages || pages.length === 0) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>No Pages</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      padding: 2rem;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>No Pages Available</h1>
  <p>This project has no pages to display.</p>
</body>
</html>`
    }

    const homepage = pages.find(p => p.isHomepage) || pages[0]

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentPage?.metaTitle || currentPage?.title || 'Preview'}</title>
  <meta name="description" content="${currentPage?.metaDescription || currentPage?.description || ''}">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    /* Shared styles */
    ${sharedCSS}
    
    /* Page transition */
    .page {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Navigation active state */
    .nav-item.active {
      background: rgba(147, 51, 234, 0.1);
      color: #9333ea;
      font-weight: 600;
    }
    
    /* Hide inactive pages */
    .page.hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <!-- Shared Navigation/Header -->
  ${sharedHTML}
  
  <!-- Auto-generated Navigation (if no shared nav) -->
  ${!sharedHTML.includes('<nav') ? `
  <nav class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          ${pages.map(page => `
            <a 
              href="#${page.slug}" 
              class="nav-item inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition ${page.slug === homepage.slug ? 'active' : ''}"
              data-page="${page.slug}"
            >
              ${page.isHomepage ? '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>' : ''}
              ${page.title}
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  </nav>
  ` : ''}
  
  <!-- Page Content -->
  <main>
    ${pages.map((page, index) => `
      <div id="page-${page.slug}" class="page ${index === 0 ? '' : 'hidden'}" data-page-slug="${page.slug}">
        ${page.content}
      </div>
    `).join('')}
  </main>
  
  <script>
    // App State
    const AppState = {
      currentPage: '${homepage.slug}',
      pages: ${JSON.stringify(pages.map(p => ({ slug: p.slug, title: p.title })))},
    };
    
    // Page navigation function
    function showPage(pageSlug) {
      if (!pageSlug) {
        console.warn('No page slug provided');
        return;
      }
      
      // Hide all pages
      document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
      });
      
      // Show selected page
      const selectedPage = document.getElementById('page-' + pageSlug);
      if (selectedPage) {
        selectedPage.classList.remove('hidden');
        AppState.currentPage = pageSlug;
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
          item.classList.remove('active');
        });
        
        const activeNav = document.querySelector('[data-page="' + pageSlug + '"]');
        if (activeNav) {
          activeNav.classList.add('active');
        }
        
        // Update URL hash (without scroll)
        if (history.pushState) {
          history.pushState(null, null, '#' + pageSlug);
        } else {
          window.location.hash = pageSlug;
        }
      } else {
        console.warn('Page not found:', pageSlug);
      }
    }
    
    // Handle navigation clicks
    document.addEventListener('DOMContentLoaded', function() {
      // Navigation click handlers
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          const pageSlug = this.getAttribute('data-page');
          if (pageSlug) {
            showPage(pageSlug);
          }
        });
      });
      
      // Handle browser back/forward
      window.addEventListener('hashchange', function() {
        const hash = window.location.hash.slice(1);
        if (hash) {
          showPage(hash);
        }
      });
      
      // Handle initial hash
      const initialHash = window.location.hash.slice(1);
      if (initialHash) {
        showPage(initialHash);
      } else {
        showPage('${homepage.slug}');
      }
    });
    
    // Shared JavaScript
    ${sharedJS}
    
    // Error handling
    window.addEventListener('error', function(e) {
      console.warn('[Preview Error]:', e.message);
    });
  </script>
</body>
</html>`
  }, [pages, currentPage, sharedHTML, sharedCSS, sharedJS])

  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pages Available</h3>
          <p className="text-sm text-gray-600">
            This project has no pages to preview. Generate or create pages to see them here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Multi-Page Preview
          </span>
          <span className="text-xs text-gray-500">
            ({pages.length} page{pages.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        {/* Page Selector */}
        <select
          value={currentPageSlug}
          onChange={(e) => setCurrentPageSlug(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {pages.map(page => (
            <option key={page.id} value={page.slug}>
              {page.isHomepage && '🏠 '}
              {page.title}
            </option>
          ))}
        </select>
        
        {/* Page Info */}
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
          <span className="px-2 py-1 bg-white rounded border border-gray-200">
            /{currentPage?.slug || ''}
          </span>
          {currentPage?.isHomepage && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1">
              <Home className="w-3 h-3" />
              Homepage
            </span>
          )}
        </div>
      </div>

      {/* Preview iframe */}
      <iframe
        srcDoc={fullHTML}
        className="flex-1 w-full h-full border-0"
        title="Multi-Page Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      
      {/* Page List Overlay (Mobile) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsMobileNavOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Pages</h3>
            <div className="space-y-2">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    setCurrentPageSlug(page.slug)
                    setIsMobileNavOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    page.slug === currentPageSlug
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {page.isHomepage && <Home className="w-4 h-4" />}
                    <span className="font-medium">{page.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">/{page.slug}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
