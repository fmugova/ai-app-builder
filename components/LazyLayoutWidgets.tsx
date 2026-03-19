'use client';

import dynamic from 'next/dynamic';

// These widgets are non-critical — load them after the page has hydrated
// so they don't compete with main-thread work on initial load.
const SupportChat = dynamic(() => import('./SupportChat'), { ssr: false });
const FeedbackWidget = dynamic(() => import('./FeedbackWidget'), { ssr: false });
const CSPMonitor = dynamic(() => import('./CSPMonitor'), { ssr: false });
const CookieConsent = dynamic(() => import('./CookieConsent'), { ssr: false });
const ConditionalAnalytics = dynamic(() => import('./ConditionalAnalytics'), { ssr: false });

export default function LazyLayoutWidgets() {
  return (
    <>
      <ConditionalAnalytics />
      <CookieConsent />
      <SupportChat />
      <FeedbackWidget />
      <CSPMonitor />
    </>
  );
}
