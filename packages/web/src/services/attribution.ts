/**
 * Capture and persist acquisition attribution from URL parameters.
 * Stores GCLID (Google Ads click id) and UTM tags in localStorage on first visit
 * so they can be sent to the backend on signup, even if the user signs up days later.
 */

const STORAGE_KEY = 'jk_attribution';
const EXPIRY_DAYS = 90;

export interface Attribution {
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
  captured_at: number; // ms epoch
}

/**
 * Read URL params on every page load. If we find any attribution params
 * (or this is the user's first visit), store them. Don't overwrite existing
 * attribution unless new ad params come in (last-click attribution model).
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid') || undefined;
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const utm_term = params.get('utm_term') || undefined;
    const utm_content = params.get('utm_content') || undefined;

    const hasAdParams = gclid || utm_source || utm_campaign;
    const existing = readAttribution();

    // If new ad params arrived, overwrite (last-click attribution)
    // If no new params and we already have attribution, leave it alone
    if (!hasAdParams && existing) return;

    const attribution: Attribution = hasAdParams
      ? {
          gclid,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          landing_page: window.location.pathname,
          referrer: document.referrer || undefined,
          captured_at: Date.now(),
        }
      : {
          // First-touch organic visit: capture referrer + landing page
          landing_page: window.location.pathname,
          referrer: document.referrer || undefined,
          captured_at: Date.now(),
        };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage may be unavailable (privacy mode) — fail silently
  }
}

/**
 * Read stored attribution. Returns null if expired or missing.
 */
export function readAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: Attribution = JSON.parse(raw);
    const ageMs = Date.now() - data.captured_at;
    if (ageMs > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear stored attribution (e.g., after successfully sent to backend).
 */
export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
