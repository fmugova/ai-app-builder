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
    let enhanced = originalCode

    // Interactive enhancement script
    const interactiveScript = `
<script>
  (function() {
    'use strict';
    
    window.addEventListener('DOMContentLoaded', function() {
      // Handle anchor clicks
      document.addEventListener('click', function(e) {
        const anchor = e.target.closest('a');
        if (!anchor || !anchor.href) return;
        
        const href = anchor.getAttribute('href');
        if (!href) return;
        
        // Allow hash links
        if (href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }
        
        // Allow footer/legal links to open in new tab
        const allowedLinks = [
          'terms', 'privacy', 'contact', 'about',
          'mailto:', 'tel:', 
          'twitter.com', 'linkedin.com', 'facebook.com', 
          'instagram.com', 'github.com'
        ];
        
        const isAllowed = allowedLinks.some(pattern => href.includes(pattern));
        
        if (isAllowed) {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }
        
        // Block other navigation
        e.preventDefault();
      });

      // Handle form submissions
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => { data[key] = value; });
        
        // Show success toast
        const toast = document.createElement('div');
        toast.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 999999;
          animation: slideIn 0.3s ease-out;
          font-family: system-ui, -apple-system, sans-serif;
        \`;
        toast.innerHTML = '<strong>✅ Form Submitted!</strong><br><small>In production, this would send data</small>';
        document.body.appendChild(toast);
        
        // Add animation styles
        if (!document.getElementById('toast-styles')) {
          const style = document.createElement('style');
          style.id = 'toast-styles';
          style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
          document.head.appendChild(style);
        }
        
        // Remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        console.log('Form data:', data);
      });

      // Button click feedback
      document.addEventListener('click', function(e) {
        const button = e.target.closest('button');
        if (button && !button.disabled) {
          const originalTransform = button.style.transform;
          button.style.transform = 'scale(0.95)';
          button.style.transition = 'transform 0.1s';
          setTimeout(() => {
            button.style.transform = originalTransform || 'scale(1)';
          }, 100);
        }
      });
    });
  })();
</script>

<style>
  html {
    scroll-behavior: smooth;
  }
  
  button:not(:disabled) {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  button:not(:disabled):hover {
    filter: brightness(1.1);
  }
  
  a {
    cursor: pointer;
  }
  
  footer a {
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.3);
  }
  
  footer a:hover {
    text-decoration-color: rgba(255,255,255,0.8);
  }
</style>
`

    // Inject before closing body or html tag
    if (enhanced.includes('</body>')) {
      enhanced = enhanced.replace('</body>', interactiveScript + '</body>')
    } else if (enhanced.includes('</html>')) {
      enhanced = enhanced.replace('</html>', interactiveScript + '</html>')
    } else {
      enhanced += interactiveScript
    }

    return enhanced
  }

  const refreshPreview = () => {
    loadProject()
    toast.success('Preview refreshed!')
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
      
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <h1 className="text-white font-semibold flex items-center gap-2">
                <span>👁️</span>
                <span>{projectName}</span>
              </h1>
              
              {/* View Mode */}
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

            {/* Right */}
            <div className="flex items-center gap-2">
              <button
                onClick={refreshPreview}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center gap-2"
              >
                🔄 Refresh
              </button>
              
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm flex items-center gap-2"
              >
                {showCode ? '👁️ Preview' : '📝 Code'}
              </button>
              
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-900 overflow-hidden">
          {showCode ? (
            // Code View
            <div className="h-full p-6 overflow-auto">
              <div className="max-w-6xl mx-auto bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-lg">Source Code</h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(code)
                      toast.success('Code copied!')
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    <code>{code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            // Preview View
            <div className="h-full flex items-center justify-center p-6">
              <div 
                className="bg-white shadow-2xl transition-all duration-300 overflow-hidden"
                style={{
                  width: viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px',
                  height: '100%',
                  maxWidth: '100%',
                  borderRadius: viewMode === 'desktop' ? '0' : '12px'
                }}
              >
                <iframe
                  srcDoc={code}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                  title="Preview"
                  style={{ background: 'white' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>✅ Interactive</span>
              <span>💾 LocalStorage enabled</span>
              <span>🔒 Safe preview mode</span>
            </div>
            <div>
              {viewMode === 'desktop' && '🖥️ Desktop View'}
              {viewMode === 'tablet' && '📱 Tablet (768px)'}
              {viewMode === 'mobile' && '📱 Mobile (375px)'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}