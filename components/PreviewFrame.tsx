'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Monitor, Tablet, Smartphone } from 'lucide-react'
import { stripMarkdownCodeFences } from '@/lib/utils'

type Viewport = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

// ============================================
// TYPES
// ============================================

interface ValidationMessage {
  message: string;
  line?: number;
  column?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

interface ValidationResult {
  isComplete: boolean;
  hasHtml: boolean;
  hasCss: boolean;
  hasJs: boolean;
  validationScore: number;
  validationPassed: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  cspViolations: string[];
  passed: boolean;
}

interface PreviewFrameProps {
  html: string;
  css: string;
  js: string;
  validation?: ValidationResult;
  onElementClick?: (info: { tag: string; classes: string; text: string; outerHTML: string }) => void;
}

// ============================================
// DEFAULT VALIDATION
// ============================================

const DEFAULT_VALIDATION: ValidationResult = {
  isComplete: false,
  hasHtml: false,
  hasCss: false,
  hasJs: false,
  validationScore: 0,
  validationPassed: true,
  errors: [],
  warnings: [],
  cspViolations: [],
  passed: false,
};

// ============================================
// COMPONENT
// ============================================

export default function PreviewFrame({ html, css, js, validation, onElementClick }: PreviewFrameProps) {
  const safeValidation = validation || DEFAULT_VALIDATION;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [editMode, setEditMode] = useState(false);

  const fullHTML = useMemo(() => {
    if (!html?.trim()) {
      return '';
    }

    // Detect if content is JSON instead of HTML (multi-file fullstack project)
    const trimmedHtml = html.trim();
    if (trimmedHtml.startsWith('{') || trimmedHtml.startsWith('[')) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
        .msg{text-align:center;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:360px;}
        .icon{font-size:2.5rem;margin-bottom:.75rem;}
        h2{margin:0 0 .5rem;font-size:1.1rem;color:#1e293b;}
        p{margin:0;color:#64748b;font-size:.875rem;}
      </style></head><body>
        <div class="msg"><div class="icon">🏗️</div>
          <h2>Full-Stack Project Generated</h2>
          <p>Use <strong>Browse Files</strong> to view and download your project files.</p>
        </div>
      </body></html>`;
    }

    // Detect partial JSON fragments during streaming
    if (trimmedHtml.includes('"projectName"') || trimmedHtml.includes('"description"')) {
      if (!trimmedHtml.includes('<!DOCTYPE') && !trimmedHtml.includes('<html')) {
        console.log('📦 Preview received partial multi-file project - waiting for completion...');
        return '';
      }
    }
    
    // Detect if content contains markdown code fences
    if (trimmedHtml.includes('```')) {
      console.warn('⚠️ Markdown fences detected - stripping as safety measure');
    }

    try {
      // SAFETY NET: Strip markdown fences as last resort
      let cleanHtml = stripMarkdownCodeFences(html);
      const cleanCss = css ? stripMarkdownCodeFences(css) : '';
      const cleanJs = js ? stripMarkdownCodeFences(js) : '';

      // Fix malformed image src attributes from AI output:
      // 1. Strip extra leading quote: src=""https:// → src="https://
      cleanHtml = cleanHtml.replace(/(\bsrc=")(?:["'])(https?:\/\/[^"]+)(")/gi, '$1$2$3');
      // 2. Unresolved template placeholders: src="{item.image}" → picsum
      cleanHtml = cleanHtml.replace(/\bsrc=["']\{([^}"']+)\}["']/gi, (_m, v) => {
        const seed = v.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'img';
        return `src="https://picsum.photos/seed/${seed}/800/600"`;
      });
      // 3. Empty or hash-only src on img tags
      cleanHtml = cleanHtml.replace(/(<img\b[^>]*)\bsrc=["'](?:|#)["']/gi, '$1src="https://picsum.photos/seed/placeholder/800/600"');
      
      // Verify we have actual HTML after cleaning
      if (!cleanHtml.includes('<') && !cleanHtml.includes('>')) {
        // Only log error if there's actual content (not just empty/whitespace)
        if (cleanHtml.trim().length > 0) {
          console.warn('⚠️ No HTML tags found - likely streaming explanatory text:', cleanHtml.substring(0, 100));
        }
        return '';
      }

      // SECURITY FIX: Inject navigation prevention script
      const securityScript = `
        // Prevent navigation and popup attacks
        (function() {
          // In-page toast — no browser alert() popups
          function showPreviewToast(msg) {
            var existing = document.getElementById('__bf_toast');
            if (existing) existing.remove();
            var t = document.createElement('div');
            t.id = '__bf_toast';
            t.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(30,30,30,.92);color:#fff;padding:8px 16px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;z-index:2147483647;pointer-events:none;max-width:320px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.3);';
            t.textContent = msg;
            document.body.appendChild(t);
            setTimeout(function(){ if(t.parentNode) t.remove(); }, 2500);
          }

          // Intercept link clicks
          window.addEventListener('click', function(e) {
            var el = e.target;
            // Walk up to find the <a> tag (click may land on a child element)
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (!el || el.tagName !== 'A') return;

            var href = el.getAttribute('href') || '';

            // Allow same-page hash anchors to scroll normally
            if (!href || href.startsWith('#')) return;

            // Silently block internal .html page links (multi-page nav)
            // — srcdoc iframes cannot navigate between .html files
            if (/^[^/]*\.html?(#.*)?$/i.test(href) || href === '/' || href === './') {
              e.preventDefault();
              showPreviewToast('Page navigation is previewed inline only.');
              return;
            }

            // Block everything else (external URLs, parent-app paths like /dashboard)
            e.preventDefault();
            console.log('🔒 Navigation blocked for security:', href);
            showPreviewToast('Links open in your published site, not in preview.');
          }, true); // Use capture phase to catch before other handlers

          // Block form submissions
          window.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🔒 Form submission blocked in preview mode');
            var t = document.createElement('div');
            t.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(30,30,30,.92);color:#fff;padding:8px 16px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;z-index:2147483647;pointer-events:none;';
            t.textContent = 'Form submissions work on your published site.';
            document.body.appendChild(t);
            setTimeout(function(){ if(t.parentNode) t.remove(); }, 2500);
          }, true);

          // Prevent window.open
          window.open = function() {
            console.log('🔒 window.open blocked');
            return null;
          };

          // Prevent top navigation
          try {
            if (window.top !== window.self) {
              Object.defineProperty(window.top, 'location', {
                get: function() { return window.location; },
                set: function() { console.log('🔒 top.location blocked'); }
              });
            }
          } catch (e) {
            // Blocked by same-origin policy (good!)
          }

          // Override history.pushState/replaceState to prevent SecurityError
          // in srcdoc iframes (about:srcdoc origin can't push absolute URLs)
          (function() {
            var _push = history.pushState.bind(history);
            var _replace = history.replaceState.bind(history);
            history.pushState = function() { try { _push.apply(history, arguments); } catch(e) { console.log('🔒 pushState intercepted (preview mode)'); } };
            history.replaceState = function() { try { _replace.apply(history, arguments); } catch(e) { console.log('🔒 replaceState intercepted (preview mode)'); } };
          })();

          // Security initialized
        })();
      `;

      const result = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  
  <!-- SECURITY: Base tag to contain navigation -->
  <base target="_self">
  
  <!-- SECURITY: Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
    font-src 'self' data: https://fonts.gstatic.com;
    img-src 'self' data: blob: https: http:;
    connect-src 'self' https://api.anthropic.com;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'none';
  ">
  
  <style>${cleanCss}</style>
</head>
<body>
  <!-- SECURITY: Initialize security before any other scripts -->
  <script>${securityScript}</script>
  
  ${cleanHtml}
  
  <script>
    // Error handling
    window.addEventListener('error', (e) => {
      console.warn('[Preview Error]:', e.message);
    });

    // User code
    try {
      ${cleanJs}
    } catch (error) {
      console.error('[Preview JS Error]:', error);
    }
  </script>
  ${editMode ? `
  <!-- BuildFlow: click-to-edit overlay -->
  <script>
  (function(){
    var _hovered = null;
    var _origOutline = '';
    var _origCursor = '';
    var SKIP = new Set(['HTML','BODY','HEAD','SCRIPT','STYLE','META','LINK']);
    function highlight(el){
      if(_hovered && _hovered !== el){ _hovered.style.outline=_origOutline; _hovered.style.cursor=_origCursor; }
      if(!el||SKIP.has(el.tagName)) return;
      _origOutline=el.style.outline; _origCursor=el.style.cursor;
      el.style.outline='2px solid #a855f7'; el.style.cursor='crosshair';
      _hovered=el;
    }
    document.addEventListener('mouseover',function(e){ highlight(e.target); },true);
    document.addEventListener('mouseout',function(e){ if(_hovered===e.target){ _hovered.style.outline=_origOutline; _hovered.style.cursor=_origCursor; _hovered=null; } },true);
    document.addEventListener('click',function(e){
      var el=e.target;
      if(!el||SKIP.has(el.tagName)) return;
      e.stopImmediatePropagation(); e.preventDefault();
      var info={
        tag: el.tagName.toLowerCase(),
        classes: el.className||'',
        text: (el.innerText||'').trim().slice(0,120),
        outerHTML: el.outerHTML.slice(0,600)
      };
      window.parent.postMessage({type:'bf-element-click',info:info},'*');
    },true);
  })();
  </script>` : ''}
</body>
</html>`;

      return result;
    } catch (error) {
      console.error('❌ Error building preview HTML:', error);
      return '';
    }
  }, [html, css, js, editMode]);

  // Additional iframe security monitoring
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        // Attempt to verify iframe didn't navigate away
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          console.warn('⚠️ Cannot access iframe document (blocked by CORS - good!)');
          return;
        }

        // Check if iframe navigated to unexpected location
        const iframeLocation = iframe.contentWindow?.location.href;
        if (iframeLocation && !iframeLocation.startsWith('blob:') && iframeLocation !== 'about:srcdoc') {
          console.error('🚨 SECURITY: Iframe navigated to unexpected location:', iframeLocation);
          // Reload with correct content
          iframe.srcdoc = fullHTML;
        }
      } catch {
        // Expected to fail due to same-origin policy (iframe properly sandboxed)
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [fullHTML]);

  // Listen for element-click messages from the iframe in edit mode
  useEffect(() => {
    if (!editMode || !onElementClick) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'bf-element-click') {
        onElementClick(e.data.info);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [editMode, onElementClick]);

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {/* Validation Status Bar */}
      {(!safeValidation.validationPassed || safeValidation.errors.length > 0) && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Code Quality Issues Detected
              </p>
              {safeValidation.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {safeValidation.errors.slice(0, 3).map((error, i) => (
                    <li key={i} className="text-xs text-yellow-700 flex items-start gap-2">
                      <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{error.message}</span>
                    </li>
                  ))}
                  {safeValidation.errors.length > 3 && (
                    <li className="text-xs text-yellow-600">
                      + {safeValidation.errors.length - 3} more errors
                    </li>
                  )}
                </ul>
              )}
              {safeValidation.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {safeValidation.warnings.slice(0, 2).map((warning, i) => (
                    <li key={i} className="text-xs text-yellow-600 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {safeValidation.validationPassed && safeValidation.errors.length === 0 && html && (
        <div className="bg-green-50 border-b border-green-200 p-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Code validated successfully
            </span>
            <span className="text-xs text-green-600 ml-auto">
              Score: {safeValidation.validationScore}/100
            </span>
          </div>
        </div>
      )}

      {/* Viewport Toggle Bar */}
      {fullHTML && (
        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 border-b border-gray-200">
          <button
            onClick={() => setViewport('desktop')}
            title="Desktop"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'desktop' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            onClick={() => setViewport('tablet')}
            title="Tablet (768px)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'tablet' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" /> Tablet
          </button>
          <button
            onClick={() => setViewport('mobile')}
            title="Mobile (375px)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewport === 'mobile' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
          {viewport !== 'desktop' && (
            <span className="ml-2 text-xs text-gray-400">{VIEWPORT_WIDTHS[viewport]}</span>
          )}
          <div className="ml-auto pl-2 border-l border-gray-300">
            <button
              onClick={() => setEditMode(v => !v)}
              title={editMode ? 'Exit edit mode' : 'Click any element to edit it'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                editMode
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white'
              }`}
            >
              {editMode ? '✏️ Editing' : '✏️ Edit'}
            </button>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div className="flex-1 relative overflow-hidden bg-gray-200">
        {!fullHTML ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p className="text-sm">No preview available yet</p>
              <p className="text-xs mt-1">Start generating to see the preview</p>
            </div>
          </div>
        ) : viewport === 'desktop' ? (
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms"
            srcDoc={fullHTML}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex justify-center overflow-auto py-2">
            <div
              className="relative bg-white shadow-lg flex-shrink-0"
              style={{ width: VIEWPORT_WIDTHS[viewport], height: '100%', minHeight: '500px' }}
            >
              <iframe
                ref={iframeRef}
                title="Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms"
                srcDoc={fullHTML}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}