'use client'

import { useMemo, useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { stripMarkdownCodeFences } from '@/lib/utils'

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

export default function PreviewFrame({ html, css, js, validation }: PreviewFrameProps) {
  const safeValidation = validation || DEFAULT_VALIDATION;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fullHTML = useMemo(() => {
    if (!html?.trim()) {
      console.warn('⚠️ No HTML content to preview');
      return '';
    }

    // CRITICAL: Check if content is actually HTML
    const trimmedHtml = html.trim();
    
    // Detect if content is JSON instead of HTML (multi-file fullstack project)
    if (trimmedHtml.startsWith('{') || trimmedHtml.startsWith('[')) {
      console.log('📦 Preview received JSON format (multi-file project) - use file viewer to browse files.');
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
          // Prevent all navigation attempts
          window.addEventListener('click', function(e) {
            const target = e.target;
            if (target && target.tagName === 'A') {
              e.preventDefault();
              console.log('🔒 Navigation blocked for security:', target.href);
              
              // Show user feedback
              const href = target.getAttribute('href');
              if (href && !href.startsWith('#')) {
                alert('Preview Mode: External links are disabled for security.\\n\\nLink: ' + href);
              }
            }
          }, true); // Use capture phase to catch before other handlers

          // Block form submissions
          window.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🔒 Form submission blocked in preview mode');
            alert('Preview Mode: Form submissions are disabled.');
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
</body>
</html>`;
      
      return result;
    } catch (error) {
      console.error('❌ Error building preview HTML:', error);
      return '';
    }
  }, [html, css, js]);

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

      {/* Preview Frame */}
      <div className="flex-1 relative overflow-hidden">
        {!fullHTML ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p className="text-sm">No preview available yet</p>
              <p className="text-xs mt-1">Start generating to see the preview</p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms"
            srcDoc={fullHTML}
            // SECURITY: Additional protection
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  )
}