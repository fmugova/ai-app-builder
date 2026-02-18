/**
 * Tests for preview system fixes
 * - Multi-file parser improvements
 * - TSX to HTML conversion with fallbacks
 * - Page extraction validation
 */

import { convertTSXPageToHTML, extractPagesFromProject } from '../lib/multi-file-parser';
import type { MultiFileProject } from '../lib/multi-file-parser';

describe('Preview System Fixes', () => {
  describe('convertTSXPageToHTML', () => {
    test('should extract JSX elements with classes', () => {
      const tsx = `
        export default function Page() {
          return (
            <div className="container mx-auto">
              <h1 className="text-4xl font-bold">Welcome</h1>
              <p className="text-gray-600">This is a test page</p>
            </div>
          )
        }
      `;
      
      const html = convertTSXPageToHTML(tsx, 'Test Page', '');
      
      // Should contain extracted text
      expect(html).toContain('Welcome');
      expect(html).toContain('This is a test page');
      
      // Should have proper HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      
      // Should include Tailwind CSS
      expect(html).toContain('tailwindcss.com');
    });

    test('should create fallback for minimal content', () => {
      const tsx = `export default function Page() { return <div>Test</div> }`;
      
      const html = convertTSXPageToHTML(tsx, 'Minimal Page', '');
      
      // Should still create valid HTML
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Minimal Page');
    });

    test('should filter out code keywords', () => {
      const tsx = `
        export default function Page() {
          const handleClick = () => console.log('clicked');
          return (
            <div>
              <button onClick={handleClick}>Click Me</button>
            </div>
          )
        }
      `;
      
      const html = convertTSXPageToHTML(tsx, 'Interactive Page', '');
      
      // Should contain button text
      expect(html).toContain('Click Me');
      
      // Should NOT contain code keywords in fallback
      expect(html).not.toContain('handleClick =');
      expect(html).not.toContain('console.log');
    });
  });

  describe('extractPagesFromProject', () => {
    test('should extract pages from Next.js project', () => {
      const project: MultiFileProject = {
        projectName: 'Test Project',
        description: 'Test',
        projectType: 'website',
        files: [
          {
            path: 'app/page.tsx',
            content: `
              export default function Home() {
                return <div><h1>Home Page</h1></div>
              }
            `,
          },
          {
            path: 'app/about/page.tsx',
            content: `
              export default function About() {
                return <div><h1>About Us</h1></div>
              }
            `,
          },
        ],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);

      expect(pages.length).toBeGreaterThan(0);
      
      // Should have homepage
      const homePage = pages.find(p => p.isHomepage);
      expect(homePage).toBeDefined();
      expect(homePage?.slug).toBe('home');
      
      // Should have about page
      const aboutPage = pages.find(p => p.slug === 'about');
      expect(aboutPage).toBeDefined();
      expect(aboutPage?.title).toBe('About');
    });

    test('should skip dynamic routes', () => {
      const project: MultiFileProject = {
        projectName: 'Test Project',
        description: 'Test',
        projectType: 'website',
        files: [
          {
            path: 'app/page.tsx',
            content: `export default function Home() { return <div>Home</div> }`,
          },
          {
            path: 'app/blog/[slug]/page.tsx',
            content: `export default function BlogPost() { return <div>Post</div> }`,
          },
        ],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);

      // Should only have homepage, not dynamic route
      expect(pages.length).toBe(1);
      expect(pages[0].isHomepage).toBe(true);
    });

    test('should create fallbacks for corrupted/minimal content', () => {
      const project: MultiFileProject = {
        projectName: 'Test Project',
        description: 'Test',
        projectType: 'website',
        files: [
          {
            path: 'app/page.tsx',
            content: `export default function Home() { return <div><h1>Welcome</h1><p>This is a proper page with content</p></div> }`,
          },
          {
            path: 'app/broken/page.tsx',
            content: `{ "error": "failed" }`, // JSON fragment
          },
          {
            path: 'app/minimal/page.tsx',
            content: `x`, // Too short
          },
        ],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);

      // Should create fallback pages for all files, even broken ones
      expect(pages.length).toBeGreaterThan(0);
      
      // Should have homepage
      const homePage = pages.find(p => p.isHomepage);
      expect(homePage).toBeDefined();
      expect(homePage?.content).toContain('Welcome');
      
      // Even broken pages should get fallback HTML
      pages.forEach(page => {
        expect(page.content).toContain('<!DOCTYPE html>');
        expect(page.content).toContain('</html>');
      });
    });

    test('should generate styled fallback for pages with issues', () => {
      const project: MultiFileProject = {
        projectName: 'Test Project',
        description: 'Test',
        projectType: 'website',
        files: [
          {
            path: 'app/dashboard/page.tsx',
            content: `
              // This has lots of dynamic code but some extractable text
              const data = await fetch('/api/data');
              export default function Dashboard() {
                return <div><h1>Dashboard</h1></div>
              }
            `,
          },
        ],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);

      expect(pages.length).toBeGreaterThan(0);
      const page = pages[0];
      
      // Should be valid HTML with proper structure
      expect(page.content).toContain('<!DOCTYPE html>');
      expect(page.content).toContain('</html>');
      
      // Should have the page title (Dashboard)
      expect(page.title).toBe('Dashboard');
      expect(page.slug).toBe('dashboard');
      
      // Should have Tailwind CSS for styling
      expect(page.content).toContain('tailwindcss.com');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty project', () => {
      const project: MultiFileProject = {
        projectName: 'Empty',
        description: 'Empty project',
        projectType: 'website',
        files: [],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);
      expect(pages.length).toBe(0);
    });

    test('should handle project with no page.tsx files', () => {
      const project: MultiFileProject = {
        projectName: 'No Pages',
        description: 'Test',
        projectType: 'website',
        files: [
          {
            path: 'components/Header.tsx',
            content: 'export default function Header() { return <div>Header</div> }',
          },
          {
            path: 'lib/utils.ts',
            content: 'export const util = () => {}',
          },
        ],
        dependencies: {},
        devDependencies: {},
        envVars: [],
        setupInstructions: [],
      };

      const pages = extractPagesFromProject(project);
      expect(pages.length).toBe(0);
    });
  });
});
