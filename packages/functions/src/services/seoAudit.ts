import * as functions from 'firebase-functions';
import { geminiGenerate, safeParseGeminiJSON } from './gemini';
import { fetchAndParse, type ParsedPage } from './htmlParser';
import { runAeoScanLight } from './aeoScan';
import { runPageSpeed, type PageSpeedResult } from './pageSpeed';
import { SEO_AUDIT_CATEGORY_WEIGHTS } from '@jackpotkeywords/shared';
import type { AeoResult } from '@jackpotkeywords/shared';
import type {
  SeoAuditResult,
  SeoAuditCheckItem,
  SeoAuditPageResult,
  SeoAuditCategory,
  SeoAuditKeywordGap,
  SeoAuditRecommendation,
} from '@jackpotkeywords/shared';

// Single source of truth for category weights — shared with web renderers.
const CATEGORY_WEIGHTS: Record<SeoAuditCategory, number> = SEO_AUDIT_CATEGORY_WEIGHTS;

// AI answer-engine crawlers we check robots.txt access for (#6).
const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

const MAX_SECONDARY_PAGES = 8;
const PAGE_FETCH_TIMEOUT = 8000;

// Paths to skip when selecting pages to analyze
const SKIP_PATTERNS = [
  /\/login/i, /\/register/i, /\/signup/i, /\/signin/i,
  /\/cart/i, /\/checkout/i, /\/account/i, /\/admin/i,
  /\/terms/i, /\/tos/i, /\/privacy/i, /\/cookie/i,
  /\/page\/\d+/i, /\?p=\d+/i, /\/tag\//i, /\/category\//i,
  /\/author\//i, /\/wp-admin/i, /\/wp-json/i, /\/feed/i,
  /\.(jpg|png|gif|svg|pdf|zip|css|js)$/i,
];

// Priority paths when selecting which pages to analyze
const PRIORITY_PATHS = [
  '/', '/about', '/blog', '/pricing', '/services', '/features',
  '/contact', '/products', '/solutions', '/how-it-works',
];

interface PrimaryPageAnalysis {
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
  hasRobotsMetaNoindex: boolean;
  isSpaShell: boolean;
  pageUrl: string;
  finalUrl: string;
  httpStatus: number;
  redirected: boolean;
  hasXRobotsNoindex: boolean;
  images: { total: number; missingAlt: number };
  contentSummary: string;
}

interface SiteStructure {
  sitemapUrls: string[];
  sitemapExists: boolean;
  sitemapReferencedInRobots: boolean;
  sitemapContentType: string;
  sitemapHasLastmod: boolean;
  robotsTxt: string | null;
  robotsBlocksImportant: boolean;
  aiCrawlerBlocks: string[];
  llmsTxtExists: boolean;
}

/**
 * Main entry point: run a full SEO audit on a URL.
 *
 * `includeAeo` defaults to true (consumer audit + `/api/audit` behavior).
 * The public `/v1/audit` endpoint passes `includeAeo: false` so customers
 * who want AEO data buy it via the dedicated `/v1/aeo-scan` endpoint.
 */
export async function runSeoAudit(
  url: string,
  options: { includeAeo?: boolean } = {},
): Promise<Omit<SeoAuditResult, 'id' | 'paid' | 'createdAt'>> {
  const includeAeo = options.includeAeo ?? true;
  const startTime = Date.now();
  const parsedUrl = new URL(url);
  const domain = parsedUrl.origin;

  functions.logger.info(`SEO Audit starting for ${domain}`);

  // Kick off PageSpeed (Lighthouse) in parallel — slow (~5-15s) and non-fatal. (#8)
  const pageSpeedPromise = runPageSpeed(url);

  // Step 1: Analyze the primary page with Gemini URL context
  functions.logger.info('Step 1: Analyzing primary page...');
  const primaryAnalysis = await analyzePrimaryPage(url);
  functions.logger.info(`Step 1 done: title="${primaryAnalysis.title}", ${primaryAnalysis.wordCount} words, ${primaryAnalysis.internalLinks.length} internal links`);

  // Step 2: Discover site structure (sitemap + robots.txt)
  functions.logger.info('Step 2: Discovering site structure...');
  const structure = await discoverSiteStructure(domain);
  functions.logger.info(`Step 2 done: sitemap=${structure.sitemapExists} (${structure.sitemapUrls.length} URLs), robots=${!!structure.robotsTxt}`);

  // Step 3: Select and shallow-analyze secondary pages
  const secondaryUrls = selectSecondaryPages(
    domain, primaryAnalysis.internalLinks, structure.sitemapUrls, url,
  );
  functions.logger.info(`Step 3: Analyzing ${secondaryUrls.length} secondary pages...`);
  const pageResults = await analyzeSecondaryPages(secondaryUrls);
  functions.logger.info(`Step 3 done: ${pageResults.length} pages analyzed`);

  // Step 4: Build the checklist (deterministic, no AI)
  functions.logger.info('Step 4: Building checklist...');
  const pageSpeed = await pageSpeedPromise;
  const siteChecks = buildChecklist(primaryAnalysis, pageResults, structure);
  const perfChecks = buildPerformanceChecks(pageSpeed);
  // Fold per-page issues into the main checks array so the score and summary
  // counts reflect per-page warnings (title-too-long on blogs, thin content on
  // /about, etc.). Their `id` starts with `page_` so renderers can choose to
  // skip them in the per-category Detailed Checklist if they're already shown
  // in the page-by-page section.
  const pageIssues = pageResults.flatMap((r) => r.issues);
  const checks = [...siteChecks, ...perfChecks, ...pageIssues];

  // Step 5: Generate keyword gaps + recommendations (Gemini)
  functions.logger.info('Step 5: Generating recommendations...');
  const { keywordGaps, recommendations } = await generateInsights(primaryAnalysis, checks, domain, structure);
  functions.logger.info(`Step 5 done: ${keywordGaps.length} gaps, ${recommendations.length} recommendations`);

  // Step 6: AEO — AI Visibility check (lightweight, non-fatal). Skipped when
  // the caller opts out (e.g. /v1/audit, which sells AEO via /v1/aeo-scan).
  let aeoResult: AeoResult | null = null;
  if (includeAeo) {
    try {
      functions.logger.info('Step 6: Running AEO light scan...');
      const productName = primaryAnalysis.title?.replace(/[—–|:].*/,  '').trim() || undefined;
      aeoResult = await runAeoScanLight(
        primaryAnalysis.contentSummary,
        domain,
        productName,
      );
      functions.logger.info(`Step 6 done: visibility ${aeoResult.visibilityScore}/100, ${aeoResult.queriesCited}/${aeoResult.queriesChecked} cited`);
    } catch (err: any) {
      functions.logger.warn(`Step 6 AEO scan failed (non-fatal): ${err.message}`);
    }
  } else {
    functions.logger.info('Step 6: AEO scan skipped (includeAeo=false)');
  }

  // Calculate scores (now includes per-page issues)
  const categoryScores = calculateCategoryScores(checks);
  const overallScore = calculateOverallScore(categoryScores);

  const executionTimeMs = Date.now() - startTime;
  functions.logger.info(`SEO Audit complete: score ${overallScore}/100 in ${(executionTimeMs / 1000).toFixed(1)}s`);

  return {
    url,
    domain,
    overallScore,
    categoryScores,
    checks,
    pageResults: [
      {
        url,
        title: primaryAnalysis.title,
        metaDescription: primaryAnalysis.metaDescription,
        h1: primaryAnalysis.h1s[0],
        wordCount: primaryAnalysis.wordCount,
        issues: checks.filter((c) => c.id.startsWith('primary_')),
      },
      ...pageResults,
    ],
    keywordGaps,
    recommendations,
    aeoResult,
    performanceMetrics: pageSpeed
      ? { score: pageSpeed.score, lcp: pageSpeed.lcp, cls: pageSpeed.cls, tbt: pageSpeed.tbt }
      : null,
    metadata: {
      pagesAnalyzed: 1 + pageResults.length,
      executionTimeMs,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 1: Primary page analysis via Gemini URL context
// ---------------------------------------------------------------------------

async function analyzePrimaryPage(url: string): Promise<PrimaryPageAnalysis> {
  const parsed = await fetchAndParse(url);
  if (!parsed.fetchedHtml) {
    functions.logger.warn(`Primary page fetch failed for ${url}: ${parsed.fetchError}`);
  }
  const contentSummary = await summarizeContent(parsed);
  return parsedToPrimaryAnalysis(parsed, contentSummary);
}

function parsedToPrimaryAnalysis(p: ParsedPage, contentSummary: string): PrimaryPageAnalysis {
  return {
    title: p.title,
    titleLength: p.titleLength,
    metaDescription: p.metaDescription,
    metaDescriptionLength: p.metaDescriptionLength,
    h1s: p.h1s,
    h2s: p.h2s,
    h3s: p.h3s,
    hasViewportMeta: p.hasViewportMeta,
    hasCanonical: p.hasCanonical,
    canonicalUrl: p.canonicalUrl,
    isHttps: p.isHttps,
    ogTags: p.ogTags,
    twitterCard: p.twitterCard,
    jsonLdTypes: p.jsonLdTypes,
    jsonLdData: p.jsonLdData,
    internalLinks: p.internalLinks,
    wordCount: p.wordCount,
    hasRobotsMetaNoindex: p.hasRobotsMetaNoindex,
    isSpaShell: p.isSpaShell,
    pageUrl: p.url,
    finalUrl: p.finalUrl,
    httpStatus: p.httpStatus,
    redirected: p.redirected,
    hasXRobotsNoindex: p.hasXRobotsNoindex,
    images: p.images,
    contentSummary,
  };
}

async function summarizeContent(p: ParsedPage): Promise<string> {
  if (!p.fetchedHtml || !p.bodyText) return '';
  const prompt = `Summarize what this webpage is about in 2-3 sentences. Be specific about the product/service offered. Return only the summary, no preamble.

URL: ${p.url}
Title: ${p.title || '(no title)'}
H1: ${p.h1s[0] || '(no H1)'}
Page text (first 8KB):
${p.bodyText}`;
  try {
    const text = await geminiGenerate(prompt);
    return text.trim().slice(0, 1000);
  } catch (err: any) {
    functions.logger.warn(`Content summary failed: ${err.message}`);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Step 2: Site structure discovery
// ---------------------------------------------------------------------------

async function discoverSiteStructure(domain: string): Promise<SiteStructure> {
  const [sitemapResult, robotsResult, llmsResult] = await Promise.allSettled([
    fetchWithMeta(`${domain}/sitemap.xml`, PAGE_FETCH_TIMEOUT),
    fetchWithTimeout(`${domain}/robots.txt`, PAGE_FETCH_TIMEOUT),
    fetchWithTimeout(`${domain}/llms.txt`, PAGE_FETCH_TIMEOUT),
  ]);

  // Parse sitemap (+ content-type and lastmod for validity, #2)
  const sitemapUrls: string[] = [];
  let sitemapExists = false;
  let sitemapContentType = '';
  let sitemapHasLastmod = false;
  if (sitemapResult.status === 'fulfilled' && sitemapResult.value) {
    const { body, contentType } = sitemapResult.value;
    sitemapContentType = contentType;
    if (body.includes('<urlset') || body.includes('<sitemapindex')) {
      sitemapExists = true;
      const locMatches = body.matchAll(/<loc>(.*?)<\/loc>/g);
      for (const match of locMatches) sitemapUrls.push(match[1].trim());
      sitemapHasLastmod = /<lastmod>/i.test(body);
    }
  }

  // Parse robots.txt (+ Sitemap: reference #1, AI-crawler access #6)
  let robotsTxt: string | null = null;
  let robotsBlocksImportant = false;
  let sitemapReferencedInRobots = false;
  let aiCrawlerBlocks: string[] = [];
  if (robotsResult.status === 'fulfilled' && robotsResult.value) {
    robotsTxt = robotsResult.value;
    if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) robotsBlocksImportant = true;
    sitemapReferencedInRobots = /^\s*Sitemap:\s*\S+/im.test(robotsTxt);
    aiCrawlerBlocks = AI_CRAWLERS.filter((bot) => robotsFullyBlocks(robotsTxt!, bot));
  }

  const llmsTxtExists =
    llmsResult.status === 'fulfilled' && !!llmsResult.value && llmsResult.value.trim().length > 0;

  return {
    sitemapUrls,
    sitemapExists,
    sitemapReferencedInRobots,
    sitemapContentType,
    sitemapHasLastmod,
    robotsTxt,
    robotsBlocksImportant,
    aiCrawlerBlocks,
    llmsTxtExists,
  };
}

/** Like fetchWithTimeout but also returns the HTTP status + content-type (for sitemap validity, #2). */
async function fetchWithMeta(
  url: string,
  timeoutMs: number,
): Promise<{ body: string; status: number; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'JackpotKeywords-SEO-Audit/1.0' },
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    if (body.length > 500_000) return null;
    return { body, status: response.status, contentType };
  } catch {
    return null;
  }
}

/**
 * True if `userAgent` is disallowed from the whole site (`Disallow: /`). A
 * UA-specific group wins over the `*` group. Lightweight robots.txt grouping —
 * enough to detect a deliberate full block of an AI crawler (#6).
 */
function robotsFullyBlocks(robotsTxt: string, userAgent: string): boolean {
  const lines = robotsTxt
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);

  const groups: { agents: string[]; disallows: string[] }[] = [];
  let cur: { agents: string[]; disallows: string[] } | null = null;
  let prevWasAgent = false;

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!prevWasAgent || !cur) {
        cur = { agents: [], disallows: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      prevWasAgent = true;
    } else if (field === 'disallow') {
      if (cur) cur.disallows.push(val);
      prevWasAgent = false;
    } else {
      prevWasAgent = false;
    }
  }

  const ua = userAgent.toLowerCase();
  const blocksRoot = (g: { disallows: string[] }) => g.disallows.includes('/');
  const specific = groups.find((g) => g.agents.includes(ua));
  if (specific) return blocksRoot(specific);
  const star = groups.find((g) => g.agents.includes('*'));
  return star ? blocksRoot(star) : false;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'JackpotKeywords-SEO-Audit/1.0' },
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > 500_000) return null; // Skip huge responses
    return text;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 3: Select and analyze secondary pages
// ---------------------------------------------------------------------------

function selectSecondaryPages(
  domain: string, internalLinks: string[], sitemapUrls: string[], primaryUrl: string,
): string[] {
  const primaryPath = new URL(primaryUrl).pathname;
  const allPaths = new Set<string>();

  // Add internal links from primary page
  for (const link of internalLinks) {
    const path = link.startsWith('/') ? link : `/${link}`;
    allPaths.add(path);
  }

  // Add sitemap URLs (convert to paths)
  for (const sitemapUrl of sitemapUrls) {
    try {
      const u = new URL(sitemapUrl);
      if (u.origin === domain) allPaths.add(u.pathname);
    } catch { /* skip invalid */ }
  }

  // Remove primary page and root
  allPaths.delete(primaryPath);

  // Filter out skip patterns
  const filtered = [...allPaths].filter(
    (path) => !SKIP_PATTERNS.some((pattern) => pattern.test(path)),
  );

  // Sort by priority
  const prioritized = filtered.sort((a, b) => {
    const aIdx = PRIORITY_PATHS.findIndex((p) => a === p || a.startsWith(p + '/'));
    const bIdx = PRIORITY_PATHS.findIndex((p) => b === p || b.startsWith(p + '/'));
    const aScore = aIdx >= 0 ? aIdx : 100;
    const bScore = bIdx >= 0 ? bIdx : 100;
    return aScore - bScore;
  });

  // Always include homepage if not the primary
  const selected: string[] = [];
  if (primaryPath !== '/') selected.push('/');
  for (const path of prioritized) {
    if (selected.length >= MAX_SECONDARY_PAGES) break;
    if (!selected.includes(path)) selected.push(path);
  }

  return selected.map((path) => `${domain}${path}`);
}

async function analyzeSecondaryPages(urls: string[]): Promise<SeoAuditPageResult[]> {
  if (urls.length === 0) return [];

  const settled = await Promise.allSettled(urls.map((u) => fetchAndParse(u)));
  const results: SeoAuditPageResult[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const r = settled[i];
    if (r.status !== 'fulfilled' || !r.value.fetchedHtml) {
      const reason = r.status === 'rejected'
        ? (r.reason?.message || 'unknown error')
        : (r.value.fetchError || 'fetch failed');
      functions.logger.warn(`Secondary page ${url} unfetchable: ${reason}`);
      results.push({ url, wordCount: 0, issues: [] });
      continue;
    }

    const p = r.value;
    const issues: SeoAuditCheckItem[] = [];

    if (!p.title) {
      issues.push({ id: `page_title_${url}`, category: 'technical', label: 'Missing title tag', status: 'fail', details: `${url} has no title tag`, priority: 'high' });
    } else if (p.titleLength > 60) {
      issues.push({ id: `page_title_long_${url}`, category: 'technical', label: 'Title too long', status: 'warning', details: `Title is ${p.titleLength} chars (recommended: under 60)`, priority: 'medium' });
    }

    if (!p.metaDescription) {
      issues.push({ id: `page_meta_${url}`, category: 'technical', label: 'Missing meta description', status: 'fail', details: `${url} has no meta description`, priority: 'high' });
    }

    if (p.h1s.length === 0) {
      issues.push({ id: `page_h1_${url}`, category: 'content', label: 'Missing H1', status: 'warning', details: `${url} has no H1 heading`, priority: 'medium' });
    }

    if (p.wordCount > 0 && p.wordCount < 300) {
      issues.push({ id: `page_thin_${url}`, category: 'content', label: 'Thin content', status: 'warning', details: `Only ${p.wordCount} words (recommended: 300+)`, priority: 'medium' });
    }

    results.push({
      url,
      title: p.title,
      metaDescription: p.metaDescription,
      h1: p.h1s[0],
      wordCount: p.wordCount,
      issues,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 4: Build the checklist (deterministic rules, no AI)
// ---------------------------------------------------------------------------

function buildChecklist(
  primary: PrimaryPageAnalysis,
  pageResults: SeoAuditPageResult[],
  structure: SiteStructure,
): SeoAuditCheckItem[] {
  const checks: SeoAuditCheckItem[] = [];

  // --- TECHNICAL ---

  // Title tag
  if (!primary.title) {
    checks.push({ id: 'title_missing', category: 'technical', label: 'Title tag', status: 'fail', details: 'No title tag found on the page', recommendation: 'Add a descriptive <title> tag under 60 characters that includes your primary keyword', priority: 'high' });
  } else if (primary.titleLength > 60) {
    checks.push({ id: 'title_long', category: 'technical', label: 'Title tag length', status: 'warning', details: `Title is ${primary.titleLength} characters (recommended: under 60)`, recommendation: 'Shorten your title to under 60 characters so it displays fully in search results', priority: 'medium' });
  } else if (primary.titleLength < 30) {
    checks.push({ id: 'title_short', category: 'technical', label: 'Title tag length', status: 'warning', details: `Title is only ${primary.titleLength} characters — too short to be descriptive`, recommendation: 'Expand your title to 30-60 characters with your primary keyword and a compelling description', priority: 'medium' });
  } else {
    checks.push({ id: 'title_ok', category: 'technical', label: 'Title tag', status: 'pass', details: `Title is ${primary.titleLength} characters: "${primary.title}"`, priority: 'low' });
  }

  // Meta description
  if (!primary.metaDescription) {
    checks.push({ id: 'meta_desc_missing', category: 'technical', label: 'Meta description', status: 'fail', details: 'No meta description found', recommendation: 'Add a meta description (70-160 characters) that summarizes the page and includes a call to action', priority: 'high' });
  } else if (primary.metaDescriptionLength > 160) {
    checks.push({ id: 'meta_desc_long', category: 'technical', label: 'Meta description length', status: 'warning', details: `Meta description is ${primary.metaDescriptionLength} characters (max: 160)`, recommendation: 'Trim your meta description to under 160 characters so it isn\'t truncated in search results', priority: 'medium' });
  } else if (primary.metaDescriptionLength < 70) {
    checks.push({ id: 'meta_desc_short', category: 'technical', label: 'Meta description length', status: 'warning', details: `Meta description is only ${primary.metaDescriptionLength} characters`, recommendation: 'Expand your meta description to 70-160 characters to fully utilize the search result snippet', priority: 'medium' });
  } else {
    checks.push({ id: 'meta_desc_ok', category: 'technical', label: 'Meta description', status: 'pass', details: `Meta description is ${primary.metaDescriptionLength} characters`, priority: 'low' });
  }

  // H1
  if (primary.h1s.length === 0) {
    checks.push({ id: 'h1_missing', category: 'technical', label: 'H1 heading', status: 'fail', details: 'No H1 heading found on the page', recommendation: 'Add exactly one H1 tag that clearly describes the page\'s main topic', priority: 'high' });
  } else if (primary.h1s.length > 1) {
    checks.push({ id: 'h1_multiple', category: 'technical', label: 'Multiple H1 headings', status: 'warning', details: `Found ${primary.h1s.length} H1 tags (should be exactly 1)`, recommendation: 'Use only one H1 per page. Change extra H1s to H2s', priority: 'medium' });
  } else {
    checks.push({ id: 'h1_ok', category: 'technical', label: 'H1 heading', status: 'pass', details: `H1: "${primary.h1s[0]}"`, priority: 'low' });
  }

  // Heading hierarchy
  if (primary.h2s.length === 0 && primary.wordCount > 300) {
    checks.push({ id: 'h2_missing', category: 'technical', label: 'Heading hierarchy', status: 'warning', details: 'No H2 headings found on a page with substantial content', recommendation: 'Break your content into sections using H2 and H3 headings to improve readability and SEO', priority: 'medium' });
  } else if (primary.h2s.length > 0) {
    checks.push({ id: 'headings_ok', category: 'technical', label: 'Heading hierarchy', status: 'pass', details: `Found ${primary.h2s.length} H2s and ${primary.h3s.length} H3s — good structure`, priority: 'low' });
  }

  // SSL
  if (!primary.isHttps) {
    checks.push({ id: 'ssl_missing', category: 'technical', label: 'HTTPS / SSL', status: 'fail', details: 'Page is not served over HTTPS', recommendation: 'Enable HTTPS. Google uses it as a ranking signal and browsers mark HTTP sites as "Not Secure"', priority: 'high' });
  } else {
    checks.push({ id: 'ssl_ok', category: 'technical', label: 'HTTPS / SSL', status: 'pass', details: 'Page is served over HTTPS', priority: 'low' });
  }

  // Viewport meta
  if (!primary.hasViewportMeta) {
    checks.push({ id: 'viewport_missing', category: 'technical', label: 'Mobile viewport', status: 'fail', details: 'No viewport meta tag found', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile compatibility', priority: 'high' });
  } else {
    checks.push({ id: 'viewport_ok', category: 'technical', label: 'Mobile viewport', status: 'pass', details: 'Viewport meta tag is set', priority: 'low' });
  }

  // Canonical (presence + correctness #3)
  if (!primary.hasCanonical) {
    checks.push({ id: 'canonical_missing', category: 'technical', label: 'Canonical URL', status: 'warning', details: 'No canonical tag found', recommendation: 'Add a <link rel="canonical"> tag to prevent duplicate content issues', priority: 'medium' });
  } else {
    const verdict = evaluateCanonical(primary.canonicalUrl, primary.pageUrl);
    if (verdict.ok) {
      checks.push({ id: 'canonical_ok', category: 'technical', label: 'Canonical URL', status: 'pass', details: `Self-referential canonical: ${primary.canonicalUrl}`, priority: 'low' });
    } else {
      checks.push({ id: 'canonical_mismatch', category: 'technical', label: 'Canonical URL', status: 'warning', details: verdict.detail, recommendation: 'Point the canonical at this page\'s own absolute URL unless you intentionally canonicalize elsewhere — a wrong canonical can de-index the page', priority: 'medium' });
    }
  }

  // HTTP status / redirect (#5)
  if (primary.httpStatus >= 200 && primary.httpStatus < 300) {
    if (primary.redirected) {
      checks.push({ id: 'http_redirect', category: 'technical', label: 'HTTP status', status: 'info', details: `Loads via redirect to ${primary.finalUrl} (final 200)`, recommendation: 'Link to the final URL directly to avoid redirect latency and consolidate ranking signals', priority: 'low' });
    } else {
      checks.push({ id: 'http_ok', category: 'technical', label: 'HTTP status', status: 'pass', details: 'Returns HTTP 200 OK directly', priority: 'low' });
    }
  } else if (primary.httpStatus > 0) {
    checks.push({ id: 'http_error', category: 'technical', label: 'HTTP status', status: 'fail', details: `Page returned HTTP ${primary.httpStatus}`, recommendation: 'Search engines won\'t index non-200 pages. Return a 200 status for indexable URLs', priority: 'high' });
  }

  // --- CONTENT ---

  // Word count
  if (primary.wordCount < 300) {
    checks.push({ id: 'content_thin', category: 'content', label: 'Content depth', status: 'warning', details: `Page has approximately ${primary.wordCount} words (recommended: 300+)`, recommendation: 'Add more substantive content. Pages with 300+ words tend to rank better for informational queries', priority: 'medium' });
  } else if (primary.wordCount >= 300) {
    checks.push({ id: 'content_ok', category: 'content', label: 'Content depth', status: 'pass', details: `Page has approximately ${primary.wordCount} words`, priority: 'low' });
  }

  // Blog existence
  const allPaths = [...primary.internalLinks, ...structure.sitemapUrls];
  const hasBlog = allPaths.some((link) => /\/blog/i.test(link));
  if (hasBlog) {
    checks.push({ id: 'blog_exists', category: 'content', label: 'Blog / content section', status: 'pass', details: 'Blog section detected on the site', priority: 'low' });
  } else {
    checks.push({ id: 'blog_missing', category: 'content', label: 'Blog / content section', status: 'warning', details: 'No blog or content section detected', recommendation: 'Consider adding a blog to target informational keywords and build topical authority', priority: 'medium' });
  }

  // About page
  const hasAbout = allPaths.some((link) => /\/about/i.test(link));
  if (hasAbout) {
    checks.push({ id: 'about_exists', category: 'content', label: 'About page', status: 'pass', details: 'About page found — supports E-E-A-T signals', priority: 'low' });
  } else {
    checks.push({ id: 'about_missing', category: 'content', label: 'About page', status: 'info', details: 'No about page detected', recommendation: 'An about page builds trust and supports Google\'s E-E-A-T (Experience, Expertise, Authoritativeness, Trust) signals', priority: 'low' });
  }

  // Internal linking
  if (primary.internalLinks.length < 3) {
    checks.push({ id: 'internal_links_few', category: 'content', label: 'Internal linking', status: 'warning', details: `Only ${primary.internalLinks.length} internal links found`, recommendation: 'Add more internal links to help users and search engines discover your content', priority: 'medium' });
  } else {
    checks.push({ id: 'internal_links_ok', category: 'content', label: 'Internal linking', status: 'pass', details: `${primary.internalLinks.length} internal links found`, priority: 'low' });
  }

  // Image alt text (#9)
  if (primary.images.total > 0) {
    if (primary.images.missingAlt > 0) {
      checks.push({ id: 'img_alt_missing', category: 'content', label: 'Image alt text', status: 'warning', details: `${primary.images.missingAlt} of ${primary.images.total} images missing alt text`, recommendation: 'Add descriptive alt attributes to images for accessibility and image search visibility', priority: 'medium' });
    } else {
      checks.push({ id: 'img_alt_ok', category: 'content', label: 'Image alt text', status: 'pass', details: `All ${primary.images.total} images have alt text`, priority: 'low' });
    }
  }

  // --- CRAWLABILITY ---

  // Sitemap
  if (!structure.sitemapExists) {
    checks.push({ id: 'sitemap_missing', category: 'crawlability', label: 'XML Sitemap', status: 'warning', details: 'No sitemap.xml found at the site root', recommendation: 'Add a sitemap.xml listing all important pages. Submit it to Google Search Console', priority: 'medium' });
  } else {
    checks.push({ id: 'sitemap_ok', category: 'crawlability', label: 'XML Sitemap', status: 'pass', details: `Sitemap found with ${structure.sitemapUrls.length} URLs`, priority: 'low' });
  }

  // Sitemap referenced in robots.txt (#1) + sitemap format/validity (#2)
  if (structure.sitemapExists) {
    if (structure.robotsTxt) {
      if (structure.sitemapReferencedInRobots) {
        checks.push({ id: 'sitemap_in_robots', category: 'crawlability', label: 'Sitemap in robots.txt', status: 'pass', details: 'Sitemap is referenced in robots.txt', priority: 'low' });
      } else {
        checks.push({ id: 'sitemap_not_in_robots', category: 'crawlability', label: 'Sitemap in robots.txt', status: 'warning', details: 'Sitemap exists but is not referenced in robots.txt', recommendation: 'Add a "Sitemap: https://…/sitemap.xml" line to robots.txt so crawlers discover it', priority: 'medium' });
      }
    }
    const fmtIssues: string[] = [];
    if (structure.sitemapContentType && !/xml/i.test(structure.sitemapContentType)) {
      fmtIssues.push(`served as "${structure.sitemapContentType}" (expected application/xml)`);
    }
    if (!structure.sitemapHasLastmod) fmtIssues.push('no <lastmod> dates');
    if (fmtIssues.length > 0) {
      checks.push({ id: 'sitemap_format', category: 'crawlability', label: 'Sitemap format', status: 'warning', details: fmtIssues.join('; '), recommendation: 'Serve sitemap.xml with an application/xml content-type and include <lastmod> dates to help crawl prioritization', priority: 'medium' });
    } else {
      checks.push({ id: 'sitemap_format_ok', category: 'crawlability', label: 'Sitemap format', status: 'pass', details: 'Valid XML, correct content-type, includes <lastmod>', priority: 'low' });
    }
  }

  // Robots.txt
  if (!structure.robotsTxt) {
    checks.push({ id: 'robots_missing', category: 'crawlability', label: 'robots.txt', status: 'info', details: 'No robots.txt file found', recommendation: 'Add a robots.txt file to guide search engine crawlers', priority: 'low' });
  } else if (structure.robotsBlocksImportant) {
    checks.push({ id: 'robots_blocking', category: 'crawlability', label: 'robots.txt blocking all', status: 'fail', details: 'robots.txt contains "Disallow: /" which blocks all crawling', recommendation: 'Remove the "Disallow: /" rule to allow search engines to crawl your site', priority: 'high' });
  } else {
    checks.push({ id: 'robots_ok', category: 'crawlability', label: 'robots.txt', status: 'pass', details: 'robots.txt is present and allows crawling', priority: 'low' });
  }

  // Noindex (meta tag)
  if (primary.hasRobotsMetaNoindex) {
    checks.push({ id: 'noindex', category: 'crawlability', label: 'Meta robots noindex', status: 'fail', details: 'Page has a noindex meta robots tag — it will not appear in search results', recommendation: 'Remove the noindex tag if you want this page to be indexed by search engines', priority: 'high' });
  }

  // Noindex (X-Robots-Tag HTTP header, #4)
  if (primary.hasXRobotsNoindex) {
    checks.push({ id: 'x_robots_noindex', category: 'crawlability', label: 'X-Robots-Tag noindex', status: 'fail', details: 'The page sends an X-Robots-Tag: noindex HTTP header — it will be excluded from search results', recommendation: 'Remove the noindex directive from the X-Robots-Tag response header', priority: 'high' });
  }

  // SPA detection — warning only when content is essentially empty (Wix/Squarespace
  // sites are partial SPAs but render meaningful HTML; don't false-alarm on those)
  if (primary.isSpaShell) {
    const isSevere = primary.wordCount < 20;
    checks.push({
      id: 'spa_shell',
      category: 'crawlability',
      label: 'JavaScript rendering dependency',
      status: isSevere ? 'warning' : 'info',
      details: isSevere
        ? `Page renders almost entirely via JavaScript (${primary.wordCount} words in static HTML)`
        : `Page relies on JavaScript to render some content (${primary.wordCount} words in static HTML)`,
      recommendation: 'Implement server-side rendering (SSR) or pre-rendering so search engines see ranking signals (title, meta, content) without executing JavaScript',
      priority: isSevere ? 'high' : 'low',
    });
  }

  // --- AI SEARCH READINESS ---

  // AI crawler access (#6)
  if (!structure.robotsTxt) {
    checks.push({ id: 'ai_crawlers_default', category: 'ai_readiness', label: 'AI crawler access', status: 'info', details: 'No robots.txt — AI crawlers are allowed by default', priority: 'low' });
  } else if (structure.aiCrawlerBlocks.length > 0) {
    checks.push({ id: 'ai_crawlers_blocked', category: 'ai_readiness', label: 'AI crawler access', status: 'warning', details: `robots.txt blocks: ${structure.aiCrawlerBlocks.join(', ')}`, recommendation: 'To be cited in ChatGPT, Perplexity, and Google AI answers, allow these crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) in robots.txt', priority: 'medium' });
  } else {
    checks.push({ id: 'ai_crawlers_ok', category: 'ai_readiness', label: 'AI crawler access', status: 'pass', details: 'AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) are allowed', priority: 'low' });
  }

  // llms.txt (#7)
  if (structure.llmsTxtExists) {
    checks.push({ id: 'llms_txt_ok', category: 'ai_readiness', label: 'llms.txt', status: 'pass', details: 'llms.txt found — a curated content index for AI answer engines', priority: 'low' });
  } else {
    checks.push({ id: 'llms_txt_missing', category: 'ai_readiness', label: 'llms.txt', status: 'info', details: 'No llms.txt found', recommendation: 'Add /llms.txt — an emerging standard that exposes your key content to LLM-based search', priority: 'low' });
  }

  // --- STRUCTURED DATA ---

  if (primary.jsonLdTypes.length === 0) {
    checks.push({ id: 'jsonld_missing', category: 'structured_data', label: 'JSON-LD structured data', status: 'warning', details: 'No JSON-LD structured data found', recommendation: 'Add structured data (JSON-LD) to help Google understand your content. Common types: Organization, Product, Article, FAQ, BreadcrumbList', priority: 'medium' });
  } else {
    checks.push({ id: 'jsonld_found', category: 'structured_data', label: 'JSON-LD structured data', status: 'pass', details: `Found types: ${primary.jsonLdTypes.join(', ')}`, priority: 'low' });
  }

  // Check for missing common types
  const hasOrg = primary.jsonLdTypes.some((t) => /organization/i.test(t));
  if (!hasOrg) {
    checks.push({ id: 'jsonld_no_org', category: 'structured_data', label: 'Organization schema', status: 'info', details: 'No Organization structured data found', recommendation: 'Add Organization schema with your business name, logo, and contact info for a Knowledge Panel', priority: 'low' });
  }

  // FAQ schema check (if page has Q&A content)
  const hasFaq = primary.jsonLdTypes.some((t) => /faq/i.test(t));
  if (!hasFaq && primary.h2s.some((h) => /\?/.test(h))) {
    checks.push({ id: 'jsonld_no_faq', category: 'structured_data', label: 'FAQ schema opportunity', status: 'info', details: 'Page has question-style headings but no FAQ structured data', recommendation: 'Add FAQ schema for your question-and-answer content to get rich results in Google', priority: 'low' });
  }

  // --- LOCAL / GEO ---

  // Check for local business signals in content summary
  const hasLocalSignals = /address|phone|location|city|store|office|visit us/i.test(primary.contentSummary);
  const hasLocalSchema = primary.jsonLdTypes.some((t) => /local.*business/i.test(t));

  if (hasLocalSignals && !hasLocalSchema) {
    checks.push({ id: 'local_schema_missing', category: 'local_geo', label: 'LocalBusiness schema', status: 'warning', details: 'Site appears to have a physical location but no LocalBusiness structured data', recommendation: 'Add LocalBusiness schema with your address, phone, and hours to improve local search visibility', priority: 'medium' });
  } else if (hasLocalSchema) {
    checks.push({ id: 'local_schema_ok', category: 'local_geo', label: 'LocalBusiness schema', status: 'pass', details: 'LocalBusiness structured data found', priority: 'low' });
  } else {
    checks.push({ id: 'local_na', category: 'local_geo', label: 'Local SEO', status: 'info', details: 'No local business signals detected — local SEO checks may not apply', priority: 'low' });
  }

  // --- SOCIAL / SHARING ---

  // Open Graph
  if (!primary.ogTags.title) {
    checks.push({ id: 'og_missing', category: 'social_sharing', label: 'Open Graph tags', status: 'warning', details: 'No Open Graph title tag found', recommendation: 'Add og:title, og:description, and og:image tags so your content looks good when shared on social media', priority: 'medium' });
  } else {
    const hasImage = !!primary.ogTags.image;
    checks.push({ id: 'og_ok', category: 'social_sharing', label: 'Open Graph tags', status: hasImage ? 'pass' : 'warning', details: hasImage ? 'Open Graph tags present with image' : 'Open Graph title/description set but og:image is missing', recommendation: hasImage ? undefined : 'Add an og:image tag for better social sharing appearance', priority: hasImage ? 'low' : 'medium' });
  }

  // Twitter Card
  if (!primary.twitterCard) {
    checks.push({ id: 'twitter_missing', category: 'social_sharing', label: 'Twitter Card tags', status: 'info', details: 'No Twitter Card meta tags found', recommendation: 'Add twitter:card, twitter:title, and twitter:description for better Twitter/X sharing', priority: 'low' });
  } else {
    checks.push({ id: 'twitter_ok', category: 'social_sharing', label: 'Twitter Card tags', status: 'pass', details: `Twitter Card type: ${primary.twitterCard}`, priority: 'low' });
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Step 5: AI-generated insights (keyword gaps + recommendations)
// ---------------------------------------------------------------------------

async function generateInsights(
  primary: PrimaryPageAnalysis,
  checks: SeoAuditCheckItem[],
  domain: string,
  structure: SiteStructure,
): Promise<{ keywordGaps: SeoAuditKeywordGap[]; recommendations: SeoAuditRecommendation[] }> {
  const failingChecks = checks.filter((c) => c.status === 'fail' || c.status === 'warning');
  const passingChecks = checks.filter((c) => c.status === 'pass');
  const failingSummary = failingChecks.map((c) => `- [${c.status}] ${c.label}: ${c.details}`).join('\n');
  const passingSummary = passingChecks.map((c) => `- ${c.label}: ${c.details}`).join('\n');

  // Discover what the site has across both shell links and the sitemap
  const allPaths = [
    ...primary.internalLinks,
    ...structure.sitemapUrls.map((u) => { try { return new URL(u).pathname; } catch { return u; } }),
  ];
  const hasBlog = allPaths.some((p) => /\/blog/i.test(p));
  const hasAbout = allPaths.some((p) => /\/about/i.test(p));
  const hasPricing = allPaths.some((p) => /\/pricing/i.test(p));
  // Match dedicated comparison pages (/vs/foo, /compare/foo, /foo-alternative)
  // AND blog-post-style comparison content (/blog/x-vs-y, /blog/x-alternative)
  const hasComparisonPages = allPaths.some((p) => /(?:\/|-)(vs|alternative|compare)(?:\/|-|$)/i.test(p));
  const hasFeaturePages = allPaths.some((p) => /\/(features?|tools?)\//i.test(p));
  const hasJsonLdTypes = primary.jsonLdTypes;

  const prompt = `You are an SEO expert. Based on the following website analysis, provide keyword gap opportunities and prioritized recommendations.

Website: ${domain}
Content summary: ${primary.contentSummary}
Current title: "${primary.title || 'none'}"
H1: "${primary.h1s[0] || 'none'}"
Word count: ${primary.wordCount}

What this site already has (do NOT recommend adding these):
- Has blog/content section: ${hasBlog}
- Has about page: ${hasAbout}
- Has pricing page: ${hasPricing}
- Has competitor comparison/alternative pages: ${hasComparisonPages}
- Has feature pages: ${hasFeaturePages}
- JSON-LD schema types present: ${hasJsonLdTypes.length ? hasJsonLdTypes.join(', ') : 'none'}
- Sitemap URL count: ${structure.sitemapUrls.length}

Checks already passing (do NOT recommend fixing these):
${passingSummary || 'none'}

Issues to address:
${failingSummary || 'No major issues found'}

Return ONLY valid JSON, no markdown:
{
  "keywordGaps": [
    {
      "keyword": "a topic this site should target but doesn't seem to",
      "opportunity": "why this keyword is valuable (1 sentence)",
      "difficulty": "easy|medium|hard",
      "sampleKeywords": ["specific long-tail phrase 1", "specific long-tail phrase 2", "phrase 3", "phrase 4", "phrase 5"]
    }
  ],
  "recommendations": [
    {
      "title": "Short action title",
      "description": "Specific, actionable recommendation (2-3 sentences)",
      "impact": "high|medium|low",
      "effort": "quick|moderate|significant",
      "category": "technical|content|local_geo|structured_data|crawlability|social_sharing"
    }
  ]
}

RULES:
- Return 5-10 keyword gaps based on what the site is about and what's missing
- Return 5-10 recommendations, sorted by impact (highest first)
- Be specific — reference the actual site content, not generic SEO advice
- For keyword gaps: focus on topics/keywords the site doesn't currently target but should. Stay strictly on-topic for the product described in the content summary — do NOT suggest seasonal, holiday, or off-topic keywords just because they have high search volume
- For each keyword gap, include 4-6 specific long-tail keyword phrases a user could actually search for in Google. Make them realistic search queries, not just topic names
- For recommendations: each should be directly actionable with a clear next step
- IMPORTANT: never recommend adding something the "What this site already has" list says is present, and never recommend fixing something in the "Checks already passing" list. Read those carefully before drafting recommendations.`;

  try {
    const text = await geminiGenerate(prompt);
    const parsed = await safeParseGeminiJSON(text, 'object');

    const keywordGaps: SeoAuditKeywordGap[] = (parsed.keywordGaps || [])
      .filter((g: any) => g.keyword && g.opportunity)
      .map((g: any) => ({
        keyword: g.keyword,
        opportunity: g.opportunity,
        difficulty: ['easy', 'medium', 'hard'].includes(g.difficulty) ? g.difficulty : 'medium',
        sampleKeywords: Array.isArray(g.sampleKeywords)
          ? g.sampleKeywords.filter((k: any) => typeof k === 'string' && k.trim()).slice(0, 6)
          : [],
      }));

    const recommendations: SeoAuditRecommendation[] = (parsed.recommendations || [])
      .filter((r: any) => r.title && r.description)
      .map((r: any) => ({
        title: r.title,
        description: r.description,
        impact: ['high', 'medium', 'low'].includes(r.impact) ? r.impact : 'medium',
        effort: ['quick', 'moderate', 'significant'].includes(r.effort) ? r.effort : 'moderate',
        category: r.category || 'content',
      }));

    return { keywordGaps, recommendations };
  } catch (err: any) {
    functions.logger.warn(`Insights generation failed: ${err.message}`);
    return { keywordGaps: [], recommendations: [] };
  }
}

// ---------------------------------------------------------------------------
// Canonical correctness (#3) + Performance checks (#8)
// ---------------------------------------------------------------------------

function evaluateCanonical(canonical: string | undefined, pageUrl: string): { ok: boolean; detail: string } {
  if (!canonical) return { ok: false, detail: 'Canonical tag is empty' };
  let canon: URL;
  try {
    canon = new URL(canonical, pageUrl);
  } catch {
    return { ok: false, detail: `Canonical is not a valid URL: "${canonical}"` };
  }
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return { ok: true, detail: '' };
  }
  const norm = (u: URL) => (u.origin + u.pathname.replace(/\/$/, '')).toLowerCase();
  if (canon.origin !== page.origin) {
    return { ok: false, detail: `Canonical points to a different domain (${canon.origin})` };
  }
  if (norm(canon) !== norm(page)) {
    return { ok: false, detail: `Canonical points to a different URL (${canon.pathname}) than this page (${page.pathname})` };
  }
  return { ok: true, detail: '' };
}

function buildPerformanceChecks(ps: PageSpeedResult | null): SeoAuditCheckItem[] {
  if (!ps || ps.score === null) return [];
  const checks: SeoAuditCheckItem[] = [];

  const scoreStatus: SeoAuditCheckItem['status'] = ps.score >= 90 ? 'pass' : ps.score >= 50 ? 'warning' : 'fail';
  checks.push({
    id: 'perf_score',
    category: 'performance',
    label: 'Performance score',
    status: scoreStatus,
    details: `Lighthouse performance score: ${ps.score}/100`,
    recommendation: scoreStatus === 'pass' ? undefined : 'Improve page speed — optimize/lazy-load images, defer non-critical JS, and reduce render-blocking CSS',
    priority: scoreStatus === 'fail' ? 'high' : scoreStatus === 'warning' ? 'medium' : 'low',
  });

  if (typeof ps.lcpMs === 'number') {
    const status: SeoAuditCheckItem['status'] = ps.lcpMs <= 2500 ? 'pass' : ps.lcpMs <= 4000 ? 'warning' : 'fail';
    checks.push({
      id: 'perf_lcp',
      category: 'performance',
      label: 'Largest Contentful Paint (LCP)',
      status,
      details: `LCP: ${ps.lcp ?? (ps.lcpMs / 1000).toFixed(1) + ' s'}`,
      recommendation: status === 'pass' ? undefined : 'Target LCP under 2.5s — optimize the hero/largest element, compress images, and reduce server + render time',
      priority: status === 'fail' ? 'high' : status === 'warning' ? 'medium' : 'low',
    });
  }

  if (typeof ps.clsValue === 'number') {
    const status: SeoAuditCheckItem['status'] = ps.clsValue <= 0.1 ? 'pass' : ps.clsValue <= 0.25 ? 'warning' : 'fail';
    checks.push({
      id: 'perf_cls',
      category: 'performance',
      label: 'Cumulative Layout Shift (CLS)',
      status,
      details: `CLS: ${ps.cls ?? ps.clsValue.toFixed(3)}`,
      recommendation: status === 'pass' ? undefined : 'Target CLS under 0.1 — set explicit width/height on images and reserve space for dynamic content',
      priority: status === 'fail' ? 'high' : status === 'warning' ? 'medium' : 'low',
    });
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// Warnings are graded at half credit — they signal a real issue but aren't a
// hard failure. Empty categories return score: null so the UI can render "N/A"
// instead of a misleading 100/100.
const WARNING_CREDIT = 0.5;

function calculateCategoryScores(
  checks: SeoAuditCheckItem[],
): Record<SeoAuditCategory, { score: number | null; passed: number; total: number }> {
  const categories: SeoAuditCategory[] = [
    'technical', 'content', 'local_geo', 'structured_data', 'crawlability', 'performance', 'ai_readiness', 'social_sharing',
  ];

  const scores = {} as Record<SeoAuditCategory, { score: number | null; passed: number; total: number }>;

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat && c.status !== 'info');
    const passed = catChecks.filter((c) => c.status === 'pass').length;
    const warnings = catChecks.filter((c) => c.status === 'warning').length;
    const total = catChecks.length;
    scores[cat] = {
      score: total > 0 ? Math.round(((passed + warnings * WARNING_CREDIT) / total) * 100) : null,
      passed,
      total,
    };
  }

  return scores;
}

function calculateOverallScore(
  categoryScores: Record<SeoAuditCategory, { score: number | null; passed: number; total: number }>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const catScore = categoryScores[cat as SeoAuditCategory];
    if (catScore && catScore.total > 0 && catScore.score !== null) {
      weightedSum += catScore.score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
