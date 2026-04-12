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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const BASE_URL = 'https://jackpotkeywords.web.app';

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

function extractMarkdownExcerpt(content, maxLen = 300) {
  if (!content) return '';
  // Get first ~300 chars of visible text from markdown
  return content
    .replace(/^#+\s+/gm, '')         // remove headings markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*]\s+/gm, '')        // list markers
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, maxLen);
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
  const contentMatch = src.match(/content:\s*`([\s\S]*?)`\s*[,}]/);
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
];

// Add blog posts as pages
for (const post of blogPosts) {
  const excerpt = extractMarkdownExcerpt(post.markdownContent);
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
    title: `${post.title} — JackpotKeywords Blog`,
    description: post.description,
    keywords: post.keywords,
    ogType: 'article',
    ogImage: post.heroImage ? `${BASE_URL}${post.heroImage}` : null,
    extraHead: `<script type="application/ld+json">${jsonLd}</script>`,
    body: `<article>
<h1>${post.title}</h1>
<p><time datetime="${post.date}">${post.date}</time> &middot; ${post.readTime} &middot; ${post.author}</p>
<p>${post.description}</p>
<div>${excerpt}</div>
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

  // Add canonical URL
  const canonicalTag = `<link rel="canonical" href="${BASE_URL}${page.path}" />`;
  html = html.replace('</head>', `${canonicalTag}\n</head>`);

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
