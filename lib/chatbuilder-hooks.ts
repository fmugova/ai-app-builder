/**
 * ChatBuilder Utility Hooks
 * Add-on hooks for auto-save and keyboard shortcuts
 */

import { useEffect, useRef } from 'react'

/**
 * Auto-save hook with debouncing
 * Automatically saves project/page after user stops editing
 * 
 * @param code - Current code content
 * @param projectId - Project ID (null if no project)
 * @param projectName - Project or page name
 * @param pageId - Page ID (null if editing project, not page)
 * @param delay - Debounce delay in ms (default 3000 = 3 seconds)
 */
export function useAutoSave(
  code: string | null,
  projectId: string | null,
  projectName: string,
  pageId: string | null = null,
  delay: number = 3000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedCodeRef = useRef<string>('')

  useEffect(() => {
    // Don't auto-save if:
    // - No code present
    // - No project ID (project not created yet)
    // - Code hasn't changed since last save
    if (!code || !projectId || code === lastSavedCodeRef.current) {
      return
    }

    // Clear existing timeout (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        let endpoint = ''
        let body: { title: string; content: string } | { name: string; code: string } | undefined = undefined

        if (pageId) {
          // Saving a page
          endpoint = `/api/projects/${projectId}/pages/${pageId}`
          body = { 
            title: projectName, 
            content: code 
          }
        } else {
          // Saving a project
          endpoint = `/api/projects/${projectId}`
          body = { 
            name: projectName, 
            code: code 
          }
        }

        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (res.ok) {
          lastSavedCodeRef.current = code
          console.log('💾 Auto-saved:', pageId ? 'Page' : 'Project')
        } else {
          console.error('Auto-save failed:', await res.text())
        }
      } catch (error) {
        console.error('Auto-save error:', error)
        // Don't throw - auto-save failures should be silent
      }
    }, delay)

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [code, projectId, projectName, pageId, delay])
}

/**
 * Keyboard shortcuts hook
 * Adds common keyboard shortcuts for better UX
 * 
 * Shortcuts:
 * - Cmd/Ctrl + S: Save
 * - Cmd/Ctrl + D: Download
 * 
 * @param handlers - Object with callback functions
 */
export function useKeyboardShortcuts(handlers: {
  onSave?: () => void
  onDownload?: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect if Mac or Windows/Linux
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + S = Save
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault() // Prevent browser save dialog
        handlers.onSave?.()
      }

      // Cmd/Ctrl + D = Download
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault() // Prevent browser bookmark dialog
        handlers.onDownload?.()
      }

      // Could add more shortcuts here:
      // - Cmd/Ctrl + K = Open template picker
      // - Cmd/Ctrl + / = Toggle prompt guide
      // - Cmd/Ctrl + Enter = Send message
    }

    window.addEventListener('keydown', handleKeyDown)
    
    // Cleanup on unmount
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

/**
 * Helper: Download code as HTML file
 * Can be used directly or with keyboard shortcut
 */
export function downloadAsHTML(code: string, filename: string) {
  if (!code) {
    console.warn('No code to download')
    return false
  }

  try {
    const blob = new Blob([code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.replace(/\s+/g, '-').toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Download failed:', error)
    return false
  }
}