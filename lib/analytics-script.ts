/**
 * Analytics tracking script that gets injected into published sites
 * Tracks page views, form submissions, and user interactions
 */

export function getAnalyticsScript(projectId: string) {
  return `
<!-- BuildFlow Analytics -->
<script>
(function() {
  const ANALYTICS_ENDPOINT = '${process.env.NEXT_PUBLIC_APP_URL || 'https://buildflow-ai.app'}/api/analytics/track';
  const PROJECT_ID = '${projectId}';
  
  // Helper to send events
  function trackEvent(eventType, properties = {}) {
    const data = {
      projectId: PROJECT_ID,
      event: eventType,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }
    };
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        JSON.stringify(data)
      );
    } else {
      // Fallback to fetch
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(err => console.error('Analytics error:', err));
    }
  }
  
  // Track page view on load
  window.addEventListener('load', function() {
    trackEvent('page_view', {
      path: window.location.pathname,
      title: document.title,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });
  });
  
  // Track form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName === 'FORM') {
      trackEvent('form_submit', {
        formId: form.id || 'unknown',
        formAction: form.action || 'unknown',
      });
    }
  });
  
  // Track clicks on important elements
  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'A') {
      trackEvent('link_click', {
        href: target.href,
        text: target.textContent.substring(0, 100),
      });
    }
    if (target.tagName === 'BUTTON') {
      trackEvent('button_click', {
        text: target.textContent.substring(0, 100),
        type: target.type,
      });
    }
  });
  
  // Track time on page
  let startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    trackEvent('page_exit', {
      timeOnPage: timeOnPage,
    });
  });
})();
</script>
`.trim();
}