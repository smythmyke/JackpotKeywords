# JackpotKeywords — Integration & Platform Research

**Date:** 2026-05-21
**Source conversation:** MarkItUp portfolio session, after building MarkItUp's OAuth foundation + scaffolding the Canva app. User asked for cross-portfolio MCP/API opportunities.
**Scope:** Integration opportunities JackpotKeywords hasn't yet documented + recommendation on AEO API as the most promising research direction.

## 1. Existing plan recap (from JackpotKeywords/docs/AGENT_SDK.md)

Three workflow agents already planned:
1. **Full-Funnel Campaign Agent** — new $29/mo tier
2. **Saved-Search Watcher** — retention feature in $9.99 tier
3. **Niche Auditor** — $49 one-time / $149 SaaS

Plus a planned custom MCP tool wrapping the `/search` endpoint.

Portfolio-doc positioning: "Etsy-pivoted" — repositioned for Etsy sellers + AEO API whitespace is the best-case lever.

## 2. NEW opportunities not yet in the AGENT_SDK doc

Ranked by leverage-per-hour:

| # | Opportunity | Effort | Why it might work |
|---|---|---|---|
| 1 | **MCP server** (same playbook as MarkItUp) | 1–2 days | Marketers + SEOs using Claude Code / Cursor for content research. Listing on Smithery + official MCP Registry is free distribution. Wraps the keyword scoring endpoint as MCP tools. |
| 2 | **AEO (Answer Engine Optimization) API** — see Section 3 below | Research first, then 2–3 weeks build | First-mover position. AI-search-driven traffic is the growth story of 2026. Almost no competition in the API form. |
| 3 | **Etsy app (via Etsy API)** | 3–4 weeks | Direct integration with Etsy seller dashboards. "Optimize this listing for [search query]" workflow. Etsy has API access for sellers. |
| 4 | **Shopify app marketplace** | 3–4 weeks | Same product as Etsy app but for Shopify merchants. Larger TAM, more competition. |
| 5 | **Pinterest integration** | 2 weeks | Pinterest is where Etsy/Shopify sellers research trending products. "What's trending in [category]" → keyword cluster. |
| 6 | **Canva app** (using MarkItUp's now-built OAuth infrastructure) | 2 weeks | Canva users designing marketing materials would benefit from keyword-aware copy suggestions. Cross-pollinates with MarkItUp's Canva user base. |
| 7 | **WordPress / Webflow plugin** | 2 weeks each | "Suggest keyword-optimized H2s for this draft post" inline. WordPress reach is enormous but plugin-quality competition is fierce. |
| 8 | **Zapier / Make.com** | 1 week | "When new product listed on Etsy, run keyword analysis, email me the score." Long-tail automation. |

## 3. The AEO API — most novel position in any of the four projects' plans

**What it is:** Answer Engine Optimization. Where SEO targets Google's blue links, AEO targets the cited sources in AI-generated answers (Google AI Overviews, ChatGPT browsing, Perplexity, Claude with web).

**Why it's a real opportunity:**
- AI-search-driven traffic is the dominant 2026 trend in content marketing
- Existing tools (SEMrush, Ahrefs) have AEO features but only as part of $100–500/mo all-in-one suites
- **No major player has an AEO-only API** that developers can build on
- JackpotKeywords' existing keyword scoring engine + a few new metrics (citation-likelihood, answer-engine-presence) = a defensible product

**Target customer (different from current Etsy/keyword consumer):**
- Content marketing agencies
- In-house SEO teams at SaaS companies
- Developers building "content brief" tools, AI writing tools, programmatic SEO products
- VCs / strategy teams evaluating brand AEO performance

**Pricing model (different from current):**
- API tier: $99–499/mo for X queries
- Self-serve: $49/mo Pro tier for marketers who want AEO scoring in their JackpotKeywords dashboard
- Enterprise: custom — agencies running 50+ client accounts

**Why JackpotKeywords specifically can win this:**
- Existing keyword scoring infrastructure (no greenfield rebuild)
- Already positioned as "undercuts SEMrush/Ahrefs by 10x" — AEO API at $99/mo undercuts a $500/mo Ahrefs feature
- Bootstrap-friendly (no large enterprise sales required to start)
- First-mover advantage measured in months, not years — Ahrefs/SEMrush will ship something equivalent within 12 months

**Why this is "most promising research":**
- We don't have a plan for it yet (AGENT_SDK.md mentions it once in PORTFOLIO-OUTLOOK but no spec exists)
- The market sizing question is genuinely open: how big is the AEO-API TAM in 2026?
- The competitive landscape changes monthly — research has shelf life
- A 1–2 week research sprint could 10x clarify whether to invest 3 months of build time

## 4. Recommended sequence

**Phase 1 (next 2 weeks):**
1. **AEO API research sprint** (5 days) — competitor landscape, pricing benchmarks, dev interview pool, MVP scope
2. **MCP server** (1–2 days) — free distribution, same playbook as MarkItUp

**Phase 2 (after AEO research → if signal):**
3. AEO API MVP (3 weeks build + 2 weeks beta with 5 dev partners)

**Phase 3 (after AEO MVP traction):**
4. Etsy app + Pinterest integration for the consumer SEO side

## 5. 12 / 24-month conservative revenue projection (JackpotKeywords only)

Assumptions:
- MCP server shipped within 1 month
- Etsy positioning launched within 2 months
- AEO API research sprint completes within 1 month; if go-decision, MVP shipped within 6 months
- Solo-founder time ~25–30% of total portfolio bandwidth

| Horizon | My conservative MRR | Cut in half | Notes |
|---|---|---|---|
| 12 months | $1.5k–$3k | $0.75k–$1.5k | Etsy traction + early MCP/AEO. AEO API tier producing $500–1k MRR if shipped. |
| 24 months | $4k–$8k | $2k–$4k | AEO API matured + Etsy/Shopify app + Pinterest. AEO becomes the highest-leverage product if first-mover holds. |

**Wild card:** if the AEO API gets listicle pickup ("the best AEO tools of 2026") or VC-backed AEO startups adopt it as their underlying API, this projection could 5–10x. That's the upside scenario the portfolio doc references.

## Related

- [JackpotKeywords AGENT_SDK.md](./AGENT_SDK.md) — original workflow-agent plan
- [JackpotKeywords ROADMAP.md](../ROADMAP.md) — phase tracker
- [PORTFOLIO-OUTLOOK.md](./PORTFOLIO-OUTLOOK.md) — combined 3-project outlook
- [REVENUE-BENCHMARKS.md](./REVENUE-BENCHMARKS.md) — canonical revenue research
- `C:\Projects\MarkItUp\planning\CANVA-OAUTH-SPEC.md` — reusable OAuth infrastructure for Canva/Etsy/Shopify integrations
