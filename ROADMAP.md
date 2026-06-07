# ROADMAP — JackpotKeywords

**Last updated:** 2026-06-02
**Scope:** Keyword research / SEO tool. Full-stack monorepo (web + Firebase Functions + shared packages). Gemini-backed seed generation, autocomplete expansion, Keyword Planner API enrichment, Google Trends overlay, Jackpot Score aggregation. MVP scaffold complete 2026-03-28; deploying to Firebase next. AEO scan module is a parallel track. Converted from Phase-structured roadmap on 2026-05-27.

<!-- DASHBOARD-META
project_key: jackpotkeywords
title: "JackpotKeywords"
purpose: "Keyword research / SEO tool — AI seed → autocomplete → Keyword Planner → Trends pipeline with Jackpot Score"
phase: "Phase 5 — Post-launch growth"
phases: ["Phase 1 — Deploy MVP", "Phase 2 — Pipeline testing", "Phase 3 — Frontend polish", "Phase 4 — Launch prep", "Phase 5 — Post-launch growth", "Phase 6 — V2 features"]
key_dates: []
-->

**Status legend:** ☐ todo · ◐ in progress · ✓ done · ⊘ blocked · ✗ dropped

> Editing rules: `C:\Projects\dashboards\project-dashboard\STRUCTURE.md`.

> **Reality note (2026-05-31):** The MVP-build items that used to live here (Firebase
> setup, Stripe products, auth hooks, initial deploy, MCP/RapidAPI surfaces) are all
> DONE — the app is live in prod at `jackpotkeywords.web.app` (project even-plate-378520)
> with full Stripe ledger, Google sign-in, and 4 API/MCP surfaces. The real blocker is
> NOT building — it's a leaky conversion funnel (0 paid conversions to date). Current
> focus = "patch the bucket, then drive distribution." The detailed historical phase
> list remains in BACKLOG below for reference.

## ACTIVE — This Week (Funnel fixes — "patch the bucket")

- ✓ FUNNEL-1: Close the two paywall loopholes — `GET /api/search/:id` (search.ts) and
  `GET /api/audit/:id` (audit.ts) no longer return `paid:true` for any signed-in user;
  they compute real entitlement (admin/pro/agency/doc's own `paid`) and mask via the
  existing helpers. Audit fallback no longer auto-copies as `paid:true`.
  **Shipped + deployed to prod 2026-05-31.** (Was the documented "0% conversion" cause.)
- ✓ FUNNEL-2: Deploy the input-quality gate (commit `47a9b7b` — strength meter, URL
  nudge, 10-char floor). Was committed 2026-05-25 but never on prod hosting until now.
  **Deployed to prod hosting 2026-05-31.**
- ☐ FUNNEL-3: Verify the loophole fix live in prod via the browser check. Step-by-step
  procedure saved in memory (`reference_paywall_verification`). Can't be automated —
  project only has Google OAuth enabled (anon/password sign-in disabled), so no headless
  token. Script stub at `scripts/verify-paywall-fix.mjs` (needs a service-account key to
  run automatically). 1-week input-gate follow-up due ~2026-06-07 via
  `node scripts/analyze-search-inputs.mjs 3000` (compare vs 43% zero-query baseline).
- ✓ FUNNEL-4: Audited + fixed `UpgradePrompt` wiring (2026-05-31). Wiring confirmed correct at
  every real paywall (Results bar+inline, both audit blur points, KeywordGapModal,
  ConversionModal). Fixed the AEO "Sign in to see" → "Upgrade to see" copy, AND made the
  BudgetCalculator's anonymous branch pricing-first — merged the sign-in-only branch into the
  `!hasAccess` → UpgradePrompt branch and removed the now-dead `user`/`signInWithGoogle` props
  (here + at the Results.tsx call site). NOTE: the earlier "Pro-only feature offered for $1.99"
  concern was WRONG — `hasAccess` includes `paid`, so a $1.99 search purchase legitimately
  unlocks the Budget Calculator; pricing is coherent. Shipped + deployed to prod hosting 2026-05-31.
- ✓ FUNNEL-5: Fixed the `upgrade_clicked` mislabel — PDF-export success now fires a new
  `pdf_exported` completion event (added to the `FunnelEvent` type AND the backend
  `events.ts` ALLOWED_EVENTS allowlist), not `upgrade_clicked`. Builds clean.
  **Shipped + deployed to prod (functions+hosting) 2026-05-31.**

## ACTIVE — Next Two Weeks (Distribution — "turn on the taps")

- ☐ DIST-1: Concentrate the EXISTING Google Ads campaign (customer 8702609992, campaign
  23723033028, $2/day, already ENABLED) on the converting groups only — Keyword Research
  Tools (97k vol) + Competitor Alternatives. Apply the pending 84→67 keyword cut
  (`optimize_jk_keywords.py`). Do NOT raise budget until the funnel shows ≥1 real conversion.
- ☐ DIST-2: Build-in-public cadence on X — dogfood JK on the user's own 220 Etsy listings
  + 6 extensions and post the jackpot keywords found (content + case study + proof in one).
- ☐ DIST-3: Product Hunt press kit (screenshots, 45s demo, SEMrush-$140-vs-JK comparison
  graphic). See `project_jackpot_press_plan`. Don't launch PH until the funnel converts.
- ☐ DIST-4: Decide on a custom domain (currently live on `jackpotkeywords.web.app`).

## BACKLOG

### Phase 2 — Search pipeline integration testing
- ☐ P2-1: E2E pipeline test — Gemini seed generation, autocomplete expansion (rate limit + dedup), Keyword Planner enrichment (batch + errors), Google Trends overlay (rate limit + trend calc), full orchestration (15–30s), credit deduction + refund on failure
- ☐ P2-2: Pipeline optimizations — caching layer for Keyword Planner (Firestore or Redis), autocomplete batching (parallel with delays), Google Trends backoff retry, timeout handling
- ☐ P2-3: Results quality tuning — Jackpot Score weights, Gemini seed prompts across niches, category assignment accuracy, concept report verdict accuracy

### Phase 3 — Frontend polish
- ☐ P3-1: Wire Results page to real API (replace demo placeholders); sorting, filtering, category counts, paywall blur overlay, Ad Score ↔ SEO Score toggle
- ☐ P3-2: Build `ConceptReport.tsx` — demand score, competition, opportunity breakdown, related niches, budget analysis, 15-keyword preview, "Run full keyword search" CTA
- ☐ P3-3: Wire `SearchProgress` to real pipeline step updates (SSE or polling); error/retry UI; "search again" flow; mobile responsive
- ☐ P3-4: Account page — Google avatar/email/plan, credit balance + transaction history, saved searches with links, Stripe portal subscription mgmt
- ☐ P3-5: CSV export — all keywords with metrics; export button wiring; gating decision

### Phase 4 — Launch prep
- ☐ P4-1: Register domain (jackpotkeywords.com or keymine.com), DNS → Firebase Hosting, meta tags + OG + Twitter, robots.txt + sitemap.xml, SoftwareApplication schema
- ☐ P4-2: Landing page — feature sections, 3-step "How it works", comparison table (vs SEMrush/Ahrefs/Ubersuggest), testimonials placeholder, FAQ targeting "free keyword research tool"
- ☐ P4-3: GA4 + conversion tracking (free search → credit → subscription); pipeline performance metrics
- ☐ P4-4: Error handling — API exhaustion, empty results, short descriptions, URL scrape failures, input validation

### Phase 5 — Post-launch growth
- ☐ P5-1: Google Ads campaign — use own keyword research; ad groups per `KEYWORD-GOLDMINE-RESEARCH.md`; target "free keyword research tool" (6,600/mo, $1.90 CPC), "ubersuggest" (22,200/mo, $0.76 CPC), "semrush alternative" (1,900/mo, $10.84 CPC); $11/day across 5 groups
- ☐ P5-2: Content marketing — "JackpotKeywords vs SEMrush", "How to find goldmine keywords in 30s", "Why we built JackpotKeywords"; YouTube demo
- ☐ P5-3: Product Hunt launch — listing, screenshots, video, social announcement

### Phase 6 — V2 features
- ☐ V2-1: Google Ads Campaign Builder Export (CSV for Google Ads Editor) — Pro+ feature
- ☐ V2-2: Branded PDF Goldmine Reports — Agency tier
- ☐ V2-3: Chrome Extension Companion — right-click → "Find keywords for this site"; 5 free results funnel
- ☐ V2-4: Google Search Console integration — OAuth, overlay rankings on Jackpot results, "low-hanging fruit" tab; Pro tier
- ☐ V2-5: Keyword Monitoring Dashboard — track volume/CPC changes monthly, email alerts; Pro+
- ☐ V2-6: Competitor Gap Analysis — side-by-side keyword comparison, "they rank, you don't" report; Agency tier

### AEO Scan module (parallel track)
- ☐ AEO-1: Decide location (`packages/aeo-scan/` workspace vs. `scripts/aeo-scan/` tool-only). Lean workspace if migrating to Cloud Function later.
- ☐ AEO-2: Decide language — TypeScript (reuses JK Gemini client) vs. Python. Default TS.
- ☐ AEO-3: Implement buyer-voice query generator (Gemini, new prompt template)
- ☐ AEO-4: Citation capture across 4 surfaces — Gemini grounding, OpenAI Responses `web_search`, Perplexity Sonar, SerpAPI/DataForSEO for Google AI Overview
- ☐ AEO-5: Citation classification (Reddit/Medium/vendor blog/YouTube/docs/forum)
- ☐ AEO-6: AEO Score aggregation (visibility × platform coverage × citation quality)
- ☐ AEO-7: Non-determinism mitigation (2–3x runs, aggregate)
- ☐ AEO-8: Output CSV + Markdown score card; CLI args (product/URL, query count, output)
- ☐ AEO-9: A-2 validation — run against GovToolsPro, BulkListingPro, MarkItUp, JackpotKeywords (5 buyer-voice queries each); decide migrate to product or park
- ⊘ AEO-10: A-3 JK product integration — blocked: requires MVP shipped + A-2 validated. Port to `packages/functions/src/aeo/` Cloud Function, wrap in auth + credits, add to results pages, credit cost 3–5x keyword scan

### Agent SDK expansion track
- ☐ AGENT-1: Full-Funnel Campaign Agent (priority #1, new $29/mo tier) — desc + goal (SEO/PPC/Amazon) → keyword research + content brief OR ad copy OR listing copy. Add `packages/agents` workspace, expose keyword-search as MCP tool. CLI first, validate with 3 unlimited users before Stripe tier.
- ☐ AGENT-2: Saved-Search Watcher (priority #2 — overlaps V2-5) — weekly re-run + diff + opportunity/CPC digest email. Consider consolidating with V2-5.
- ☐ AGENT-3: Niche Auditor (priority #3 — $49 one-time or $149/mo agency) — niche → 15–25 page competitive audit PDF. Fits with V2-6.

### MCP/API distribution (cross-portfolio playbook)
- ⊘ MCP-SUB-2: awesome-mcp-servers PR #6960 (punkpeye) — `Add smythmyke/jackpotkeywords-mcp-server (Marketing)` — filed, awaiting Frank's review. Backlog is ~1,300 PRs; expect weeks. Check periodically: `gh pr view 6960 --repo punkpeye/awesome-mcp-servers --json state,reviewDecision`.
- ⊘ MCP-SUB-3: MCP.so issue #2528 at `chatmcp/mcpso` — filed, awaiting. Check: `gh issue view 2528 --repo chatmcp/mcpso --json state`.
- ✗ MCP-SUB-4: appcypher/awesome-mcp-servers — DROPPED, maintainer disabled PRs/issues 2026-05-26.
- ☐ MCP-V11-1: v1.1 tools — surface usage data after launch; add new tools driven by what real MCP clients call most.

### MCP monetization & Claude Connector Directory (2026-06-02 dashboard review)
*New surfaces from the MCP-monetization review — not in the original distribution playbook. Of the 4 portfolio MCPs, none do agent-to-agent payments or are listed in Anthropic's Connector Directory yet. **JK is the designated portfolio pilot** — prove the pattern here, then clone to MarkItUp / patent-search / GovToolsPro.*

**Portfolio sequencing (2026-06-06 deep-research, 24 verified claims — full report: `docs/api-deployment/MONETIZATION-SURFACES-RESEARCH-2026-06-06.md`):** Claude Connector Directory is the highest-leverage surface NOW (free cross-client distribution; off-platform Stripe is the only model it supports; zero publisher analytics → self-instrument); ChatGPT Apps = referral-only now, highest ceiling 12–24mo IF OpenAI ships digital-goods monetization (in-app checkout is private-beta physical-goods-only; Instant Checkout killed Mar 2026 — Walmart in-chat conversion 3x worse than click-out); x402 stays PARKED (research independently confirms the X402-1 park: ~half of volume artificial per Artemis, ~$28K/day real). NO verified indie publisher earns meaningfully on ANY AI-native surface — all revenue is off-platform billing. Order: (1) GovToolsPro directory listing + funnel instrumentation (its backend ROADMAP), (2) JK CONN-1 finish+submit = A/B baseline, (3) GovToolsPro ChatGPT app as lead-gen, (4) x402 unchanged, (5) zero further investment in RapidAPI/Zapier/n8n.
- ✅ DOC CONFLICT RESOLVED 2026-06-07: the roadmap was right — OAuth IS wired and live (`mcp.ts` `resolveAuth()` + `services/mcpOAuth.ts`, commits 1cce9ae/86231e8; the dev bypass only activates when `JK_MCP_DEV_AUTH` is set, OFF in prod). The playbook's §4 "current state" was stale (copied from the 06-03 plan, pre-OAuth).
- ☐ CONN-2: Post-review follow-ups — when the listing goes live: verify s2 favicon shows the gold J; watch `apiCalls` for the reviewer's first metered `source:'mcp'` call (= the non-admin billing-deduction proof); then measure `source:'mcp'` signups/usage (listed ≠ traffic per [[project_demand_diagnosis]]). If rejected, fix + resubmit (feedback arrives via the contact email).
- ☐ SURF-3-SUBMIT: OpenAI Apps submission off the same connector assets (brand/funnel only — OpenAI bans in-app digital-credit sales). All the remote-MCP + OAuth work is shared; listing copy adapts from `CONNECTOR-LISTING-COPY.md`.
- ⏸ X402-1: **PARKED 2026-06-02 pending demand** (decision after volume research). x402's *entire* network does ~$28k/day, ~half wash-trading, and volume FELL ~77% Nov 2025→May 2026 — demand "just isn't there yet" (CoinDesk). JK's API itself has 0 signups, so the bottleneck is demand/discovery, not payment friction; agents that do pay for APIs pay by card today (= JK's existing prepaid `jk_live_`+`/v1/topup` model). 1a code stays parked behind the flag at **$0** (don't delete, don't prod-enable, don't build MPP, skip the `--live` test). **Revisit triggers (act only when one fires):** (1) JK gets real paying API users AND one asks to pay per-call without a key; OR (2) a managed rail (AWS Bedrock AgentCore Payments / Stripe MPP) turns this from a build into a config. Waiting is cheap and the integration cost is falling. Full analysis: X402-PILOT-PLAN §11 + volume note. ⏬ *Original pilot description retained below for when a trigger fires:*
- ☐ X402-1: **Portfolio x402 pilot.** Add an x402 / HTTP-402-gated metered path so autonomous agents pay-per-call without a human Stripe checkout. Stripe x402 for USDC on Base is **live (preview, Feb 2026)** — confirmed 2026-06-02; settlement is an ordinary crypto `PaymentIntent` so it stays inside the existing Stripe account; an MCP tool returns `402` to gate, with zero JSON-RPC schema change. Pilot on `recommend-deep` (**$0.30** — `recommend` is $0.10, not $0.30 as earlier noted) behind a `JK_X402_ENABLED` flag. Low-cost bet on agent-to-agent demand; expand only if 402 traffic appears. **Full design + open decisions: `docs/api-deployment/X402-PILOT-PLAN-2026-06-02.md`.** Two friction points to plan around: Stripe's `@x402/*` stack is ESM/Hono while Functions are CJS/Express (hand-roll the 402, same as SURF-3), and Stripe's per-tx crypto fee is unpublished (gates the price/economics — confirm before prod).
  - ◐ X402-1a: **code built + tsc-clean + offline tests pass; NOT deployed, e2e blocked on user.** `services/x402.ts` + flag-gated `POST /v1/x402/recommend` written (flag off → 404, prod-safe); `'x402'` source + `recordX402Call()` added to `apiCredits.ts`; `JK_X402_ENABLED`/`JK_X402_PRICE_CENTS` documented in `.env`/`.env.example`. Local harness `scripts/test-x402-local.cjs` passes offline (flag/price/proof/challenge units + HTTP 404/400 contract) and has a `--live` mode for the Stripe sandbox round-trip (create PI → `simulate_crypto_deposit` → verify → refund). **BLOCKED ON USER:** request "Stablecoins and Crypto" in the Stripe **sandbox** dashboard (US-only; JK qualifies), then run `node scripts/test-x402-local.cjs --live`. NOTE: payment proof is spike-simplified (client echoes the PI id), not real x402 EIP-712 wire format → `purl`/`@x402` middleware won't drive it as-is (real wire format = 1b).
  - ☐ X402-1b: prod-enable one route (`recommend-deep`), add `source:'x402'` to dashboard attribution, watch for real 402 traffic. **D2 fee RESOLVED 2026-06-02: Stripe stablecoin/crypto rail is a flat 1.5%, no fixed fee → on $0.30 = $0.0045 (~98.5% margin), no micro-pricing floor; the kill-switch risk is gone and `recommend` @ $0.10 is also viable.** Still needs SDK v14 → preview upgrade + real EIP-712 wire format before flipping on.
  - ☐ X402-1c: **expansion — Machine Payments (x402 + MPP).** If 1b shows demand: (i) write `X402-REPLICATION-RUNBOOK.md` + clone to MarkItUp / patent-search / GovToolsPro; (ii) **evaluate Stripe MPP** (`docs.stripe.com/payments/machine/mpp`, launched 2026-03-18) to add **card-paying agents** via Shared Payment Tokens alongside crypto — `mppx`'s `Mppx.compose` serves card+crypto in **one 402 endpoint** (agent picks), eventually superseding the hand-rolled `services/x402.ts`. Decision analysis in X402-PILOT-PLAN §11. **Gate MPP on:** GA status (currently preview), confirmed SPT pricing + a sub-$0.50 workaround (SPT min charge = $0.50 > JK's $0.30 — reprice/bundle/session-balance), and a Base-vs-Tempo crypto-network call (Stripe x402=Base, MPP crypto=Tempo). NOTE: "lead with card" is largely already served by the prepaid `jk_live_`+`/v1/topup` model; MPP-SPT's *new* value is zero-onboarding inline first-touch, bounded by the Link-SPT requirement. Else park behind the flag (off = $0).

### Organic traffic / SEO — THE actual bottleneck (2026-06-02)
Root cause of 0 demand: **Google has indexed 0 pages** (0 impressions/28d; `site:` returns nothing; sitemap "couldn't fetch" — a stale/transient error, XML is spec-perfect). Full analysis + playbook: `docs/SEO-INDEXING-AND-PROGRAMMATIC-TRAFFIC-2026-06-02.md`. Sequence below is **index → earn authority → scale**; do NOT scale pSEO/GEO before authority exists.
- **Step 1 — index + Tier-A plumbing (cheap, now):**
  - ☐ GSC (user): Request Indexing on `/`, `/pricing`, `/blog` + top posts; confirm no Manual Action; wait out "couldn't fetch" (don't spam-resubmit; rename sitemap file if stuck >2wk).
  - ◐ IndexNow — BUILT 2026-06-02: `packages/web/scripts/indexnow-ping.mjs` + key file `public/e1a3cdeac1295499cfed1406f581ce3b.txt` + `npm run indexnow`. Gets URLs into Bing→ChatGPT. **Run after next deploy** (key file must be live first).
  - ✅ Schema/JSON-LD — already present (home SoftwareApplication+FAQ, blog BlogPosting+FAQ); added Organization+WebSite to home 2026-06-02. ✅ llms.txt — already present + solid.
  - ☐ Bing Webmaster Tools (user): submit sitemap (separate pipeline, feeds ChatGPT).
- **Step 2 — earn first authority:**
  - ⭐ TODAY (2026-06-02): **Build "JackpotKeywords vs Ahrefs vs SEMrush: The Affordable AI Alternative" comparison page.** Double-duty: SEO (targets real audit-confirmed volume — "semrush" 90.5k, "ahrefs" 49.5k, "[tool] alternative" terms) + AEO (the self-audit's #1 AI-visibility action; competitors own 100%/75% of AI answers vs JK 0%). Dedicated prerendered page + sitemap entry + schema.
  - ✅ Product Hunt launch — DONE. (Optional remaining: r/SEO / Indie Hackers / Show HN — see `[[project_jackpot_press_plan]]`.)
  - ◐ MCP-directory backlinks already pending (awesome-mcp PR #6960, mcp.so #2528) — merge = inbound links.
  - ☐ Custom domain decision (e.g. jackpotkeywords.com) — more trust + linkable than shared `*.web.app`.
- **Step 3 — scale (only after authority):** gradual, quality-gated programmatic SEO on JK's own keyword data; GEO via dogfooding the AEO scanner. Risk: mass thin pages on a new domain get penalized — quality gates mandatory.

### SEO Audit product — expansion (checks #1–9) — ◐ BUILT 2026-06-03, NOT DEPLOYED
◐ Added 9 audit checks (the current audit graded "crawl-able?" not "indexable/indexed?" — it scored JK 98/100 while JK had 0 indexed pages). Full plan: `docs/SEO-AUDIT-EXPANSION-PLAN-2026-06-02.md`. **Built + tsc-clean (functions + web) + live-tested against jackpotkeywords.web.app: all 9 checks fire, 2 new categories score, overall 98→88 (now reflects real 8.7s LCP). DEPLOY: `firebase deploy --only functions,hosting` (functions = new checks; hosting = renderer category arrays + prerender schema + IndexNow key). Local harness: `packages/functions/scripts/test-seo-audit-local.cjs`. Checks: (1) sitemap-in-robots, (2) sitemap validity/content-type, (3) canonical correctness, (4) X-Robots-Tag noindex, (5) HTTP status/redirect, (6) AI-crawler access [NEW ai_readiness category], (7) llms.txt [ai_readiness], (8) performance/CWV via PageSpeed API [NEW performance category], (9) image alt-text. Linchpin = fetch-layer refactor (capture status+headers). **Shelved:** keyword-rank check (Serper-metered), GSC index coverage (owner-OAuth), backlinks (paid), IndexNow-usage (undetectable). **Blocked on 2 user decisions:** PageSpeed API key (or defer #8), approve category weights.

### Automation surfaces (n8n / Zapier / OpenAI) — promoted to active 2026-05-28
All three promoted from "conditional" to active as a deliberate *discovery experiment* (427 npm downloads, 0 signups → read as a findability problem). **Pre-build verification found every surface breaks the "thin wrap" assumption to a different degree** — so the build order is by actual effort, not by directory reach. Full detail in `docs/api-deployment/DEPLOYMENT-PLAN-2026-05-25.md`.
- ✓ SURF-1 (n8n) **— PUBLISHED 2026-05-28, the only true thin wrap.** `n8n-nodes-jackpotkeywords@0.1.0` live on npm (maintainer smythmyke), source at `n8n-node/`. Declarative-routing node, 5 ops (aeo-scan/balance/recommend/recommend-deep/audit), API-key credential (`Bearer jk_live_`, test=GET /me), 300s timeout, `jackpotkeywords-n8n` UA, direct Cloud Function URL. Zero backend changes. Verified: strict tsc build, eslint-plugin-n8n-nodes-base lint clean, runtime load, live URL routes, real /me 200. **Remaining:** install + run in a real n8n instance (user verification); optional n8n verified-community submission; optional standalone-repo split.
- ◑ SURF-2 (Zapier) **— BACKEND DEPLOYED + E2E TESTED IN PROD 2026-05-28, pending interactive push.** Solved the 30s-timeout problem with an async job layer. **Backend (LIVE on even-plate-378520):** `POST /v1/jobs` + `GET /v1/jobs/:id` (v1.ts), `apiJobs.ts` service (Firestore `apiJobs/{id}`), `processApiJob` Firestore onCreate trigger (index.ts) that runs the job by calling the existing sync endpoint via an internal-secret auth branch (`apiKeyAuth.ts`, `JK_INTERNAL_JOB_SECRET`), then POSTs the result to the caller's callback URL (SSRF-allowlisted to zapier.com). Billing/pipeline code untouched. **E2E PASS:** validation guards all 400; recommend job processing→success in ~52s; balance 200¢→190¢ proving internal auth + billing work. **App** (`zapier-app/`, `jackpotkeywords-zapier` v0.1.0, core 19.0.0): Recommend + AEO Scan via `z.generateCallbackUrl`/`performResume` → `/v1/jobs`; Get Balance sync. `zapier validate`: 27/27 pass. **PUSHED to Zapier 2026-05-28** (app ID 242241, v0.0.0 — Zapier requires first version = 0.0.0; CLI is `zapier-platform`, renamed from `zapier` in v19). **Remaining (user dogfooding):** test (`zapier-platform invoke` or a test Zap in the editor — exercises the hooks.zapier.com callback leg); iterate + bump version; submit for public review (4-6wk).
- ☐ SURF-3 (OpenAI Apps SDK) **— ⭐ NEXT BUILD (the last surface).** NOT a thin wrap, the heaviest. ChatGPT requires **OAuth 2.1** for remote MCP; API keys explicitly unsupported (verified at developers.openai.com/apps-sdk/build/auth). **GATING DECISION before coding:** managed provider (Stytch [most explicit Apps-SDK guide — recommended] / Auth0 / WorkOS) hosts the OAuth 2.1 server + DCR, we map identity→JK credit account — vs. self-built minimal OAuth 2.1 in Firebase. Then: remote MCP over Streamable HTTP (npm server is stdio); reuse 5 tools + `mcp-server/src/api/client.ts` verbatim; mount on existing `api` Cloud Function; functions is CommonJS while SDK is ESM-only (hand-roll JSON-RPC or dynamic import); `jackpotkeywords-openai` UA. **Alternative under consideration:** pause surfaces, dogfood n8n + Zapier first to see if traffic appears before the OAuth lift.
- ☐ SURF-ATTR-1 (deferred): granular surface attribution — widen `ApiSource` beyond `'mcp'|'api'` + per-surface UA resolver (`apiKeyAuth.ts`); add columns to `platforms.json` in sellerdashboard repo. Build surfaces forward-compatible (distinct UA per surface) so this is a later no-client-change unlock.
- ☐ SURF-ATTR-2 (deferred): split Claude vs Cursor MCP traffic — same npm/stdio server + UA can't distinguish; capture MCP `initialize` `clientInfo.name`, forward to REST, bucket server-side.

### Tech debt
- ☐ TD-1: Unit tests for scoring formulas
- ☐ TD-2: Integration tests for search pipeline
- ☐ TD-3: CI/CD (GitHub Actions → Firebase deploy)
- ☐ TD-4: Monitor API costs + rate limits
- ☐ TD-5: Error reporting (Sentry or similar)
- ☐ TD-6: Regular Gemini prompt tuning based on user feedback

## DONE (recent wins)

- ✓ 2026-06-07 — 🎰 **CONN-1: SUBMITTED to the Claude Connector Directory** — all 4 phases shipped same-day off the playbook: contamination fix deployed (3ab202b), async job pattern + full 7-tool set live on `https://jackpotkeywords.web.app/api/mcp`, all 7 tools e2e-tested through the real connector (Claude.ai web + Claude Code), cluster naming + relevance gating (67e0dd1/edbc597), audit/AEO transcript formatters (fc1b3e0 — fixed claude.ai "undefined" reports), 25k-token payload cap (aa1b10b), RFC 9728 path-insert PRM (46edd42). Reviewer `mcp-review@anthropic.com` seeded $10; screenshots+logo in Drive; submitted WITH the `keyword-research-workflow` Skill (public mcp-server repo, free Skills-directory cross-promo). Verbatim form question bank for the next product: `docs/api-deployment/MCP-DIRECTORY-FORM-QUESTIONS-2026-06-07.md`. ~2wk review; FREEZE: keep reviewer login working ≥30d, no WorkOS changes. Known cosmetic: Google s2 favicon cache lagging (disclosed on the form).
- ✓ 2026-06-07 — ANNOT-1: tool annotations (`title` + `readOnlyHint` etc.) confirmed on all 7 remote-connector tools — the #1 directory rejection cause, cleared pre-submission.
- ✓ 2026-05-28 — **v1 API surface expanded + free tier recalibrated.** Shipped two new endpoints: `POST /v1/recommend-deep` ($0.30 — adds parallel competitor discovery + clusters + categories + competitor brands to recommend's response) and `POST /v1/audit` ($0.50 — SEO-only audit reusing the consumer `runSeoAudit` pipeline, AEO sold separately). Signup credit reduced $5 → $2 (sized to 2 AEO scans, the moat product); topup packs gained `mini` $5 tier, custom-min dropped $25 → $5. Driver: 427 npm downloads with 0 real signups against the old config. Deploy: `firebase deploy --only functions,hosting` to `even-plate-378520`. MCP server v0.2.0 built locally with two matching tools (`jackpotkeywords_recommend_deep`, `jackpotkeywords_audit`) — npm publish + MCP Registry + GitHub Release pending. Docs updated: `PRICING-RESEARCH-2026-05-23.md` (revision section + new endpoints in price table), `DEPLOYMENT-PLAN-2026-05-25.md` (revision section + current-state list).
- ✓ 2026-05-27 — MCP server live on 5 surfaces — `jackpotkeywords-mcp-server@0.1.2` published to npm + Official MCP Registry (`io.github.smythmyke/jackpotkeywords-mcp-server`) + Smithery (`.mcpb` bundle, Settings tab filled, Visibility=Public) + Glama (auto-indexed from standalone repo `smythmyke/jackpotkeywords-mcp-server`) + GitHub Release v0.1.2. Adopted the MarkItUp Tier-1 + Tier-2 cloning playbook per `[[mcp-deployment-cloning-strategy]]`.
- ✓ 2026-05-25 — MCP Stage 1 shipped in a single day — leveraged existing `middleware/apiKeyAuth.ts` from prior sprint. `DEPLOYMENT-PLAN-2026-05-25.md` documented the playbook adoption from MarkItUp.
- ✓ 2026-03-28 — MVP scaffold complete. Full-stack monorepo built and compiling. All packages type-check clean. Web app builds successfully.

## DROPPED

*(none)*

---

# Reference

*Below this line is preserved-as-was reference material. The dashboard parser ignores everything from here down.*

## AEO Scan module — background

See `AEO-MODULE-RESEARCH.md` for full module design, citation-landscape research, customer-facing output spec, and risks. Originating research: `C:\Projects\ideas\reddit-seed-pipeline\VIABILITY.md`. AEO track runs in parallel — script phase (AEO-1 through AEO-8) does NOT block MVP; integration phase (AEO-10) is gated on MVP shipping first.

**Open questions to answer during AEO-3 through AEO-8:**
1. Does JK's existing Gemini client support the grounding/search tool, or only text generation?
2. Appetite for a second AI provider (OpenAI/Perplexity) in JK infra? Adds key management, billing separation.
3. Sweet-spot query count per scan (5 = cheap/shallow, 15 = thorough/expensive)?
4. Separate competitor-AEO scan type vs. bundled into main scan?

## Agent SDK Expansion track — quarterly review

See `docs/AGENT_SDK.md` for full opportunity analysis, starter code, pricing math. Beyond the three planned agents:

- Content production agent (brief → full article)
- Amazon listing optimizer (dedicated vertical)
- YouTube/TikTok short-form keyword angle
- Google Ads campaign builder (overlaps V2-1)
- Multi-language keyword research
- Competitive gap tracker (agent version of V2-6)

Review cadence: after each agent ships, re-read `C:\Projects\ideas\claude-code-research\agent-sdk.md` + check `https://code.claude.com/docs/en/agent-sdk/overview` for new capabilities.

## Related docs

- `AEO-MODULE-RESEARCH.md` — AEO module design
- `docs/AGENT_SDK.md` — Agent SDK opportunities
- `docs/api-deployment/DEPLOYMENT-PLAN-2026-05-25.md` — latest deployment plan
- `docs/api-deployment/SCORING-V2-DESIGN.md` — scoring redesign
- `docs/api-deployment/DESIGN-PARTNER-1PAGER.md` — outreach
- `docs/MCP-REGISTRY-EXPANSION-2026-05-26.md` — MCP strategy
- `docs/PORTFOLIO-OUTLOOK.md`, `PORTFOLIO-INTEGRATION-RESEARCH-2026-05-21.md` — positioning
- `docs/REVENUE-BENCHMARKS.md` — economics
- `docs/medium/` — 4 marketing-content drafts
- `KEYWORD-GOLDMINE-RESEARCH.md` — own-product keyword research (drives P5-1 ad targeting)
