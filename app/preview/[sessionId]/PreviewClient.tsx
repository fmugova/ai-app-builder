'use client';

import React, { useMemo } from 'react';

interface PreviewClientProps {
  code: string;
  projectName: string;
}

export default function PreviewClient({ code, projectName }: PreviewClientProps) {
  // Sanitize and prepare code for iframe
  const sanitizedCode = useMemo(() => {
    let sanitized = code.trim();

    // Ensure DOCTYPE exists
    if (!sanitized.startsWith('<!DOCTYPE')) {
      sanitized = `<!DOCTYPE html>\n${sanitized}`;
    }

    // Check if Tailwind CDN is needed and missing
    const hasTailwindClasses = /class="[^"]*(?:flex|grid|p-|m-|text-|bg-|border|rounded|shadow|w-|h-)/i.test(sanitized);
    const hasTailwindCDN = sanitized.includes('tailwindcss.com') || sanitized.includes('tailwind.min.js');

    if (hasTailwindClasses && !hasTailwindCDN) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const tailwindScript = '  <script src="https://cdn.tailwindcss.com"></script>\n';
        sanitized =
          sanitized.substring(0, headEndIndex) +
          tailwindScript +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected Tailwind CDN');
      }
    }

    // Check if Babel is needed for React/JSX
    const needsBabel = sanitized.includes('type="text/babel"');
    const hasBabel = sanitized.includes('babel.min.js') || sanitized.includes('@babel/standalone');

    if (needsBabel && !hasBabel) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const babelScript = '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n';
        sanitized =
          sanitized.substring(0, headEndIndex) +
          babelScript +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected Babel standalone');
      }
    }

    // Ensure React and ReactDOM for React apps
    if (needsBabel && !sanitized.includes('react.development.js')) {
      const headEndIndex = sanitized.indexOf('</head>');
      if (headEndIndex !== -1) {
        const reactScripts = `  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>\n`;
        sanitized =
          sanitized.substring(0, headEndIndex) +
          reactScripts +
          sanitized.substring(headEndIndex);
        console.log('✅ Injected React libraries');
      }
    }

    return sanitized;
  }, [code]);

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
            <p className="text-sm text-gray-500">Live Preview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const blob = new Blob([sanitizedCode], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Download HTML
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          srcDoc={sanitizedCode}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
          title={`Preview: ${projectName}`}
        />
      </div>
    </div>
  );
}
