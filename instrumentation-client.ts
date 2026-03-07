// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://228a9def191c497bba8a2383c295f2c4@o4510805782364160.ingest.de.sentry.io/4510805845147728",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Drop AbortErrors — these are normal client-side cancellations (user navigates away
  // mid-stream, fetch cancelled, etc.) and should not pollute the error feed.
  beforeSend(event, hint) {
    const err = hint?.originalException;
    if (err instanceof Error && (err.name === 'AbortError' || err.message?.toLowerCase().includes('aborted'))) {
      return null;
    }
    return event;
  },

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Do NOT send PII — names, emails, IP addresses stay out of Sentry error reports.
  // Error events are still captured; user identity is not attached.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog client-side initialization — gated behind cookie consent.
// Only initialises if the user has explicitly accepted analytics cookies (bf_consent=all).
import posthog from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/consent";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY && hasAnalyticsConsent()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // Use env var directly — hardcoding "/ingest" causes Turbopack's dev proxy
    // to return 500 on external rewrites. The next.config.ts rewrite still applies
    // in production if NEXT_PUBLIC_POSTHOG_HOST is set to "/ingest" in Vercel.
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    // Enables capturing unhandled exceptions via Error Tracking
    capture_exceptions: true,
    // Turn on debug in development mode
    debug: process.env.NODE_ENV === "development",
  });
}
