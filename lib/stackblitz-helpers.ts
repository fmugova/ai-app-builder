import type { Project } from '@stackblitz/sdk'

// Create proper package.json
function createPackageJson(dependencies: string[]): Record<string, unknown> {
  const deps: { [key: string]: string } = {}
  
  // Add requested dependencies
  dependencies.forEach(dep => {
    const [name, version] = dep.split('@')
    deps[name] = version || 'latest'
  })
  
  // Always include Vite for modern bundling
  deps['vite'] = '^5.0.0'
  
  return {
    name: 'web-app',
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: deps,
    devDependencies: {
      'vite': '^5.0.0'
    }
  }
}

// Ensure proper HTML structure with security headers
function ensureProperHTML(html: string): string {
  if (!html || html.trim().length < 10) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web App</title>
</head>
<body>
  <div>No content available</div>
</body>
</html>`
  }

  // Check if already has DOCTYPE and html tags
  if (html.includes('<!DOCTYPE') && html.includes('<html')) {
    // Add CSP meta tag if missing
    if (!html.includes('Content-Security-Policy')) {
      html = html.replace(
        '</head>',
        `  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:">
  <link rel="stylesheet" href="/styles.css">
</head>`
      )
    }
    
    // Add script tag before closing body if missing
    if (!html.includes('<script') && html.includes('</body>')) {
      html = html.replace('</body>', `  <script type="module" src="/script.js"></script>
</body>`)
    }
    
    return html
  }
  
  // Build complete HTML structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:">
  <title>Web App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${html}
  <script type="module" src="/script.js"></script>
</body>
</html>`
}

// Wrap JavaScript as ES module
function wrapJavaScriptAsModule(js: string): string {
  if (!js || js.trim() === '') {
    return '// Add your JavaScript here\nconsole.log("App loaded successfully")'
  }
  
  // Check if already a module
  if (js.includes('export ') || js.includes('import ')) {
    return js
  }
  
  // Wrap in IIFE for safety and add error handling
  return `// App initialization
(function() {
  'use strict';
  
  try {
    ${js}
    console.log('✅ App initialized successfully');
  } catch (error) {
    console.error('❌ App initialization error:', error);
  }
})();

export {};`
}

// Create Vite config for proper bundling
function createViteConfig(): string {
  return `import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: []
  }
})`
}

// Create StackBlitz configuration
function createStackBlitzRC(): string {
  return JSON.stringify({
    installDependencies: true,
    startCommand: 'npm run dev',
    env: {
      NODE_ENV: 'development'
    }
  }, null, 2)
}

// Improved StackBlitz project configuration
export function createStackBlitzProject(
  html: string,
  css: string,
  js: string,
  dependencies: string[] = []
): Project {
  
  // Parse dependencies and create proper package.json
  const packageJson = createPackageJson(dependencies)
  
  // Add proper HTML structure with CSP headers
  const fullHtml = ensureProperHTML(html)
  
  // Add module system for JavaScript
  const moduleJs = wrapJavaScriptAsModule(js)
  
  const files: { [key: string]: string } = {
    'index.html': fullHtml,
    'styles.css': css || '/* Add your styles here */',
    'script.js': moduleJs,
    'package.json': JSON.stringify(packageJson, null, 2),
    'vite.config.js': createViteConfig(),
    '.stackblitzrc': createStackBlitzRC()
  }
  
  console.log('📦 StackBlitz files:', Object.keys(files))
  console.log('📋 Dependencies:', packageJson.dependencies)
  
  return {
    title: 'Web App',
    description: 'Generated web application',
    template: 'node' as const,
    files
  }
}

// Enhanced StackBlitz opening with better error handling
export async function openInStackBlitz(
  html: string,
  css: string,
  js: string,
  dependencies: string[] = []
): Promise<void> {
  try {
    console.log('🚀 Preparing StackBlitz project...')
    
    // Validate inputs
    if (!html || html.trim().length < 20) {
      throw new Error('HTML content is too short or empty')
    }
    
    const project = createStackBlitzProject(html, css, js, dependencies)
    
    // Check if all required files are present
    const requiredFiles = ['index.html', 'package.json']
    const missingFiles = requiredFiles.filter(f => !project.files[f])
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`)
    }
    
    console.log('📦 Opening StackBlitz with files:', Object.keys(project.files))
    console.log('📄 HTML preview:', html.substring(0, 200))
    
    // Open in new window
    // SDK methods are on the default export (StackBlitzSDK object), not named exports
    const { default: sdk } = await import('@stackblitz/sdk')
    await sdk.openProject(project, {
      newWindow: true,
      openFile: 'index.html',
      devToolsHeight: 33
    })
    
    console.log('✅ StackBlitz opened successfully')
    
  } catch (error) {
    console.error('❌ Failed to open StackBlitz:', error)
    throw new Error(`StackBlitz initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Alternative: Embed StackBlitz in iframe
export async function embedStackBlitz(
  html: string,
  css: string,
  js: string,
  elementId: string,
  dependencies: string[] = []
): Promise<void> {
  try {
    const project = createStackBlitzProject(html, css, js, dependencies)
    const { default: sdk } = await import('@stackblitz/sdk')

    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    await sdk.embedProject(element, project, {
      openFile: 'index.html',
      view: 'preview',
      height: 600,
      hideNavigation: false,
      forceEmbedLayout: true
    })
    
    console.log('✅ StackBlitz embedded successfully')
    
  } catch (error) {
    console.error('❌ Failed to embed StackBlitz:', error)
    throw error
  }
}