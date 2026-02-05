// WORKING REACT ROUTER TEMPLATE FOR CODE GENERATION/REFERENCE:
//
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <meta name="mobile-web-app-capable" content="yes">
//   <title>My App</title>
//   <script src="https://cdn.tailwindcss.com"></script>
//   <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
//   <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
//   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
//   <script src="https://unpkg.com/react-router-dom@6.8.1/dist/umd/react-router-dom.production.min.js"></script>
// </head>
// <body class="bg-gray-50">
//   <div id="root"></div>
//   <script type="text/babel">
//     const { useState, useEffect } = React;
//     const ReactRouterDOM = window.ReactRouterDOM;
//     if (!ReactRouterDOM) {
//       console.error('React Router DOM failed to load');
//       document.getElementById('root').innerHTML = 
//         '<div class="flex items-center justify-center h-screen"><h1 class="text-2xl text-red-600">Error loading application</h1></div>';
//     } else {
//       const { BrowserRouter, Routes, Route, Link, useNavigate } = ReactRouterDOM;
//       function HomePage() {
//         return (
//           <div className="container mx-auto p-8">
//             <h1 className="text-4xl font-bold mb-4">Home Page</h1>
//             <Link to="/about" className="text-blue-600 hover:underline">
//               Go to About
//             </Link>
//           </div>
//         );
//       }
//       function AboutPage() {
//         const navigate = useNavigate();
//         return (
//           <div className="container mx-auto p-8">
//             <h1 className="text-4xl font-bold mb-4">About Page</h1>
//             <button 
//               onClick={() => navigate('/')}
//               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//             >
//               Back to Home
//             </button>
//           </div>
//         );
//       }
//       function App() {
//         return (
//           <BrowserRouter>
//             <Routes>
//               <Route path="/" element={<HomePage />} />
//               <Route path="/about" element={<AboutPage />} />
//             </Routes>
//           </BrowserRouter>
//         );
//       }
//       // React 18 - use createRoot
//       const root = ReactDOM.createRoot(document.getElementById('root'));
//       root.render(<App />);
//     }
//   </script>
// </body>
// </html>
//
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SiteData {
  id: string;
  name: string;
  code: string;
  type: string;
  createdAt: string;
  User: {
    name: string | null;
  };
// IMPORTANT: When generating React Router code for site.code, always use this pattern:
// <script type="text/babel">
//   const ReactRouterDOM = window.ReactRouterDOM;
//   if (!ReactRouterDOM) {
//     console.error('React Router DOM not loaded!');
//     document.getElementById('root').innerHTML = '<h1>Error loading application</h1>';
//   } else {
//     const { BrowserRouter, Routes, Route, Link } = ReactRouterDOM;
//     // ...rest of your app code...
//   }
// </script>
// This prevents runtime errors if ReactRouterDOM is not loaded.
}

export default function SitePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSite() {
      try {
        const res = await fetch(`/api/sites/${slug}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Site not found' : 'Failed to load site');
        }
        const data = await res.json();
        setSite(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }
    loadSite();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Site Not Found</h1>
          <p className="text-gray-600">{error || 'This site does not exist or has been unpublished.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* BuildFlow Banner */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 text-sm z-10 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <span className="font-medium">
            ⚡ Built with <a href="https://buildflow-ai.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">BuildFlow AI</a>
            {site.User.name && ` by ${site.User.name}`}
          </span>
          <a 
            href="https://buildflow-ai.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs transition-colors"
          >
            Create Your Own
          </a>
        </div>
      </div>

      {/* Site Content */}
      <iframe
        srcDoc={site.code}
        className="w-full h-full border-0"
        style={{ marginTop: '40px', height: 'calc(100vh - 40px)' }}
        sandbox="allow-scripts allow-forms allow-popups"
        title={site.name}
      />
    </div>
  );
}
