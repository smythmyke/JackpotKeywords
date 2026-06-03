import * as cheerio from 'cheerio';
import * as functions from 'firebase-functions';

const USER_AGENT =
  'JackpotKeywords-SEO-Audit/1.0 (+https://jackpotkeywords.web.app/seo-audit)';
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 500_000;
const MAX_INTERNAL_LINKS = 50;

export interface ParsedPage {
  url: string;
  fetchedHtml: boolean;
  fetchError?: string;
  title?: string;
  titleLength: number;
  metaDescription?: string;
  metaDescriptionLength: number;
  h1s: string[];
  h2s: string[];
  h3s: string[];
  hasViewportMeta: boolean;
  hasCanonical: boolean;
  canonicalUrl?: string;
  isHttps: boolean;
  ogTags: { title?: string; description?: string; image?: string };
  twitterCard?: string;
  jsonLdTypes: string[];
  jsonLdData: any[];
  internalLinks: string[];
  wordCount: number;
  bodyText: string; // stripped text, capped — used for downstream summarization
  hasRobotsMetaNoindex: boolean;
  isSpaShell: boolean;
  httpStatus: number;
  redirected: boolean;
  finalUrl: string;
  hasXRobotsNoindex: boolean;
  images: { total: number; missingAlt: number };
}

interface FetchResult {
  html: string | null;
  httpStatus: number;
  finalUrl: string;
  redirected: boolean;
  contentType: string;
  xRobotsTag: string;
  error?: string;
}

async function fetchHtml(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const result: FetchResult = {
    html: null, httpStatus: 0, finalUrl: url, redirected: false, contentType: '', xRobotsTag: '',
  };
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    result.httpStatus = response.status;
    result.finalUrl = response.url || url;
    result.redirected = response.redirected;
    result.contentType = response.headers.get('content-type') || '';
    result.xRobotsTag = response.headers.get('x-robots-tag') || '';
    if (!response.ok) {
      functions.logger.warn(`Fetch ${url} returned ${response.status}`);
      result.error = `http_${response.status}`;
      return result;
    }
    if (result.contentType && !/text\/html|application\/xhtml/i.test(result.contentType)) {
      functions.logger.warn(`Fetch ${url} non-HTML content-type: ${result.contentType}`);
      result.error = 'non_html';
      return result;
    }
    const text = await response.text();
    if (text.length > MAX_HTML_BYTES) {
      functions.logger.warn(`Fetch ${url} exceeded ${MAX_HTML_BYTES} bytes (${text.length})`);
      result.error = 'too_large';
      return result;
    }
    result.html = text;
    return result;
  } catch (err: any) {
    functions.logger.warn(`Fetch ${url} failed: ${err.message || err}`);
    result.error = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch_error');
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function emptyParsed(url: string, fetchError: string): ParsedPage {
  return {
    url,
    fetchedHtml: false,
    fetchError,
    titleLength: 0,
    metaDescriptionLength: 0,
    h1s: [],
    h2s: [],
    h3s: [],
    hasViewportMeta: false,
    hasCanonical: false,
    isHttps: url.startsWith('https://'),
    ogTags: {},
    jsonLdTypes: [],
    jsonLdData: [],
    internalLinks: [],
    wordCount: 0,
    bodyText: '',
    hasRobotsMetaNoindex: false,
    isSpaShell: false,
    httpStatus: 0,
    redirected: false,
    finalUrl: url,
    hasXRobotsNoindex: false,
    images: { total: 0, missingAlt: 0 },
  };
}

function extractText($: cheerio.CheerioAPI): string {
  // Clone the document, strip non-content tags, take .text()
  const clone = $.root().clone();
  clone.find('script, style, noscript, template, svg').remove();
  return clone.text().replace(/\s+/g, ' ').trim();
}

function detectSpaShell($: cheerio.CheerioAPI, wordCount: number): boolean {
  const hasMountPoint = $('#root, #app, #__next, [data-reactroot]').length > 0;
  const hasModuleScript =
    $('script[type=module]').length > 0 ||
    $('script[src*=".js"]').length > 0;
  return wordCount < 50 && hasMountPoint && hasModuleScript;
}

function collectJsonLd($: cheerio.CheerioAPI): { types: string[]; data: any[] } {
  const types: string[] = [];
  const data: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const blocks = Array.isArray(parsed) ? parsed : [parsed];
      for (const block of blocks) {
        data.push(block);
        const t = block?.['@type'];
        if (typeof t === 'string') types.push(t);
        else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') types.push(v);
        // Schema.org @graph: nested entities
        const graph = block?.['@graph'];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            const nt = node?.['@type'];
            if (typeof nt === 'string') types.push(nt);
            else if (Array.isArray(nt)) for (const v of nt) if (typeof v === 'string') types.push(v);
          }
        }
      }
    } catch (err: any) {
      functions.logger.warn(`Invalid JSON-LD block: ${err.message}`);
    }
  });
  return { types: Array.from(new Set(types)), data };
}

function collectInternalLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  $('a[href]').each((_, el) => {
    if (seen.size >= MAX_INTERNAL_LINKS) return;
    const href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    try {
      const resolved = new URL(href, base);
      if (resolved.origin !== base.origin) return;
      const path = resolved.pathname + (resolved.search || '');
      seen.add(path);
    } catch { /* skip invalid hrefs */ }
  });
  return Array.from(seen).slice(0, MAX_INTERNAL_LINKS);
}

function collectImages($: cheerio.CheerioAPI): { total: number; missingAlt: number } {
  let total = 0;
  let missingAlt = 0;
  $('img').each((_, el) => {
    total++;
    // alt="" is a valid "decorative" marker; only a missing attribute is an issue.
    if ($(el).attr('alt') === undefined) missingAlt++;
  });
  return { total, missingAlt };
}

function collectOgTags($: cheerio.CheerioAPI): ParsedPage['ogTags'] {
  return {
    title: $('meta[property="og:title"]').attr('content') || undefined,
    description: $('meta[property="og:description"]').attr('content') || undefined,
    image: $('meta[property="og:image"]').attr('content') || undefined,
  };
}

export async function fetchAndParse(url: string): Promise<ParsedPage> {
  const fetched = await fetchHtml(url);
  if (!fetched.html) {
    const empty = emptyParsed(url, fetched.error || 'fetch_failed_or_invalid_response');
    empty.httpStatus = fetched.httpStatus;
    empty.redirected = fetched.redirected;
    empty.finalUrl = fetched.finalUrl;
    empty.hasXRobotsNoindex = /(^|[,\s])noindex([,\s]|$)/i.test(fetched.xRobotsTag);
    return empty;
  }

  const $ = cheerio.load(fetched.html);

  const title = $('title').first().text().trim() || undefined;
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || undefined;

  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3s = $('h3').slice(0, 10).map((_, el) => $(el).text().trim()).get().filter(Boolean);

  const bodyText = extractText($);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  const { types: jsonLdTypes, data: jsonLdData } = collectJsonLd($);
  const internalLinks = collectInternalLinks($, url);

  return {
    url,
    fetchedHtml: true,
    title,
    titleLength: title?.length || 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    h1s,
    h2s,
    h3s,
    hasViewportMeta: $('meta[name="viewport"]').length > 0,
    hasCanonical: !!canonicalUrl,
    canonicalUrl,
    isHttps: new URL(url).protocol === 'https:',
    ogTags: collectOgTags($),
    twitterCard,
    jsonLdTypes,
    jsonLdData,
    internalLinks,
    wordCount,
    bodyText: bodyText.slice(0, 8000),
    hasRobotsMetaNoindex: robotsMeta.split(',').map((s) => s.trim()).includes('noindex'),
    isSpaShell: detectSpaShell($, wordCount),
    httpStatus: fetched.httpStatus,
    redirected: fetched.redirected,
    finalUrl: fetched.finalUrl,
    hasXRobotsNoindex: /(^|[,\s])noindex([,\s]|$)/i.test(fetched.xRobotsTag),
    images: collectImages($),
  };
}
