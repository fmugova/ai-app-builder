// Helper function to validate JSX syntax
function validateJSXSyntax(code: string): { valid: boolean; error?: string } {
  try {
    // Check for common JSX syntax errors
    const templateLiteralInClassName = /className=`[^{]/g;
    if (templateLiteralInClassName.test(code)) {
      return {
        valid: false,
        error: 'Invalid JSX syntax: className template literal must be wrapped in {}'
      };
    }
    // You could also use @babel/parser here for full validation
    return { valid: true };
  } catch (error: unknown) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}
import { useState, useRef } from 'react'

export interface GenerationEstimate {
  min: number
  max: number
  complexity: 'simple' | 'medium' | 'complex'
  features: string[]
}

export interface GenerateOptions {
  type: string
  projectId?: string
}

export interface GenerateResult {
  success: boolean
  code?: string
  projectId?: string
  error?: string
  fromCache?: boolean
}

export function useGenerateStream() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null)
  const [elapsed, setElapsed] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [projectId, setProjectId] = useState<string | undefined>()
  const [stats, setStats] = useState<{ generationTime?: string } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const generate = async (
    prompt: string,
    options: GenerateOptions
  ): Promise<GenerateResult> => {
    // Reset state
    setIsGenerating(true)
    setStatus('Starting generation...')
    setProgress(10)
    setError(null)
    setGeneratedCode('')
    setElapsed(0)
    startTimeRef.current = Date.now()

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      setStatus('Sending request to AI...')
      setProgress(20)

      console.log('🚀 Sending request to /api/generate...');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: options.type,
          projectId: options.projectId,
        }),
        signal: abortControllerRef.current.signal,
      })

      console.log('📡 Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries())
      });

      setProgress(40)
      setStatus('Generating code...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Generation failed`)
      }

      setProgress(60)
      setStatus('Processing response...')

      // ============================================
      // STREAMING LOGIC
      // ============================================
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let receivedCode = '';
      let projectIdFromSSE: string | undefined = undefined;
      let buffer = '';
      let chunkCount = 0;

      console.log('🔍 Starting stream read loop...');

      try {
        while (true) {
          console.log(`📥 Reading chunk ${++chunkCount}...`);
          
          const { value, done } = await reader.read();
          
          if (done) {
            console.log('✅ Stream ended (done = true)');
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          console.log(`📦 Chunk ${chunkCount}:`, {
            length: chunk.length,
            preview: chunk.substring(0, 200),
            endsWithNewline: chunk.endsWith('\n')
          });
          
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          console.log(`📝 Processing ${lines.length} lines from chunk ${chunkCount}`);
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine) {
              console.log('⏭️ Skipping empty line');
              continue;
            }
            
            console.log('🔎 Line:', trimmedLine.substring(0, 100));
            
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.slice(6);
              
              try {
                const data = JSON.parse(jsonStr);
                console.log('✨ Parsed event:', {
                  type: data.type,
                  textLength: data.text?.length || 0,
                  hasMetadata: !!data.metadata
                });
                
                // Handle 'content' events (API sends this)
                if (data.type === 'content' && data.text) {
                  receivedCode += data.text;
                  console.log(`📝 Accumulated code length: ${receivedCode.length}`);
                  setProgress(Math.min(70, 40 + Math.floor(receivedCode.length / 500)));
                }
                
                // Handle 'complete' event (API sends this)
                if (data.type === 'complete') {
                  console.log('🎉 Complete event received:', {
                    parsed: data.parsed,
                    metadata: data.metadata
                  });
                  projectIdFromSSE = data.metadata?.projectId;
                }
                
                // Handle retry
                if (data.type === 'retry') {
                  console.log('🔄 Retry event:', data.message);
                  setStatus(data.message || 'Retrying...');
                }
                
                // Handle error
                if (data.type === 'error') {
                  console.error('❌ Error event:', data.error);
                  throw new Error(data.error || 'Stream error');
                }
              } catch (parseError) {
                console.error('❌ JSON parse failed:', {
                  line: trimmedLine.substring(0, 100),
                  error: parseError
                });
              }
            } else if (trimmedLine.startsWith('{')) {
              // Handle non-SSE JSON format
              try {
                const data = JSON.parse(trimmedLine);
                console.log('✨ Parsed plain JSON:', data.type);
                
                if (data.code) {
                  receivedCode = data.code;
                  projectIdFromSSE = data.projectId;
                }
              } catch (parseError) {
                console.error('❌ Plain JSON parse failed:', parseError);
              }
            } else {
              console.warn('⚠️ Unknown line format:', trimmedLine.substring(0, 50));
            }
          }
        }
        
        // Process remaining buffer
        if (buffer.trim()) {
          console.log('📝 Processing remaining buffer:', buffer.substring(0, 100));
        }
        
      } finally {
        reader.releaseLock();
        console.log('🔒 Reader released');
      }

      console.log('📊 Final statistics:', {
        totalChunks: chunkCount,
        codeLength: receivedCode.length,
        firstChars: receivedCode.substring(0, 100),
        lastChars: receivedCode.substring(Math.max(0, receivedCode.length - 100))
      });

      setProgress(80)
      setStatus('Validating code...')

      // Validate we got code
      if (!receivedCode || receivedCode.trim().length === 0) {
        console.error('❌ VALIDATION FAILED: No code received');
        throw new Error(
          'No code generated in response.\n\n' +
          'The stream completed but no code was extracted.\n' +
          'Check the browser console for detailed stream logs.'
        );
      }

      console.log('✅ Validation passed, code length:', receivedCode.length);

      // Validate HTML structure
      const code = receivedCode;
      const validation = validateHTML(code);
      
      if (!validation.isValid) {
        console.warn('⚠️ Code validation warnings:', validation.issues)
        
        if (validation.severity === 'critical') {
          throw new Error(
            `Generated code validation failed:\n${validation.issues.join('\n')}`
          )
        }
      }

      setProgress(90)
      setStatus('Saving to database...')
      setGeneratedCode(code)
      setProjectId(projectIdFromSSE)
      setProgress(100)
      setStatus('Complete!')

      const generationTime = ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
      setStats({ generationTime })

      return {
        success: true,
        code,
        projectId: projectIdFromSSE,
        fromCache: false,
      }
    } catch (err: unknown) {
      console.error('❌ GENERATION ERROR:', err)
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      let errorMessage = 'Generation failed'
      
      if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        errorMessage = 'Generation cancelled'
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        const message = (err as { message: string }).message
        if (message.includes('JSON') || message.includes('Unterminated')) {
          errorMessage = 'Generated code was too large or got cut off. Try:\n1. A simpler, more specific prompt\n2. Breaking your request into smaller parts\n3. Reducing the number of features requested'
        } else if (message.includes('incomplete')) {
          errorMessage = message + '\n\nTry a simpler prompt or fewer features.'
        } else {
          errorMessage = message
        }
      }

      setError(errorMessage)
      setStatus('Failed')
      setProgress(0)
      
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setIsGenerating(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const reset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsGenerating(false)
    setStatus('')
    setProgress(0)
    setEstimate(null)
    setElapsed(0)
    setError(null)
    setGeneratedCode('')
    setProjectId(undefined)
    setStats(null)
  }

  // The return statement should be here, at the end of the hook function:
  return {
    isGenerating,
    status,
    progress,
    estimate,
    elapsed,
    error,
    generatedCode,
    projectId,
    stats,
    generate,
    reset,
  }
}

// Helper function to validate HTML structure
interface ValidationResult {
  isValid: boolean
  issues: string[]
  severity: 'none' | 'warning' | 'critical'
}

function validateHTML(html: string): ValidationResult {
  const issues: string[] = []
  let severity: 'none' | 'warning' | 'critical' = 'none'

  if (!html || html.length === 0) {
    return { isValid: false, issues: ['Empty response'], severity: 'critical' }
  }

  // Basic structural validation
  const hasDoctype = /<!doctype\s+html/i.test(html)
  const hasHtmlTag = /<html[^>]*>/i.test(html)
  const hasBody = /<body[^>]*>/i.test(html)
  const hasClosingHtml = /<\/html>/i.test(html)
  const hasClosingBody = /<\/body>/i.test(html)

  if (!hasDoctype) {
    issues.push('Missing DOCTYPE')
    severity = 'warning'
  }
  if (!hasHtmlTag) {
    issues.push('Missing <html> tag')
    severity = 'critical'
  }
  if (!hasBody) {
    issues.push('Missing <body> tag')
    severity = 'critical'
  }
  if (!hasClosingHtml) {
    issues.push('Missing </html> closing tag')
    severity = 'critical'
  }
  if (!hasClosingBody) {
    issues.push('Missing </body> closing tag')
    severity = 'critical'
  }

  // Check for truncation indicators
  const endsWithIncompleteTag = /<[^>]*$/.test(html.trim())
  if (endsWithIncompleteTag) {
    issues.push('HTML ends with incomplete tag (likely truncated)')
    severity = 'critical'
  }

  // Check for unmatched braces in scripts
  const openBraces = (html.match(/{/g) || []).length
  const closeBraces = (html.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`)
    severity = 'warning' // Could be in comments/strings
  }

  // Check for basic tag matching (simplified)
  const scriptTags = (html.match(/<script[^>]*>/gi) || []).length
  const scriptCloseTags = (html.match(/<\/script>/gi) || []).length
  if (scriptTags !== scriptCloseTags) {
    issues.push('Mismatched <script> tags')
    severity = 'critical'
  }

  const isValid = severity !== 'critical'

  return { isValid, issues, severity }
}
