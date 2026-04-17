import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'how-to-do-seo-audit',
  title: 'How to Do an SEO Audit (Without Paying $100/Month)',
  description: 'Step-by-step guide to auditing your website\'s SEO. Check technical issues, content gaps, and missed opportunities — without expensive tools.',
  date: '2026-04-12',
  author: 'JackpotKeywords Team',
  readTime: '9 min read',
  category: 'guide',
  keywords: ['how to do an seo audit', 'seo audit', 'seo audit guide', 'website seo audit', 'diy seo audit'],
  faq: [
    { question: 'How long does an SEO audit take?', answer: 'A basic SEO audit using an automated tool takes 1 to 2 minutes. A manual audit covering technical, content, and off-page factors takes 2 to 4 hours for a small site. Enterprise sites with thousands of pages may require days of analysis. JackpotKeywords free audit tool completes a comprehensive check in about 60 seconds.' },
    { question: 'How much does an SEO audit cost?', answer: 'Free options include JackpotKeywords SEO audit tool and Google Search Console. Professional SEO audits from agencies typically cost 500 to 5000 dollars. Monthly audit tools like SEMrush and Ahrefs cost 99 to 140 per month. For most small businesses, a free automated audit covers the essential checks.' },
    { question: 'What should an SEO audit include?', answer: 'A thorough audit checks technical foundation (title tags, meta descriptions, HTTPS, site speed), content structure (headings, depth, internal links), crawlability (sitemap, robots.txt), structured data (JSON-LD schema), and social sharing tags (Open Graph, Twitter Cards). The best audits also identify keyword opportunities based on the site content.' },
  ],
  content: `
> **Key Takeaway:** An SEO audit identifies technical issues, content gaps, and missed opportunities that silently cost your website traffic. You do not need expensive tools — a systematic check of 6 core areas using free tools catches the issues that matter most.

## What Is an SEO Audit?

An SEO audit is a systematic review of everything that affects how search engines see your website. It covers technical setup, content quality, site structure, and how your pages appear in search results.

Think of it like a health checkup for your website. You might feel fine (your site loads, it looks good), but under the surface there could be issues silently hurting your rankings — missing meta tags, blocked pages, thin content, broken structured data.

The goal of an audit is to find those issues, prioritize them by impact, and create a plan to fix them.

## When Should You Do an SEO Audit?

- **Before launching a new site** — Catch issues before Google indexes them
- **After a redesign or migration** — Redesigns frequently break SEO without anyone noticing
- **When traffic drops unexpectedly** — An audit can identify what changed
- **Quarterly as maintenance** — SEO issues accumulate over time
- **Before investing in ads or content** — Fix the foundation before building on it

## The Cost Problem

Professional SEO audit tools are expensive:

- **Ahrefs** — $99/month minimum, and you need a subscription just to run a site audit
- **SEMrush** — $140/month for their cheapest plan that includes site audit
- **Screaming Frog** — $259/year for the paid version (free version limited to 500 URLs)
- **Hiring an SEO consultant** — $500-$2,000 for a one-time audit

For large businesses managing dozens of sites, these costs make sense. For a small business, freelancer, or indie maker who needs to audit one site a few times a year, it is hard to justify.

That is why we built a [free SEO audit tool](https://jackpotkeywords.web.app/seo-audit) — but more on that later. First, let us walk through exactly what an audit should cover.

## Step 1: Check Technical Fundamentals

These are the basics that every page on your site needs. If these are wrong, nothing else matters.

### Title Tags

Open your browser, go to your website, and view the page source (right-click, "View Page Source"). Search for \`<title>\`. Every page should have a unique title under 60 characters.

**Red flags:**
- Same title on every page
- Title missing entirely
- Title over 60 characters
- Title that does not describe what the page is about

### Meta Descriptions

In the same page source, search for \`meta name="description"\`. Each page should have a unique description between 70-160 characters.

**Why it matters:** Google often uses your meta description as the snippet shown in search results. A missing description means Google picks its own text, which is usually not as compelling.

### HTTPS

Check your URL bar. If your site shows "Not Secure" or loads over http://, you need to enable SSL. Every major hosting provider offers free SSL certificates through Let's Encrypt.

### Mobile Responsiveness

Open your site on your phone. Does it look right? Can you read the text without zooming? Can you tap buttons without hitting the wrong one? Google uses mobile-first indexing, meaning the mobile version of your page is what it ranks.

## Step 2: Analyze Content Structure

### Check Word Count

Select all the body text on your most important pages (excluding navigation and footer) and check the word count. Pages under 300 words are considered thin content and rarely rank.

This does not mean every page needs 2,000 words. Your homepage might be 500 words and that is fine. But if your main product or service page has fewer than 300 words, it likely does not give Google enough information to rank it.

### Heading Structure

View page source and search for \`<h1\`, \`<h2\`, \`<h3\`. Every page should have exactly one H1 and multiple H2 subheadings that break content into sections.

**Common problem:** Many website builders and themes accidentally create multiple H1 tags (the logo, the page title, and a section heading all set as H1).

### Blog or Content Section

Does your site have a blog? A resource center? Any regularly updated content? Sites that publish relevant content build topical authority over time. If your competitors have blogs and you do not, they have a structural SEO advantage.

### Internal Links

Click through your site. Are pages connected to each other through contextual links within the content? Or is every page only reachable through the main navigation? Good internal linking helps search engines discover pages and understand how topics relate.

## Step 3: Verify Crawlability

### Check robots.txt

Go to yourdomain.com/robots.txt in your browser. You should see a file that looks something like:

\`\`\`
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
\`\`\`

If you see \`Disallow: /\`, that means your entire site is blocked from search engines. This is more common than you think — sometimes left over from a staging environment.

### Check Your Sitemap

Go to yourdomain.com/sitemap.xml. You should see an XML file listing all your important pages. If you get a 404, you do not have a sitemap, and Google has to discover your pages by crawling links — which is slower and less reliable.

### Check for Noindex Tags

View page source on your key pages and search for \`noindex\`. If you find \`<meta name="robots" content="noindex">\`, that page is being hidden from Google intentionally. Make sure this is only on pages you actually want hidden (login pages, admin pages, etc.).

### JavaScript Rendering Test

This one is crucial for modern websites. View your page source (not the inspected/rendered version — the actual raw HTML). Is your content visible in the source? Or do you only see an empty \`<div id="root">\` with a JavaScript file?

If your content only appears after JavaScript runs, you have a JavaScript rendering problem. Google can render JavaScript, but it is slow, unreliable, and lower priority. Pre-rendering or server-side rendering solves this.

## Step 4: Review Structured Data

### Check for JSON-LD

View page source and search for \`application/ld+json\`. If you find structured data blocks, check what types they use:

- **Organization** — Should be on your homepage
- **Article or BlogPosting** — Should be on every blog post
- **Product** — Should be on product pages
- **FAQ** — Should be on pages with Q&A content
- **BreadcrumbList** — Helps Google display navigation paths

### Find Missing Opportunities

If a page has FAQ-style content (questions with answers) but no FAQ schema, you are missing free rich results. Same for product pages without Product schema, or blog posts without Article schema.

## Step 5: Audit Social and Sharing

### Open Graph Tags

Share your homepage URL on Facebook or LinkedIn (or use a social sharing debugger). Does it show a title, description, and image? Or does it show a generic link with no preview?

Check page source for \`og:title\`, \`og:description\`, and \`og:image\`. All three should be present on every page.

### Twitter Card Tags

Same check for Twitter/X. Search for \`twitter:card\` in page source.

## Step 6: Identify Content Gaps

This is the strategic part of the audit. Beyond fixing technical issues, what topics should your site cover that it currently does not?

Look at your competitors. What pages do they have that you do not? What questions do your customers ask that you have not answered on your site?

Content gaps represent free traffic you are leaving on the table. Every topic with search demand that your site does not address is an opportunity.

## Putting It All Together: The Audit Report

After completing all six steps, organize your findings by priority:

1. **Critical** — Issues that prevent indexing or ranking (noindex on important pages, robots.txt blocking, no HTTPS, JavaScript rendering problems)
2. **High impact** — Issues that directly affect rankings (missing titles, thin content, no structured data)
3. **Medium impact** — Issues that affect click-through rates and user experience (meta descriptions, Open Graph tags, heading structure)
4. **Opportunities** — Content gaps and keyword opportunities to pursue

## The Easy Way: Automated SEO Audit

If manually checking all of this sounds like a lot of work, it is. That is why automated audit tools exist.

[JackpotKeywords SEO Audit](https://jackpotkeywords.web.app/seo-audit) checks all six categories automatically in about 60 seconds. Enter your URL, and our AI:

- Analyzes your page plus up to 8 additional pages from your sitemap
- Checks 20+ ranking factors across technical, content, structured data, crawlability, local SEO, and social
- Scores every factor as pass, warning, or fail
- Generates specific fix recommendations sorted by impact
- Identifies keyword gap opportunities your site is missing

It is free for signed-in users. No credit card required, no trial period, no bait-and-switch.

## After the Audit: Next Steps

Once you have your audit results, the next question is: what keywords should you target? Fixing technical issues is the foundation, but you also need to know which keywords to optimize for.

For the specific on-page factors to check and fix, see our [on-page SEO checklist](/blog/on-page-seo-checklist). To find the right keywords to optimize for after your audit, our [keyword research beginner\'s guide](/blog/what-is-keyword-research) covers the fundamentals, and our [best free keyword tools guide](/blog/best-free-keyword-research-tools) helps you choose the right tool for your budget.

![JackpotKeywords SEO Audit showing keyword gap opportunities with difficulty ratings](/blog/screenshot-audit-gaps.png)

## Frequently Asked Questions

### How long does an SEO audit take?

A basic audit using an automated tool like [JackpotKeywords SEO audit](https://jackpotkeywords.web.app/seo-audit) takes about 60 seconds. A manual audit covering technical, content, and off-page factors takes 2-4 hours for a small site (under 50 pages). Enterprise sites with thousands of pages may require days of analysis across multiple tools.

### How much does an SEO audit cost?

Free options include JackpotKeywords\' SEO audit tool and Google Search Console. Professional audits from agencies typically cost $500-$5,000 depending on site complexity. Monthly tools like SEMrush ($140/mo) and Ahrefs ($99/mo) include site audit features. For most small businesses, a free automated audit covers the essential checks.

### What should an SEO audit include?

A thorough audit checks six areas: technical foundation (title tags, meta descriptions, HTTPS, site speed), content structure (headings, depth, internal links), crawlability (sitemap, robots.txt), structured data (JSON-LD schema), local and geo SEO signals, and social sharing tags (Open Graph, Twitter Cards). The best audits also identify keyword opportunities based on the existing site content.

[JackpotKeywords keyword research](https://jackpotkeywords.web.app/) finds 1,000+ keyword opportunities with real Google Ads data. Describe your product and get scored, categorized keywords in under 30 seconds.
`,
};
