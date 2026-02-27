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

  // Sanitize user-generated HTML while preserving the full document structure
  // (html/head/body/script tags). Without WHOLE_DOCUMENT:true DOMPurify drops
  // the <head>, stripping Tailwind CDN and other stylesheet links — leaving the
  // page completely unstyled. The iframe sandbox (no allow-same-origin) keeps
  // the content isolated from the parent origin regardless of what scripts run.
  const sanitizedCode = DOMPurify.sanitize(site.code, {
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
    ADD_TAGS: ['script', 'style', 'link', 'meta', 'html', 'head', 'body'],
    ADD_ATTR: [
      'class', 'id', 'style', 'href', 'src', 'rel', 'type', 'charset',
      'name', 'content', 'alt', 'title', 'lang', 'dir', 'property',
      'media', 'async', 'defer', 'crossorigin', 'integrity', 'data-*',
    ],
    FORBID_TAGS: ['iframe', 'object', 'embed', 'base'],
    FORBID_ATTR: [
      'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onsubmit', 'onchange', 'onkeydown', 'onkeyup', 'onresize',
    ],
  });

  // Inject a form-interceptor script so that any contact/booking forms on the
  // published site POST their data to BuildFlow's submissions API instead of
  // navigating away (which would break in the sandboxed iframe anyway).
  // The script runs in the iframe context — the absolute API URL is needed
  // because the iframe has no origin (sandbox without allow-same-origin).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildflow-ai.app';
  const formInterceptor = `<script>
(function(){
  var API='${appUrl}/api/projects/${site.id}/submissions';
  function showToast(msg,ok){
    var t=document.createElement('div');
    t.style.cssText='position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-size:14px;font-family:system-ui,sans-serif;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.2);color:#fff;background:'+(ok?'#10b981':'#ef4444');
    t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},4000);
  }
  document.addEventListener('submit',function(e){
    var form=e.target;if(!form||form.tagName!=='FORM')return;
    e.preventDefault();
    var data={};
    try{new FormData(form).forEach(function(v,k){data[k]=String(v)});}catch(ex){}
    data.formType=form.dataset.formType||form.id||form.getAttribute('name')||'contact';
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){r.ok?showToast('Message sent!',true):showToast('Failed to send. Please try again.',false);})
      .catch(function(){showToast('Failed to send. Please try again.',false);});
  },true);
})();
</script>`;

  // Inject before </body> (or </html> as fallback, or append if neither found)
  let finalCode = sanitizedCode;
  if (finalCode.includes('</body>')) {
    finalCode = finalCode.replace('</body>', formInterceptor + '</body>');
  } else if (finalCode.includes('</html>')) {
    finalCode = finalCode.replace('</html>', formInterceptor + '</html>');
  } else {
    finalCode = finalCode + formInterceptor;
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

      {/* Site Content - Sanitized for security */}
      <iframe
        srcDoc={finalCode}
        className="w-full h-full border-0"
        style={{ marginTop: "40px", height: "calc(100vh - 40px)" }}
        sandbox="allow-scripts allow-forms allow-popups"
        title={site.name}
      />
    </div>
  );
}
