/**
 * Sanitizes and wraps code for iframe preview
 * Handles React/JSX code by wrapping with necessary CDN scripts
 * Removes internal navigation links
 * DEFENSIVE: Handles missing CDN scripts gracefully
 */
export function sanitizeForPreview(code: string): string {
  let sanitized = code
    .replace(/<a\s+[^>]*href=["']\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']https?:\/\/[^"']*\/dashboard["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']http:\/\/localhost:\d+\/builder["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/auth[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\s+[^>]*href=["']\/api[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/href=["']\/dashboard["']/gi, 'href="#"')
    .replace(/href=["']\/builder["']/gi, 'href="#"')
    .replace(/href=["']\/auth[^"']*["']/gi, 'href="#"')
    .replace(/href=["']\/api[^"']*["']/gi, 'href="#"')
    .replace(/onclick=["'][^"']*dashboard[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*builder[^"']*["']/gi, 'onclick="return false"')
    .replace(/onclick=["'][^"']*router\.push[^"']*["']/gi, 'onclick="return false"')

  // If already a complete HTML document, return as-is
  if (sanitized.trim().startsWith('<!DOCTYPE') || 
      sanitized.trim().startsWith('<html') ||
      (sanitized.includes('<head>') && sanitized.includes('<body>'))) {
    if (sanitized.includes('<head>') && !sanitized.includes('<base')) {
      sanitized = sanitized.replace('<head>', '<head>\n  <base target="_blank">')
    }
    return sanitized
  }

  // Detect React/JSX code
  const isReactCode = 
    sanitized.includes('export default function') ||
    sanitized.includes('useState') ||
    sanitized.includes('useEffect') ||
    sanitized.includes('className=') ||
    sanitized.includes('```tsx') ||
    sanitized.includes('```jsx') ||
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/i.test(sanitized)

  // Detect React Router usage
  const usesReactRouter =
    sanitized.includes('<Routes') ||
    sanitized.includes('<Route') ||
    sanitized.includes('HashRouter') ||
    sanitized.includes('BrowserRouter') ||
    sanitized.includes('useNavigate') ||
    sanitized.includes('useLocation') ||
    sanitized.includes('react-router-dom')

  if (isReactCode) {
    // Clean markdown code blocks
    let reactCode = sanitized
      .replace(/```(?:tsx|jsx|javascript|js)?\n?/g, '')
      .trim()
    
    // Remove export statement and rename to App
    reactCode = reactCode
      .replace(/export\s+default\s+function\s+\w+/, 'function App')
      .replace(/^function\s+\w+/, 'function App')
    
    // Compose script includes
    let routerScript = ''
    let routerSetup = ''
    
    if (usesReactRouter) {
      routerScript = `
  <!-- React Router - Multiple CDN fallbacks -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js"></script>
  <script>
    // Fallback: If jsdelivr fails, try unpkg
    if (!window.ReactRouterDOM) {
      console.warn('Primary CDN failed, trying fallback...');
      var script = document.createElement('script');
      script.crossOrigin = 'anonymous';
      script.src = 'https://unpkg.com/react-router-dom@6.20.1/dist/umd/react-router-dom.production.min.js';
      document.head.appendChild(script);
    }
  </script>`
      
      routerSetup = `
    // ✅ DEFENSIVE: Wait for React Router to load with retry
    function waitForReactRouter(callback, maxAttempts = 10) {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.ReactRouterDOM && window.ReactRouterDOM.HashRouter) {
          clearInterval(check);
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(check);
          console.error('React Router failed to load after', maxAttempts, 'attempts');
          // Render error message
          document.getElementById('root').innerHTML = \`
            <div style="padding: 40px; text-align: center; font-family: system-ui;">
              <h1 style="color: #ef4444;">⚠️ React Router Failed to Load</h1>
              <p style="color: #666;">The React Router library could not be loaded from the CDN.</p>
              <p style="color: #666; font-size: 14px;">This may be due to network issues or CDN unavailability.</p>
              <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Retry
              </button>
            </div>
          \`;
        }
      }, 100);
    }
    
    // ✅ DEFENSIVE: Safe destructuring with fallbacks
    const getSafeRouterComponents = () => {
      if (!window.ReactRouterDOM) {
        console.error('ReactRouterDOM is not available');
        return {
          HashRouter: () => null,
          Routes: () => null,
          Route: () => null,
          Link: ({ children }) => React.createElement('a', { href: '#' }, children),
          useNavigate: () => () => {},
          useLocation: () => ({ pathname: '/' }),
          useParams: () => ({}),
          Outlet: () => null,
          Navigate: () => null
        };
      }
      
      const {
        HashRouter = () => null,
        Routes = () => null,
        Route = () => null,
        Link = ({ children }) => React.createElement('a', { href: '#' }, children),
        useNavigate = () => () => {},
        useLocation = () => ({ pathname: '/' }),
        useParams = () => ({}),
        Outlet = () => null,
        Navigate = () => null
      } = window.ReactRouterDOM;
      
      return { HashRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Outlet, Navigate };
    };
`
    } else {
      routerSetup = `
    // No React Router needed - render immediately
    function waitForReactRouter(callback) {
      callback();
    }
`
    }
    
    // Wrap the entire component
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script>window.tailwindcss = { config: {} };</script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  ${routerScript}
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root">
    <div style="padding: 40px; text-align: center; color: #666;">
      <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <p>Loading preview...</p>
    </div>
  </div>
  
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;
    ${routerSetup}
    
    // Wait for libraries to load, then render
    waitForReactRouter(() => {
      try {
        ${usesReactRouter ? 'const { HashRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Outlet, Navigate } = getSafeRouterComponents();' : ''}
        
        // Define the component
        ${reactCode}
        
        // Render
        const root = ReactDOM.createRoot(document.getElementById('root'));
        ${usesReactRouter ? 'root.render(<HashRouter><App /></HashRouter>);' : 'root.render(<App />);'}
      } catch (error) {
        console.error('Render error:', error);
        document.getElementById('root').innerHTML = \`
          <div style="padding: 40px; text-align: center; font-family: system-ui;">
            <h1 style="color: #ef4444;">⚠️ Preview Error</h1>
            <p style="color: #666;">\${error.message}</p>
            <pre style="text-align: left; background: #f3f4f6; padding: 20px; border-radius: 8px; overflow: auto; font-size: 12px;">\${error.stack}</pre>
          </div>
        \`;
      }
    });
  </script>
</body>
</html>`
  }

  // Regular HTML content
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Preview</title>
  <script>window.tailwindcss = { config: {} };</script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${sanitized.trim()}
</body>
</html>`
}