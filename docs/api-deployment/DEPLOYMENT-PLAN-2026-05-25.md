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
- ✅ Self-serve signup live (mailto gate removed 2026-05-25, commit `a847f97`)

**Composite scoring v2:**
- ✅ `jackpotScore_v2` writes alongside v1 on every search
- ✅ Admin v1/v2 toggle in Results

**MCP server:**
- ✅ `jackpotkeywords-mcp-server@0.1.0` published 2026-05-25 to npm, MCP Registry, GitHub (commits `d3d1dc3`, `3a92068`, `b868b5e`)
- ✅ Three tools live: `jackpotkeywords_credit_balance`, `jackpotkeywords_recommend`, `jackpotkeywords_aeo_scan`
- ✅ Glama + Smithery auto-detect from `glama.json` / `smithery.yaml` in repo (passive)

---

## Stage 1 — Build ✅ COMPLETE 2026-05-25

All four items shipped in a single day:

1. ✅ **Self-serve signup on `/developers`** — mailto gate removed, inline form calls `POST /v1/signup`, raw key shown once with save warning. Commit `a847f97`.

2. ✅ **MCP server built** — `jackpotkeywords-mcp-server` npm package modeled on `C:\Projects\MarkItUp\mcp-server\`. Three tools wrapping `/v1/recommend`, `/v1/aeo-scan`, and `/v1/me`. Local stdio, auth via `JACKPOTKEYWORDS_API_KEY` env var. Commit `d3d1dc3`.

3. ✅ **MCP server published** — npm (v0.1.0, granular token w/ bypass-2FA in `~/.npmrc`), MCP Registry (`io.github.smythmyke/jackpotkeywords-mcp-server`, via `mcp-publisher` CLI), GitHub (public at `github.com/smythmyke/JackpotKeywords/tree/master/mcp-server`). Glama + Smithery auto-detect passively.

4. ⏭️ **Static `/api` page** — deferred. React `/developers` page is sufficient; prerendered for Googlebot. Revisit only if there's a measurable need.

**Out of scope (stayed out):**
- Sheets add-on (deferred unless Michael personally uses it)
- Vertical content tracks
- `/v1/score` (Path D — deferred)
- All non-MCP automation surfaces

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

- **Zapier app** — **promoted from deferred 2026-05-25.** ~2-3 days build + 4-6 week passive Zapier review wait. Once approved, sits in Zapier's app directory permanently. Indie SEO + ops audience actively searches for keyword research integrations there; one of the highest passive-distribution wins available. Single tool wrap of `/v1/recommend` plus optional `/v1/aeo-scan`. Low ongoing maintenance — Zapier handles infra.
- **n8n community node** — ~2 days when calm. Worth doing if `/v1/recommend` traffic shows ops-style usage patterns.
- **Sheets add-on** — only if Michael personally uses it.
- **`/v1/score` ship decision** — gated on reversibility test against first 50 real `/v1/recommend` samples (then 500 as traffic permits). Path D: defer until recommend traffic is high enough that the test is empirically meaningful AND revenue from existing endpoints justifies the ToS surface area.

### Conditional surfaces (defer unless trigger fires)

These platforms make sense IF specific signals appear, but aren't worth building speculatively:

- **OpenAI Apps SDK / GPT Store** — natural follow-up to the MCP server (same tool shape, different host). Build IF MCP traction shows meaningful usage, since the OpenAI port is mostly a thin rewrap. ~3-5 days of work. Trigger: 5+ active MCP installs OR a specific GPT Store user request.
- **Chrome extension** — Michael already publishes 6 Chrome extensions with existing distribution presence — different audience-discovery dynamic than the other deferred platforms. Worth considering if a focused use case emerges (e.g., on-page keyword research overlay). Trigger: a specific UX pattern that benefits from in-browser context rather than an MCP/API call.

### Permanently deferred (not in this plan)

| Surface | Reason |
|---|---|
| ~~Zapier app~~ | ~~4-6 week review, low solo capacity, audience overlap with n8n~~ — **promoted to active Stage 3 on 2026-05-25** |
| Shopify app | 12-18 month review, requires existing revenue ramp |
| WordPress plugin | Review pipeline + low solo capacity |
| Notion integration | Audience-discovery work + custom Notion API surface for low ROI |
| HubSpot integration | Enterprise audience, sales cycle, mismatched with self-serve PAYG |
| Slack bot | Audience-discovery work; MCP via Claude already covers the Slack-via-Claude use case |
| Raycast extension | Niche audience, maintenance overhead |
| Discord bot | Audience-discovery work, mismatched with B2B keyword research use case |
| VS Code extension | MCP via Cursor/Claude Code already covers IDE-context use |
| Vertical content tracks (external case studies) | Requires outreach capacity solo dev doesn't have |
| $3-5k legal opinion | Only relevant if/when `/v1/score` ships publicly to enterprise customers |

**Disposition policy:** items in the deferred table are killed for the foreseeable future, not "later." If you find yourself drawn to one, ask first whether the conditions that originally killed it have actually changed.

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

**Last action 2026-05-25 (end of day):** Stage 1 complete. Everything shipped — self-serve signup, MCP server built + npm published + MCP Registry submitted + GitHub source live. Usage tracking instrumented (latencyMs + errCode + analyze script). Path D locked for `/v1/score`. Hosting + functions both deployed to prod.

**Next session's first action — pick one:**

- **(A) Stage 2 post (lowest effort, highest leverage if traction matters):** Write one short post on whichever community Michael has presence on (Indie Hackers, r/SEO, Show HN, or skip). 1 paragraph, links to `/developers`, mentions MCP + REST. One-time action. No follow-up obligation.

- **(B) Dogfood from own portfolio (highest validation):** Install the MCP server in Michael's own Claude Code config (`~/.claude/mcp.json`), use it for real keyword research on BulkListingPro / GovToolsPro / MarkItUp landing pages. Generates real `/v1/recommend` traffic, accumulates data toward the `/v1/score` reversibility test, surfaces UX gaps from first-person use.

- **(C) Stage 3 opportunistic — n8n community node (~2 days):** Build only if (B) shows ops-style usage that justifies it.

- **(D) Address non-API roadmap items:** Relevance scoring tuning, blog image creation, Budget Calculator forecast API, custom domain — see `[[project_roadmap]]` for the full list.

**Recommended order:** B → A → (D or C depending on what surfaces).

---

## Related

- `DEPLOYMENT-PLAN-2026-05-23.md` — superseded predecessor (kept for history)
- `PRICING-RESEARCH-2026-05-23.md` — pricing audit, decisions still active
- `SCORING-V2-DESIGN.md` — composite scoring rationale
- `DESIGN-PARTNER-1PAGER.md` — drafted under prior plan; **deprecated by this revision** but kept as reference for the API examples it contains
- `C:\Projects\MarkItUp\mcp-server\` — reference implementation for Stage 1 item #2
- `../REVENUE-BENCHMARKS.md` — original Shape A/B/C ToS audit
- `../AEO-API-RESEARCH-2026-05-21.md` — Shape C (AEO scan) market context
