'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ValidationResult } from '@/lib/validators/code-validator';
import type { AutoFixResult } from '@/lib/validators/auto-fixer';

const CodeQualityReport = dynamic(() => import('@/components/CodeQualityReport'), { ssr: false });
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ValidationExamplePage() {
  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html>
<head>
  <title>Example Page</title>
</head>
<body>
  <p>Hello World</p>
  <img src="test.jpg">
</body>
</html>`);

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: htmlCode }),
      });
      
      const data = await response.json();
      setValidationResult(data.validation);
      setAutoFixResult(null);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoFix = async () => {
    if (!validationResult) return;

    setIsFixing(true);
    try {
      const response = await fetch('/api/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: htmlCode,
          validation: validationResult 
        }),
      });
      
      const data = await response.json();
      setAutoFixResult(data.autoFix);
      setHtmlCode(data.fixed);
      
      // Re-validate after auto-fix
      await handleValidate();
    } catch (error) {
      console.error('Auto-fix error:', error);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Code Quality Validation Example</h1>
          <p className="text-muted-foreground">
            Test the HTML validation and auto-fix system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <Card>
            <CardHeader>
              <CardTitle>HTML Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Enter your HTML code here..."
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleValidate}
                  disabled={isValidating || !htmlCode}
                >
                  {isValidating ? 'Validating...' : 'Validate Code'}
                </Button>
                {validationResult && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setValidationResult(null);
                      setAutoFixResult(null);
                    }}
                  >
                    Clear Results
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          <div>
            {validationResult ? (
              <CodeQualityReport
                validationResult={validationResult}
                onAutoFix={handleAutoFix}
                isFixing={isFixing}
                autoFixResult={autoFixResult ?? undefined}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-muted-foreground">
                    <p className="mb-4">Enter HTML code and click Validate to see results</p>
                    <Button onClick={handleValidate} disabled={!htmlCode}>
                      Validate Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Example Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Common Validation Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Auto-fixable Issues:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Missing DOCTYPE declaration</li>
                  <li>Missing charset meta tag</li>
                  <li>Missing viewport meta tag</li>
                  <li>Missing lang attribute on html tag</li>
                  <li>Images without loading=&quot;lazy&quot;</li>
                  <li>External links without rel attribute</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Manual Fix Required:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Missing or multiple h1 tags</li>
                  <li>Images without alt text</li>
                  <li>Improper heading hierarchy</li>
                  <li>Missing title tag</li>
                  <li>Generic link text</li>
                  <li>Form inputs without labels</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
