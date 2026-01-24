'use client';

import { useEffect, useState } from 'react';

export default function PreviewFrame({ html, css, js, validation }: PreviewProps) {
    const [iframeContent, setIframeContent] = useState('');
    const [error, setError] = useState(false);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function updateIframe() {
            if (validation && !validation.passed) {
                const fallbackCss = await fetch('/styles.css').then(r => r.text());
                const fallbackJs = await fetch('/script.js').then(r2 => r2.text());
                const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; 
                   style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; 
                   font-src 'self' https://cdnjs.cloudflare.com; 
                   script-src 'self' 'unsafe-inline'; 
                   img-src 'self' data: https:; 
                   connect-src 'self';">
    <style>${fallbackCss}</style>
</head>
<body>
    ${html}
    <script>${fallbackJs}</script>
</body>
</html>`;
                if (!cancelled) {
                    setIframeContent(fallbackHtml);
                    setError(true);
                }
                return;
            }
            // Construct full HTML document with strict CSP
            const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; 
                   style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; 
                   font-src 'self' https://cdnjs.cloudflare.com; 
                   script-src 'self' 'unsafe-inline'; 
                   img-src 'self' data: https:; 
                   connect-src 'self';">
    <style>${css}</style>
</head>
<body>
    ${html}
    <script type="module">${js}</script>
</body>
</html>`;
            if (!cancelled) {
                setIframeContent(fullHtml);
                setError(false);
            }
        }
        updateIframe();
        return () => { cancelled = true; };
    }, [html, css, js, validation]);

    // Validation report UI
    const renderReport = () => {
        if (!validation) return null;
        const { score, grade, status, recommendation } = validation.summary || {};
        return (
            <div className="bg-gray-800 text-gray-100 rounded-lg p-6 max-w-xl mx-auto my-6 shadow-lg">
                <h3 className="text-lg font-bold mb-2">Validation Report</h3>
                <div className="mb-2">Score: <span className="font-bold">{score}/100</span> (Grade: {grade})</div>
                <div className="mb-2">Status: <span className={status === 'PASSED' ? 'text-green-400' : 'text-red-400'}>{status}</span></div>
                <div className="mb-2">{recommendation}</div>
                {validation.errors && validation.errors.length > 0 && (
                    <div className="mt-4">
                        <div className="font-semibold text-red-400 mb-1">Errors:</div>
                        <ul className="list-disc ml-6">
                            {validation.errors.map((err, i) => (
                                <li key={i}>{err.message}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {validation.warnings && validation.warnings.length > 0 && (
                    <div className="mt-4">
                        <div className="font-semibold text-yellow-400 mb-1">Warnings:</div>
                        <ul className="list-disc ml-6">
                            {validation.warnings.map((warn, i) => (
                                <li key={i}>{warn.message}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {validation.info && validation.info.length > 0 && (
                    <div className="mt-4">
                        <div className="font-semibold text-blue-400 mb-1">Suggestions:</div>
                        <ul className="list-disc ml-6">
                            {validation.info.map((info, i) => (
                                <li key={i}>{info.message}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 relative">
                <iframe
                    srcDoc={iframeContent}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                    className="w-full h-full border-0"
                    title="Preview"
                    onError={() => setError(true)}
                />
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
                        <div className="text-center max-w-md p-8">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-bold text-white mb-4">Preview Error</h2>
                            <p className="text-gray-400 mb-6">
                                The code failed validation or could not be rendered. Please fix the issues and try again.
                            </p>
                            <button
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                                onClick={() => setShowReport(!showReport)}
                            >
                                {showReport ? 'Hide Validation Report' : 'Show Validation Report'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {showReport && (
                <div className="w-full flex justify-center">
                    {renderReport()}
                </div>
            )}
        </div>
    );
}

interface ValidationResult {
    passed: boolean;
    score?: number;
    errors?: { type: string; severity: string; message: string; details?: unknown }[];
    warnings?: { type: string; severity: string; message: string }[];
    info?: { type: string; message: string }[];
    summary?: {
        score: number;
        grade: string;
        totalIssues: number;
        criticalIssues: number;
        status: string;
        recommendation: string;
    };
}

interface PreviewProps {
    html: string;
    css: string;
    js: string;
    validation?: ValidationResult;
}