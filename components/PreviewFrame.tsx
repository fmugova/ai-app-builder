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
    
    // Detect if content is JSON instead of HTML (streaming multi-file projects)
    if (trimmedHtml.startsWith('{') || trimmedHtml.startsWith('[')) {
      console.log('📦 Preview received JSON format (multi-file project) - waiting for conversion...');
      // Return empty for now - the chatbuilder will convert this to preview HTML
      return '';
    }
    
    // Detect if content contains project metadata fragments (partial JSON during streaming)
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
      const cleanHtml = stripMarkdownCodeFences(html);
      const cleanCss = css ? stripMarkdownCodeFences(css) : '';
      const cleanJs = js ? stripMarkdownCodeFences(js) : '';
      
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

          console.log('✅ Preview security initialized');
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
      
      console.log('✅ Preview HTML built successfully with security measures');
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
      } catch (e) {
        // Expected to fail due to same-origin policy
        console.log('✅ iframe properly sandboxed (same-origin block active)');
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
            // SECURITY: Explicitly block navigation
            allow="none"
            // SECURITY: Additional protection
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  )
}