import * as functions from 'firebase-functions';

/**
 * PageSpeed Insights (Lighthouse) — Performance / Core Web Vitals for the SEO
 * audit's `performance` category. Free Google API; key in PAGESPEED_API_KEY
 * (project even-plate-378520, restricted to the PageSpeed Insights API).
 *
 * Lab data (score, LCP, CLS, TBT) always returns. Real-user CrUX field data
 * only exists for sites with enough traffic, so for new/low-traffic sites we
 * surface the lab numbers. Non-fatal: returns null on any error or missing key
 * (the audit's performance category then renders N/A).
 */
export interface PageSpeedResult {
  score: number | null; // Lighthouse performance score 0–100
  lcp?: string; // display, e.g. "9.5 s"
  cls?: string; // display, e.g. "0.02"
  tbt?: string; // display, e.g. "280 ms"
  lcpMs?: number; // numeric LCP in ms (for thresholds)
  clsValue?: number; // numeric CLS (unitless)
  tbtMs?: number; // numeric TBT in ms
}

const PAGESPEED_TIMEOUT_MS = 25000;

export async function runPageSpeed(url: string): Promise<PageSpeedResult | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) {
    functions.logger.info('PageSpeed skipped: PAGESPEED_API_KEY not set');
    return null;
  }

  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&key=${key}&strategy=mobile&category=performance`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGESPEED_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) {
      functions.logger.warn(`PageSpeed returned ${res.status} for ${url}`);
      return null;
    }
    const json: any = await res.json();
    const lh = json?.lighthouseResult || {};
    const audits = lh.audits || {};

    const rawScore = lh.categories?.performance?.score;
    const score = typeof rawScore === 'number' ? Math.round(rawScore * 100) : null;

    return {
      score,
      lcp: audits['largest-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
      lcpMs: numeric(audits['largest-contentful-paint']?.numericValue),
      clsValue: numeric(audits['cumulative-layout-shift']?.numericValue),
      tbtMs: numeric(audits['total-blocking-time']?.numericValue),
    };
  } catch (err: any) {
    functions.logger.warn(`PageSpeed failed for ${url}: ${err?.message || err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function numeric(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
