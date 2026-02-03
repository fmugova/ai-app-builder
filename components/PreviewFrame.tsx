// components/PreviewFrame.tsx
// FIXED: Inject script to make all links in iframe open in new tab

'use client'

import { useEffect, useRef } from 'react'

interface PreviewFrameProps {
  html: string
  css?: string | null
  js?: string | null
  projectId?: string
  onRegenerate?: () => void
}

export default function PreviewFrame({ html, css, js, projectId, onRegenerate }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      // Only proceed if iframeDoc is accessible
      if (iframeDoc) {
        // ✅ Inject script to make all links open in new tab
        const linkFixScript = `
          <script>
            (function() {
              // Function to fix all links
              function fixLinks() {
                const links = document.querySelectorAll('a[href]');
                links.forEach(link => {
                  // Skip if already processed
                  if (link.getAttribute('data-link-fixed')) return;
                  
                  // Mark as processed
                  link.setAttribute('data-link-fixed', 'true');
                  
                  // Set target="_blank" and rel="noopener noreferrer"
                  link.setAttribute('target', '_blank');
                  link.setAttribute('rel', 'noopener noreferrer');
                });
              }

              // Fix existing links
              fixLinks();

              // Watch for new links being added dynamically
              const observer = new MutationObserver(() => {
                fixLinks();
              });

              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });

              // Also intercept clicks on links without href
              document.addEventListener('click', (e) => {
                let target = e.target;
                
                // Find closest anchor tag
                while (target && target.tagName !== 'A') {
                  target = target.parentElement;
                }
                
                if (target && target.tagName === 'A') {
                  const href = target.getAttribute('href');
                  
                  // If it's a relative link or starts with #, prevent default
                  if (href && (href.startsWith('/') || href.startsWith('#'))) {
                    e.preventDefault();
                    console.log('Prevented navigation to:', href);
                  }
                }
              }, true);
            })();
          </script>
        `;

        // Insert the script before </body> or at end of HTML
        let modifiedHtml = html
        
        if (html.includes('</body>')) {
          modifiedHtml = html.replace('</body>', linkFixScript + '</body>')
        } else if (html.includes('</html>')) {
          modifiedHtml = html.replace('</html>', linkFixScript + '</html>')
        } else {
          modifiedHtml = html + linkFixScript
        }

        // Write the modified HTML to iframe
        iframeDoc.open()
        iframeDoc.write(modifiedHtml)
        iframeDoc.close()
      }
    } catch (e) {
      // Cross-origin access error, do nothing or log if needed
    }

  }, [html])

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
      title="Preview"
    />
  )
}
