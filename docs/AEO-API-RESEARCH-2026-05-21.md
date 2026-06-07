# AEO API — Research & Positioning Analysis

**Date:** 2026-05-21
**Author:** Research sprint conducted in MarkItUp session
**Status:** Research only — go/no-go decision pending
**TL;DR:** The market is **more crowded than initially assumed**. "First-mover" framing was wrong. The genuine opportunity is **the affordable developer-tier API niche** — every existing competitor either skips it or charges $1,000+/month for API access. JackpotKeywords could realistically own the $49–199/mo developer-API segment IF it ships within 3 months.

## What is AEO?

Answer Engine Optimization (AEO) — also called GEO (Generative Engine Optimization) — is the practice of optimizing content so it gets cited in AI-generated answers from ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini, Grok, Copilot, etc. Where SEO targets Google's blue links, AEO targets the source citations in AI responses.

## Market context (verified 2026-05-21)

- **ChatGPT: 900M+ weekly active users** (and ~2.5B prompts/day)
- **Google AI Overviews appear in 13–48% of search queries** (BrightEdge 2026 data, varying by query type)
- **AI-search-driven traffic is THE growth story of 2026** in content marketing — every major SEO platform has shipped or announced AEO features
- **61% of marketers** are actively investing in AEO/GEO tooling per recent industry surveys

The market is real, growing, and money is flowing in.

## Competitive landscape — saturated, not greenfield

I was wrong in earlier conversations to call this "first-mover." The space has 15+ named tools and multiple well-funded competitors.

### Tier 1: enterprise leaders (well-funded, established)

| Tool | Funding / status | Pricing | API access | Coverage |
|---|---|---|---|---|
| **Profound** | $58.5M raised (Khosla, Kleiner Perkins, Sequoia). G2 AEO category leader. Customers include MongoDB, Ramp, Figma, Docusign, Zapier | Starter $99/mo; enterprise $1,000+/mo | Yes, at $1,000+/mo | ChatGPT, Perplexity, Gemini, Claude, Grok, Copilot, AI Overviews |
| **Scrunch** | SOC 2 Type II certified. Enterprise focus | Starter $99/mo; enterprise custom | **Developer-grade data API** at enterprise tier | 10 AI platforms incl. DeepSeek + Mistral + Meta AI |
| **HubSpot AEO** | Part of HubSpot's $$$$ marketing stack | Bundled with HubSpot tiers | Via HubSpot ecosystem | Multi-engine |
| **Adobe LLM Optimizer** | Adobe-backed enterprise | Enterprise tier | API likely | Multi-engine |
| **Bluefish** | Enterprise-focused | Enterprise | Likely | Multi-engine |

### Tier 2: mid-market self-serve

| Tool | Pricing | API access |
|---|---|---|
| **Otterly AI** | $29/mo (Lite), $99+ Pro | Pro+ |
| **Peec AI** | $99/mo Starter | Premium tiers |
| **Visiblie** | ~$99/mo | Limited |
| **Promptwatch** | $99/mo Starter | Pro+ |
| **AI Rank Lab** | Mid-tier | Yes |

### Tier 3: long tail

Conductor, Airefs, Stackmatix, withGauge, Snezzi, omnibound, tryprofound, leapd, aeoengine — 10+ smaller tools, mostly content-marketing-agency-built.

### What this means

- The "tools" market is saturated. Building another AEO **tool** is not the play.
- **API access at affordable price points is the gap.** Every Tier 1 player gates API behind $1,000+/mo enterprise tiers. Tier 2 players mostly don't expose APIs at all.
- Indie developers + small agencies who want to build AEO-aware products (dashboards, content briefs, programmatic SEO tools) have nowhere to buy API access under $1,000/mo.

## The genuine opportunity — developer-tier API

**Position:** "The Stripe-priced AEO API for developers and small agencies."

**Target customer profile:**
- Indie hackers building AEO-aware content tools
- Marketing agencies running 10–50 client accounts (too small for Profound enterprise but need API for client dashboards)
- AI writing tools wanting to ship "your draft scores X for AEO citations" features
- Programmatic SEO sites scaling beyond manual content
- VC scouts evaluating brand AEO performance across portfolios

**Pricing model (proposed):**

| Tier | Monthly $ | Includes |
|---|---|---|
| **Hacker** | $49/mo | 1,000 prompt-checks across 3 AI engines |
| **Agency** | $199/mo | 5,000 prompt-checks across 6 AI engines, multi-client dashboards |
| **Scale** | $499/mo | 25,000 prompt-checks, 10 engines, webhooks, custom domains |
| **Enterprise** | custom | unlimited, SLAs, white-label |

Compare: Scrunch enterprise starts at $1,000/mo. Profound enterprise similar. We're 5–10x cheaper for developer use cases.

## Why JackpotKeywords specifically could win this niche

1. **Existing keyword-scoring infrastructure** — most of the data plumbing already exists. Adding AEO citation tracking is incremental, not greenfield.
2. **"Undercuts SEMrush/Ahrefs by 10x" brand DNA** — same positioning, different surface
3. **Bootstrap-compatible economics** — no enterprise sales required to hit $20k MRR
4. **Cross-pollination** — AEO data ENHANCES the keyword product (now keywords score on "AEO citation likelihood" too)
5. **No installed-base inertia** — competitors with installed customers will struggle to lower API prices without cannibalizing enterprise deals

## Why JackpotKeywords might LOSE this niche

1. **Ongoing API cost burden** — tracking 6+ AI engines means paying for ChatGPT API, Perplexity API, Gemini API, Claude API, etc. Per-query costs ~$0.01–0.05. At 5,000 checks/mo per Agency customer = $50–250 in COGS. Margins are tight at $199/mo.
2. **Anthropic + OpenAI could ship their own** "your citation rank" APIs and crush third-party trackers
3. **Profound or Scrunch could ship a "Developer" tier** at $99/mo and win the niche on brand
4. **Indie API customers churn faster** than enterprise — high acquisition cost vs LTV
5. **Solo-founder bandwidth** — JackpotKeywords already has consumer/Etsy positioning. Adding API tier is a strategic split.

## Realistic 12-month projection (AEO API only — pessimistic / realistic / optimistic)

| Scenario | Customers (mix) | MRR @ 12 mo |
|---|---|---|
| **Pessimistic** | 5 Hacker + 2 Agency | $645/mo |
| **Realistic** | 15 Hacker + 8 Agency + 2 Scale | $3,330/mo |
| **Optimistic** | 30 Hacker + 20 Agency + 6 Scale + 1 Enterprise | $9,460/mo + custom |

**Realistic gross margin at $3.3k MRR:** ~60% after API costs (~$1k/mo). Net $2k MRR contribution. Modest but real.

## Build effort

| Phase | Effort | Notes |
|---|---|---|
| **Phase 0** — competitor deep-dive + 10 dev interviews | 1 week | CRITICAL. Validate willingness-to-pay at $49–199/mo before building. |
| **Phase 1** — MVP API: 3 AI engines (ChatGPT, Perplexity, Gemini), basic scoring | 3 weeks | |
| **Phase 2** — Add Claude, AI Overviews, multi-language, webhooks | 2 weeks | |
| **Phase 3** — Self-serve signup, billing, dashboard, docs | 2 weeks | |
| **Phase 4** — Public launch (Product Hunt, indie dev newsletters, agency outreach) | 1 week | |
| **Total** | **~9 weeks** | Solo founder at ~50% allocation = ~4 months calendar time |

## Risks ranked

1. **Profound/Scrunch ship a Developer tier first** (~30% chance within 12 months). Mitigation: ship fast, lock in early customers with annual prepay.
2. **AI engines change rate-limit policies** that break tracking economics. Mitigation: diversify engines, build cost-efficient sampling strategies.
3. **Customer LTV is shorter than projected** (3–6 month churn for indie devs). Mitigation: annual plan discount, retention via integration depth.
4. **Indie devs balk at $49/mo** for what they perceive as a "scraping" tool. Mitigation: free 100-checks/mo tier for credibility, paid for scale.
5. **JackpotKeywords brand confusion** — consumer Etsy positioning vs developer API. Mitigation: separate sub-brand or sub-domain.

## Go/no-go decision criteria

**GO if:**
- 7+ of 10 dev interviews say "yes, I would pay $49–199/mo for this"
- Competitive scan confirms no Tier 1 player has shipped Developer-tier API within last 60 days
- Cost modeling confirms 50%+ gross margin at $199/mo with realistic usage

**NO-GO if:**
- Profound or Scrunch announces Developer tier during research week
- Dev interviews surface "we'd just use Profound's free trial repeatedly" or similar
- API cost modeling shows <30% gross margin

## Recommended next step

**Week 1: Customer discovery (5–10 days, no code).**
- 10 dev interviews: indie hackers, agency owners, programmatic SEO operators
- Specific question battery: "Have you considered Profound? Scrunch? Why didn't you buy? What price would tip you?"
- Output: a go/no-go decision document

If GO → 9-week build sprint. If NO-GO → JackpotKeywords stays consumer-focused on Etsy positioning.

## Sources

- [Contently — Top 10 AEO Tools 2026](https://contently.com/2026/04/29/top-10-tools-answer-engine-optimization-aeo-2026/)
- [First Page Sage — Top AEO Companies 2026](https://firstpagesage.com/seo-blog/the-top-answer-engine-optimization-aeo-companies/)
- [Scrunch — Best AEO/GEO Enterprise Platforms 2026](https://scrunch.com/blog/best-answer-engine-optimization-aeo-generative-engine-optimization-geo-enterprise-platforms-2026)
- [Withgauge — 10 Best AEO Tools 2026](https://www.withgauge.com/resources/10-best-answer-engine-optimization-aeo-tools-2025)
- [HubSpot AEO](https://www.hubspot.com/products/aeo)
- [Stackmatix — AI Citation Tracking Tools 2026](https://www.stackmatix.com/blog/ai-citation-tracking-tools)
- [Try Profound — 9 Best AEO Platforms](https://www.tryprofound.com/blog/9-best-answer-engine-optimization-platforms)
