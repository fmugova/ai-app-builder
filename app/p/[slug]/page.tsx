"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DOMPurify from 'isomorphic-dompurify';

interface SiteData {
  id: string;
  name: string;
  code: string;
  type: string;
  isMultiPage?: boolean;
  createdAt: string;
  User: {
    name: string | null;
  };
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
          throw new Error(res.status === 404 ? "Site not found" : "Failed to load site");
        }
        const data = await res.json();
        setSite(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
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
          <p className="text-gray-600">{error || "This site does not exist or has been unpublished."}</p>
        </div>
      </div>
    );
  }

  // Sanitize user-generated HTML to prevent XSS attacks
  const sanitizedCode = DOMPurify.sanitize(site.code, {
    ADD_TAGS: ['script', 'style', 'link'],
    ADD_ATTR: ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 'data-*'],
    FORBID_TAGS: ['iframe', 'object', 'embed', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });

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

      {/* Site Content - Sanitized for security */}
      <iframe
        srcDoc={sanitizedCode}
        className="w-full h-full border-0"
        style={{ marginTop: "40px", height: "calc(100vh - 40px)" }}
        sandbox="allow-scripts allow-forms allow-popups"
        title={site.name}
      />
    </div>
  );
}
