'use client';

import React, { useMemo, useState } from 'react';
import { FileText, ChevronRight, Home } from 'lucide-react';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  isHomepage: boolean;
  order: number;
}

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string | null;
}

interface PreviewClientProps {
  code: string;
  projectName: string;
  pages?: Page[];
  files?: ProjectFile[];
  isMultiPage?: boolean;
}

export default function PreviewClient({ 
  code, 
  projectName, 
  pages = [], 
  files = [],
  isMultiPage = false 
}: PreviewClientProps) {
  const [currentPage, setCurrentPage] = useState<string>('main');
  const [showNav, setShowNav] = useState(true);

  // Get HTML files from project files
  const htmlFiles = useMemo(() => {
    return files.filter(f => f.path.endsWith('.html') || f.path.endsWith('.htm'));
  }, [files]);

  // Determine if we have multiple pages to show
  const hasMultiplePages = pages.length > 0 || htmlFiles.length > 1;

  // Get current content to display
  const currentContent = useMemo(() => {
    if (currentPage === 'main') {
      return sanitizeCode(code);
    }

    // Check if it's a page
    const page = pages.find(p => p.slug === currentPage);
    if (page) {
      return sanitizeCode(page.content);
    }

    // Check if it's a file
    const file = htmlFiles.find(f => f.path === currentPage);
    if (file) {
      return sanitizeCode(file.content);
    }

    return sanitizeCode(code);
  }, [currentPage, code, pages, htmlFiles]);

  // Sanitize and prepare code for iframe
  function sanitizeCode(rawCode: string): string {
    let sanitized = rawCode.trim();

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
  }

  return (
    <div className="w-full h-screen bg-gray-100 flex">
      {/* Sidebar Navigation - Only show if there are multiple pages/files */}
      {hasMultiplePages && showNav && (
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 mb-1">Pages</h3>
            <p className="text-xs text-gray-500">
              {pages.length > 0 ? `${pages.length} pages` : `${htmlFiles.length} files`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Main/Homepage */}
            {!isMultiPage && (
              <button
                onClick={() => setCurrentPage('main')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === 'main'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Main Page</span>
              </button>
            )}

            {/* Pages from database */}
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(page.slug)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === page.slug
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page.isHomepage ? (
                  <Home className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{page.title || page.slug}</span>
              </button>
            ))}

            {/* HTML files */}
            {htmlFiles.length > 0 && pages.length === 0 && (
              <>
                {htmlFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setCurrentPage(file.path)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentPage === file.path
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{file.path}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {hasMultiplePages && (
              <button
                onClick={() => setShowNav(!showNav)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={showNav ? 'Hide navigation' : 'Show navigation'}
              >
                <ChevronRight className={`w-5 h-5 transition-transform ${showNav ? 'rotate-180' : ''}`} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
              <p className="text-sm text-gray-500">
                {currentPage === 'main' ? 'Live Preview' : 
                 pages.find(p => p.slug === currentPage)?.title || currentPage}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const blob = new Blob([currentContent], { type: 'text/html' });
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
            key={currentPage}
            srcDoc={currentContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
            title={`Preview: ${projectName}`}
          />
        </div>
      </div>
    </div>
  );
}
