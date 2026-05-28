# ROADMAP — JackpotKeywords

**Last updated:** 2026-05-27
**Scope:** Keyword research / SEO tool. Full-stack monorepo (web + Firebase Functions + shared packages). Gemini-backed seed generation, autocomplete expansion, Keyword Planner API enrichment, Google Trends overlay, Jackpot Score aggregation. MVP scaffold complete 2026-03-28; deploying to Firebase next. AEO scan module is a parallel track. Converted from Phase-structured roadmap on 2026-05-27.

<!-- DASHBOARD-META
project_key: jackpotkeywords
title: "JackpotKeywords"
purpose: "Keyword research / SEO tool — AI seed → autocomplete → Keyword Planner → Trends pipeline with Jackpot Score"
phase: "Phase 1 — Deploy MVP"
phases: ["Phase 1 — Deploy MVP", "Phase 2 — Pipeline testing", "Phase 3 — Frontend polish", "Phase 4 — Launch prep", "Phase 5 — Post-launch growth", "Phase 6 — V2 features"]
key_dates: []
-->

**Status legend:** ☐ todo · ◐ in progress · ✓ done · ⊘ blocked · ✗ dropped

> Editing rules: `C:\Projects\dashboards\project-dashboard\STRUCTURE.md`.

## ACTIVE — This Week

- ☐ FB-1: Create Firebase project (jackpotkeywords or similar)
- ☐ FB-2: `firebase init` — connect project to local repo
- ☐ FB-3: Enable Firebase Auth (Google provider)
- ☐ FB-4: Enable Firestore
- ☐ FB-5: Configure Firestore security rules (already written in `firestore.rules`)
- ☐ ENV-1: Set Gemini API key (`GEMINI_API_KEY`)
- ☐ ENV-2: Set Google Ads credentials (`GOOGLE_ADS_*` — 5 keys)
- ☐ MCP-SUB-1: Cursor Directory submission at `cursor.directory/plugins/new` (~5 min) — paste-ready content at `C:\Projects\MarkItUp\planning\CURSOR-DIRECTORY-SUBMISSIONS.md`.

## ACTIVE — Next Two Weeks

- ☐ ENV-3: Set Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) + `APP_URL`
- ☐ ENV-4: Configure via `firebase functions:config:set` or `.env` in functions
- ☐ STRIPE-1: Create 3 credit pack products ($0.99/1, $1.99/3, $4.99/10)
- ☐ STRIPE-2: Create 2 subscription products ($9.99/mo Pro, $19.99/mo Agency)
- ☐ STRIPE-3: Get Stripe price IDs, update `SUBSCRIPTION_PLANS` in `shared/credits.ts`
- ☐ STRIPE-4: Set up webhook endpoint pointing to `/api/stripe/webhook`
- ☐ AUTH-1: Add Google OAuth client to web app (firebase config in `web/src/services/`)
- ☐ AUTH-2: Build `useAuth` hook connecting Firebase Auth to backend `/api/auth/init`
- ☐ AUTH-3: Build `useCredits` hook for balance + purchases
- ☐ DEPLOY-1: `npm run build:all`
- ☐ DEPLOY-2: `firebase deploy` (functions + hosting + rules)
- ☐ DEPLOY-3: Verify health check `GET /api/health`, test auth flow E2E, test free search (blurred), test credit purchase → unblurred

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
