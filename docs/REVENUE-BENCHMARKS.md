# JackpotKeywords — Revenue Benchmarks, API Candidacy & ToS Risk Audit

**Date:** 2026-05-19
**Status:** Research only — no implementation changes.
**Method:** Five parallel research agents covering (1) keyword API pricing, (2) SEO marketplace plugin earnings, (3) indie SEO SaaS revenue, (4) MCP/dev-tool SEO monetization, (5) **Google Ads ToS + data licensing risk audit**.
**Related:** [PROJECT_PLAN.md](../PROJECT_PLAN.md) · [PRODUCT-DESIGN.md](../PRODUCT-DESIGN.md) · [ROADMAP.md](../ROADMAP.md) · [AEO-MODULE-RESEARCH.md](../AEO-MODULE-RESEARCH.md)

---

## Headline

**The Google Ads API ToS is a Red-tier dealbreaker for reselling Keyword Planner data via a third-party developer API.** Google sued SerpAPI on Dec 19, 2025 for DMCA §1201 circumvention; industry analysts publicly name DataForSEO as next-in-line. The "expose what the consumer app already does" API plan cannot ship as-is.

**However:** Two of the three candidate API shapes survive cleanly, and one sits in genuine open-water whitespace (AEO citation tracking). The consumer web app itself is unaffected — KP data flowing from your developer token to your own app users is permitted; the problem is specific to the API-resale move.

## Locked-in decisions (2026-05-19)

1. **Consumer web app stays as-is.** Only Shape B (scoring) and Shape C (AEO scan) ship as public APIs. Shape A (full pipeline) is deferred / dropped.
2. **Etsy-vertical pivot is on the table.** Founder owns 220+ Etsy products; eRank ($2.6M ARR) proves the market.
3. **First AEO developer API.** No competitor in the AEO space (Profound, Athena, Otterly, Peec, Brandlight) exposes a PAYG developer endpoint.

---

## 1. ToS audit — the critical finding

### Google Ads API Terms — the killer clause

From the [Google Ads API Terms](https://developers.google.com/google-ads/api/docs/api-policy/terms):

> "You shall not **sell, redistribute, sublicense or otherwise disclose or transfer to any Third Party** all or any portion of AdWords API Report Data."

And from [API Policies](https://support.google.com/adspolicy/answer/6169371?hl=en):

> "You can't allow agencies, end-advertisers, or other third parties to use your Google Ads API token or your own API in a way that would allow those third parties to avoid applying for their own Google Ads API token or circumvent Google's RMF. This policy prevents you from allowing third-parties to access the Google Ads API in a programmatic or automated way using your API token instead of applying for their own API token."

**Plain reading:** Exposing `KeywordPlanIdeaService` results to third-party developers through your own API, using your own developer token, is exactly the pattern this policy bans. Standard-access application and RMF qualification do not cure a content-redistribution prohibition — it's tier-independent.

### Per-feature risk table

| # | Feature | Verdict | Safest path |
|---|---|---|---|
| a | Resell GKP volume/CPC/competition via JK API | 🔴 RED | Don't expose on public API. Keep inside consumer web app only. Or proxy through DataForSEO (themselves at risk). Or license clickstream panel. |
| b | Resell Google Autocomplete | 🔴/🟡 | Source via third-party scraper under their terms, or LLM-generated. |
| c | Resell Google Trends | 🔴 | pytrends archived (April 2025), no official commercial Trends product. Use Glimpse/Exploding Topics or drop. |
| d | Resell Google AI Overview citations | 🔴 | Both SerpAPI & DataForSEO under Google legal pressure. Wait or use Gemini Grounding directly. |
| e | Resell Gemini-grounded citations | 🟡 | Permitted commercially BUT mandatory `searchEntryPoint` HTML/CSS display must be enforced in API contract. |
| f | Resell OpenAI + Perplexity citations | 🟡 | Both allow commercial use; require visible citations to end users. Enforce in your downstream ToS. |

### Shutdown precedents (the structural lesson)

| Event | What happened |
|---|---|
| Reddit API repricing (Jun 2023) | Apollo, Rif, Sync killed within weeks at $0.24/1k calls |
| Twitter API (Feb 2023) | Free tier killed, $42k/mo minimums; third-party ecosystem wiped |
| Jumpshot (Jan 2020) | Largest clickstream provider closed in 24 hours after PR crisis |
| Keywords Everywhere (Oct 2019) | Free model destroyed by Google policy change overnight |
| SerpAPI (Dec 2025) | Active DMCA litigation by Google |

**Building a paid API on gated upstream data has historically ended in price hike, access termination, or lawsuit.** No independent paid reseller of Google data has run long-term without pivoting.

---

## 2. Per-shape unit economics & verdicts

### Shape A — Full pipeline API (`/v1/research`) — DEFERRED

| Metric | Value |
|---|---|
| Backend cost (own stack) | $0.02–$0.05/call |
| Backend cost (DataForSEO proxy) | $0.05–$0.20/call (their floor) |
| Defensible API price | $0.10–$0.25/call PAYG |
| ToS verdict | 🔴 RED — KP data resale forbidden |
| Margin via DataForSEO proxy | Compressed (~50% gross) |
| Competition | DataForSEO ($0.05/task), SerpAPI ($0.015/call), SEMrush API ($499+/mo), Ahrefs API |

**Verdict:** Structurally compromised. Working around the ToS via DataForSEO is expensive, kills margin, and inherits their litigation risk. **Drop from the public API plan.** Keep all KP-dependent features inside the consumer web app where they remain legal.

### Shape B — Scoring / enrichment API (`/v1/score`) — RECOMMENDED FIRST

| Metric | Value |
|---|---|
| Input | User-supplied keyword list (no Google data fetched) |
| Backend cost | ~$0.001–$0.005 per keyword (Gemini only) |
| Defensible price | $0.01–$0.05 per scored keyword PAYG, or $5 per 1,000 batch |
| ToS verdict | 🟢 GREEN — no Google data resold |
| Margin | 90–95% gross |
| Competition | None clean — Surfer ($29/article), Clearscope ($170/mo), MarketMuse ($25/brief) all score *documents*, not keywords |

**Verdict:** No clean competitor for AI keyword scoring of user-supplied lists. Lowest ToS exposure, lowest backend cost, fits naturally as MCP / n8n / Zapier tool ("score these 500 keywords"). **Launch first.**

### Shape C — AEO scan API (`/v1/aeo-scan`) — ASYMMETRIC BET

| Metric | Value |
|---|---|
| Input | Brand or product description |
| Surfaces captured | Gemini grounding + OpenAI Responses web_search + Perplexity Sonar + (deferred: Google AI Overview, ChatGPT, Copilot) |
| Backend cost | $0.30–$0.70 per 5-surface scan |
| Defensible price | $1.99–$4.99/scan PAYG |
| ToS verdict | 🟡 YELLOW — must enforce citation-display compliance in API contract |
| Margin | 70%+ gross |
| Competition | **No PAYG developer API exists** in this category |

**The AEO landscape — all SaaS, no API:**

| Tool | Entry plan | Notes |
|---|---|---|
| Profound | $99/mo Starter, $399 Growth | $1B valuation Feb 2026; $96M raise |
| AthenaHQ | $295/mo Starter | Enterprise + GEO specialist |
| Otterly.AI | $29/mo Lite (15 prompts) | G2 High Performer |
| Peec.AI | €89/mo | €650K ARR in 4mo; $21M Series A Nov 2025 |
| Scrunch | ~$250/mo | Hallucination detection |
| Goodie AI | ~$495/mo | Negotiated enterprise |
| Evertune | $3,000+/mo | 1M+ prompts/brand/month |
| Brandlight | $30M raise | Mid-market enterprise |

Otterly's $29/mo Lite buys 15 prompts — equivalent to about one $2 scan on your API. You can price 10× below SaaS minimums and still hit 70%+ gross margin.

---

## 3. Marketplace fit

| Surface | Verdict | 12-mo central | Notes |
|---|---|---|---|
| **Etsy ecosystem** | ★ Best fit | **$25k–$120k** | eRank ($2.6M ARR / 9yr / ~1M users), Marmalead, Alura, Sale Samurai prove niche supports multiple $1M+ tools. Founder's 220 Etsy products = unmatched credibility wedge. |
| Shopify App Store | Secondary | $8k–$40k | AEO-scan is novel for Shopify SEO. 15% rev share above $1M. 12–18mo ramp on reviews. |
| Chrome Web Store | Funnel only | $3k–$25k | Keywords Everywhere (1.6M users), Ubersuggest (300k DAU), MozBar/SEOquake own the slot. Treat as lead-gen for web app. |
| MCP + n8n + Zapier | Distribution only | $35k–$45k combined | $140k upside if AEO-MCP first-mover lands. Free integration, paid backend = universal pattern. |
| WordPress.org | Skip | n/a | Slot locked by Yoast (10M+ installs), RankMath (3M+), AIOSEO. |
| Amazon ecosystem | Skip | n/a | Helium 10 ($21M ARR), Jungle Scout ($100M+ ARR) — PE-funded incumbents. |
| Wix / Squarespace / Canva | Skip | n/a | No SEO-tool product fit. |
| Slack | Skip | n/a | Wrong context for keyword research. |

### Cross-marketplace conversion benchmarks

- Chrome ext: 0.5–2% of WAU (not installs)
- WordPress: 1–2% median, 5% top quartile
- Shopify: 5–15% (highest — merchants have CC on file)
- Etsy seller tools: 3–8%

---

## 4. Comparable API & SaaS pricing

### Keyword research / SEO data APIs (Shape A/B reference)

| Provider | Pricing | Notes |
|---|---|---|
| DataForSEO | $0.05/task (KP), $0.075/1k Trends, $0.01/AI keyword task | Most "developer-friendly"; explicit KP resale model but at growing legal risk |
| SerpAPI | $75/mo for 5,000 searches = $0.015/call | Active DMCA litigation by Google (Dec 2025) |
| SEMrush API | $499.95/mo Business + API add-on ~$200–500/mo | $700–1,000/mo realistic floor; no PAYG |
| Ahrefs API v3 | $129/mo entry + per-row overage $0.35–$1.00/1k | Enterprise-only for unlimited |
| Moz API | Bundled with Moz Pro $49–$299/mo | 25 free queries/mo, 10 rows each |
| Keywords Everywhere API | $0.0001/credit ($10 = 100k credits) | Cheapest commodity keyword data; data depth shallow |
| Bing Webmaster / MS Ads API | Free | Verified properties only |

### AEO citation tracking (Shape C reference)

All listed in §2 Shape C above — **all subscription, none expose a developer PAYG API.** This is the whitespace.

### Indie credit-pack benchmarks

| Product | Model | Notes |
|---|---|---|
| Mangools (KWFinder) | $29/mo entry | Bootstrapped to $2.6M ARR over 4yr |
| Keyword Tool | $89–$199/mo | $934k ARR after 11yr |
| Surfer SEO | $89/mo entry | 5-person team, 3yr to $7M ARR, $16M at acquisition '25 |

---

## 5. Indie SEO SaaS realism

### Direct shape-match comparables

| Product | Years live | Revenue | Wedge |
|---|---|---|---|
| Mangools | 10+ | ~$3M ARR | SEO content + affiliate |
| Surfer SEO | 9 | $15M ARR ('25), acquired by Positive Group | 5-person team, content-optimization niche |
| Frase.io | 9 | ~$750k revenue ('25) | Content + SEO + GEO |
| Keyword Tool | 11 | $934k ARR ('24) | Long-tail Autocomplete scraper |
| AnswerThePublic | 9 | $8.6M acquisition by NP Digital ('23) | Freemium virality |
| **eRank** (Etsy) | 9 | **$2.6M ARR ('25), ~1M users** | **Etsy niche** |
| Marmalead (Etsy) | 11 | Not public | Etsy niche |
| Helium 10 (Amazon) | 8 | $21M ARR / $62.7M val | Amazon niche, PE-acquired |
| Jungle Scout (Amazon) | 10 | $100M+ ARR est. | Amazon niche, $110M Summit round |
| Profound (AEO) | 2 | Pre-revenue → $96M Series C | Enterprise sales, VC-funded |

**Pattern:** Winners had a distribution wedge — niche vertical (eRank/Etsy, Helium 10/Amazon), founder audience (Patel/Ubersuggest), team scale (Surfer's 5 founders), or extension distribution (Keywords Everywhere/vidIQ).

### Indie SaaS base rates

| Outcome | % of products |
|---|---|
| Never break $500/mo | ~70% |
| $1k–$5k MRR | ~18% |
| $5k–$10k MRR | ~10–12% |
| $50k+ MRR | ~1–2% |

### Retention reality

| Category | Annual churn |
|---|---|
| Traditional SaaS | ~35% |
| **AI wrappers under $50/mo** | **65% in 90 days** |
| SEO-as-service agencies | 38% annual |
| Retainer-style agency clients | ~56 months avg lifetime |

The $0.99 credit pricing tier matches the **worst-retention** bucket in ChartMogul's AI-wrapper data (23% GRR, 32% NRR). To hit sticky MRR you need a $29+/mo agency tier with workflow lock-in.

---

## 6. MCP / n8n / Zapier monetization

### The universal pattern: free integration, paid backend

| Server / node | Monetization |
|---|---|
| DataForSEO MCP (official) | Free MCP, pay-as-you-go API |
| Ahrefs MCP | Bundled with Ahrefs plan ($129+/mo) |
| Semrush MCP | Bundled with Semrush One |
| DataForSEO n8n node | Free node, paid API |
| SE Ranking n8n | Free node, paid sub |
| Bright Data MCP | Paid backend ($0.75/1k) |
| Qwairy AEO MCP | €59/mo SaaS, MCP = feature |
| 6+ GSC MCP servers | Free OSS, BYO OAuth |

**There is no AEO-specific MCP server in the major registries yet.** Qwairy is the only AEO-adjacent MCP — and they're a €59/mo SaaS with MCP as a feature, not a developer API. **This is the first-mover slot for Shape C.**

### Realistic 12-month from MCP+n8n+Zapier combined

| Shape | Likely ARR | Best-case |
|---|---|---|
| Shape A (deferred) | $5–8k | $18–22k |
| Shape B | $12–16k | $45–55k |
| Shape C | $18–22k | $80–110k (first-mover AEO listicle pickup) |
| **Combined** | **$35–45k** | **$140–185k** |

---

## 7. Probability bands for JackpotKeywords

Lower than MarkItUp's because (a) category is more crowded, (b) $0.99 credit pricing is AI-wrapper-tier with worst retention, (c) ToS exposure adds platform risk, (d) LLM-search disruption: ChatGPT now drives ~17% of global digital queries with 95–96% less referral than Google search — structural headwind on the *Google* keyword market.

### Without the Etsy pivot (horizontal positioning)

| Target | Month 12 | Month 24 |
|---|---|---|
| $5k MRR | 15–20% | 30–35% |
| $10k MRR | 7–10% | 15–20% |
| $30k MRR | 2–3% | 5–8% |

Realistic outcome: $500–$3k MRR by month 12, $2k–$8k MRR by month 24.

### With the Etsy pivot (vertical positioning, locked in)

| Target | Month 12 | Month 24 |
|---|---|---|
| $5k MRR | 30–40% | 50–60% |
| $10k MRR | 15–20% | 30–40% |
| $30k MRR | 5–8% | 12–18% |

Realistic outcome: $2k–$10k MRR by month 12, $5k–$25k MRR by month 24, eRank-shaped ceiling (~$2.6M ARR) reachable over 4–6 years vs. 9 years for eRank itself (compressed by better AI tooling and existing 220-product credibility).

---

## 8. The Etsy pivot in plain English

### What it means
Reposition the product specifically for Etsy sellers first. Main landing page, marketing copy, templates, Chrome extension — all framed around "find keywords that get your Etsy listings seen." Broaden later only if/when Etsy revenue is paying rent.

### Why narrower beats wider when solo
- An Etsy seller searching "Etsy keyword tool" knows what she needs. A generic "keyword research tool" competes with SEMrush ($100/mo), Ahrefs ($129/mo), Ubersuggest, Moz, and free tools. Different game, much harder to win.
- The Etsy seller market already pays — eRank charges $5.99–$29.99/mo to ~1M users for $2.6M ARR. Marmalead, Alura, Sale Samurai all make real money. There's proven willingness to pay and still room.
- Etsy keyword research is its own beast — Etsy's search algorithm differs from Google's, listings need long-tail tags, seasonal patterns matter, competitor research is shop-vs-shop. A purpose-built tool wins on relevance even with fewer features.

### Why 220+ Etsy products are an unfair advantage
- Not pretending to understand sellers — you are one. Marketing writes itself.
- Public dogfooding: every product launch, tag change, seasonal push is a real case study.
- Natural entry to seller communities (FB groups, r/EtsySellers, Etsy Conference) that horizontal SaaS founders fake their way into.
- Trust is the hardest thing to manufacture; you have it for free in this niche.

### What changes practically
- Landing page becomes "Find keywords that get your Etsy listings seen" — not "AI keyword research for any business."
- 10 intent categories re-weighted: "competitor shop names" up, "B2B competitor brands" out.
- Chrome extension becomes Etsy-page-aware (right-click an Etsy listing → "find better tags").
- Pricing aligns with market — $9.99 Pro / $19.99 Agency sits squarely in eRank's range.
- Skip Shopify App Store, Slack, WordPress entirely — Etsy sellers don't live there.

### Strategic pattern
**Niche-first → broaden later** is a known winning play (Helium 10 started Amazon-only). **Horizontal-first → niche later** is the play that historically fails for solo founders without an audience.

The public API (Shapes B + C) can serve any vertical later. The consumer app should be Etsy-only at launch.

---

## 9. Comparison to MarkItUp

| Dimension | MarkItUp | JackpotKeywords |
|---|---|---|
| ToS risk on API | None | 🔴 RED on Shape A — drop |
| Category competition | Moderate (Canva-native AI gen growing) | Heavy (SEMrush, Ahrefs, DataForSEO, dozens of indie tools) |
| Unit cost per call | $0.13 sync / $0.07 batched | $0.001–$0.005 (Shape B), $0.30–$0.70 (Shape C) |
| Margin headroom | 60–80% | 90–95% (B), 70%+ (C) |
| Best API shape | Public `/v1/generate` is the product | Shape B (scoring) + Shape C (AEO) — not full pipeline |
| Distribution wedge | None obvious | **Etsy ecosystem (founder owns 220+ products)** |
| Whitespace play | None | **AEO MCP first-mover available** |
| 24-mo ARR base case | $50–$100k | $24–$96k (horizontal) / $60–$300k (Etsy-vertical) |
| 24-mo ARR stretch | $100–$300k | $300k+ (Etsy-vertical + AEO breakout) |

---

## 10. Recommended sequencing (decisions-locked)

1. **Consumer web app — finish + launch Etsy-first.** Re-frame all marketing copy, landing page, Chrome extension around Etsy sellers. Skip cross-marketplace listings at launch.
2. **Ship Shape B API** (`/v1/score`) — lowest ToS risk, lowest backend cost, no clean competitor. Distribute via MCP + n8n + Zapier (free integrations). Target $12–16k ARR by month 12.
3. **Ship Shape C API** (`/v1/aeo-scan`) — first-mover AEO developer API. Distribute via MCP first ("track me in ChatGPT" install velocity). Citation-display obligations enforced in customer ToS. Target $18–22k ARR likely, $80k+ if listicle pickup happens.
4. **Defer Shape A.** Keep KP-derived features inside the consumer web app only. Revisit if Google's enforcement landscape changes or if DataForSEO survives unscathed for ≥18 months.
5. **Marketplace track:** Chrome Web Store (funnel for web app) → Shopify App Store (secondary, only after Etsy traction). Skip WordPress, Amazon, Slack, Wix.

---

## 11. Bottom line

JackpotKeywords as a public API is **viable but with a fundamentally different shape than "expose the consumer pipeline."** The ToS audit kills Shape A. What's alive is AI-scoring-on-user-input (Shape B) + AEO-citation-tracker (Shape C). The Etsy-vertical pivot is the single biggest revenue lever sitting unused; without it, the realistic outcome is $30–$60k ARR at month 24. With it, $60–$300k ARR is in range, and an eRank-shaped multi-year trajectory becomes plausible.

**Compared to MarkItUp:** Lower ceiling, harder competition, but better margin and a clearer distribution wedge if you commit to the Etsy positioning.

---

## Sources

### ToS / risk audit (the most important sources)
- [Google Ads API Terms](https://developers.google.com/google-ads/api/docs/api-policy/terms) · [API Policies](https://support.google.com/adspolicy/answer/6169371) · [RMF docs](https://developers.google.com/google-ads/api/docs/rmf) · [Access Levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels)
- [Google announces SerpApi lawsuit](https://blog.google/technology/safety-security/serpapi-lawsuit/) · [Search Engine Land coverage](https://searchengineland.com/google-sues-serpapi-466541) · [IPWatchdog analysis](https://ipwatchdog.com/2025/12/26/google-sues-serpapi-parasitic-scraping-circumvention-protection-measures/)
- [Keywords Everywhere Oct 2019 history](https://keywordseverywhere.com/google-keyword-planner-alternative.html) · [SEM Post: Keyword Planner restriction](http://www.thesempost.com/google-adwords-begins-restricting-keyword-planner-data-non-advertisers/)
- [Gemini Grounding ToS](https://ai.google.dev/gemini-api/docs/google-search) · [OpenAI Service Terms](https://openai.com/policies/service-terms/) · [Perplexity API ToS](https://www.perplexity.ai/hub/legal/perplexity-api-terms-of-service)
- [pytrends archived April 2025](https://github.com/GeneralMills/pytrends) · [Apollo / Reddit shutdown](https://techcrunch.com/2023/06/08/popular-third-party-reddit-app-apollo-is-shutting-down-as-a-result-of-reddits-new-api-pricing/)

### API pricing
- [DataForSEO Pricing](https://dataforseo.com/pricing) · [Google Ads endpoint](https://dataforseo.com/pricing/keywords-data/google-ads)
- [SerpAPI Pricing](https://serpapi.com/pricing) · [SEMrush API 2026](https://thatmarketingbuddy.com/blog/semrush-api-pricing) · [Ahrefs API](https://ahrefs.com/api/pricing) · [Moz API 2026](https://www.toolsurf.com/moz-api-pricing-2025-plans-access-tiers-best-affordable-options-2026-plans-features-best-deals-compared/)
- [Keywords Everywhere Credits](https://keywordseverywhere.com/credits.html) · [Bing Webmaster](https://learn.microsoft.com/en-us/bingwebmaster/)

### AEO landscape (Shape C reference)
- [Profound G2 pricing](https://www.g2.com/products/profound/pricing) · [Profound Series C $96M](https://fortune.com/2026/02/24/exclusive-as-ai-threatens-search-profound-raises-96-million-to-help-brands-stay-visible/)
- [Otterly.AI](https://otterly.ai/blog/the-25-best-ai-seo-tools/) · [Surmado AI Visibility Tools 2026](https://www.surmado.com/blog/best-ai-visibility-tools-2026) · [Scrunch AEO/GEO Tools](https://scrunch.com/blog/best-answer-engine-optimization-aeo-generative-engine-optimization-geo-tools-2026)
- [Perplexity Sonar pricing](https://docs.perplexity.ai/docs/getting-started/pricing) · [Gemini Grounding pricing](https://ai.google.dev/gemini-api/docs/google-search)

### Marketplace earnings
- [Keywords Everywhere review](https://stuartkerrs.com/keyword-everywhere-review/) · [Detailed SEO Extension growth](https://www.linkedin.com/posts/glen-allsopp-63084025_the-detailed-seo-extension-for-chrome-firefox-activity-7089980506347360256-lK7V) · [Chrome Web Store monetization 2025](https://www.averagedevs.com/blog/monetize-chrome-extensions-2025)
- [Yoast/Newfold acquisition](https://www.newfold.com/newsroom/clearlake-and-siris-backed-newfold-digital-acquires-yoast) · [RankMath profile](https://www.zoominfo.com/c/rank-math/467334204) · [Freemius conversion](https://freemius.com/blog/increase-freemium-upgrades-wordpress-plugin-theme/)
- [Shopify revenue share](https://shopify.dev/docs/apps/launch/distribution/revenue-share) · [Shopify App Store stats](https://uptek.com/shopify-statistics/app-store/)
- [eRank](https://erank.com/) · [Marmalead review](https://goldcityventures.com/marmalead-review/) · [Best Etsy SEO Tools 2026](https://www.outfy.com/blog/etsy-seo-tools/)

### Indie SaaS comparables
- [Mangools / Latka](https://getlatka.com/companies/mangools) · [Mangools Failory interview](https://www.failory.com/interview/mangools)
- [Surfer SEO acquisition](https://theygotacquired.com/saas/surfer-seo-acquired-by-positive-group/) · [Surfer / Latka](https://getlatka.com/companies/surfer)
- [Frase Crunchbase](https://www.crunchbase.com/organization/frase) · [Keyword Tool / Latka](https://getlatka.com/companies/keyword-tool) · [AnswerThePublic / Foundation Inc](https://foundationinc.co/lab/npdigital-acquires-answerthepublic)
- [eRank / Latka](https://getlatka.com/companies/erank.com) · [Helium 10 / Latka](https://getlatka.com/companies/helium10.com) · [Keywords Everywhere / Latka](https://getlatka.com/companies/keywordseverywhere.com)
- [SaaSRanger Micro-SaaS Revenue Reality](https://saasranger.com/blog/micro-saas-revenue-reality-what-1000-founders-actually-earn/) · [ChartMogul AI churn wave](https://chartmogul.com/reports/saas-retention-the-ai-churn-wave/)

### MCP / dev-tool
- [DataForSEO MCP](https://dataforseo.com/model-context-protocol) · [Ahrefs MCP](https://ahrefs.com/mcp/) · [Semrush MCP GitHub](https://github.com/mrkooblu/semrush-mcp)
- [DataForSEO n8n node](https://dataforseo.com/update/dataforseo-community-node-for-n8n) · [SE Ranking n8n](https://github.com/seranking/n8n-nodes-seranking)
- [GSC MCP servers compared](https://www.ekamoira.com/blog/google-search-console-mcp-servers-compared-complete-2025-guide) · [SerpAPI on Sacra](https://sacra.com/c/serpapi/)
- [Algolia developer pricing](https://www.algolia.com/about/news/algolia-introduces-new-developer-friendly-build-pricing-plan-with-one-million-free-records-for-its-search-and-discovery-platform-slashes-api-pricing-by-50)
