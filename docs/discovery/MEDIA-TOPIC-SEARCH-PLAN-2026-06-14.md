# Build Plan — Media Topic Search

**Date:** 2026-06-14 · **Status:** planned, not started · **Build order:** SECOND (after Product Search)
**Related:** ROADMAP.md (DISC-2/DISC-3) · `DISCOVERY-SOURCES-TOS-STRATEGY-2026-06-14.md` · `[[project_discovery_tools]]`

## What we're building
A demand/interest tool for **creators/influencers** ("what should I make next"). Surfaces *what people are searching/reading about per platform* — **demand-only, NO commerce/CPC**. Two modes: **(A) by platform** (pick a platform → its rising query themes), **(B) by topic** (pick a topic → how it's searched across platforms). This is the **safest tool** to operate: its spine is open data.

## Guardrails (locked decisions)
- **Open-data anchors load-bearing** (Wikipedia/GDELT); NO Keyword Planner / CPC anywhere.
- **Momentum honesty:** topic-level momentum = REAL (Wikipedia Pageviews + Google Trends time-series); **per-platform momentum = ≈PROXY** (re-polled search-suggest breadth — accrues over time, labeled "proxy"; never imply a platform's internal trend feed).
- Separate **Interest Score** (interest/demand-weighted), distinct from Product Search's Goldmine Score.
- Surface **data only** — never "make a video titled X" (respects the no-content-ideas principle).
- Scrape/paid sources (Reddit-commercial, etc.) abandoned.

## Reuses from Product Search
Suggest-endpoint infra (`autocomplete.ts`), BigQuery client + Trends data (Phase 0 of Product Search), Firestore daily-refresh pattern, Stage/momentum helpers from `trendSignals`. Build Product Search first so this is mostly assembly.

---

## Phase 0 — Topic data spine
- **0.1 Wikipedia Pageviews** — REST API client (no auth); per-topic daily interest time-series = the load-bearing momentum anchor.
- **0.2 GDELT 2.0** — DOC API or BigQuery; news/theme momentum + emerging topics.
- **0.3 YouTube Data API v3** — `videos.mostPopular` (cheap, 10k units/day); category trends. Mind the quota (search = 100 units).
- **0.4 Suggest extension + history** — add **Etsy** + **TikTok** suggest to `autocomplete.ts`; store per-poll **suggest-depth** so per-platform proxy momentum can accrue.
- **0.5 Hacker News API** — top stories (tech niches).
- **Deliverable:** `services/topicSignals.ts` returning per-topic + per-platform demand/momentum. **Verify:** real Wikipedia/Trends momentum on a known rising topic.

## Phase 1 — Topic dataset + Interest Score
- **1.1 Topic assembly** — seed rising topics from GDELT + Trends rising + Wikipedia movers; dedupe/cluster (Gemini).
- **1.2 Per-platform breakdown** — for each topic, demand per platform (suggest-depth + platform popularity) + top **rising queries** (fastest-growing autocompletes).
- **1.3 Interest Score** — open-data anchors weighted; NO CPC. Stage from topic-level curve.
- **1.4 Momentum split** — topic-level = real; per-platform = proxy (starts empty, fills as re-poll history grows; label accordingly).
- **1.5 Daily refresh job** → `discoveryTopics/{id}` in Firestore.
- **Deliverable:** populated `discoveryTopics` + read endpoints (`GET /v1/topics` for mode A; `GET /v1/topics/:id` for mode B). **Verify:** matches mockup shape.

## Phase 2 — UI (two modes)
- **2.1 Route + nav tab** `/media-topic-search` (port `media-topic-search-mockup.html`).
- **2.2 Mode A (by platform)** — platform chips, table, stage chips, demand filter; per-platform momentum tagged ≈proxy.
- **2.3 Mode B (by topic)** — topic search/select, cross-platform cards (demand + rising queries + proxy momentum), real topic-level momentum in header. Hottest-platform highlight.
- **2.4 Explore→** links a mode-A row to its mode-B topic view.
- **2.5 Paywall** — free = top ~5 topics / 2 platform cards; Pro = full + CSV.
- **Deliverable:** working two-mode tool on web.app.

## Phase 3 — Retention + polish + QA
- **Saved topics + weekly alerts** (the retention hook JK lacks; ties to V2-5/AGENT-2).
- Attribution `source:'media_topic_search'`; funnel events.
- Admin debug; quota monitoring (YouTube units).
- **Verify:** alert opt-in; two-mode end-to-end.

---

## Open decisions (resolve during build)
1. **Monetization** — lead-magnet (free, drives signups) vs standalone paid subscription? Affects free-tier size.
2. **Interest Score weights** — how much Wikipedia vs GDELT vs YouTube vs suggest.
3. **Proxy momentum go-live** — show per-platform proxy from day one (sparse) or hide until N weeks of history?
4. **Topic taxonomy** — how topics are defined/clustered to avoid near-duplicates.
5. **YouTube quota** — caching strategy to stay within 10k units/day.

## Rough sizing
Phase 0: ~3–4 days (less if Product Search spine reused) · Phase 1: ~3–4 days · Phase 2: ~4 days · Phase 3: ~2–3 days.
