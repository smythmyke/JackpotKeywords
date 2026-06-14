# Build Plan — Product Search (+ shared trend-data spine + Niche Opportunity Report)

**Date:** 2026-06-14 · **Status:** planned, not started · **Build order:** FIRST (before Media Topic Search)
**Related:** ROADMAP.md (TREND-1..6, DISC-1/DISC-3/DISC-4) · `DISCOVERY-SOURCES-TOS-STRATEGY-2026-06-14.md` · `[[project_discovery_tools]]`

## What we're building
A "push" discovery tool: a standing, daily-refreshed board of **rising sellable niches** (Product Search) → click **Research →** opens a free **Niche Opportunity Report** (Option B) → **Run full keyword research** converts into the existing `recommend` pipeline (paid). Commerce-scored; honest, Google-first-party + open data only; no scraping, no paid-data resale.

## Guardrails (locked decisions)
- Composite **non-invertible** scores; free/open anchors (Trends/Wikipedia) carry real weight; KP ≤~25–30% minority input.
- **No banding** — show raw volume/CPC at the same fidelity as Keyword Search.
- Honesty: "advertising competition" not "SEO difficulty"; competitor **names only**, no market share; coverage badges = search-suggest presence, not momentum.
- Consumer feature (no public/agent metered API → no attorney opinion needed yet).

---

## ⚠️ Cost-safety decision (2026-06-14) — NO BigQuery in v1
User had a massive BigQuery bill on the patents project; with ~0 traffic the bill-explosion surface isn't worth it. **BigQuery is dropped from v1.** Every v1 data source is **either fixed-quota or free HTTP — none is billed by bytes scanned:** Google Ads API (KP) = quota-limited, not byte-billed; Gemini = predictable per-call; Daily Trends RSS = free GET; Firestore = bounded reads/writes. BigQuery stays a clearly-labeled *future enhancement* only — re-add behind `maximum_bytes_billed` cap + daily cache + project daily-bytes quota, and only if traffic ever justifies the 5-yr Stage precision.

## Phase 0 — Shared trend-data spine (prereq; also upgrades existing `recommend`)
*Roadmap TREND-1/TREND-2 (revised BQ-free). Build once; both Product Search and `recommend` consume it. **Audit finding:** KP already returns ~12-mo `monthly_search_volumes` and `analyzeTrendFromVolumes()` already derives trend + seasonality — so the spine is mostly assembly + Stage computation, no new paid data.*
- **0.1 (revised) — reuse existing KP monthly volumes;** skip the redundant KP historical-metrics endpoint.
- **0.2 (revised, BQ-free) — niche/term discovery without BigQuery:** Gemini-generated candidate niches (per category, optionally grounded) **validated against real KP data** before anything is shown; optional freshness from the **free Google Daily Trends RSS** (`trends.google.com/trends/trendingsearches/daily/rss?geo=US` — plain HTTP GET, no auth, no bill). Candidate-gen is AI; every displayed number is real Google data.
- **0.3 `trendSignals` service** — one internal module returning, per term/niche: momentum %, **Stage (Emerging/Rising/Peaking/Cooling)** (NEW — current code only does rising/stable/declining), seasonality[12]. Sources from KP monthly volumes (+ optional RSS). Wire into `overlayTrends` so `recommend` benefits too.
- **Deliverable:** `services/trendSignals.ts` + `recommend` trend/Stage upgraded. **Verify:** real momentum/seasonality/Stage on an existing search; zero BigQuery dependency.

## Phase 1 — Niche dataset + Goldmine Score (backend)
- **1.1 Niche assembly (BQ-free)** — Gemini candidate niches (per category, optionally grounded) + optional Daily Trends RSS → cluster/dedupe (Gemini, reuse clustering) → drop any niche that fails KP validation in 1.2.
- **1.2 Enrichment** — KP volume/CPC/competition per niche (reuse `keywordPlanner.ts`); attach `trendSignals`.
- **1.3 Sell-channel coverage** — reuse the suggest endpoints (`autocomplete.ts`); presence per platform (Amazon/Etsy/YT/Pin/eBay/TikTok); Gemini best-fit channel tag.
- **1.4 Goldmine Score** — composite (momentum + demand + commercial value + competition gap), non-invertible; KP minority weight. Document weights.
- **1.5 Daily refresh job** — scheduled function writes `discoveryNiches/{id}` to Firestore (category, region, all fields).
- **Deliverable:** populated `discoveryNiches` collection + read endpoint `GET /v1/niches` (filters: category, region, stage, minVol, q, sort). **Verify:** board data matches mockup shape.

## Phase 2 — Product Search board (frontend)
- **2.1 Route + nav tab** `/product-search` (port `product-search-mockup.html`).
- **2.2 Table** — columns, sort, stage chips, category/region/min-vol filters, platform coverage badges.
- **2.3 Paywall** — free = top ~5 rows, volume/CPC blurred + paywall; Pro = full + filters + CSV export.
- **2.4 Wire** to `GET /v1/niches`.
- **Deliverable:** working board on web.app. **Verify:** free vs Pro gating; sort/filter.

## Phase 3 — Niche Opportunity Report (Option B)
- **3.1 Report endpoint** `GET /v1/niches/:id/report` — aggregates the niche's stored signals + a **lightweight keyword preview** (12–15; cached or mini-pipeline). FREE.
- **3.2 Report page** `/niche/:id` (port `niche-opportunity-report-mockup.html`) — header + Opportunity Score, demand/timing, money signals (ad-competition label), score breakdown, landscape, keyword preview, honest "what we don't do" note.
- **3.3 Handoff** — "Run full keyword research" → existing `recommend`, seed prefilled from niche, **skip input-quality gate**, bill 1 credit / free on Pro.
- **Deliverable:** free report → paid handoff. **Verify:** credit deduction on full-research; report loads free.

## Phase 4 — Billing, attribution, polish, QA
- Attribution `source:'product_search'` on the paid conversion (extend `apiCredits.ts`/funnel events).
- Funnel events: board view → research-click → report view → full-research purchase.
- Admin debug panel for the niche dataset; refresh-cost monitoring.
- **Verify:** end-to-end discovery → paid conversion logged.

---

## Open decisions (resolve during build)
1. **Niche granularity** — how broad is a "niche" (e.g., "beef tallow skincare" vs "tallow")? Affects clustering + dedupe.
2. **Goldmine weights** — exact blend; how load-bearing KP is allowed to be (target: minority).
3. **Refresh cost/cadence** — daily full rebuild vs incremental; Gemini/KP call budget.
4. **Free-tier generosity** — top 5 rows? Which columns blurred?
5. **Report keyword preview** — cached vs live mini-pipeline (cost vs freshness).

## Rough sizing
Phase 0: ~2–3 days · Phase 1: ~3–5 days · Phase 2: ~3 days · Phase 3: ~3 days · Phase 4: ~2 days. (Spine in Phase 0 is reusable for Media Topic Search.)
