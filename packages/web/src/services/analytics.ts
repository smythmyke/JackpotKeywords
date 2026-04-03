/**
 * Google Analytics 4 + Google Ads conversion tracking helpers.
 *
 * Setup:
 * 1. Replace GA_MEASUREMENT_ID in index.html with your GA4 ID (e.g., G-XXXXXXXXXX)
 * 2. Replace AW-CONVERSION_ID in index.html with your Google Ads conversion ID
 * 3. Uncomment the gtag('config', 'AW-CONVERSION_ID') line in index.html
 * 4. Replace the CONVERSION_LABEL values below with your actual conversion labels
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (window.gtag) {
    window.gtag(...args);
  }
}

// --- Page view tracking (automatic with GA4, but useful for SPA route changes) ---

export function trackPageView(path: string, title?: string) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  });
}

// --- Custom events ---

export function trackSearch(query: string) {
  gtag('event', 'search', {
    search_term: query,
  });
}

export function trackSignUp(method: string) {
  gtag('event', 'sign_up', {
    method,
  });
  // Google Ads conversion — REPLACE label with your actual conversion label
  // gtag('event', 'conversion', { send_to: 'AW-CONVERSION_ID/SIGNUP_LABEL' });
}

export function trackPurchase(value: number, currency: string, item: string) {
  gtag('event', 'purchase', {
    value,
    currency,
    items: [{ item_name: item }],
  });
  // Google Ads conversion — REPLACE label with your actual conversion label
  // gtag('event', 'conversion', {
  //   send_to: 'AW-CONVERSION_ID/PURCHASE_LABEL',
  //   value,
  //   currency,
  // });
}

export function trackSubscription(plan: string, value: number) {
  gtag('event', 'subscribe', {
    plan,
    value,
    currency: 'USD',
  });
}

export function trackCreditPurchase(pack: string, value: number) {
  gtag('event', 'credit_purchase', {
    pack,
    value,
    currency: 'USD',
  });
}

export function trackExport(format: string, keywordCount: number) {
  gtag('event', 'export', {
    format,
    keyword_count: keywordCount,
  });
}
