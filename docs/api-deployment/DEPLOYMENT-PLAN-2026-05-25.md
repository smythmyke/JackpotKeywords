# JackpotKeywords API Deployment Plan — Streamlined

**Date:** 2026-05-25
**Status:** Active. Supersedes `DEPLOYMENT-PLAN-2026-05-23.md`.
**Driver:** Realignment after recognizing that the prior plan inherited B2B partnership framing that doesn't fit solo-dev execution. Comparison with `C:\Projects\MarkItUp` confirmed there's an existing solo-dev playbook in the user's own portfolio — this plan adopts it.

---

## What changed vs. 2026-05-23

| Removed | Why |
|---|---|
| "~2 design partners" requirement (was Phase 1C anchor) | Requires external relationships solo dev doesn't have. MarkItUp shipped its API with zero partners. |
| "Single coordinated launch day" (Stage 2) | Requires presence on PH/HN/Reddit + founder outreach. MarkItUp distributed via npm + MCP Registry + GitHub — no event. |
| "Founder case studies" / "MCP listicle author outreach" / "ProductHunt push" | Outbound work a solo dev doesn't have capacity for. |
| Sequential phase ordering for Stage 2 → Stage 3 | All surfaces ship when dogfoodable; no inter-phase dependencies. |
| Zapier / Shopify / WordPress app builds (in active scope) | Multi-week review cycles + low solo capacity. Deferred indefinitely. |
| `/v1/score` calendar gate ("~August 2026") | Replaced with **traffic-gated** evaluation: run reversibility test on first 50 real `/v1/recommend` samples, scale to 500 as traffic permits. |

| Kept | Why |
|---|---|
| Composite `jackpotScore_v2` as the only score shipped | ToS posture — the v1 90%-Google-data score is not safe to expose. |
| No raw GKP fields cross the API boundary | Same. |
| `/v1/aeo-scan` requires customers to render Gemini `searchEntryPoint` HTML | Gemini grounded-search ToS requirement. |
| Endpoint naming `/v1/score`, `/v1/recommend`, `/v1/aeo-scan` | Locked 2026-05-23, no reason to revisit. |
| Pricing: $0.005/keyword, $0.10/recommend, $1.00/scan; $5 signup credit | Locked 2026-05-23, no reason to revisit. |

---

## Operating model — MarkItUp playbook

Reference: `C:\Projects\MarkItUp\mcp-server\` and `markitup.app/api`.

1. **Self-serve from day one.** No invitation, no manual provisioning, no whitelist. Email → API key → use immediately. The free credit ($5) IS the trial.
2. **One distribution channel per context, all same day.** REST API on the site. MCP server on npm + MCP Registry + Glama + GitHub. No "coordinated launch" — distribution channels handle discovery.
3. **Build only what you can dogfood.** Every surface must have at least one real user before it ships — and that user is *you*, calling it from one of your own products. If you wouldn't use it personally, don't build it.
4. **Observability replaces feedback loops.** `scripts/analyze-api-usage.mjs` is the source of truth on what works. No 1:1 design-partner calls.
5. **Revenue-first ordering.** Build endpoints/surfaces in order of fastest credible path to $6k/mo, not "plan completeness."

---

## Revenue math — target $6k/mo

| Endpoint | Price | Calls/mo for $6k | Realistic buyer profile |
|---|---|---|---|
| `/v1/score` | $0.005/keyword | 1.2M keyword scores | Agency/enterprise batch — long sales cycle, also highest ToS exposure |
| `/v1/recommend` | $0.10/call | 60,000 calls | Indie devs, agencies, automation users — fits MarkItUp pattern |
| `/v1/aeo-scan` | $1.00/scan | 6,000 scans | SEO consultancies, agencies tracking AI visibility for clients |

**`/v1/aeo-scan` is the shortest credible path** — 6k scans/mo is one mid-size SEO consultancy or a few small ones. **`/v1/recommend` is the volume play.** **`/v1/score` is deferred until both (a) revenue from the others justifies the ToS surface area and (b) real recommend traffic enables the reversibility test.**

---

## Current state — what's already shipped

**Consumer app (jackpotkeywords.web.app):**
- Full 6-step pipeline, results dashboard, 33 blog posts, SEO audit, AEO scan, idea board, Stripe, conversion overhaul, input quality gate
- All consumer-facing surfaces live and deployed

**API (`/api/v1`):**
- ✅ `POST /v1/signup` — email → API key (`jk_live_…`) + $5 credit
- ✅ `GET /v1/me` — balance + customer info
- ✅ `POST /v1/topup` — Stripe checkout ($25/$100/$500 packs or custom ≥$25)
- ✅ `POST /v1/aeo-scan` — $1.00, refunded on failure
- ✅ `POST /v1/recommend` — $0.10, refunded on failure
- ✅ `POST/GET/DELETE /v1/keys` — key rotation
- ✅ Per-key rate limit (60/min, 1000/hr)
- ✅ Usage tracking — `apiCalls` records `latencyMs`, `errCode`, `refunded`
- ✅ `scripts/analyze-api-usage.mjs` — per-endpoint stats, p50/p90/p99, error codes, per-customer revenue

**Developer surface:**
- ✅ Public `/developers` docs page — live at `jackpotkeywords.web.app/developers`
- ✅ Prerendered for Googlebot, sitemap entry at priority 0.7, footer link
- ⚠️ Currently behind mailto gate — needs swap to self-serve signup button (Stage 1 todo)

**Composite scoring v2:**
- ✅ `jackpotScore_v2` writes alongside v1 on every search
- ✅ Admin v1/v2 toggle in Results

---

## Stage 1 — Build (in progress)

Goal: a coherent self-serve developer surface. Everything below is dogfoodable from Michael's own portfolio.

**Remaining work:**

1. **Drop mailto gate on `/developers`.** Replace with self-serve "Get API Key" button hitting `POST /v1/signup`. ~2 hours. *Already-built backend; pure UX.*

2. **MCP server** — `jackpotkeywords-mcp-server` npm package. Model directly on `C:\Projects\MarkItUp\mcp-server\` so we're not re-deciding architecture. Wraps `/v1/recommend` and `/v1/aeo-scan` as MCP tools. Local stdio, auth via `JACKPOTKEYWORDS_API_KEY` env var. ~3–5 days. *Dogfood requirement:* Michael uses it from Claude Code to do keyword research for BulkListingPro / GovToolsPro / MarkItUp landing pages.

3. **Publish MCP** to npm + MCP Registry + Glama (via `smithery.yaml` auto-sync) + GitHub. Same day as build. ~1 day for packaging + README + submission.

4. **Static API docs page** at `/api` (companion to React `/developers` page). Same pattern as MarkItUp's `public/api/index.html`. Lets developers find the API without rendering JS. *Optional* — `/developers` React page may be sufficient.

**Out of scope for Stage 1:**
- Sheets add-on (deferred unless Michael personally uses it for his own portfolio)
- Any vertical content tracks
- Any non-MCP automation surface
- `/v1/score` (Path D — deferred)

---

## Stage 2 — Discover (no event)

Goal: make the surface findable. No coordinated launch.

1. **One low-ceremony post** on whichever community Michael has presence on (Indie Hackers, r/SEO, Show HN, or skip). One-time action, no follow-up obligation.
2. **Distribution channels do the work** — npm registry, MCP Registry, Glama, and the prerendered `/developers` page handle discovery passively.
3. **Watch `analyze-api-usage.mjs` weekly** to see what calls come in.

**No PH push, no founder outreach, no "case study subjects," no "MCP listicle authors."**

---

## Stage 3 — Expand (opportunistic, parallel, optional)

Each item ships independently when (a) dogfoodable from Michael's own products AND (b) revenue from current surfaces justifies it.

- **n8n community node** — ~2 days when calm. Worth doing if `/v1/recommend` traffic shows ops-style usage patterns.
- **Sheets add-on** — only if Michael personally uses it.
- **`/v1/score` ship decision** — gated on reversibility test against first 50 real `/v1/recommend` samples (then 500 as traffic permits). Path D: defer until recommend traffic is high enough that the test is empirically meaningful AND revenue from existing endpoints justifies the ToS surface area.

**Permanently deferred (not in this plan):**
- Zapier app (4–6 week review, low solo capacity)
- Shopify app (12–18 month review, requires existing revenue ramp)
- WordPress plugin (review pipeline + low solo capacity)
- Vertical content tracks with external case studies
- Legal opinion ($3–5k attorney) — only relevant if/when `/v1/score` ships publicly to enterprise customers

---

## /v1/score posture — Path D

**Don't ship `/v1/score` publicly yet. Drive traffic to `/v1/recommend` and `/v1/aeo-scan` first.**

- The revenue math says `/v1/score` isn't the fastest path to $6k anyway (`/v1/aeo-scan` is).
- Real `/v1/recommend` traffic accumulates the data needed to run the reversibility test for free.
- ToS exposure on `/v1/score` is non-trivial: if Google flags JK for reselling Keyword Planner data, the consequence is **revoking the Google Ads API key**, which kills `/v1/recommend` too. The whole product goes dark, not just `/v1/score`.
- If a specific customer needs batch scoring before the reversibility test passes, ship it to them as a **named-account, rate-limited internal endpoint** (Option B from the 2026-05-25 ship-or-not discussion). Not the same as public self-serve.

**Reversibility test, when it happens:**
- Pull 50 real `(score, keyword)` pairs from `/v1/recommend` results
- Hand to fresh agent with no other context, ask it to backsolve volume/CPC/competition buckets
- If accuracy <50% at n=50, scale to 100, then 500 to confirm
- If accuracy >50% at any scale, `/v1/score` stays internal indefinitely — and v2 scoring weights need retuning to add more non-Google signal

---

## Hard rules (unchanged from 2026-05-23)

- One API, many surfaces — every integration calls the same REST endpoints
- No raw GKP fields cross the API boundary, ever
- `/v1/aeo-scan` customers must contractually render Gemini `searchEntryPoint` HTML
- `/v1/score` stays gated per Path D above
- Brand stays horizontal (no vertical-specific brand repositioning at any phase)

---

## Resume-here checkpoint

**Last action 2026-05-25:** Plan revision. No code changes pending from this revision; prior session deployed hosting + functions with the docs page, usage tracking, scoring v2 admin toggle, input quality gate, and AEO PDF improvements all live in prod.

**Next session's first action:** Stage 1 item #1 (drop mailto gate, swap to self-serve "Get API Key" button on `/developers`). Smallest unit of work, biggest unblock — once shipped, the `/developers` page is a real working signup surface that distribution channels can point at.

**Next session after that:** Stage 1 item #2 (MCP server scaffolding, modeled on MarkItUp's `mcp-server/`).

---

## Related

- `DEPLOYMENT-PLAN-2026-05-23.md` — superseded predecessor (kept for history)
- `PRICING-RESEARCH-2026-05-23.md` — pricing audit, decisions still active
- `SCORING-V2-DESIGN.md` — composite scoring rationale
- `DESIGN-PARTNER-1PAGER.md` — drafted under prior plan; **deprecated by this revision** but kept as reference for the API examples it contains
- `C:\Projects\MarkItUp\mcp-server\` — reference implementation for Stage 1 item #2
- `../REVENUE-BENCHMARKS.md` — original Shape A/B/C ToS audit
- `../AEO-API-RESEARCH-2026-05-21.md` — Shape C (AEO scan) market context
