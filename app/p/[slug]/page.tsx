// Server Component — data fetching and sanitization happen at request time,
// so the iframe content is ready on the first HTML response. No client-side
// fetch waterfall, no loading spinner — the published site paints immediately.

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DOMPurify from 'isomorphic-dompurify'
import SiteIframe from './SiteIframe'

export const dynamic = 'force-dynamic'

type PageRow = { slug: string; title: string; content: string; isHomepage: boolean }
type FileRow = { path: string; content: string }
type ProjectRow = {
  id: string; name: string; code: string; type: string; createdAt: Date
  User: { name: string | null } | null
  Page: PageRow[]
  ProjectFile: FileRow[]
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // ── Fetch from DB directly — no HTTP round-trip to /api/sites/[slug] ──────
  const project = await (prisma.project.findFirst as (args: unknown) => Promise<ProjectRow | null>)({
    where: { publicSlug: slug, isPublished: true, publishedAt: { not: null } },
    include: {
      User: { select: { name: true } },
      Page: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        select: { slug: true, title: true, content: true, isHomepage: true },
      },
      ProjectFile: { select: { path: true, content: true } },
    },
  })

  if (!project) notFound()

  // ── Resolve displayable code (mirrors /api/sites/[slug] logic) ────────────
  const pages = project.Page ?? []
  const isMultiPage = pages.length > 1
  let code = project.code

  if (isMultiPage) {
    const homepage = pages.find(p => p.isHomepage) ?? pages[0]
    if (homepage) code = homepage.content
  }

  if (!code) {
    const files = project.ProjectFile ?? []
    const indexHtml = files.find(f => f.path === 'index.html' || f.path === 'public/index.html')
    if (indexHtml) {
      code = indexHtml.content
    } else if (files.length > 0) {
      const safeName = escapeHtml(project.name)
      code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${safeName}</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc"><div style="text-align:center;padding:40px"><h1>${safeName}</h1><p>Full-stack app — deploy to Vercel to view live.</p></div></body></html>`
    }
  }

  // ── Server-side DOMPurify (isomorphic-dompurify uses jsdom on Node) ───────
  const sanitized = DOMPurify.sanitize(code ?? '', {
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
    ADD_TAGS: ['script', 'style', 'link', 'meta', 'html', 'head', 'body'],
    ADD_ATTR: [
      'class', 'id', 'style', 'href', 'src', 'rel', 'type', 'charset',
      'name', 'content', 'alt', 'title', 'lang', 'dir', 'property',
      'media', 'async', 'defer', 'crossorigin', 'integrity', 'data-*',
    ],
    FORBID_TAGS: ['iframe', 'object', 'embed', 'base'],
    FORBID_ATTR: ['onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onsubmit', 'onchange', 'onkeydown', 'onkeyup', 'onresize'],
  })

  // ── Inject form interceptor script ────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildflow-ai.app'
  const formInterceptor = `<script>
(function(){
  var API='${appUrl}/api/projects/${project.id}/submissions';
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
</script>`

  let finalCode = sanitized
  if (finalCode.includes('</body>')) {
    finalCode = finalCode.replace('</body>', formInterceptor + '</body>')
  } else if (finalCode.includes('</html>')) {
    finalCode = finalCode.replace('</html>', formInterceptor + '</html>')
  } else {
    finalCode = finalCode + formInterceptor
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* BuildFlow banner */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 text-sm z-10 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <span className="font-medium">
            ⚡ Built with{' '}
            <a href="https://buildflow-ai.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
              BuildFlow AI
            </a>
            {project.User?.name && ` by ${project.User.name}`}
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

      {/* Sandboxed site content — pre-sanitized server-side */}
      <SiteIframe code={finalCode} title={project.name} />
    </div>
  )
}
