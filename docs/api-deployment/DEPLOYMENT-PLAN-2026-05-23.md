# JackpotKeywords API Deployment Plan

> **⚠️ SUPERSEDED 2026-05-25.** This plan was written assuming a B2B execution model with design partners and coordinated launches. After comparison with MarkItUp's solo-dev playbook, the plan was revised to drop partner-dependent work and adopt self-serve-from-day-one distribution. See **[`DEPLOYMENT-PLAN-2026-05-25.md`](./DEPLOYMENT-PLAN-2026-05-25.md)** for the active plan. This doc is preserved for history — its Phase 0/1A/1B execution details remain accurate as a record of what shipped.

**Date:** 2026-05-23
**Status:** Phase 0 + 0.5 shipped, Q1 locked, **Phase 1A shipped 2026-05-23** (signup + me + topup + aeo-scan endpoints live, pending end-to-end test). Phase 1B (recommend + key rotation + rate limits + docs page) is next session's first action.
**Related:** [`../REVENUE-BENCHMARKS.md`](../REVENUE-BENCHMARKS.md) (ToS audit) · [`../AEO-API-RESEARCH-2026-05-21.md`](../AEO-API-RESEARCH-2026-05-21.md) (Shape C) · [`../AGENT_SDK.md`](../AGENT_SDK.md) (MCP design)

## Headline

Combines two prior threads:

1. **Composite-scoring refactor** to move `jackpotScore` from a 90%-Google-data formula to a 40%-Google-data composite, reducing reversibility and ToS exposure (target: 🟡 defensible per `project_ads_tos_derived_score` memory).
2. **Multi-surface deployment** of three API endpoints (Shape A-prime, B, C) across MCP, automation tools, marketplaces, and end-user surfaces.

The score refactor gates Shape A-prime's public exposure. Shapes B and C ship cleanly without it.

---

## Execution model — Build / Launch / Expand (added 2026-05-23)

Solo-dev constraint reshapes the original 7-phase calendar. Each phase that ships separately creates support load (design partner emails, billing questions, docs gaps) that competes with the next phase's dev time. Iterative phase-by-phase shipping is wrong for solo. But "build everything then disseminate" risks 6 months in a vacuum on wrong assumptions.

Middle path: collapse the phases into 3 stages. Don't disseminate until Stage 2 ships a coherent multi-surface product on one day.

### Stage 1 — Build (private, no marketing, no support load)

Everything needed for a coherent public launch:

- **Phase 0** (scoring v2) — ships to consumer app silently, accumulates validation data
- **Phase 1** (REST API) — built but not publicly announced. ~2 design partners, not 10. Goal: debug billing/auth/rate limits with real traffic, not acquire customers
- **Phase 2** (MCP server) — built, submitted to registries with "private beta" flag
- **Phase 4 first piece: Google Sheets add-on** — built but not published

Why these four together: Sheets = non-developer demo. MCP = developer demo. REST = foundation that both wrap. Scoring v2 = consumer-app upgrade running in parallel. Together = one launchable thing.

**Skip in Stage 1:** Shape A-prime (waits for v2 validation), Shape C (defer to Stage 2 if it stretches timeline), n8n/Zapier/Make, Shopify/WP/HubSpot, vertical content tracks.

**Effort:** ~6–8 focused weeks.

### Stage 2 — Launch (single coordinated public push)

Everything announced together on one day so marketing energy compounds:

- Docs site goes live at `docs.jackpotkeywords.com`
- API signups open
- Sheets add-on published to Workspace Marketplace
- MCP server flipped to public in Anthropic/Cursor/Windsurf registries
- Launch post: "JackpotKeywords now has an API + Sheets + MCP"
- Submit to ProductHunt, Hacker News, Indie Hackers, relevant subreddits, MCP listicle authors
- First vertical content track (likely Etsy, leveraging founder's 220-product credibility) goes live the same day

**Effort:** ~1–2 weeks of launch work + handling initial support spikes.

### Stage 3 — Expand (parallel campaigns, not sequential phases)

Remaining surfaces ship as independent parallel projects, each when actually ready. **None gate each other.**

- Shape C (AEO scan) → second public endpoint, mini-launch
- n8n node → ship when calm (~2 days)
- Zapier app → submit, wait for 4–6 week review
- Shopify app → only if Sheets revenue justifies 12–18 month review ramp
- WordPress AEO plugin → only if AEO is strongest revenue driver
- Additional Phase 5 vertical content tracks → ongoing background marketing work
- Shape A-prime → only after v2 validation + reversibility test + legal opinion

Compound effect of multiple surfaces over 6–12 months drives the $35–185k ARR projection from saved REVENUE-BENCHMARKS.

### The reframe in one line

Original phase ordering implied sequential customer acquisition. Solo-dev reality requires **one launch, multiple channels** — Stage 2 is a single concentrated moment that uses channels to compound attention, not a series of separate moments.

---

## 1. Deployment surfaces — tiered fit assessment

### Tier 1 — Highest leverage, lowest build cost

| Surface | Endpoints exposed | Audience |
|---|---|---|
| **MCP server** (Claude Code, Claude.ai connectors, Cursor, Windsurf, OpenAI Apps SDK) | `score_keywords`, `aeo_scan`, `recommend_keywords` | Devs, agentic workflows, content ops |
| **n8n community node** | All three | SEO ops, indie SaaS, agencies |
| **Zapier app** | Triggers + actions | Marketers, founders |
| **Make.com module** | All three | Same as n8n |
| **Direct REST API** at `docs.jackpotkeywords.com` | All three | Developers |

### Tier 2 — Real end-user value, moderate build effort

| Surface | What ships |
|---|---|
| **Google Workspace add-on** (Sheets + Docs) | Sheets: score keyword columns. Docs: opportunity sidebar. |
| **Chrome extension** (Etsy-aware first) | Goldmine badges on Etsy/SERPs/Amazon; right-click → score |
| **Shopify App Store** | Embedded keyword research + AEO scan in admin |
| **WordPress plugin** (AEO-only) | "How is your post cited by ChatGPT/Perplexity?" — slot is whitespace |
| **HubSpot Marketplace** | Score HubSpot-imported keyword lists, AEO for hosted content |
| **Webflow Apps** | SEO/AEO panel for marketers on Webflow |
| **Notion integration** | Auto-score content calendar entries |

### Tier 3 — Reconsider before skipping

| Surface | Notes |
|---|---|
| **Slack bot** | Reconsidered — agencies benefit from `/jk-score` in #seo channels. Low build cost. |
| **Custom GPT in GPT Store** | Free distribution; weak monetization but strong discovery for "AI keyword research" |
| **Raycast extension** | Power-user lookup. Tiny audience, tiny build, good brand signal. |
| **Discord bot** | Indie-maker/creator communities (Indie Hackers, BuildSpace) |
| **VS Code / Cursor extension** | Devs writing landing-page copy. Niche but vocal. |

### Tier 4 — Skip

Canva, Figma (no surface), Amazon Seller Central (PE-funded incumbents), Wix/Squarespace (no fit), WordPress generic SEO (Yoast/RankMath own it — only viable as AEO-only).

---

## 2. Phased deployment

Each phase is shippable independently. Phase boundaries are decision points to stop, pivot, or continue.

### Phase 0 — Scoring foundation *(approved)*

**Goal:** Validate composite `jackpotScore_v2` against `v1` in the consumer app before exposing externally.

- One-file refactor to `packages/shared/src/types/scoring.ts`. Add `jackpotScore_v2` alongside `v1` — don't remove.
- Wire in three new inputs:
  - `aiRelevance` — already computed in `scoreRelevance`, currently unused in formula
  - `suggestDepthScore(suggestHits)` — count of how many of 6 platforms autocompleted this keyword (from `expandAutocomplete`)
  - `clusterFitScore(cluster)` — cluster size + intent purity + competitor presence
- Target weights:
  ```
  jackpotScore_v2 = volumeScore(volume)            × 0.15   // GKP, was 0.30
                  + cpcInverseScore(avgCpc)        × 0.15   // GKP, was 0.25
                  + competitionScore(comp)         × 0.10   // GKP, was 0.20
                  + (aiRelevance × 10)             × 0.25   // Gemini, NEW
                  + suggestDepthScore(suggestHits) × 0.15   // Multi-platform, NEW
                  + (50 + trendBonus(trend))       × 0.10   // Google Trends
                  + clusterFitScore(cluster)       × 0.10   // Derived, NEW
  ```
- Feature flag in `Admin.tsx` to toggle v1/v2 in consumer-app tables.
- Instrument: log v1 vs v2 score for every keyword. Run 3–6 months. Measure save/select rate as quality proxy.

**Risk:** Zero — consumer-app use of KP data is permitted by Google.
**Effort:** 1–2 days code; 3–6 months data accumulation.
**Exit criteria for Phase 1:** v2 matches or beats v1 on save rate AND GKP-derived signals are <50% of explanatory variance in the score.

### Phase 1 — Direct REST API (private alpha)

**Goal:** First paid endpoint. No marketplaces yet — 5–10 design-partner customers.

**Locked pricing (Q1, 2026-05-23):**
- `/v1/score`: **$0.005 per keyword scored** (batch up to 200)
- `/v1/recommend`: **$0.10 per call** (uses `jackpotScore_v2`)
- `/v1/aeo-scan`: **$1.00 per scan**
- PAYG-only for Stage 1. Customer signs up → $5 starter credit, no expiration. Top up via Stripe ($25 / $100 / $500 packs or custom amount ≥ $25).

Full pricing rationale + competitor comparison: see `PRICING-RESEARCH-2026-05-23.md`.

**Milestone 1A — SHIPPED 2026-05-23 (live in production):**
- `apiCustomers` + `apiKeys` + `apiCalls` + `apiTransactions` Firestore schema
- `POST /api/v1/signup` (email → API key + $5 credit, idempotent on email)
- `GET /api/v1/me` (balance + customer info)
- `POST /api/v1/topup` (Stripe checkout, fixed packs or custom amount)
- `POST /api/v1/aeo-scan` ($1.00 deducted, refunded on failure)
- API key auth middleware (`Authorization: Bearer jk_live_<key>`)
- Stripe webhook extended for `purpose=api_topup` metadata branch
- **Pending user verification:** run `node scripts/test-v1-api.mjs` to confirm end-to-end flow against prod

**Milestone 1B — pending (next session):**
- `POST /v1/recommend` endpoint (full pipeline, $0.10 deduction)
- Self-service key rotation: `POST /v1/keys` (new key), `GET /v1/keys` (list), `DELETE /v1/keys/:id` (revoke)
- Rate limiting per API key (e.g. 60 req/min default, configurable per customer)
- Public docs page at `/developers` (quick-start, endpoint refs, curl/Node/Python examples)

**Milestone 1C — pending (third session):**
- `POST /v1/score` (Shape A-prime) — stays internal until month-3 reversibility test passes
- Onboard first 1–2 design partners
- Per-customer monitoring (call volumes, error rates) in admin dashboard
- Email notifications for low balance (<$5 remaining)
- Customer ToS rider for `/v1/aeo-scan` citation-display obligations

**Reversibility test before opening `/v1/score`:** generate 500 (score, keyword) pairs, hand to a fresh agent, ask it to backsolve volume/CPC buckets. If accuracy >50%, GKP weight is still too high — return to Phase 0 and rebalance.

**Risk:** Shapes B+C clean. A-prime conditional on v2 validation.
**Effort:** 2–3 weeks total. ~3 hours in 1A (done). 1B est. 4–6 hours. 1C est. 4–6 hours.
**Exit criteria for Phase 2:** 5+ paying customers using the REST API directly.

### Phase 2 — First MCP server (developer leverage)

**Goal:** Free distribution to the agentic-dev audience.

- Single repo: `@jackpotkeywords/mcp-server`. Three tools wrapping the REST endpoints.
- Publish to Anthropic's MCP registry; submit to Cursor and Windsurf MCP catalogs.
- Bundle CLI: `npx @jackpotkeywords/mcp` for one-line install.
- "Install in Claude Code" one-liner on docs site.
- Free integration, paid backend (DataForSEO/Bright Data pattern).
- Per `AGENT_SDK.md`: expose `run_keyword_search` (consumer pipeline) as a tool — but only behind end-user account auth, not under your dev token. Same legal posture as them logging into the web app.

**Risk:** Same as Phase 1 (MCP server is a thin wrapper).
**Effort:** 3–5 days.
**Exit criteria for Phase 3:** Listed in 2+ AEO-MCP listicles OR 100+ installs.

### Phase 3 — Automation surfaces

**Goal:** Reach non-developer automation crowd. Lower conversion than direct API but huge install base.

- **n8n community node** (`n8n-nodes-jackpotkeywords`): publish to npm, request inclusion in n8n community registry. ~2 days.
- **Zapier app**: triggers ("new low AEO score for tracked brand"), actions ("score keyword list", "run AEO scan"). Submit for public listing. ~1 week + 4–6 weeks Zapier review.
- **Make.com module**: same shape. ~3 days.
- Pricing: free integration, backend consumed at REST API rates. Optional bundled credit packs for automation-only customers.

**Risk:** Same as Phase 1.
**Effort:** 2–3 weeks total.
**Exit criteria for Phase 4:** $5k MRR combined across automation surfaces.

### Phase 4 — End-user surfaces (consumer reach)

**Goal:** Wrap the API where non-technical users already work.

Order within phase (top-down by ROI):

1. **Chrome extension** (multi-platform aware: Etsy + Amazon + SERPs + Shopify). Already in roadmap. Calls `/v1/recommend` + `/v1/score`.
2. **Google Sheets add-on**. Shape B's killer demo: paste 500 keywords, get scores. 2-minute install. Free up to N keywords/month.
3. **Shopify app**. AEO scan + keyword research in admin. 12–18 month review ramp, 5–15% conversion when it lands.
4. **WordPress plugin** (AEO-only). Whitespace play vs Yoast/RankMath.
5. **Notion integration**. Content calendar entries auto-scored.
6. **HubSpot Marketplace**. After WordPress traction validates the buyer.

**Risk:** Same as Phase 1.
**Effort:** 6–10 weeks for all six (Chrome ext + Sheets are weeks 1–3).
**Exit criteria for Phase 5:** Cross-surface revenue ≥ $10k MRR; usage patterns visible by vertical.

### Phase 5 — Deep vertical content tracks (horizontal positioning)

**Goal:** Capture vertical-specific SEO traffic and conversion without repositioning the brand. Consumer app stays horizontal ("AI keyword research for your business").

**Rationale (revised 2026-05-23):** Earlier draft of this phase proposed full Etsy-vertical brand repositioning to chase eRank's $2.6M ARR ceiling. Reconsidered — that math assumed the consumer app was the only revenue surface. The 12+ deployment surfaces in Phases 1–4 are mostly horizontal (MCP, Sheets, Shopify, WP, HubSpot, etc.); brand-niching to Etsy hurts conversion on every non-Etsy surface and creates repositioning lock-in. Better path: keep brand horizontal, build deep *content* tracks per vertical.

**Per-vertical content track structure:**
- Landing page section ("JackpotKeywords for Etsy sellers", "for Shopify merchants", "for content sites", "for SaaS founders")
- Founder case study where applicable (220+ Etsy products = built-in dogfooding story for the Etsy track)
- Template gallery (Sheets templates with vertical-specific taxonomy)
- Blog content cluster (deep "Etsy SEO", "Shopify keyword research", etc.)
- Chrome extension surface awareness (auto-detect Etsy/Amazon/Shopify pages — already a feature, not a brand)

**Initial tracks (priority order):**
1. **Etsy** — founder credibility wedge, eRank's $2.6M ARR proves market depth
2. **Shopify** — overlaps Phase 4 Shopify app, ~5–15% marketplace conversion
3. **Content sites / SEO** — broadest horizontal SEO audience
4. **SaaS founders** — high LTV, agency-adjacent buyer

**Skip:** Full brand repositioning. eRank-aligned pricing rename. Etsy-only marketing channels.

**Effort:** Content + landing pages, not engineering. ~2 weeks per track to launch baseline.
**Exit criteria:** Each track converts ≥1% of its segment-specific traffic to paid; trackable via separate landing-page UTMs.

### Phase 6 — Agentic/AI-platform surfaces (long tail)

**Goal:** Capture agentic-research demand. Lower revenue per surface, free distribution, brand signal.

- **Custom GPT in GPT Store**. Free for users, recoup via free-tier conversion.
- **Slack bot** for agencies (`/jk-score`, `/jk-aeo`). Free public app or paid private.
- **Raycast extension**, **Discord bot**, **VS Code extension** — opportunistic, only if community contributors offer.

**Effort:** 1–2 weeks per surface, very parallelizable.

---

## Cross-cutting non-negotiables

1. **One API, many surfaces.** Every deployment in Phases 2–6 calls the same three REST endpoints from Phase 1. Solo-founder sustainability requires this.

2. **No raw GKP fields cross the API boundary, ever.** `/v1/recommend` returns `{keyword, jackpotScore_v2, tier}` only. Volume/CPC/competition stay inside the consumer app.

3. **Citation-display ToS rider** for `/v1/aeo-scan` consumers — copy-paste-able clause in customer terms requiring them to render Gemini's `searchEntryPoint` HTML.

4. **Phase 0 reversibility test gates Phase 1's `/v1/recommend`.** If the v2 score remains backsolvable, ship Shapes B+C and defer A-prime, exactly as the original locked plan said. The refactor doesn't automatically rescue Shape A — it has to be empirically verified.

5. **Legal opinion before `/v1/recommend` goes public.** ~$3–5k spend with a developer-platform-experienced attorney (not generic IP counsel).

6. **Brand stays horizontal.** No vertical-specific brand repositioning at any phase. Vertical leverage happens via content tracks (Phase 5), founder case studies, template galleries, and surface-aware features — never via landing-page hero or product naming. Repositioning to a vertical is asymmetric: easy to do, hard to undo, and hurts conversion on every other surface in the meantime.

---

## Confirmed decisions (2026-05-23)

- **Phase 0 approved.** 1–2 day refactor before any external API work.
- **REST-first ordering** (Phase 1 → Phase 2). MCP wraps REST, simpler debugging surface, more standard. Alternative (MCP-first against private REST) deferred.
- **Horizontal brand, vertical content** (resolves earlier Etsy-commitment question). Consumer app stays "AI keyword research for your business." Etsy + other verticals get deep content tracks, founder case studies, and template galleries — but never brand repositioning. Rationale: deployment plan's 12+ surfaces are mostly horizontal; brand-niching one surface hurts conversion on all the others.
- **Build / Launch / Expand execution model** (resolves solo-dev tempo constraint). See section above. Stage 1 contents locked: scoring v2 + REST API (private) + MCP server (private beta) + Google Sheets add-on. Stage 2 is one coordinated public launch with all four going live the same day plus first vertical content track. Stage 3 is opportunistic parallel surfaces.
- **No public marketing during Stage 1.** Discipline that prevents support load from killing dev velocity. Design partners capped at ~2 (purpose: debug billing/auth/rate limits, not acquire customers). No ProductHunt, no Twitter launch threads, no "we built an API" posts until Stage 2 ships.

## Open questions

### Q1 — API surface naming and pricing tier — RESOLVED 2026-05-23

- **Endpoint paths: LOCKED — utility naming.** `/v1/score`, `/v1/recommend`, `/v1/aeo-scan`. Rejected: brand-forward (`/v1/jackpot`) and generic (`/v1/research`).
- **Pricing model: LOCKED — PAYG-only for Stage 1.** Reserved + overage hybrid layered in once usage data from first 5–10 design partners reveals call distributions.
- **Per-call prices: LOCKED:**
  - `/v1/score`: **$0.005 per keyword scored** (batch up to 200 = $0.10–$1.00 per call)
  - `/v1/recommend`: **$0.10 per call**
  - `/v1/aeo-scan`: **$1.00 per scan**
- **Free tier: LOCKED — $5 signup credit, no expiration, no card required.** Matches OpenAI/Anthropic norm; more generous on expiration. Translates to ~1,000 keyword scores OR 50 recommends OR 5 aeo-scans.

Margin: 92%–99.9% across all three endpoints. We undercut every competitor by 1.9x (Otterly) to 10x (Profound, SemRush). Full competitive analysis and reasoning in `PRICING-RESEARCH-2026-05-23.md`.

---

## Next concrete deliverable

`SCORING-V2-DESIGN.md` in this folder — refactor sketch for `scoring.ts` covering:
- The `suggestDepthScore` and `clusterFitScore` formulas
- How `aiRelevance` plumbs from `scoreRelevance` into the score (timing — relevance is async after main pipeline)
- The feature-flag mechanism for v1/v2 toggle
- The reversibility test methodology

Written when Phase 0 work begins.

---

## Stage 1 build sequence (locked 2026-05-23)

Within Stage 1, build order is forced by dependencies:

| Order | What | Why | Effort |
|---|---|---|---|
| 1 | **Phase 0 — scoring v2** | Independent, no platform dependency, runs in consumer app immediately. Starts the 3–6 month validation clock so it's not the long pole later. | 1–2 days |
| 2 | **REST API** (`api.jackpotkeywords.com`) | Foundation. Both MCP and Sheets wrap it — they can't be built before it exists. | ~2 weeks |
| 3 | **MCP server** | Fastest wrapper. JSON-RPC over the REST endpoints. Distributes to Anthropic registry, Cursor, Windsurf catalogs. | 3–5 days |
| 4 | **Google Sheets add-on** | Slower wrapper (Apps Script + UI + Google review queue). Conversion surface for non-developers. | 1–2 weeks |

## Stage 2 launch-day attention priority

All four ship publicly the same day, but marketing focus is sequenced:

1. **MCP first** — AEO-MCP whitespace per saved research, devs amplify via Twitter/HN/Substack fastest, listicle pickup is cheapest distribution, MCP installs convert to PAYG API customers more reliably than Sheets installs do
2. **Sheets second** — conversion engine for non-developers, lands the same day so SEO traffic and vertical content tracks have something to point at
3. **REST API in the background** — proof-of-seriousness anchor; cited in technical reviews even when most actual usage flows through MCP and Sheets

---

## Resume-here checkpoint — session ending 2026-05-23 (Phase 1A)

**Done this session (chronological):**
- Phase 0 — scoring v2 shipped (composite GKP 25% + aiRelevance 30% + suggestDepth 20% + clusterFit 15% + trend 10%). v1 + v2 written side-by-side on every search. See `SCORING-V2-DESIGN.md`.
- Phase 0.5 — admin v1/v2 UI toggle wired in `packages/web/src/pages/Admin.tsx` + Results.tsx normalizer that swaps `kw.jackpotScore = kw.jackpotScore_v2` when toggle is on.
- Phase 0 validation tested (BulkListingPro keyword export) — v2 correctly promoted real-demand "ebay bulk listing tool" (720 vol, real CPC) from rank 11 to rank 1, score 72→88. Real competitors (list perfectly, inkfrog, crosslist) all surfaced. **No weight retuning needed.**
- Q1 resolved — utility endpoint naming + PAYG-only + per-call prices ($0.005/kw, $0.10/recommend, $1.00/aeo-scan) + $5 signup credit (no expiration). See `PRICING-RESEARCH-2026-05-23.md`.
- Phase 1A shipped — `/api/v1/{signup, me, topup, aeo-scan}` live in production with API key auth, $5 signup credit, Stripe top-up flow. No Stripe dashboard setup was needed (inline `price_data` like existing credits flow).

**Pending before next session starts:**
- ⚠️ User to run `node scripts/test-v1-api.mjs` to confirm Phase 1A works end-to-end against prod. Test does: signup → me → aeo-scan (against markitup.app) → me again to verify balance dropped from 500c to 400c.

**Next session's first action: Phase 1B.**

Code touchpoints for Phase 1B:
- `packages/functions/src/api/v1.ts` — add `POST /v1/recommend` (full pipeline call, $0.10 deduction); add `POST /v1/keys`, `GET /v1/keys`, `DELETE /v1/keys/:id` for self-service key rotation.
- `packages/functions/src/middleware/apiKeyAuth.ts` — add per-key rate limiting (Firestore counter with sliding window, or in-memory if acceptable for Stage 1).
- New: `packages/web/src/pages/Developers.tsx` — public docs page with quick-start (signup → first call), endpoint reference, curl/Node/Python examples.
- New: `packages/web/src/pages/DevDashboard.tsx` (gated to API customers) — show current balance, list keys, top-up button, recent call history.

**Where to find context for next session:**
- `DEPLOYMENT-PLAN-2026-05-23.md` (this doc) — Phase 1 section has full milestone breakdown
- `SCORING-V2-DESIGN.md` — Phase 0 design + reversibility-test method (for month-3 cutover decision on `/v1/score`)
- `PRICING-RESEARCH-2026-05-23.md` — Q1 competitive research + locked prices
- `../REVENUE-BENCHMARKS.md` — original Shape A/B/C audit
- Memory: `project_api_deployment_plan`, `project_ads_tos_derived_score`, `project_relevance_scoring`

**Operational notes for next session:**
- Existing Stripe webhook (`/api/stripe/webhook`) already handles `purpose=api_topup` metadata — no Stripe dashboard work needed.
- API customers are stored in `apiCustomers/{customerId}` (separate from consumer-app `users/{userId}` — email may overlap, no link maintained).
- API keys hashed via sha256, stored as doc ID at `apiKeys/{hash}`. Raw key only shown at creation.
- Test script at `scripts/test-v1-api.mjs` — runs against prod by default; pass `http://127.0.0.1:5001/even-plate-378520/us-central1/api` as first arg for emulator.
