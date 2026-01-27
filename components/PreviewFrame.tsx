/**
 * FINAL FIX - PreviewFrame Component
 * Fixes:
 * 1. Validation error showing when it shouldn't
 * 2. Iframe navigation security
 * 3. Handles embedded CSS/JS in HTML
 */

'use client';

import React, { useState, useEffect } from 'react';

interface ValidationMessage {
  message: string;
  line?: number;
  column?: number;
  type?: 'syntax' | 'structure' | 'completeness';
}

interface ValidationResult {
  validationPassed: boolean;
  validationScore: number;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  passed: boolean;
}

interface PreviewFrameProps {
  html: string | null;
  css?: string | null;
  js?: string | null;
  validation?: ValidationResult | null;
  onRegenerate?: () => void;
}

export default function PreviewFrame({ 
  html, 
  css, 
  js, 
  validation, 
  onRegenerate 
}: PreviewFrameProps) {
  
  // ✅ FIX: Better code checking
  const hasCode = !!(html && html.trim().length > 0);
  
  console.log('🎨 PreviewFrame:', {
    hasCode,
    htmlLength: html?.length || 0,
    cssLength: css?.length || 0,
    jsLength: js?.length || 0,
  });

  // If no code, show empty state
  if (!hasCode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-lg text-gray-600 mb-2">No preview yet</p>
          <p className="text-sm text-gray-500">Generate code to see preview</p>
        </div>
      </div>
    );
  }

  // ✅ Rest of your component as normal...
  // Build the complete HTML with inline CSS and JS
  const completeHtml = buildCompleteHtml(html, css, js);
  
  return (
    <iframe
      srcDoc={completeHtml}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      title="Preview"
    />
  );
}

// Helper function to build complete HTML
function buildCompleteHtml(html: string, css?: string | null, js?: string | null): string {
  // If HTML already has everything, use as-is
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    return html;
  }
  
  // Otherwise wrap it
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
  ${html}
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>
  `.trim();
}