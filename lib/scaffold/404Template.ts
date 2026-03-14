// lib/scaffold/404Template.ts
// Builds a branded 404.html page using the real shared nav + footer.
// Always generated as a shared asset so deployed sites have a proper error page.

interface PageRef {
  slug: string
  name: string
}

export function build404Page(
  siteName: string,
  navHtml: string,
  footerHtml: string,
  pages: PageRef[]
): string {
  const year = new Date().getFullYear()

  const links = pages
    .filter((p) => p.slug !== '404')
    .slice(0, 6)
    .map((p) => {
      const href = p.slug === 'index' ? 'index.html' : `${p.slug}.html`
      return `<a href="${href}" class="text-indigo-600 hover:underline font-medium text-sm">${p.name}</a>`
    })
    .join('\n          ')

  const defaultNav = `<nav class="bg-white shadow-sm sticky top-0 z-50 px-6 py-4 flex items-center">
  <span class="font-bold text-xl text-gray-900">${siteName}</span>
</nav>`

  const defaultFooter = `<footer class="bg-gray-900 text-gray-400 py-8 text-center text-sm">
  <p>&copy; ${year} ${siteName}. All rights reserved.</p>
</footer>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found — ${siteName}</title>
  <meta name="description" content="The page you're looking for doesn't exist on ${siteName}.">
  <meta name="robots" content="noindex, nofollow">
  <meta property="og:title" content="Page Not Found — ${siteName}">
  <meta property="og:type" content="website">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
  <script src="auth.js"></script>
</head>
<body class="bg-gray-50 flex flex-col min-h-screen">

  ${navHtml || defaultNav}

  <main class="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
    <div class="text-9xl font-extrabold text-indigo-100 select-none leading-none mb-2">404</div>
    <div class="-mt-8 relative z-10">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Page Not Found</h1>
      <p class="text-gray-500 text-lg mb-8 max-w-md mx-auto">
        Sorry, we couldn't find the page you're looking for.
        It may have been moved, deleted, or never existed.
      </p>
      <a
        href="index.html"
        class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition"
      >
        ← Back to Home
      </a>
      ${links ? `
      <div class="mt-10">
        <p class="text-sm text-gray-400 mb-3">Or explore these pages:</p>
        <div class="flex flex-wrap justify-center gap-4">
          ${links}
        </div>
      </div>` : ''}
    </div>
  </main>

  ${footerHtml || defaultFooter}

  <script src="script.js"></script>
</body>
</html>`
}
