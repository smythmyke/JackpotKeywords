# JackpotKeywords API Deployment Plan — Streamlined

**Date:** 2026-05-25
**Status:** Active. Supersedes `DEPLOYMENT-PLAN-2026-05-23.md`. **Pricing/free-tier revised 2026-05-28 — see revision section below.**
**Driver:** Realignment after recognizing that the prior plan inherited B2B partnership framing that doesn't fit solo-dev execution. Comparison with `C:\Projects\MarkItUp` confirmed there's an existing solo-dev playbook in the user's own portfolio — this plan adopts it.

---

## 2026-05-28 revision — free tier + topup tiers

Two of the "Locked 2026-05-23" pricing decisions have been partially revised after Stage 1 traffic data showed 427 npm downloads but **0 real customer signups** (only admin + 3 internal test accounts). The locked numbers were inherited from OpenAI/Anthropic comp without empirical testing against JK's unit economics.

**Changes:**

- Signup credit reduced **$5 → $2**. Still satisfies the "free trial sized to evaluate" requirement (2 AEO scans = the moat product). Per-signup giveaway exposure capped at $2.
- Topup packs gained **`mini` ($5) tier**. Existing `starter`/`growth`/`scale` unchanged.
- Custom topup minimum: **$25 → $5**. Consistent with the new `mini` pack.
- **Two new endpoints added to the v1 surface** (live, billable):
  - `POST /v1/recommend-deep` — $0.30/call. `/v1/recommend` plus parallel competitor discovery + cluster/category/competitor-brand aggregates in the response.
  - `POST /v1/audit` — $0.50/call. Reuses the consumer SEO audit pipeline via `runSeoAudit(url, { includeAeo: false })`. AEO sold separately via `/v1/aeo-scan`.

**Driver:** 0 real signups against 427 npm downloads means the funnel is the bottleneck, not the giveaway size. $5 → $2 is a smaller, faster experiment than $5 → $0 — preserves the trial lever while reducing per-signup giveaway exposure 60%. If conversion stays at 0% at $2, friction isn't the bottleneck and we go to $0 with data behind it.

**What's unchanged:** Per-call prices ($0.10 / $1.00 / $0.005). Pricing model (PAYG-only). `/v1/score` Path D gate. All other locked decisions. See `PRICING-RESEARCH-2026-05-23.md` for the full pricing rationale + revision details.

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
| Pricing: $0.005/keyword, $0.10/recommend, $1.00/scan; ~~$5~~ $2 signup credit *(revised 2026-05-28)* | Per-call prices locked 2026-05-23. Signup credit recalibrated 2026-05-28 — see revision section above. |

---

## Operating model — MarkItUp playbook

Reference: `C:\Projects\MarkItUp\mcp-server\` and `markitup.app/api`.

1. **Self-serve from day one.** No invitation, no manual provisioning, no whitelist. Email → API key → use immediately. The free credit ($2, revised from $5 on 2026-05-28) IS the trial.
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
- ✅ `POST /v1/signup` — email → API key (`jk_live_…`) + $2 credit *(revised from $5 on 2026-05-28)*
- ✅ `GET /v1/me` — balance + customer info
- ✅ `POST /v1/topup` — Stripe checkout ($5/$25/$100/$500 packs or custom ≥$5) *(revised 2026-05-28: added `mini` $5 pack, dropped custom min from $25 to $5)*
- ✅ `POST /v1/aeo-scan` — $1.00, refunded on failure
- ✅ `POST /v1/recommend` — $0.10, refunded on failure
- ✅ `POST /v1/recommend-deep` — $0.30, refunded on failure *(added 2026-05-28)*
- ✅ `POST /v1/audit` — $0.50, refunded on failure, AEO not bundled *(added 2026-05-28)*
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

Each item ships independently when dogfoodable. **2026-05-28 decision (Michael):** the trigger gates on n8n and OpenAI are *lifted* — all three surfaces (Zapier, n8n, OpenAI) are now active. Framing is an explicit **discovery experiment**: the 427-downloads/0-signups signal is being read as a *findability* problem, so we widen passive-distribution shelf presence rather than wait for demand signals that can't appear until JK is discoverable.

**⚠️ Pre-build verification (2026-05-28) found all three break the "thin wrap" assumption to different degrees — so build order is by actual effort, not directory reach. Corrected build order: n8n → (Zapier | OpenAI, both infra projects, order TBD).**

| Surface | Platform constraint | Thin wrap of current synchronous API? | Backend work |
|---|---|---|---|
| **n8n** | Custom node sets its own request timeout; self-hosted generous, Cloud ~5min — both clear JK's 60-180s | ✅ **Yes** | **None** |
| **Zapier** | Hard **30s** request timeout, not extendable (`docs.zapier.com/platform/build/operating-constraints`) | ❌ No | Moderate — async callback infra |
| **OpenAI** | **OAuth 2.1 required**, API keys explicitly unsupported | ❌ No | Heavy — OAuth 2.1 server |

- **n8n community node** — **BUILDING FIRST (2026-05-28).** The only true thin wrap. A custom HTTP request inside the node sets its own timeout (e.g. `300000`ms); self-hosted has generous/no execution cap, n8n Cloud ~5min — both comfortably exceed JK's 60-180s endpoints. So JK's existing **synchronous** `Bearer jk_live_` endpoints work as-is, **zero backend changes**. Build `n8n-nodes-jackpotkeywords`: API-key credential → `Authorization: Bearer jk_live_`, operations wrapping `/recommend` (+ `/aeo-scan`, `/audit`, `/me`), generous request timeout, direct Cloud Function URL, distinct `jackpotkeywords-n8n` UA. Publish to npm (n8n auto-discovers community nodes). ~2 days.
- **Zapier app** — **active, but NOT a thin wrap.** Zapier kills create/action requests at **30s** (not extendable); JK's `/recommend` (60-180s), `/recommend-deep`, `/aeo-scan` (30-120s), `/audit` all exceed it. Viable only via Zapier's async pattern: `z.generateCallbackUrl()` in `perform` + `performResume`, which requires JK backend support for a `callbackUrl` — run the pipeline in the background (Cloud Tasks/Pub-Sub, since an `onRequest` function can't continue after responding) and POST the result to the callback when done. Moderate backend infra. 4-6 week passive review after submit. Build after n8n; possibly after building the shared async-job infra (which would also serve any future long-running integration).
- **OpenAI Apps SDK / GPT Store** — **active, but NOT a thin wrap, and the heaviest.** See "OpenAI Apps SDK build" determinations below — ChatGPT mandates OAuth 2.1. Build last, gated on the OAuth approach decision.
- **Sheets add-on** — still deferred; only if Michael personally uses it.
- **`/v1/score` ship decision** — unchanged. Gated on reversibility test against first 50 real `/v1/recommend` samples (then 500 as traffic permits). Path D.

### OpenAI Apps SDK build — locked determinations (2026-05-28)

Resolved by the consistency principle: default to what JK already does on every other surface; only deviate where the platform forces it. Verified against the codebase (`apiKeyAuth.ts`, `index.ts`, `mcp-server/`).

1. **Auth → ⚠️ CORRECTED 2026-05-28: OAuth 2.1 is REQUIRED, API-key-header is NOT feasible on this platform.** Original determination (API key via `Authorization: Bearer jk_live_` header, consistent with `apiKeyAuth.ts`) was overturned after verifying OpenAI's own docs (`developers.openai.com/apps-sdk/build/auth`). OpenAI states verbatim: *"ChatGPT does not support machine-to-machine OAuth grants … nor can it present custom API keys or customer-provided mTLS certificates."* OAuth 2.1 is the **only** supported mechanism. A connectable MCP endpoint must implement: Protected Resource Metadata (`/.well-known/oauth-protected-resource`), an OAuth 2.0/2.1 Authorization Server with discovery metadata, client registration (CIMD or Dynamic Client Registration), and per-request token verification (issuer/audience/expiry/scopes). JK has no OAuth server today, only `jk_live_` keys.
   - **Consequence:** OpenAI is the MOST expensive of the three surfaces, not the cheapest — the "thin rewrap, do it first" rationale is void. **Build order corrected: Zapier → n8n → OpenAI** (Zapier + n8n take `Bearer jk_live_` directly, zero auth-server work). OpenAI is gated behind a separate decision: build a minimal OAuth 2.1 server in-house vs. front the MCP endpoint with a managed provider (Stytch/Auth0/WorkOS all publish Apps-SDK guides), then map the OAuth identity → a JK customer/credit account. PENDING USER DECISION as of 2026-05-28.
2. **Deployment → mount the remote MCP endpoint on the existing `api` Cloud Function**, not a new Cloud Run service. New router (e.g. `app.use('/mcp', …)` in `index.ts`), reusing `apiKeyAuth` + the 540s/1GB config (`index.ts:45-47`). ChatGPT connects to `https://us-central1-even-plate-378520.cloudfunctions.net/api/mcp` — same direct-URL convention the npm server uses to dodge the 60s Hosting edge timeout (`[[firebase-hosting-60s-edge-timeout]]`). Validate-during-build (not a decision): MCP Streamable-HTTP plain-POST mode works on Cloud Functions; if long-lived SSE is required and misbehaves, Cloud Run is the documented fallback — try the consistent path first.
3. **Code reuse → the 5 tools + `mcp-server/src/api/client.ts` carry over verbatim.** Only the transport wrapper changes (stdio → HTTP). Same tools, same REST calls, same `jk_live_` auth — honors the "one API, many surfaces" hard rule.
4. **Attribution → follow the UA pattern.** Remote server self-identifies as `jackpotkeywords-openai/…` (mirrors `jackpotkeywords-mcp-server/…`). Buckets as `'mcp'` today; the distinct UA makes the granular split free later (to-do #1). No new pattern.

### Deferred to-do (recorded 2026-05-28, do later)

Not blocking the surface builds. Capture now so the surfaces are built *forward-compatible* with them:

1. **Granular surface attribution + dashboard columns.** Today `ApiSource` is binary (`'mcp' | 'api'`, `apiCredits.ts:64`) and resolved purely from User-Agent prefix (`apiKeyAuth.ts:27`, `v1.ts:87`). Zapier/n8n currently bucket as `'api'`; OpenAI-via-MCP buckets as `'mcp'`. **Forward-compatible move while building:** give each surface client a *distinct* User-Agent now (e.g. `jackpotkeywords-openai/…`, the Zapier app UA, the n8n node UA), even though the backend still collapses them. Later, widening the `ApiSource` enum + the resolver matcher unlocks the granular split for go-forward traffic with no client changes. Dashboard `platforms.json` + surface columns live in the **sellerdashboard repo** — separate change, do when measurement matters.
2. **Distinguish Claude vs Cursor MCP traffic.** Both use the *same* npm stdio server with the same UA (`jackpotkeywords-mcp-server/0.2.0`), so UA alone can't split them. The lever is the MCP `initialize` handshake `clientInfo.name` (Claude Desktop vs Cursor vs ChatGPT/Apps SDK each report distinct names). To enable: capture `clientInfo` in the stdio server and forward it as a header/param to the REST API, then bucket on it server-side. Do alongside to-do #1.

### Conditional surfaces (defer unless trigger fires)

- **RapidAPI (Rapid Hub) — PLANNED, PORTFOLIO PILOT — START HERE (added 2026-05-29).** Strongest non-MCP marketplace fit *and* lowest effort across the four products (MarkItUp/Bull/GovTools/JK), so JK is the designated first RapidAPI surface — learn the mechanics here, then reuse the playbook for patent-search once its v1 API ships. SEO/keyword/SERP APIs are one of RapidAPI's biggest proven-selling categories, and the v1 REST surface (`/recommend`, `/aeo-scan`, `/audit`, `/me`) is already stateless + key-billed, so this is mostly RapidAPI-side config + a thin gateway-auth shim, near-zero backend change. **RapidAPI is a *REST* marketplace, not an MCP one** — parallel surface to the MCP registries (Smithery/Glama), not a replacement. Honors "One API, many surfaces."

  **Build trigger:** after n8n ships and the v1 contract is stable; sequence alongside/after Zapier.

  **RESOLVED — credits-vs-quota reconciliation (via RapidAPI docs, 2026-05-29):** RapidAPI's billing is quota-based, but a provider can override the default "1 unit per request" by returning the **`X-RapidAPI-Billing` response header**. So JK maps cleanly with **zero changes to the internal credit model**:
    1. Define **one custom quota object** named `Credits` on the listing (RapidAPI allows the default `Requests` object + up to 4 custom objects mapped to endpoints).
    2. Each JK endpoint returns `X-RapidAPI-Billing: Credits=<n>` where `<n>` is that call's existing credit cost (e.g. `/recommend` → `Credits=1`, `/aeo-scan` → its cost). Multiple objects use `;` separators (`Credits=3; Foo=1`); **no commas** in values (causes a Parse Error).
    3. Price plans as **monthly Credit allotments** (Basic free / Pro / Ultra), **Soft Limit** so over-quota calls bill an **overage fee per Credit** rather than hard-blocking. This makes RapidAPI tiers a pure front-end over JK's existing per-call credit costs — no per-endpoint plans, no parallel billing logic.
    4. **Free alignment:** RapidAPI's own free-tier cap is 1000 req/hr & 500K/mo; map the Basic plan's monthly Credits to JK's intended free allowance.
    5. **Failure handling is already correct:** RapidAPI does **not** increment usage on response codes **≥500**, which matches JK's "refund credits on pipeline failure" — return 5xx (not a 200-with-error) on hard pipeline failures so the customer isn't billed.

  **Gateway auth:** RapidAPI proxies every call and appends an **`X-RapidAPI-Proxy-Secret`** header (unique per API, from the listing's Gateway → Firewall settings). JK must **validate this server-side** and reject calls missing/mismatching it, so the public CF URL can't be hit directly to bypass RapidAPI billing. Map the RapidAPI consumer (`X-RapidAPI-User` header) → a JK customer/credit account at the boundary; give the gateway a distinct User-Agent for attribution.

  **Economics & caveats:** RapidAPI takes a **flat 25% marketplace fee** (provider keeps 75%) — higher than first assumed. **Payout is PayPal-only**, consolidated monthly, paid ~5–6 weeks after the charge (no Stripe/bank). Treat as an additive-discovery channel, **not** primary billing. Plus: another versioned REST spec + docs to maintain, and RapidAPI's softening listing-quality reputation. `/v1/score` stays off this surface per Path D.

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

**Last action 2026-05-25 (end of session):** Stage 1 complete + Zapier promoted from deferred to Stage 3 active. MCP server installed in Michael's Claude Code (verified working via fresh-session `jackpotkeywords_credit_balance` call). 60-second Firebase Hosting edge timeout bug discovered and fixed (mcp-server v0.1.2 + Developers.tsx now use direct Cloud Function URL — see `[[firebase-hosting-60s-edge-timeout]]`). Admin bypass live for `smythmyke@gmail.com` so internal dogfooding is free.

**2026-05-28 — surfaces progress (end of session):**

- ✅ **n8n — DONE.** `n8n-nodes-jackpotkeywords@0.1.0` published to npm. Built at `n8n-node/`. Only true thin wrap; zero backend changes. Remaining: optional verified-community submission.
- ✅ **Zapier — backend live + app pushed.** Async job layer deployed to prod (`api` + `processApiJob` Firestore trigger) and E2E-tested (job processing→success ~52s, balance 200¢→190¢ proving internal-secret auth + billing through the untouched sync endpoint). Zapier app at `zapier-app/` pushed to the developer platform (app ID 242241, version 0.0.0 — Zapier requires first version = 0.0.0). CLI command is **`zapier-platform`** (v19 renamed it from `zapier`). Remaining (user dogfooding): test via `zapier-platform invoke` or a test Zap (exercises the hooks.zapier.com callback leg, the only part not yet proven), then submit for public review (4-6wk).
- ⬜ **OpenAI — NOT STARTED. THIS IS THE NEXT BUILD.**

**Next action: BUILD OPENAI APPS SDK SERVER (the last surface).** Before writing code, DECIDE the OAuth approach (this is the gating fork):

ChatGPT **requires OAuth 2.1** for remote MCP servers — API keys are explicitly unsupported (verified at `developers.openai.com/apps-sdk/build/auth`). JK has no OAuth server. Options:
  - **(A) Managed provider (Stytch / Auth0 / WorkOS)** — hosts the OAuth 2.1 authorization server + discovery + dynamic client registration; we map their identity → a JK credit account. Fastest correct path, adds a vendor. **Stytch has the most explicit Apps-SDK guide. RECOMMENDED.**
  - **(B) Self-built minimal OAuth 2.1** in the Firebase backend — no vendor, full control, but the fiddly/security-sensitive multi-day build (authorization server + Protected Resource Metadata + DCR/CIMD + token verification).

Then build: remote MCP server over **Streamable HTTP** (the npm server is stdio); reuse the 5 tools + `mcp-server/src/api/client.ts` verbatim; mount on the existing `api` Cloud Function (`packages/functions` is CommonJS while `@modelcontextprotocol/sdk` is ESM-only → hand-roll the stateless JSON-RPC handler or use dynamic import); distinct `jackpotkeywords-openai/…` User-Agent. See the "OpenAI Apps SDK build — locked determinations" section above (note determination #1 is CORRECTED to OAuth-required).

Alternative the user is weighing: **pause surfaces and dogfood n8n + Zapier first** to see if real traffic appears before investing in the OAuth lift — the original plan's data-driven instinct.

**CRITICAL (applies to OpenAI too):** Use the **direct Cloud Function URL** (`https://us-central1-even-plate-378520.cloudfunctions.net/api/api/v1`), NOT the Hosting URL — Hosting silently 502s long-running endpoints at 60s. See `[[firebase-hosting-60s-edge-timeout]]`.

**While Zapier is in review, return to Bucket 1:**
- Dogfood MCP server from portfolio (BulkListingPro, GovToolsPro, MarkItUp landing pages)
- Stage 2 community post (Indie Hackers / r/SEO / Show HN)

**Reference for Zapier build:** Zapier's docs at `platform.zapier.com/docs` are authoritative. Their CLI option (`zapier-platform-cli`) lets you scaffold + version-control the app, which is cleaner than UI-only. Worth considering for a JK/Zapier repo structure.

---

## Related

- `DEPLOYMENT-PLAN-2026-05-23.md` — superseded predecessor (kept for history)
- `PRICING-RESEARCH-2026-05-23.md` — pricing audit, decisions still active
- `SCORING-V2-DESIGN.md` — composite scoring rationale
- `DESIGN-PARTNER-1PAGER.md` — drafted under prior plan; **deprecated by this revision** but kept as reference for the API examples it contains
- `C:\Projects\MarkItUp\mcp-server\` — reference implementation for Stage 1 item #2
- `../REVENUE-BENCHMARKS.md` — original Shape A/B/C ToS audit
- `../AEO-API-RESEARCH-2026-05-21.md` — Shape C (AEO scan) market context
