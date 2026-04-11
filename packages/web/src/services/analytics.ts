/**
 * Google Analytics 4 + Google Ads conversion tracking helpers.
 *
 * GA4: G-XMF08SHJQS
 * Google Ads: AW-17678736775
 * Conversion actions: Search Completed, Sign Up, Purchase
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
  // Google Ads: JK - Search Completed
  gtag('event', 'conversion', { send_to: 'AW-17678736775/eLjNCIb4mZkcEIe78O1B' });
}

export function trackSignUp(method: string) {
  gtag('event', 'sign_up', {
    method,
  });
  // Google Ads: JK - Sign Up
  gtag('event', 'conversion', { send_to: 'AW-17678736775/wmogCIn4mZkcEIe78O1B' });
}

export function trackPurchase(value: number, currency: string, item: string) {
  gtag('event', 'purchase', {
    value,
    currency,
    items: [{ item_name: item }],
  });
  // Google Ads: JK - Purchase
  gtag('event', 'conversion', {
    send_to: 'AW-17678736775/dS__CIz4mZkcEIe78O1B',
    value,
    currency,
  });
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

// --- Conversion modal events ---
// Fire at each step of the free-to-paid funnel so we can measure modal impact:
// shown → (dismissed | cta_click) → (signup | purchase) downstream.

export function trackConversionModalShown(
  variant: 'anonymous' | 'free' | 'lastFreeSearch',
  trigger: 'scroll' | 'masked_click',
  jackpots: number,
  totalKeywords: number,
) {
  gtag('event', 'conversion_modal_shown', {
    variant,
    trigger,
    jackpots,
    total_keywords: totalKeywords,
  });
}

export function trackConversionModalCta(
  variant: 'anonymous' | 'free' | 'lastFreeSearch',
) {
  gtag('event', 'conversion_modal_cta', {
    variant,
  });
}

export function trackConversionModalDismissed(
  variant: 'anonymous' | 'free' | 'lastFreeSearch',
) {
  gtag('event', 'conversion_modal_dismissed', {
    variant,
  });
}
