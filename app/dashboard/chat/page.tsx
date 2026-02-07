'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';

// Dynamically import to avoid SSR issues
const CodeQualityReport = dynamic(() => import('@/components/CodeQualityReport'), { ssr: false });

interface ValidationResult {
  passed: boolean;
  score: number;
  errors: any[];
  warnings: any[];
  info: any[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    score: number;
    grade: string;
    status: string;
  };
}

interface AutoFixResult {
  fixed: string;
  appliedFixes: string[];
  remainingIssues: number;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setValidationResult(null);
    setAutoFixResult(null);
    setGeneratedCode('');

    try {
      // Stream response from chatbot
      const response = await fetch('/api/chatbot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          generationType: 'single-html',
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.html) {
              setGeneratedCode(data.html);
            }

            if (data.validation) {
              setValidationResult(data.validation);
              
              // Show auto-fix info if available
              if (data.validation.autoFix) {
                setAutoFixResult(data.validation.autoFix);
                toast.success(`Generated! Auto-fixed ${data.validation.autoFix.appliedFixes.length} issues`);
              } else if (data.validation.validationPassed) {
                toast.success('Code generated with perfect quality!');
              } else {
                toast(`Code generated with ${data.validation.errors.length} issues`, {
                  icon: '⚠️',
                });
              }
            }

            if (data.done) {
              console.log('Generation complete');
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFix = async () => {
    if (!validationResult || !generatedCode) return;

    setIsFixing(true);

    try {
      const response = await fetch('/api/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode,
          validation: validationResult,
        }),
      });

      const data = await response.json();

      if (data.fixed) {
        setGeneratedCode(data.fixed);
        setAutoFixResult(data.autoFix);
        
        // Re-validate to get updated results
        const validateResponse = await fetch('/api/validate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.fixed }),
        });
        
        const validateData = await validateResponse.json();
        setValidationResult(validateData.validation);
        
        toast.success(`Applied ${data.autoFix.appliedFixes.length} fixes!`);
      } else {
        toast.error('Failed to apply auto-fixes');
      }
    } catch (error) {
      console.error('Auto-fix error:', error);
      toast.error('An error occurred during auto-fix');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Code Generator</h1>
          <p className="text-muted-foreground">
            Generate production-ready code with automatic quality validation and fixing
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Describe Your Application
            </CardTitle>
            <CardDescription>
              Tell us what you want to build and we'll generate the code with quality checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: Create a todo app with add, edit, delete functionality and local storage..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isGenerating}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Application
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Validation Results */}
        {validationResult && (
          <CodeQualityReport
            validationResult={validationResult}
            onAutoFix={handleAutoFix}
            isFixing={isFixing}
            autoFixResult={autoFixResult ?? undefined}
          />
        )}

        {/* Generated Code Preview */}
        {generatedCode && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Code</CardTitle>
              <CardDescription>
                Preview of the generated HTML code ({generatedCode.length.toLocaleString()} characters)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                  <code>{generatedCode}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success('Code copied to clipboard!');
                  }}
                >
                  Copy Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        {!generatedCode && !isGenerating && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">💡 Tips for better results:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Be specific about features and functionality</li>
                <li>Mention the type of application (todo app, landing page, dashboard, etc.)</li>
                <li>Include any specific styling or design preferences</li>
                <li>Our AI automatically validates and fixes common issues</li>
                <li>You can manually trigger auto-fix if needed</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
