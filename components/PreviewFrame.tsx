'use client'

import { useMemo, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

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

  // Debug: Log what we're receiving
  useEffect(() => {
    console.log('🖼️ PreviewFrame received:', {
      htmlLength: html?.length || 0,
      cssLength: css?.length || 0,
      jsLength: js?.length || 0,
      htmlPreview: html?.substring(0, 100),
      validation: safeValidation
    });
  }, [html, css, js, safeValidation]);

  const fullHTML = useMemo(() => {
    if (!html?.trim()) {
      console.warn('⚠️ No HTML content to preview');
      return '';
    }

    try {
      const result = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>${css || ''}</style>
</head>
<body>
  ${html}
  <script>
    window.addEventListener('error', (e) => {
      console.warn('[Preview Error]:', e.message);
    });

    try {
      ${js || ''}
    } catch (error) {
      console.error('[Preview JS Error]:', error);
    }
  </script>
</body>
</html>`;
      console.log('✅ Preview HTML built successfully');
      return result;
    } catch (error) {
      console.error('❌ Error building preview HTML:', error);
      return '';
    }
  }, [html, css, js]);

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
            key={fullHTML.substring(0, 100)} // Force remount on significant changes
            srcDoc={fullHTML}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        )}
      </div>
    </div>
  )
}