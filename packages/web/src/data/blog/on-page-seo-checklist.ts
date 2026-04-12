import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'on-page-seo-checklist',
  title: 'On-Page SEO Checklist: 20 Factors That Actually Matter in 2026',
  description: 'The complete on-page SEO checklist for 2026. Every ranking factor that matters — title tags, headings, structured data, content depth — with how to check and fix each one.',
  date: '2026-04-12',
  author: 'JackpotKeywords Team',
  readTime: '10 min read',
  category: 'guide',
  keywords: ['on page seo checklist', 'on page seo checker', 'on page seo factors', 'on page seo optimization checklist', 'seo checklist 2026'],
  content: `
## Why On-Page SEO Still Matters

Google's algorithm uses over 200 ranking factors, but on-page SEO remains the foundation. It is the only part of SEO you have complete control over. Backlinks depend on other sites. Technical infrastructure depends on your hosting. But the content and markup on your pages? That is entirely in your hands.

The problem is that most on-page SEO advice is either outdated (keyword density is not a thing anymore) or too vague ("write quality content"). This checklist covers the 20 specific, measurable factors that affect rankings in 2026 — with how to check each one and what to do if it fails.

## The Checklist

### Title Tag

**What to check:** Every page should have a unique \`<title>\` tag that is 30-60 characters long and includes the page's primary keyword near the beginning.

**Why it matters:** The title tag is the most important on-page ranking signal. It is also what appears as the clickable headline in search results. If it is missing, too long (gets truncated), or does not match what the page is about, you lose both rankings and clicks.

**Common mistakes:**
- Same title on every page (Google sees them as duplicates)
- Title over 60 characters (gets cut off with "...")
- Title stuffed with keywords ("Best SEO Tool Free SEO Tool Cheap SEO Tool")
- Missing entirely (more common than you think, especially on SPA sites)

### Meta Description

**What to check:** Each page should have a unique meta description between 70-160 characters that summarizes the page and includes a call to action.

**Why it matters:** Meta descriptions do not directly affect rankings, but they significantly affect click-through rates. A compelling description can double your clicks from search results. Google also bolds matching query terms in the description, making relevant descriptions more eye-catching.

**Common mistakes:**
- Missing entirely (Google will auto-generate one, often poorly)
- Over 160 characters (truncated)
- Same description across all pages
- No call to action ("Learn more", "Try free", "See pricing")

### H1 Heading

**What to check:** Every page should have exactly one H1 tag that clearly describes the main topic.

**Why it matters:** The H1 tells search engines and users what the page is about. Multiple H1s create confusion about the page's primary topic. A missing H1 means the page has no declared main topic.

**How to fix:** If you have multiple H1s, demote the extras to H2. If you have no H1, add one at the top of your content that includes your primary keyword naturally.

### Heading Hierarchy (H2-H6)

**What to check:** Content should be organized with H2 subheadings that break the page into logical sections. H3s can subdivide H2 sections. Never skip levels (H2 directly to H4).

**Why it matters:** Headings help Google understand the structure and subtopics of your content. Pages with clear heading hierarchies rank better for related queries because Google can identify that the page covers multiple aspects of a topic.

### URL Structure

**What to check:** URLs should be short, descriptive, and include the primary keyword. Use hyphens to separate words. Avoid query parameters, numbers, and random strings.

**Good:** \`/blog/on-page-seo-checklist\`
**Bad:** \`/blog/post?id=47283&cat=seo\`

### Content Depth

**What to check:** Main content pages should have at least 300 words. For competitive topics, aim for 1,000-2,000 words. The average page 1 result has 1,447 words.

**Why it matters:** Thin content (under 300 words) rarely ranks for anything competitive. Google needs enough text to understand what the page is about and determine that it thoroughly covers the topic.

**Important:** Word count alone does not guarantee rankings. 500 words of focused, useful content outranks 2,000 words of filler. The goal is depth, not length.

### Internal Linking

**What to check:** Every page should link to at least 2-3 other relevant pages on your site. Important pages should have many internal links pointing to them.

**Why it matters:** Internal links do three things. They help search engines discover pages. They distribute ranking authority across your site. And they help users find related content, reducing bounce rates.

**Quick win:** Add 2-3 contextual links within each blog post to related pages or posts on your site.

### Image Alt Text

**What to check:** Every image should have descriptive alt text that explains what the image shows. Include relevant keywords naturally.

**Why it matters:** Alt text helps Google understand images (it cannot "see" them), improves accessibility for screen readers, and creates opportunities for image search traffic.

**Bad:** \`alt="image1"\` or \`alt=""\`
**Good:** \`alt="on-page SEO checklist showing title tag optimization"\`

### HTTPS / SSL

**What to check:** Your entire site should load over HTTPS. No mixed content warnings.

**Why it matters:** Google confirmed HTTPS as a ranking signal in 2014. Browsers mark HTTP sites as "Not Secure," which destroys user trust. There is no reason to not use HTTPS in 2026.

### Mobile Viewport

**What to check:** Your page should include \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\` and render correctly on mobile devices.

**Why it matters:** Google uses mobile-first indexing — it primarily looks at the mobile version of your page for ranking. If your page is not mobile-friendly, it will rank poorly regardless of how good the desktop version looks.

### Canonical Tags

**What to check:** Every page should have a \`<link rel="canonical">\` tag pointing to its preferred URL. This prevents duplicate content issues when the same page is accessible at multiple URLs.

**Why it matters:** Without canonical tags, Google might index multiple versions of the same page (with/without www, with/without trailing slash, with query parameters) and split your ranking authority between them.

### Open Graph Tags

**What to check:** Every page should have og:title, og:description, and og:image meta tags.

**Why it matters:** When someone shares your page on Facebook, LinkedIn, or other social platforms, Open Graph tags control how it looks. Without them, the platform guesses — usually poorly. A compelling share preview drives more click-throughs from social.

### Structured Data (JSON-LD)

**What to check:** Your site should include appropriate JSON-LD structured data. At minimum, Organization schema on your homepage. Article/BlogPosting on blog posts. Product on product pages. FAQ on pages with Q&A content.

**Why it matters:** Structured data does not directly boost rankings, but it enables rich results — stars, prices, FAQs, how-to steps — that dramatically increase click-through rates. A result with FAQ schema takes up 2-3x more space on the page.

### Page Load Indicators

**What to check:** Avoid large uncompressed images, excessive JavaScript, and render-blocking resources. Keep your HTML document under 100KB.

**Why it matters:** While Core Web Vitals are measured separately, basic page weight directly affects user experience. A page that takes 5+ seconds to load has a bounce rate 3x higher than one that loads in under 2 seconds.

### Robots Meta Tag

**What to check:** Make sure important pages do not have \`<meta name="robots" content="noindex">\` unless you intentionally want to hide them from search.

**Why it matters:** A single noindex tag silently removes a page from Google's index. This is sometimes added accidentally during development and never removed. We have seen entire blog sections set to noindex without the owner knowing.

### Sitemap.xml

**What to check:** Your site should have a sitemap.xml at the root that lists all important pages. Submit it to Google Search Console.

**Why it matters:** A sitemap helps Google discover pages it might not find through crawling alone. It is especially important for new sites, large sites, and sites with pages that have few internal links.

### Robots.txt

**What to check:** Your robots.txt file should exist and allow crawling of all important pages. It should reference your sitemap location.

**Why it matters:** An incorrectly configured robots.txt can accidentally block Google from crawling your entire site. Check that you are not blocking CSS or JavaScript files, which prevents Google from rendering your pages.

### JavaScript Rendering

**What to check:** View your page's source code (not the rendered version in your browser). Is the actual content visible in the HTML, or does it only appear after JavaScript executes?

**Why it matters:** Google can render JavaScript, but it is lower priority and can take days or weeks. If your content is only available via JavaScript (common with React, Vue, Angular SPAs), Google may see an empty page. Pre-rendering or server-side rendering solves this.

### Keyword Placement

**What to check:** Your primary keyword should appear in the title tag, H1, first paragraph, and at least one H2. Do not force it — it should read naturally.

**Why it matters:** Keyword placement confirms to Google what the page is about. But do not overdo it. Keyword stuffing (repeating the same phrase unnaturally) hurts more than it helps. Google's natural language processing is sophisticated enough to understand synonyms and related terms.

### Content Freshness

**What to check:** For topics that change over time (tools, best-of lists, industry guides), update your content at least annually. Include the year in the title if relevant.

**Why it matters:** Google prefers fresh content for queries where recency matters. A "best SEO tools" post from 2022 will lose rankings to a 2026 version, even if the older one is more comprehensive.

## How to Check All 20 Factors at Once

Going through this checklist manually for every page is tedious. That is why we built a tool that does it automatically.

[JackpotKeywords SEO Audit](https://jackpotkeywords.web.app/seo-audit) checks all 20+ factors across your site in 60 seconds. Enter your URL, and our AI analyzes your page plus up to 8 additional pages discovered from your sitemap. Every factor is scored pass/warning/fail with specific fix recommendations.

It is free for signed-in users. No credit card, no subscription, no trial period.

## After the Checklist: Finding the Right Keywords

Fixing on-page issues is step one. Step two is making sure you are targeting the right keywords. Even a perfectly optimized page will not rank if nobody searches for what it is about.

[JackpotKeywords keyword research](https://jackpotkeywords.web.app/) helps you find 1,000+ keyword opportunities with real Google Ads data — search volume, CPC, competition, and intent labels. Describe your product in plain English and get scored results in 30 seconds.
`,
};
