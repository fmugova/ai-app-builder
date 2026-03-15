// lib/utils/spaZipExport.ts
// ============================================================
// Builds a downloadable ZIP of the Vite project.
// Excludes the preview-only _preview/ directory.
// Called from the file explorer "Download" button.
// ============================================================

/**
 * Filter files for ZIP export.
 * Excludes preview-only files that aren't needed in the Vite project.
 */
export function filterFilesForExport(files: Record<string, string>): Record<string, string> {
  const EXCLUDE_PREFIXES = [
    '_preview/',   // preview index.html — not part of the Vite project
  ];
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (!EXCLUDE_PREFIXES.some(prefix => path.startsWith(prefix))) {
      result[path] = content;
    }
  }
  return result;
}

/**
 * Returns a README.md string for the exported SPA project.
 * Included in the ZIP to guide the user on how to run it.
 */
export function buildSpaReadme(siteName: string): string {
  return `# ${siteName}

Built with [BuildFlow AI](https://buildflow-ai.app) — React + Vite + Tailwind CSS.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

The app runs at **http://localhost:3000**

## Build for production

\`\`\`bash
npm run build
\`\`\`

Output goes to the \`dist/\` folder. Deploy to any static host:
- **Netlify**: drag and drop the \`dist/\` folder at netlify.com/drop
- **Vercel**: \`npx vercel --prod\`
- **GitHub Pages**: push \`dist/\` to \`gh-pages\` branch

## Stack

- React 18 + React Router v6 (HashRouter)
- Vite 5
- Tailwind CSS 3
- Custom CSS variables for brand tokens

## Project structure

\`\`\`
src/
  main.jsx          Entry point
  App.jsx           Router + layout
  pages/            One file per route
  components/       Shared UI components
  hooks/            Custom React hooks
  styles/
    globals.css     Global styles + CSS variables
\`\`\`
`;
}
