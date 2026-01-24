/**
 * CODE VALIDATION SCRIPT FOR BUILDFLOW AI
 * ========================================
 * 
 * This script validates generated HTML, CSS, and JavaScript code
 * for enterprise-grade quality standards including CSP compliance,
 * security, accessibility, and modern best practices.
 * 
 * Usage:
 *   const validator = new CodeValidator();
 *   const results = validator.validateAll(html, css, js);
 *   console.log(results);
 */

export interface ValidationMessage {
    type: string;
    severity: string;
    message: string;
    details?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  isTruncated: boolean;
  severity?: 'info' | 'warning' | 'error'; // Add this line
}

class CodeValidator {
    errors: ValidationMessage[] = [];
    warnings: ValidationMessage[] = [];
    info: ValidationMessage[] = [];
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    /**
     * Main validation entry point
     */
    validateAll(html: string, css: string, js: string) {
        this.errors = [];
        this.warnings = [];
        this.info = [];

        // Run all validations
        this.validateHTML(html);
        this.validateCSS(css);
        this.validateJavaScript(js);
        this.validateCSPCompliance(html);
        this.validateSecurity(html, js);
        this.validateAccessibility(html);

        return {
            passed: this.errors.length === 0,
            score: this.calculateScore(),
            errors: this.errors,
            warnings: this.warnings,
            info: this.info,
            summary: this.generateSummary()
        };
    }

    /**
     * HTML Validation
     */
    validateHTML(html: string) {
                // Check for data attributes for event delegation
                const dataActionPattern = /data-action\s*=\s*['"][^'"]+['"]/gi;
                const dataActionMatches = html.match(dataActionPattern);
                if (!dataActionMatches) {
                    this.warnings.push({
                        type: 'HTML',
                        severity: 'warning',
                        message: 'No data-action attributes found for event delegation'
                    });
                }

                // Check for toast notification container
                if (!html.includes('id="toastContainer"')) {
                    this.warnings.push({
                        type: 'UI/UX',
                        severity: 'warning',
                        message: 'No toast notification container (id="toastContainer") found in HTML'
                    });
                }

                // Check for ARIA labels on buttons and interactive elements
                const buttonPattern: RegExp = /<button[^>]*>/gi;
                const buttons: RegExpMatchArray | null = html.match(buttonPattern);
                if (buttons) {
                    const missingAria: string[] = buttons.filter((btn: string) => !btn.includes('aria-label'));
                    if (missingAria.length > 0) {
                        this.warnings.push({
                            type: 'Accessibility',
                            severity: 'warning',
                            message: `${missingAria.length} button(s) missing aria-label attribute`
                        });
                    }
                }

                // Check for keyboard navigation hints (tabindex, Escape, etc.)
                if (!html.match(/tabindex|keyboard|escape|aria-keyshortcuts/i)) {
                    this.info.push({
                        type: 'Accessibility',
                        message: 'Consider adding keyboard navigation support (tabindex, Escape key, etc.)',
                        severity: 'info'
                    });
                }
        if (!html) {
            this.errors.push({
                type: 'HTML',
                severity: 'error',
                message: 'HTML content is empty'
            });
            return;
        }

        // Check for doctype
        if (!html.includes('<!DOCTYPE html>')) {
            this.warnings.push({
                type: 'HTML',
                severity: 'warning',
                message: 'Missing DOCTYPE declaration'
            });
        }

        // Check for viewport meta tag
        if (!html.includes('viewport')) {
            this.errors.push({
                type: 'HTML',
                severity: 'error',
                message: 'Missing viewport meta tag for responsive design'
            });
        }

        // Check for charset
        if (!html.includes('charset')) {
            this.errors.push({
                type: 'HTML',
                severity: 'error',
                message: 'Missing charset declaration'
            });
        }

        // Check for inline styles
        const inlineStyleMatches = html.match(/style\s*=\s*["'][^"']+["']/gi);
        if (inlineStyleMatches) {
            this.errors.push({
                type: 'CSP',
                severity: 'error',
                message: `Found ${inlineStyleMatches.length} inline style(s) - violates CSP`,
                details: inlineStyleMatches.slice(0, 3).map(m => m.substring(0, 50))
            });
        }

        // Check for inline event handlers
        const inlineHandlers = [
            'onclick', 'onload', 'onchange', 'onsubmit', 'onmouseover', 
            'onmouseout', 'onfocus', 'onblur', 'oninput'
        ];
        
        inlineHandlers.forEach(handler => {
            const pattern = new RegExp(`${handler}\\s*=\\s*["'][^"']+["']`, 'gi');
            const matches = html.match(pattern);
            if (matches) {
                this.errors.push({
                    type: 'CSP',
                    severity: 'error',
                    message: `Found inline ${handler} handler(s) - violates CSP`,
                    details: matches.slice(0, 3)
                });
            }
        });

        // Check for semantic HTML
        const hasMain = html.includes('<main');
        const hasHeader = html.includes('<header');
        const hasFooter = html.includes('<footer');
        
        if (!hasMain || !hasHeader || !hasFooter) {
            this.warnings.push({
                type: 'HTML',
                severity: 'warning',
                message: 'Consider using semantic HTML5 elements (main, header, footer)'
            });
        }

        this.info.push({ type: 'HTML', message: 'HTML structure validation completed', severity: 'info' });
    }

    /**
     * CSS Validation
     */
    validateCSS(css: string) {
                // Check for loading state class
                if (!css.includes('.btn-loading')) {
                    this.info.push({ type: 'UI/UX', message: 'Consider adding .btn-loading class for loading state feedback', severity: 'info' });
                }
        if (!css) {
            this.errors.push({
                type: 'CSS',
                severity: 'error',
                message: 'CSS content is empty'
            });
            return;
        }

        // Check for CSS variables
        if (!css.includes(':root') && !css.includes('--')) {
            this.warnings.push({
                type: 'CSS',
                severity: 'warning',
                message: 'Consider using CSS custom properties (variables) for maintainability'
            });
        }

        // Check for responsive design
        if (!css.includes('@media')) {
            this.warnings.push({
                type: 'CSS',
                severity: 'warning',
                message: 'No media queries found - check responsive design'
            });
        }

        // Check for accessibility features
        if (!css.includes('focus') && !css.includes(':focus')) {
            this.warnings.push({
                type: 'Accessibility',
                severity: 'warning',
                message: 'No focus styles defined - important for keyboard navigation'
            });
        }

        // Check for reduced motion support
        if (!css.includes('prefers-reduced-motion')) {
            this.info.push({ type: 'Accessibility', message: 'Consider adding @media (prefers-reduced-motion) for accessibility', severity: 'info' });
        }

        // Check for print styles
        if (css.length > 5000 && !css.includes('@media print')) {
            this.info.push({ type: 'CSS', message: 'Consider adding print styles for better printing experience', severity: 'info' });
        }

        this.info.push({
            type: 'CSS',
            message: 'CSS validation completed',
            severity: 'info'
        });
    }

    /**
     * JavaScript Validation
     */
    validateJavaScript(js: string) {
        // --- UI/UX Linting ---
        // Toast notifications
        if (!js.includes('toast') && !js.includes('ToastManager')) {
            this.warnings.push({
                type: 'UI/UX',
                severity: 'warning',
                message: 'No toast notification usage detected (use toast or ToastManager for user feedback)'
            });
        }
        // Debounced search input
        if (js.includes('search') && !js.match(/debounce|setTimeout/)) {
            this.info.push({ type: 'UI/UX', message: 'Consider debouncing search input for performance', severity: 'info' });
        }
        // Event delegation
        if (js.includes('addEventListener') && !js.includes('data-action')) {
            this.info.push({ type: 'UI/UX', message: 'Consider using data-action attributes for event delegation', severity: 'info' });
        }
        // Loading state
        if (js.includes('fetch') && !js.includes('loading')) {
            this.info.push({ type: 'UI/UX', message: 'Consider adding loading state to async actions', severity: 'info' });
        }
        // prefers-reduced-motion
        if (!js.includes('prefers-reduced-motion')) {
            this.info.push({ type: 'UI/UX', message: 'Consider respecting prefers-reduced-motion for animations', severity: 'info' });
        }
        // Check for focus management (focus(), blur())
        if (!js.match(/\.focus\(|\.blur\(/)) {
            this.info.push({ type: 'Accessibility', message: 'Consider managing focus for accessibility (e.g., .focus(), .blur())', severity: 'info' });
        }
        // --- BuildFlow AI explicit validation rules ---
                        // --- UI/UX Linting ---
                        // Toast notifications
                        if (!js.includes('toast') && !js.includes('ToastManager')) {
                            this.warnings.push({
                                type: 'UI/UX',
                                severity: 'warning',
                                message: 'No toast notification usage detected (use toast or ToastManager for user feedback)'
                            });
                        }
                        // Debounced search input
                        if (js.includes('search') && !js.match(/debounce|setTimeout/)) {
                            this.info.push({ type: 'UI/UX', message: 'Consider debouncing search input for performance', severity: 'info' });
                        }
                        // Event delegation
                        if (js.includes('addEventListener') && !js.includes('data-action')) {
                            this.info.push({ type: 'UI/UX', message: 'Consider using data-action attributes for event delegation', severity: 'info' });
                        }
                        // Loading state
                        if (js.includes('fetch') && !js.includes('loading')) {
                            this.info.push({ type: 'UI/UX', message: 'Consider adding loading state to async actions', severity: 'info' });
                        }
                        // prefers-reduced-motion
                        if (!js.includes('prefers-reduced-motion')) {
                            this.info.push({ type: 'UI/UX', message: 'Consider respecting prefers-reduced-motion for animations', severity: 'info' });
                        }
                // Check for toast notification usage
                if (!js.includes('ToastManager') && !js.includes('toast')) {
                    this.info.push({ type: 'UI/UX', message: 'Consider using a toast notification system for user feedback', severity: 'info' });
                }

                // Check for focus management (focus(), blur())
                if (!js.match(/\.focus\(|\.blur\(/)) {
                    this.info.push({ type: 'Accessibility', message: 'Consider managing focus for accessibility (e.g., .focus(), .blur())', severity: 'info' });
                }

                // --- BuildFlow AI explicit validation rules ---
                // CSP Compliance
                if (js.match(/style\s*=\s*["']/)) {
                    this.errors.push({
                        type: 'CSP',
                        severity: 'error',
                        message: 'Inline style attribute detected in JavaScript - violates CSP'
                    });
                }
                if (js.match(/on(click|load|change|submit)\s*=\s*["']/)) {
                    this.errors.push({
                        type: 'CSP',
                        severity: 'error',
                        message: 'Inline event handler detected in JavaScript - violates CSP'
                    });
                }
                // Security
                if (js.match(/eval\(|Function\(|setTimeout\(['"]|setInterval\(['"]/)) {
                    this.errors.push({
                        type: 'Security',
                        severity: 'error',
                        message: 'Use of eval, Function constructor, or setTimeout/setInterval with string detected - security risk'
                    });
                }
                // XSS Protection
                if (!(js.includes('escapeHtml') || js.includes('textContent'))) {
                    this.warnings.push({
                        type: 'Security',
                        severity: 'warning',
                        message: 'No XSS protection detected (escapeHtml or textContent missing)'
                    });
                }
                // Error Handling
                if (!(js.includes('try {') && js.includes('catch'))) {
                    this.warnings.push({
                        type: 'JavaScript',
                        severity: 'warning',
                        message: 'No try-catch error handling detected'
                    });
                }
                // Modern Patterns
                if (!js.match(/class\s+\w+\s*{/)) {
                    this.warnings.push({
                        type: 'JavaScript',
                        severity: 'warning',
                        message: 'No ES6 class pattern detected'
                    });
                }
        if (!js) {
            this.errors.push({
                type: 'JavaScript',
                severity: 'error',
                message: 'JavaScript content is empty'
            });
            return;
        }

        // Check for syntax errors (basic)
        try {
            new Function(js);
        } catch (error) {
            this.errors.push({
                type: 'JavaScript',
                severity: 'error',
                message: 'JavaScript syntax error',
                details: error instanceof Error ? error.message : String(error)
            });
            return; // Don't continue if syntax is invalid
        }

        // Check for use strict
        if (!js.includes("'use strict'") && !js.includes('"use strict"')) {
            this.info.push({ type: 'JavaScript', message: 'Consider adding "use strict" for better error checking', severity: 'info' });
        }

        // Check for eval usage
        if (js.match(/\beval\s*\(/)) {
            this.errors.push({
                type: 'Security',
                severity: 'error',
                message: 'eval() usage detected - serious security risk'
            });
        }

        // Check for Function constructor
        if (js.match(/new\s+Function\s*\(/)) {
            this.errors.push({
                type: 'Security',
                severity: 'error',
                message: 'Function constructor detected - security risk'
            });
        }

        // Check for setTimeout/setInterval with strings
        if (js.match(/setTimeout\s*\(\s*["'`]/) || js.match(/setInterval\s*\(\s*["'`]/)) {
            this.errors.push({
                type: 'Security',
                severity: 'error',
                message: 'setTimeout/setInterval with string argument detected - use function instead'
            });
        }

        // Check for error handling
        const hasTryCatch = js.includes('try') && js.includes('catch');
        if (!hasTryCatch && js.length > 1000) {
            this.warnings.push({
                type: 'JavaScript',
                severity: 'warning',
                message: 'No error handling (try-catch) found in substantial code'
            });
        }

        // Check for XSS protection
        const hasXSSProtection = js.includes('escapeHtml') || 
                                js.includes('textContent') || 
                                js.includes('DOMPurify');
        if (!hasXSSProtection && js.includes('innerHTML')) {
            this.errors.push({
                type: 'Security',
                severity: 'error',
                message: 'innerHTML usage without XSS protection detected'
            });
        }

        // Check for modern patterns
        const hasClasses = js.includes('class ');
        if (!hasClasses && js.length > 2000) {
            this.warnings.push({
                type: 'JavaScript',
                severity: 'warning',
                message: 'Consider using ES6 classes for better code organization'
            });
        }

        // Check for const/let usage
        const hasVar = js.match(/\bvar\s+/);
        if (hasVar) {
            this.warnings.push({
                type: 'JavaScript',
                severity: 'warning',
                message: 'var keyword usage detected - prefer const/let for block scoping'
            });
        }

        // Check for arrow functions
        const hasArrowFunctions = js.includes('=>');
        if (!hasArrowFunctions && js.length > 1000) {
            this.info.push({ type: 'JavaScript', message: 'Consider using arrow functions for cleaner syntax', severity: 'info' });
        }

        // Check for event delegation
        if (js.includes('addEventListener') && !js.includes('querySelectorAll')) {
            this.info.push({ type: 'JavaScript', message: 'Consider using event delegation for better performance', severity: 'info' });
        }

        // Check for localStorage error handling
        if (js.includes('localStorage') && !js.includes('try')) {
            this.warnings.push({
                type: 'JavaScript',
                severity: 'warning',
                message: 'localStorage usage without error handling'
            });
        }

        // Check for global error handlers
        if (!js.includes('window.addEventListener') || !js.includes('error')) {
            this.info.push({ type: 'JavaScript', message: 'Consider adding global error handlers for better reliability', severity: 'info' });
        }

        this.info.push({ type: 'JavaScript', message: 'JavaScript validation completed', severity: 'info' });
    }

    /**
     * CSP Compliance Validation
     */
    validateCSPCompliance(html: string) {
        // Check for CSP meta tag
        if (!html.includes('Content-Security-Policy')) {
            this.warnings.push({
                type: 'CSP',
                severity: 'warning',
                message: 'Missing Content-Security-Policy meta tag'
            });
        }

        // Check for inline scripts
        const inlineScriptPattern = /<script[^>]*>[\s\S]*?<\/script>/gi;
        const inlineScripts = html.match(inlineScriptPattern);
        if (inlineScripts) {
            const hasContent = inlineScripts.some(script => 
                !script.includes('src=') && script.length > 50
            );
            if (hasContent) {
                this.errors.push({
                    type: 'CSP',
                    severity: 'error',
                    message: 'Inline script tags detected - violates CSP'
                });
            }
        }

        // Check for javascript: URLs
        if (html.includes('javascript:')) {
            this.errors.push({
                type: 'CSP',
                severity: 'error',
                message: 'javascript: URL detected - violates CSP'
            });
        }

        this.info.push({ type: 'CSP', message: 'CSP compliance check completed', severity: 'info' });
    }

    /**
     * Security Validation
     */
    validateSecurity(html: string, js: string) {
        // Check for potential XSS vulnerabilities
        const dangerousPatterns = [
            { pattern: /innerHTML\s*=\s*[^;]+\+/, message: 'String concatenation with innerHTML' },
            { pattern: /document\.write\(/, message: 'document.write() usage' },
            { pattern: /dangerouslySetInnerHTML/, message: 'dangerouslySetInnerHTML in React' }
        ];

        dangerousPatterns.forEach(({ pattern, message }) => {
            if (js.match(pattern)) {
                this.errors.push({
                    type: 'Security',
                    severity: 'error',
                    message: `Potential XSS vulnerability: ${message}`
                });
            }
        });

        // Check for sensitive data exposure
        const sensitivePatterns = [
            'password', 'api_key', 'apiKey', 'secret', 'token', 
            'private_key', 'privateKey'
        ];

        sensitivePatterns.forEach(pattern => {
            const regex = new RegExp(`(${pattern})\\s*[:=]\\s*["'][^"']+["']`, 'i');
            if (js.match(regex)) {
                this.warnings.push({
                    type: 'Security',
                    severity: 'warning',
                    message: `Potential sensitive data exposure: ${pattern}`
                });
            }
        });

        this.info.push({ type: 'Security', message: 'Security validation completed', severity: 'info' });
    }

    /**
     * Accessibility Validation
     */
    validateAccessibility(html: string) {
        // --- UI/UX Linting ---
        // Empty state handling
        if (html.match(/<table|<ul|<ol|<div[^>]*class=["'][^"']*(list|items|table)[^"']*["']/i)) {
            if (html.match(/No results|No data|Nothing found|empty state/i) === null) {
                this.info.push({ type: 'UI/UX', message: 'Consider handling empty states for lists and tables', severity: 'info' });
            }
        }
        // Image optimization and alt attribute check
        const imgPattern = /<img[^>]*>/gi;
        const images: RegExpMatchArray | null = html.match(imgPattern);
        if (images) {
            const unoptimized: string[] = images.filter((img: string) => !img.includes('loading="lazy"'));
            if (unoptimized.length > 0) {
                this.info.push({
                    type: 'UI/UX',
                    severity: 'info',
                    message: `${unoptimized.length} <img> tag(s) missing loading="lazy" for optimization`
                });
            }
            const missingAlt: string[] = images.filter((img: string) => !img.includes('alt='));
            if (missingAlt.length > 0) {
                this.errors.push({
                    type: 'Accessibility',
                    severity: 'error',
                    message: `${missingAlt.length} image(s) missing alt attribute`
                });
            }
        }
        // Check for high contrast mode support
        if (!html.includes('high-contrast') && !html.includes('contrast')) {
            this.info.push({ type: 'Accessibility', message: 'Consider supporting high contrast mode for accessibility', severity: 'info' });
        }
        // Check for ARIA labels on buttons
        const buttonPattern: RegExp = /<button[^>]*>/gi;
        const buttons: RegExpMatchArray | null = html.match(buttonPattern);
        if (buttons) {
            const missingAria: string[] = buttons.filter((btn: string) => 
                !btn.includes('aria-label') && 
                !btn.includes('aria-labelledby') &&
                btn.match(/<button[^>]*>\s*<i/) // Icon-only buttons
            );
            if (missingAria.length > 0) {
                this.warnings.push({
                    type: 'Accessibility',
                    severity: 'warning',
                    message: `${missingAria.length} icon button(s) may need aria-label`
                });
            }
        }

        // Check for form labels
        const inputPattern: RegExp = /<input[^>]*>/gi;
        const inputs: RegExpMatchArray | null = html.match(inputPattern);
        if (inputs) {
            const missingLabels: string[] = inputs.filter((input: string) => 
                !input.includes('aria-label') && 
                !input.includes('placeholder')
            );
            if (missingLabels.length > 0) {
                this.warnings.push({
                    type: 'Accessibility',
                    severity: 'warning',
                    message: `${missingLabels.length} input(s) may need labels or aria-label`
                });
            }
        }

        // Check for heading hierarchy
        const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        const headingCounts = headings.map(h => {
            const pattern = new RegExp(`<${h}[^>]*>`, 'gi');
            const matches = html.match(pattern);
            return matches ? matches.length : 0;
        });

        if (headingCounts[0] === 0) {
            this.errors.push({
                type: 'Accessibility',
                severity: 'error',
                message: 'Missing h1 element - required for page structure'
            });
        }

        if (headingCounts[0] > 1) {
            this.warnings.push({
                type: 'Accessibility',
                severity: 'warning',
                message: 'Multiple h1 elements found - may confuse screen readers'
            });
        }

        // Check for role attributes on modals
        if (html.includes('modal') && !html.includes('role="dialog"')) {
            this.warnings.push({
                type: 'Accessibility',
                severity: 'warning',
                message: 'Modal elements should have role="dialog"'
            });
        }

        // Check for aria-live regions
        if (!html.includes('aria-live') && html.includes('toast')) {
            this.info.push({ type: 'Accessibility', message: 'Consider adding aria-live="polite" to notification containers', severity: 'info' });
        }

        this.info.push({ type: 'Accessibility', message: 'Accessibility validation completed', severity: 'info' });
    }

    /**
     * Calculate overall quality score
     */
    calculateScore() {
        const errorWeight = 10;
        const warningWeight = 5;
        const maxScore = 100;

        const deductions = (this.errors.length * errorWeight) + 
                          (this.warnings.length * warningWeight);

        return Math.max(0, maxScore - deductions);
    }

    /**
     * Generate human-readable summary
     */
    generateSummary() {
        const score = this.calculateScore();
        let grade = 'F';
        
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';

        return {
            score,
            grade,
            totalIssues: this.errors.length + this.warnings.length,
            criticalIssues: this.errors.length,
            status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
            recommendation: this.getRecommendation(score)
        };
    }

    /**
     * Get recommendations based on score
     */
    getRecommendation(score: number): string {
        if (score >= 90) {
            return 'Excellent! Code meets enterprise standards.';
        } else if (score >= 80) {
            return 'Good code quality. Address warnings for improvement.';
        } else if (score >= 70) {
            return 'Fair code quality. Several issues need attention.';
        } else if (score >= 60) {
            return 'Poor code quality. Significant improvements required.';
        } else {
            return 'Critical issues detected. Code requires major refactoring.';
        }
    }

    /**
     * Format results for console output
     */
    formatResults(results: { errors: ValidationMessage[]; warnings: ValidationMessage[]; info: ValidationMessage[]; summary: { score: number; grade: string; totalIssues: number; criticalIssues: number; status: string; recommendation: string; }; }): string {
        let output = '\n========================================\n';
        output += '  CODE VALIDATION RESULTS\n';
        output += '========================================\n\n';
        
        output += `Score: ${results.summary.score}/100 (Grade: ${results.summary.grade})\n`;
        output += `Status: ${results.summary.status}\n`;
        output += `${results.summary.recommendation}\n\n`;

        if (results.errors.length > 0) {
            output += '❌ ERRORS (Must Fix):\n';
            output += '─────────────────────\n';
            results.errors.forEach((error: ValidationMessage, i: number) => {
                output += `${i + 1}. [${error.type}] ${error.message}\n`;
                if (error.details) {
                    output += `   Details: ${JSON.stringify(error.details).substring(0, 100)}\n`;
                }
            });
            output += '\n';
        }

        if (results.warnings.length > 0) {
            output += '⚠️  WARNINGS (Should Fix):\n';
            output += '─────────────────────────\n';
            results.warnings.forEach((warning: ValidationMessage, i: number) => {
                output += `${i + 1}. [${warning.type}] ${warning.message}\n`;
            });
            output += '\n';
        }

        if (results.info.length > 0) {
            output += 'ℹ️  SUGGESTIONS (Optional):\n';
            output += '──────────────────────────\n';
            results.info.forEach((info: ValidationMessage, i: number) => {
                output += `${i + 1}. [${info.type}] ${info.message}\n`;
            });
            output += '\n';
        }

        output += '========================================\n';

        return output;
    }
}

export default CodeValidator;