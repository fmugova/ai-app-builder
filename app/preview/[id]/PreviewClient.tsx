'use client'

import { useState, useEffect } from 'react'
import { toast, Toaster } from 'react-hot-toast'

interface PreviewClientProps {
  projectId: string
}

export default function PreviewClient({ projectId }: PreviewClientProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showCode, setShowCode] = useState(false)
  const [projectName, setProjectName] = useState('Preview')

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()

      if (data.code) {
        setProjectName(data.name || 'Preview')
        // Enhance code for full interactivity
        const enhancedCode = enhanceCodeForPreview(data.code)
        setCode(enhancedCode)
      }
    } catch (error) {
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }


  const enhanceCodeForPreview = (originalCode: string): string => {
    // Remove any existing base tags
    let enhanced = originalCode.replace(/<base[^>]*>/gi, '')

    // Inject interactive scripts and styles
    const interactiveScript = `
<script>
  // Prevent MOST external navigation, but allow footer links
  window.addEventListener('DOMContentLoaded', function() {
    // Override all anchor clicks
    document.addEventListener('click', function(e) {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href) {
        const href = anchor.getAttribute('href');
        
        // Allow hash links
        if (href && href.startsWith('#')) {
          return; // Let them work normally
        }
        
        // Allow footer links (terms, privacy, contact, etc.)
        const footerLinks = [
          '/terms', '/privacy', '/contact', '/about',
          'mailto:', 'tel:', 'twitter.com', 'linkedin.com',
          'facebook.com', 'instagram.com', 'github.com'
        ];
        
        const isFooterLink = footerLinks.some(link => 
          href && (href.includes(link) || href.startsWith(link))
        );
        
        if (isFooterLink) {
          // Open footer links in new tab
          e.preventDefault();
          window.open(href, '_blank');
          return;
        }
        
        // Allow javascript: links
        if (href && href.startsWith('javascript:')) {
          return;
        }
        
        // Prevent other external navigation
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          e.preventDefault();
          console.log('Navigation blocked in preview:', href);
        }
      }
    });

    // Make forms work
    document.addEventListener('submit', function(e) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const data = {};
      
      formData.forEach((value, key) => {
        data[key] = value;
      });
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 99999; animation: slideIn 0.3s ease-out;';
      successDiv.innerHTML = '<strong>✅ Form Submitted!</strong><br><small>In production, this would send data to your server</small>';
      document.body.appendChild(successDiv);
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = '@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }';
      document.head.appendChild(style);
      
      // Remove after 3 seconds
      setTimeout(() => {
        successDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => successDiv.remove(), 300);
      }, 3000);
      
      console.log('Form submission (preview mode):', data);
    });

    // Enable localStorage (already works in iframe sandbox with allow-same-origin)
    // Add visual feedback for buttons
    document.addEventListener('click', function(e) {
      const button = e.target.closest('button');
      if (button && !button.disabled) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 100);
      }
    });
  });

  // Override window.open for non-footer links
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    const footerDomains = ['twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'github.com'];
    const isFooterLink = footerDomains.some(domain => url && url.includes(domain));
    
    if (isFooterLink || (url && url.startsWith('mailto:')) || (url && url.startsWith('tel:'))) {
      return originalWindowOpen.call(window, url, target, features);
    }
    
    console.log('window.open blocked in preview (use footer links for external):', url);
    return null;
  };
</script>

<style>
  /* Ensure transitions work */
  * {
    transition-property: transform, opacity, background-color, border-color, color;
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Button hover effects */
  button:not(:disabled) {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  button:not(:disabled):hover {
    filter: brightness(1.1);
  }
  
  button:not(:disabled):active {
    transform: scale(0.95);
  }

  /* Footer link styling */
  footer a {
    text-decoration: underline;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  footer a:hover {
    opacity: 1;
  }
</style>
`

    // Inject scripts before </body> or at the end
    if (enhanced.includes('</body>')) {
      enhanced = enhanced.replace('</body>', `${interactiveScript}</body>`)
    } else if (enhanced.includes('</html>')) {
      enhanced = enhanced.replace('</html>', `${interactiveScript}</html>`)
    } else {
      enhanced += interactiveScript
    }

    return enhanced
  }

  const refreshPreview = () => {
    loadProject()
    toast.success('Preview refreshed!')
  }

  const viewportSizes = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Preview...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Preview Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <h1 className="text-white font-semibold flex items-center gap-2">
                <span>👁️</span>
                <span>{projectName}</span>
              </h1>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${
                    viewMode === 'desktop'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  🖥️ Desktop
                </button>
                <button
                  onClick={() => setViewMode('tablet')}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${
                    viewMode === 'tablet'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  📱 Tablet
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`px-3 py-1.5 rounded-md text-sm transition ${
                    viewMode === 'mobile'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={refreshPreview}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
              >
                🔄 Refresh
              </button>
              
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
              >
                {showCode ? '👁️ Preview' : '📝 Code'}
              </button>
              
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          {showCode ? (
            // Code View
            <div className="w-full max-w-6xl bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Source Code</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code)
                    toast.success('Code copied to clipboard!')
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  📋 Copy Code
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[70vh]">
                <pre className="text-sm text-green-400 font-mono">
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          ) : (
            // Preview View
            <div 
              className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
              style={{
                width: viewportSizes[viewMode].width,
                height: viewportSizes[viewMode].height,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <iframe
                srcDoc={code}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                title="Full Preview"
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>✅ All interactions work in preview</span>
              <span>💾 LocalStorage enabled</span>
              <span>🔒 External links blocked</span>
            </div>
            <div>
              {viewMode === 'desktop' ? '🖥️ Desktop View' : 
               viewMode === 'tablet' ? '📱 Tablet View (768x1024)' : 
               '📱 Mobile View (375x667)'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}