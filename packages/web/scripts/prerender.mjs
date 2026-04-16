/**
 * Post-build pre-rendering script.
 *
 * Generates static HTML files for SEO-critical routes so that Googlebot
 * sees page-specific <title>, <meta>, structured data, and visible text
 * without needing to execute JavaScript.
 *
 * Firebase Hosting serves static files before applying the SPA rewrite,
 * so dist/blog/what-is-keyword-research/index.html is served directly
 * for /blog/what-is-keyword-research.
 *
 * Usage: node scripts/prerender.mjs (run after `vite build`)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const BASE_URL = 'https://jackpotkeywords.web.app';

marked.setOptions({ gfm: true, breaks: false });

// Read the built index.html as our template
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// -------------------------------------------------------------------
// Blog posts — dynamically imported from the TS source data files.
// We parse them with a simple regex since we can't import TS directly.
// -------------------------------------------------------------------
const blogDir = path.resolve(__dirname, '../src/data/blog');
const blogIndex = fs.readFileSync(path.join(blogDir, 'index.ts'), 'utf-8');

// Extract imported filenames from the index
const importMatches = [...blogIndex.matchAll(/from\s+'\.\/([^']+)'/g)];
const blogFiles = importMatches
  .map((m) => m[1])
  .filter((f) => f !== 'index');

function extractField(content, field) {
  // Match field: 'value' or field: "value" or field: `value`
  // For single quotes, handle escaped quotes like \'
  const singleQuote = content.match(new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
  if (singleQuote) return singleQuote[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
  const doubleQuote = content.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (doubleQuote) return doubleQuote[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
  const backtick = content.match(new RegExp(`${field}:\\s*\`([^\`]*)\``));
  if (backtick) return backtick[1];
  return '';
}

function extractArray(content, field) {
  const match = content.match(new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
}

function renderMarkdown(content) {
  if (!content) return '';
  // Unescape template-literal escape sequences (\`, \\, \$) captured from the TS source.
  const normalized = content.replace(/\\([\s\S])/g, '$1');
  return marked.parse(normalized);
}

const blogPosts = blogFiles.map((filename) => {
  const filePath = path.join(blogDir, `${filename}.ts`);
  const src = fs.readFileSync(filePath, 'utf-8');

  const slug = extractField(src, 'slug');
  const title = extractField(src, 'title');
  const description = extractField(src, 'description');
  const date = extractField(src, 'date');
  const author = extractField(src, 'author');
  const readTime = extractField(src, 'readTime');
  const keywords = extractArray(src, 'keywords');
  const heroImage = extractField(src, 'heroImage');

  // Extract markdown content between backticks after content:
  // Must allow escaped backticks (\`) inside the template literal body.
  const contentMatch = src.match(/content:\s*`((?:[^`\\]|\\[\s\S])*)`\s*[,}]/);
  const markdownContent = contentMatch ? contentMatch[1] : '';

  return { slug, title, description, date, author, readTime, keywords, heroImage, markdownContent };
}).filter((p) => p.slug);

// -------------------------------------------------------------------
// Page definitions — all routes that should be pre-rendered
// -------------------------------------------------------------------
const pages = [
  // Home page — keep the existing rich content in index.html as-is
  // (it already has good crawler content)

  // Pricing
  {
    path: '/pricing',
    title: 'Pricing — JackpotKeywords',
    description: 'Keyword research from $1.99/search or $9.99/mo unlimited. 3 free searches, no credit card required. 14x cheaper than SEMrush.',
    body: `<h1>JackpotKeywords Pricing</h1>
<p>Keyword research from $1.99/search or $9.99/month unlimited. 3 free searches included, no credit card required.</p>
<h2>Free</h2><p>3 lifetime searches. No credit card required. Full keyword results with scores, intent labels, and clusters.</p>
<h2>Pay Per Search</h2><p>$1.99 per search or $4.99 for a 3-pack ($1.66 each). Credits never expire.</p>
<h2>Pro — $9.99/month</h2><p>Unlimited searches. Full features including relevance scoring, keyword saving, and CSV export. Cancel anytime.</p>
<p>14x cheaper than SEMrush ($140/mo). Real Google Ads data at a fraction of the cost.</p>`,
  },

  // Blog index
  {
    path: '/blog',
    title: 'Blog — JackpotKeywords',
    description: 'Keyword research guides, SEO tips, and marketing strategies for small businesses. Learn how to find goldmine keywords without expensive tools.',
    body: `<h1>JackpotKeywords Blog</h1>
<p>Keyword research guides, SEO tips, and marketing strategies for small businesses.</p>
<ul>${blogPosts.map((p) => `<li><a href="${BASE_URL}/blog/${p.slug}">${p.title}</a> — ${p.description}</li>`).join('\n')}</ul>`,
  },

  // Feature pages
  {
    path: '/features/competitor-keyword-research',
    title: 'Competitor Keyword Research Tool — JackpotKeywords',
    description: 'Discover your competitors\' keywords with AI-powered competitor keyword research. Find competitor brand terms, alternative searches, and gaps — free to try.',
    body: `<h1>Competitor Keyword Research Tool</h1>
<p>Discover your competitors' keywords with AI-powered competitor keyword research. Find competitor brand terms, alternative searches, and keyword gaps — free to try.</p>
<p>JackpotKeywords automatically identifies your competitors and generates keyword opportunities across brand terms, alternatives, and comparison queries.</p>`,
  },
  {
    path: '/features/long-tail-keyword-generator',
    title: 'Long Tail Keyword Generator — JackpotKeywords',
    description: 'Generate long tail keywords with real search volume and CPC data. Our free long tail keyword tool finds 4+ word phrases across 12 intent categories.',
    body: `<h1>Long Tail Keyword Generator</h1>
<p>Generate long tail keywords with real search volume and CPC data. Find 4+ word phrases across 12 intent categories — free to try.</p>
<p>Long tail keywords have lower competition and higher conversion rates. JackpotKeywords finds them automatically from your product description.</p>`,
  },
  {
    path: '/features/keyword-competition-checker',
    title: 'Keyword Competition Checker — JackpotKeywords',
    description: 'Check keyword competition levels with real Google Ads data. Our keyword competition tool shows LOW/MEDIUM/HIGH ratings, CPC ranges, and opportunity scores.',
    body: `<h1>Keyword Competition Checker</h1>
<p>Check keyword competition levels with real Google Ads data. See LOW/MEDIUM/HIGH ratings, CPC ranges, and opportunity scores for every keyword.</p>
<p>Find low-competition keywords with high search volume — the goldmine opportunities that expensive tools charge $100+/month to reveal.</p>`,
  },
  {
    path: '/features/seo-audit',
    title: 'Free SEO Audit Tool — JackpotKeywords',
    description: 'Audit your website\'s SEO in 60 seconds. Check title tags, meta descriptions, structured data, crawlability, and more. AI-powered analysis with specific fix recommendations.',
    body: `<h1>Free SEO Audit Tool</h1>
<p>Audit your website's SEO in 60 seconds. AI-powered analysis of 20+ ranking factors with specific recommendations sorted by impact.</p>
<h2>What We Check</h2>
<ul>
<li>Technical Foundation — title tags, meta descriptions, heading hierarchy, HTTPS, viewport, canonical URLs</li>
<li>Content Structure — content depth, blog presence, about page, internal linking</li>
<li>Structured Data — JSON-LD types, missing schema opportunities (FAQ, Product, Article)</li>
<li>Crawlability — robots.txt, sitemap.xml, noindex tags, JavaScript rendering</li>
<li>Local & Geo SEO — LocalBusiness schema, location signals</li>
<li>Social & Sharing — Open Graph tags, Twitter Card tags</li>
</ul>
<p><a href="https://jackpotkeywords.web.app/seo-audit">Start Your Free SEO Audit</a></p>`,
  },
  {
    path: '/seo-audit',
    title: 'SEO Audit — JackpotKeywords',
    description: 'Enter your website URL for a free AI-powered SEO audit. Check 20+ ranking factors in under 2 minutes.',
    body: `<h1>SEO Audit</h1>
<p>Enter your website URL and we'll analyze 20+ SEO factors across your site. Free audit with preview, full report from $1.99.</p>`,
  },

  // About
  {
    path: '/about',
    title: 'About — JackpotKeywords',
    description: 'JackpotKeywords delivers real Google Ads keyword data and instant SEO audits at a fraction of SEMrush or Ahrefs prices. Built for indie founders, small SEO teams, and agencies.',
    body: `<h1>About JackpotKeywords</h1>
<p>AI-powered keyword research and SEO audits, without the SEMrush price tag.</p>
<h2>Why we built this</h2>
<p>Keyword research and SEO audit tools used to cost $99-$140 a month — locking out indie founders, side-project builders, and small businesses who needed real data to make ranking decisions. JackpotKeywords delivers the same advertiser-grade metrics (search volume, CPC, competition, trend direction) for $9.99/mo Pro or $1.99 a search. The first three runs are free. No credit card, no trial sign-up, no asterisks.</p>
<p>The big SEO platforms are built for enterprise teams running thousands of keyword searches a month. Most of our users run two or three searches a week — and their old options were either pay $1,680 a year or guess at keywords with ChatGPT and hope for the best. We exist to be the third option: real data, fair pricing, no annual contract.</p>
<h2>What we do</h2>
<p>Keyword research: describe a product or paste a URL, and we generate 1,000+ scored keywords across 10 intent categories — direct, feature, problem, audience, competitor, alternative, use case, niche, benefit, and adjacent. Each keyword gets a Jackpot Score combining volume, CPC, competition, and trend direction so the goldmine opportunities surface to the top automatically.</p>
<p>SEO audits: point us at a domain and we crawl up to 10 pages, score across 6 categories (technical, content, crawlability, structured data, local/geo, social), and surface keyword gap opportunities with real volume and CPC data — all in under a minute. Every audit ships with a downloadable PDF so you can hand it to a client or developer.</p>
<h2>Where the data comes from</h2>
<p>Four data sources combine to produce every search: Google Ads Keyword Planner (real search volume, CPC ranges, competition), Google Autocomplete (real queries expanded a-z from each seed), Google Trends (rising/stable/falling overlay), and Gemini AI (seed generation, intent classification, opportunity scoring, clustering). No estimated metrics. No third-party scraping. Just direct integrations with Google's own data sources.</p>
<h2>Pricing in plain English</h2>
<p>Free: 3 lifetime runs (search or audit, your choice). Single search: $1.99. 3-pack: $4.99 ($1.66 each). Pro: $9.99/mo unlimited searches and audits. Cancel anytime — no annual lock-in, no upsell calls, no auto-upgrade tricks.</p>
<h2>Who it's for</h2>
<p>Indie founders launching a SaaS or product and needing keywords fast. Small SEO teams who want real data without enterprise contracts. Marketing agencies running site audits for clients. Content writers researching topics that actually have demand. PPC managers planning Google Ads campaigns who want CPC data before committing budget.</p>
<p>Built by smythmyke. Questions or feedback? Email <a href="mailto:smythmyke@gmail.com">smythmyke@gmail.com</a>.</p>`,
  },

  // Privacy
  {
    path: '/privacy',
    title: 'Privacy Policy — JackpotKeywords',
    description: 'How JackpotKeywords collects, uses, and protects your data. Account info via Google sign-in, payments via Stripe, anonymous identifiers for free-tier limits, no PII sale.',
    body: `<h1>Privacy Policy</h1>
<p>Last updated: April 2026. JackpotKeywords takes your privacy seriously. This policy explains what we collect, why we collect it, who we share it with, and what control you have over your data.</p>
<h2>Information we collect</h2>
<p>Account data: when you sign in with Google, we receive your email address, display name, and profile photo. Payment data: handled entirely by Stripe — we never see or store full card numbers. Search and audit history: stored against your account so you can revisit results. Anonymous identifier: a UUID stored in your browser's localStorage to count free searches before sign-in. IP address: collected for rate limiting and abuse protection. Attribution: UTM parameters and Google Ads gclid stored once on first sign-in to understand marketing channels.</p>
<h2>Why we collect it</h2>
<p>To authenticate your account, process payments, enforce free-tier limits, prevent abuse, improve the product, and understand which marketing channels bring valuable users.</p>
<h2>Third-party services we use</h2>
<p>Firebase / Google Cloud (auth, database, hosting), Stripe (payment processing), Google Ads Keyword Planner API (keyword data), Google Gemini API (AI processing), Google Analytics 4 + Google Ads conversion tracking, and Google Trends. Each operates under its own privacy policy.</p>
<h2>Cookies and storage</h2>
<p>jk_anon_id (localStorage), GA4 cookies, attribution storage (localStorage), Firebase auth cookies, and Stripe cookies during checkout. You can clear localStorage and cookies at any time.</p>
<h2>Data retention</h2>
<p>Account data is retained until you request deletion. Anonymous logs are retained ~30 days for abuse and analytics.</p>
<h2>Your rights</h2>
<p>You can request access to or deletion of your data by emailing <a href="mailto:smythmyke@gmail.com">smythmyke@gmail.com</a>. We don't sell your data to anyone.</p>
<h2>Changes to this policy</h2>
<p>If we make material changes we'll update the date at the top of this page and notify signed-in users via email.</p>`,
  },

  // Terms
  {
    path: '/terms',
    title: 'Terms of Service — JackpotKeywords',
    description: 'Terms of Service for JackpotKeywords — service description, account requirements, acceptable use, payment terms, refund policy, and limitations of liability.',
    body: `<h1>Terms of Service</h1>
<p>Last updated: April 2026. By using JackpotKeywords you agree to these Terms. If you don't agree, don't use the service.</p>
<h2>1. The Service</h2>
<p>JackpotKeywords provides AI-powered keyword research and SEO audits via the website at jackpotkeywords.web.app. The service includes search volume estimates, CPC ranges, competition data, intent classification, keyword scoring, and site audits across technical, content, crawlability, structured data, and social categories.</p>
<h2>2. Account requirements</h2>
<p>You must be 18 or older. Sign-in is via Google OAuth — you're responsible for keeping your account credentials secure. One account per person.</p>
<h2>3. Acceptable use</h2>
<p>Don't scrape, abuse rate limits, attempt to bypass paywalls, share account credentials, or use the service to violate any law. We may suspend accounts that abuse the service.</p>
<h2>4. Pricing and payment</h2>
<p>3 free lifetime runs are included with sign-up. Beyond that, $1.99 per single search, $4.99 for a 3-pack, or $9.99/month for Pro unlimited. Payments are processed by Stripe. Subscriptions auto-renew monthly until cancelled in your account.</p>
<h2>5. Refund policy</h2>
<p>Pro subscriptions can be cancelled any time and won't renew. Single-search and 3-pack credits are non-refundable once a search has been run. Email <a href="mailto:smythmyke@gmail.com">smythmyke@gmail.com</a> for billing disputes.</p>
<h2>6. Intellectual property</h2>
<p>You own your search inputs and the saved results in your account. We own the platform, code, and methodology. You can export your data at any time via CSV/Excel.</p>
<h2>7. No warranty</h2>
<p>Keyword data is sourced from Google Ads Keyword Planner and other public sources — accuracy is best-effort but not guaranteed. SEO audit recommendations are informational and don't guarantee ranking improvements.</p>
<h2>8. Limitation of liability</h2>
<p>JackpotKeywords is provided "as is." We're not liable for indirect, incidental, or consequential damages. Total liability for any claim is capped at the amount you paid us in the prior 12 months.</p>
<h2>9. Termination</h2>
<p>You can delete your account anytime. We may suspend or terminate accounts that violate these Terms.</p>
<h2>10. Changes to these Terms</h2>
<p>We may update these Terms; material changes will be posted with a new "Last updated" date and notified to signed-in users.</p>
<h2>11. Governing law</h2>
<p>These Terms are governed by the laws of the State of California, USA.</p>
<h2>12. Contact</h2>
<p>Questions? Email <a href="mailto:smythmyke@gmail.com">smythmyke@gmail.com</a>.</p>`,
  },
];

// Add blog posts as pages
for (const post of blogPosts) {
  const bodyHtml = renderMarkdown(post.markdownContent);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'JackpotKeywords' },
    url: `${BASE_URL}/blog/${post.slug}`,
    ...(post.heroImage ? { image: `${BASE_URL}${post.heroImage}` } : {}),
  });

  pages.push({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    ogType: 'article',
    ogImage: post.heroImage ? `${BASE_URL}${post.heroImage}` : null,
    extraHead: `<script type="application/ld+json">${jsonLd}</script>`,
    body: `<article>
<h1>${post.title}</h1>
<p><time datetime="${post.date}">${post.date}</time> &middot; ${post.readTime} &middot; ${post.author}</p>
<p>${post.description}</p>
${bodyHtml}
<p><a href="${BASE_URL}/blog">Read more on the JackpotKeywords Blog</a></p>
</article>`,
  });
}

// -------------------------------------------------------------------
// Generate HTML for each page
// -------------------------------------------------------------------
function generatePage(page) {
  let html = template;

  // Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(page.title)}</title>`,
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escapeAttr(page.description)}"`,
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${escapeAttr(page.title)}"`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${escapeAttr(page.description)}"`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${BASE_URL}${page.path}"`,
  );
  if (page.ogType) {
    html = html.replace(
      /<meta property="og:type" content="[^"]*"/,
      `<meta property="og:type" content="${page.ogType}"`,
    );
  }
  if (page.ogImage) {
    html = html.replace(
      /<meta property="og:image" content="[^"]*"/,
      `<meta property="og:image" content="${escapeAttr(page.ogImage)}"`,
    );
  }

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}"`,
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}"`,
  );

  // Set canonical URL — replace the shell's homepage canonical with the per-page one
  const canonicalTag = `<link rel="canonical" href="${BASE_URL}${page.path}" />`;
  if (/<link rel="canonical"[^>]*>/.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/, canonicalTag);
  } else {
    html = html.replace('</head>', `${canonicalTag}\n</head>`);
  }

  // Add keywords meta if present
  if (page.keywords && page.keywords.length) {
    const keywordsTag = `<meta name="keywords" content="${escapeAttr(page.keywords.join(', '))}" />`;
    html = html.replace('</head>', `${keywordsTag}\n</head>`);
  }

  // Add extra head content (e.g., JSON-LD for blog posts)
  if (page.extraHead) {
    html = html.replace('</head>', `${page.extraHead}\n</head>`);
  }

  // Replace the #root content with page-specific body
  // Match from <div id="root"> through closing </div> before </body>
  // Escape $ in body to prevent regex replacement interpretation
  const safeBody = page.body.replace(/\$/g, '$$$$');
  html = html.replace(
    /(<div id="root">)[\s\S]*?(<\/div>\s*<\/body>)/,
    `$1<main>${safeBody}</main>$2`,
  );

  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// -------------------------------------------------------------------
// Write files
// -------------------------------------------------------------------
let count = 0;
for (const page of pages) {
  const html = generatePage(page);
  const outDir = path.join(DIST, page.path);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  count++;
}

console.log(`Pre-rendered ${count} pages (${blogPosts.length} blog posts + ${count - blogPosts.length} static pages)`);
