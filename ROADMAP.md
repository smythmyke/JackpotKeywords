# ROADMAP — JackpotKeywords

**Last updated:** 2026-05-31
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
