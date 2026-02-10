'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

/**
 * Client-side component to monitor Content Security Policy violations
 * and report them to analytics for security monitoring
 */
export default function CSPMonitor() {
  useEffect(() => {
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      // Track CSP violation to analytics
      analytics.cspViolation(e.violatedDirective, e.blockedURI)

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('🚨 CSP Violation:', {
          violatedDirective: e.violatedDirective,
          blockedURI: e.blockedURI,
          originalPolicy: e.originalPolicy,
          disposition: e.disposition,
        })
      }
    }

    window.addEventListener('securitypolicyviolation', handleCSPViolation)

    return () => {
      window.removeEventListener('securitypolicyviolation', handleCSPViolation)
    }
  }, [])

  return null // This component doesn't render anything
}
