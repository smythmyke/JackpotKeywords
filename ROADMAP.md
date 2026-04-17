# JackpotKeywords — Development Roadmap

## Current Status: MVP Scaffold Complete (March 28, 2026)

Full-stack monorepo built and compiling. All packages type-check clean. Web app builds successfully.

---

## Phase 1: Deploy MVP (Next Session)

### 1.1 Firebase Setup
- [ ] Create Firebase project (jackpotkeywords or similar)
- [ ] `firebase init` — connect project to local repo
- [ ] Enable Firebase Auth (Google provider)
- [ ] Enable Firestore
- [ ] Configure Firestore security rules (already written in firestore.rules)

### 1.2 Environment Variables
- [ ] Set Gemini API key (`GEMINI_API_KEY`)
- [ ] Set Google Ads credentials (`GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`)
- [ ] Set Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] Set `APP_URL` for Stripe redirect URLs
- [ ] Configure via `firebase functions:config:set` or `.env` in functions

### 1.3 Stripe Setup
- [ ] Create 3 credit pack products ($0.99/1, $1.99/3, $4.99/10)
- [ ] Create 2 subscription products ($9.99/mo Pro, $19.99/mo Agency)
- [ ] Get Stripe price IDs and update `SUBSCRIPTION_PLANS` in shared/credits.ts
- [ ] Set up webhook endpoint pointing to `/api/stripe/webhook`

### 1.4 Firebase Auth Setup
- [ ] Add Google OAuth client to web app (firebase config in web/src/services/)
- [ ] Build `useAuth` hook connecting Firebase Auth to backend `/api/auth/init`
- [ ] Build `useCredits` hook for balance checking and credit purchases

### 1.5 Deploy
- [ ] `npm run build:all`
- [ ] `firebase deploy` (functions + hosting + rules)
- [ ] Verify health check: `GET /api/health`
- [ ] Test auth flow end-to-end
- [ ] Test free search (blurred results)
- [ ] Test credit purchase → unblurred results

---

## Phase 2: Search Pipeline Integration Testing

### 2.1 End-to-End Pipeline Test
- [ ] Test Gemini seed generation with real product descriptions
- [ ] Test autocomplete expansion (rate limiting, deduplication)
- [ ] Test Keyword Planner API enrichment (batch queries, error handling)
- [ ] Test Google Trends overlay (rate limiting, trend calculation)
- [ ] Test full pipeline orchestration (15-30 second execution)
- [ ] Test credit deduction and refund on failure

### 2.2 Pipeline Optimizations
- [ ] Add caching layer for Keyword Planner results (Firestore or Redis)
- [ ] Optimize autocomplete batching (parallel with delays)
- [ ] Handle Google Trends rate limiting gracefully (retry with backoff)
- [ ] Add timeout handling for long-running searches

### 2.3 Results Quality Tuning
- [ ] Tune Jackpot Score weights based on real data
- [ ] Tune Gemini prompts for seed quality (test across multiple niches)
- [ ] Validate category assignment accuracy
- [ ] Test concept report quality and verdict accuracy

---

## Phase 3: Frontend Polish

### 3.1 Results Dashboard
- [ ] Wire Results page to real API data (replace demo placeholders)
- [ ] Implement keyword sorting (by score, volume, CPC, competition)
- [ ] Implement keyword filtering (by category, score range, volume range)
- [ ] Show category keyword counts in tabs
- [ ] Implement paywall overlay (blur + unlock CTA for free users)
- [ ] Implement score view toggle (Ad Score ↔ SEO Score)

### 3.2 Concept Report Page
- [ ] Build ConceptReport.tsx with demand score, competition, opportunity breakdown
- [ ] Show related niches section
- [ ] Show budget analysis (if budget was entered)
- [ ] Show truncated 15-keyword preview at bottom
- [ ] CTA: "Run full keyword search" (unlocks full table, no extra credit)

### 3.3 Search Experience
- [ ] Wire SearchProgress component to real pipeline step updates (SSE or polling)
- [ ] Add error handling and retry UI
- [ ] Add "search again with different description" flow
- [ ] Mobile responsive layout

### 3.4 Account Page
- [ ] Show user profile (Google avatar, email, plan)
- [ ] Show credit balance and transaction history
- [ ] Show saved searches list with links to results
- [ ] Subscription management (upgrade/cancel via Stripe portal)

### 3.5 Export Features
- [ ] CSV export (all keywords with metrics)
- [ ] Wire export button to generate and download CSV
- [ ] Disable export for free/credit users if we decide to gate it (currently all paid users get export)

---

## Phase 4: Launch Preparation

### 4.1 Domain & SEO
- [ ] Register domain (jackpotkeywords.com or keymine.com)
- [ ] Set up DNS → Firebase Hosting
- [ ] Add meta tags, OG images, Twitter cards
- [ ] Create robots.txt and sitemap.xml
- [ ] Add structured data (SoftwareApplication schema)

### 4.2 Landing Page Optimization
- [ ] Add feature explanation sections below the fold
- [ ] Add "How it works" (3-step visual)
- [ ] Add comparison table (vs SEMrush, Ahrefs, Ubersuggest)
- [ ] Add testimonials section (placeholder, fill after launch)
- [ ] Add FAQ section targeting "free keyword research tool" queries

### 4.3 Analytics
- [ ] Set up Google Analytics 4
- [ ] Set up conversion tracking (free search → credit purchase → subscription)
- [ ] Track search pipeline performance metrics

### 4.4 Error Handling & Edge Cases
- [ ] Handle API key exhaustion / rate limiting gracefully
- [ ] Handle empty results (no keywords found)
- [ ] Handle very short descriptions (prompt user for more detail)
- [ ] Handle URL scraping failures
- [ ] Input validation and sanitization

---

## Phase 5: Post-Launch Growth

### 5.1 Google Ads Campaign
- [ ] Use our own keyword research (KEYWORD-GOLDMINE-RESEARCH.md) to set up ads
- [ ] Create ad groups per KEYWORD-GOLDMINE-RESEARCH.md recommendations
- [ ] Target "free keyword research tool" (6,600/mo, $1.90 CPC)
- [ ] Target "ubersuggest" (22,200/mo, $0.76 CPC)
- [ ] Target "semrush alternative" (1,900/mo, $10.84 CPC)
- [ ] Budget: $11/day across 5 ad groups

### 5.2 Content Marketing
- [ ] Blog: "JackpotKeywords vs SEMrush — 14x cheaper with AI scoring"
- [ ] Blog: "How to find goldmine keywords for your product in 30 seconds"
- [ ] Blog: "Free keyword research tool — why we built JackpotKeywords"
- [ ] YouTube: Demo video showing a real product search

### 5.3 Product Hunt Launch
- [ ] Prepare PH listing (tagline, screenshots, video)
- [ ] Schedule launch day
- [ ] Prepare social media announcement

---

## Phase 6: V2 Features (Post-Launch)

### 6.1 Google Ads Campaign Builder Export
- [ ] Generate Google Ads Editor CSV from search results
- [ ] Include match types, CPC bids, ad group structure
- [ ] Pro+ feature

### 6.2 Branded PDF Goldmine Reports
- [ ] Generate PDF with charts, tier rankings, recommendations
- [ ] Agency branding options (logo, colors)
- [ ] Agency tier feature

### 6.3 Chrome Extension Companion
- [ ] Right-click any website → "Find keywords for this site"
- [ ] Shows 5 free results → funnels to web app
- [ ] Competitive spy: scrape competitor page + run analysis

### 6.4 Google Search Console Integration
- [ ] OAuth connection to user's GSC
- [ ] Overlay actual rankings/impressions on Jackpot results
- [ ] "Low-hanging fruit" tab (keywords already ranking that have high Jackpot Scores)
- [ ] Pro tier feature

### 6.5 Keyword Monitoring Dashboard
- [ ] Save goldmine keywords → track volume/CPC changes monthly
- [ ] Email alerts: "Keyword X dropped from $0.85 to $0.40 CPC — bid now"
- [ ] Pro+ feature

### 6.6 Competitor Gap Analysis
- [ ] Enter your URL + competitor URL
- [ ] Side-by-side keyword comparison
- [ ] "They rank for X, you don't" gap report
- [ ] Agency tier feature

---

## AEO Scan Module Track

See `AEO-MODULE-RESEARCH.md` for full module design, citation-landscape research, customer-facing output spec, and risks. Originating research: `C:\Projects\ideas\reddit-seed-pipeline\VIABILITY.md`. This track runs in parallel to the core roadmap — script phase (A-1, A-2) does **not** block MVP; integration phase (A-3) is gated on MVP shipping first.

### Phase A-1: Reconnaissance script (standalone CLI, lives in this repo)

Script is a separate CLI/package inside the JK monorepo — does **not** hit the web app, Firebase auth, or credit system in this phase.

- [ ] Decide location: `packages/aeo-scan/` (monorepo workspace) vs. `scripts/aeo-scan/` (tool-only). Lean toward workspace if logic is likely to migrate to Cloud Function.
- [ ] Decide language: TypeScript (reuses existing JK Gemini client and prompt helpers) vs. Python (richer AI library ecosystem). Default to TypeScript unless library gaps force otherwise.
- [ ] Implement buyer-voice query generator (Gemini) — new prompt template, distinct from keyword-seed prompt
- [ ] Implement citation capture across 4 surfaces:
  - [ ] Gemini API with grounding/search tool
  - [ ] OpenAI Responses API with `web_search` tool
  - [ ] Perplexity Sonar API
  - [ ] SerpAPI or DataForSEO for Google AI Overview extraction (lowest reliability — expect partial coverage)
- [ ] Implement citation classification (Reddit thread / Medium article / vendor blog / YouTube / docs / forum / other)
- [ ] Implement AEO Score aggregation (visibility × platform coverage × citation quality)
- [ ] Implement non-determinism mitigation (run each query 2–3x, aggregate)
- [ ] Output: CSV (per-query citation table) + Markdown (score card + action list)
- [ ] CLI args: product description OR URL, query count, output path

### Phase A-2: Internal validation against Michael's products

- [ ] Run script against GovToolsPro with 5 buyer-voice queries
- [ ] Run against BulkListingPro with 5 queries
- [ ] Run against Markitup with 5 queries (requires product description)
- [ ] Run against JackpotKeywords itself (eat own dogfood; also informs JK's own launch AEO strategy)
- [ ] Critical read: signal-to-noise ratio, action list usefulness, score correlation with real competitive reality
- [ ] Decision point: migrate into JK product (→ Phase A-3) or park

### Phase A-3: JK product integration (gated: MVP shipped + A-2 validated)

- [ ] Port script logic into `packages/functions/src/aeo/` as Cloud Function
- [ ] Wrap in existing Firebase auth + credit system
- [ ] Add "Run AEO Scan" action on Flow A and Flow B results pages
- [ ] Credit cost model: 3–5x keyword scan (4 API surfaces per query, 2–3 reruns each)
- [ ] Pricing decision: Pro-tier gated feature vs. premium credit pack vs. both
- [ ] Free tier hook: 1 free AEO scan at signup (parallel to 3 free keyword searches)
- [ ] Build AEO Report UI: per-query citation table + AEO Score card + action list
- [ ] Update Stripe if new credit pack is introduced
- [ ] Landing page feature section and marketing copy
- [ ] Update PRODUCT-DESIGN.md with the new flow

### Open questions (answer during A-1 build)

1. Does JK's existing Gemini client support the grounding/search tool, or only text generation?
2. Appetite for a second AI provider (OpenAI/Perplexity) in JK infra? Adds key management, billing separation.
3. Sweet-spot query count per scan (5 = cheap/shallow, 15 = thorough/expensive)?
4. Separate competitor-AEO scan type vs. bundled into main scan?

---

## Agent SDK Expansion Track

See `docs/AGENT_SDK.md` for full opportunity analysis, starter code, and pricing math. This track layers on top of the core product once Phase 1–3 ship — not a replacement for existing roadmap.

### Near-term agents (after core ships)

- [ ] **Full-Funnel Campaign Agent** (priority #1 — new $29/mo tier)
  - Description + goal (SEO / PPC / Amazon) → keyword research + content brief OR ad copy variants OR listing copy
  - Architecture: add `packages/agents` workspace, expose existing keyword-search as custom MCP tool
  - First step: build as CLI script, validate with 3 unlimited-tier users before wiring Stripe tier
- [ ] **Saved-Search Watcher** (priority #2 — overlaps with 6.5 Keyword Monitoring Dashboard)
  - Weekly re-run saved searches, diff against last week, email digest of opportunities and CPC shifts
  - Consider consolidating with planned 6.5 work to avoid duplicate effort
- [ ] **Niche Auditor** (priority #3 — $49 one-time or $149/mo agency)
  - Niche in → 15–25 page competitive audit PDF
  - Fits naturally with existing 6.6 Competitor Gap Analysis

### Explore Agent SDK for more opportunities

**Task:** Revisit `docs/AGENT_SDK.md` quarterly as the SDK evolves and user data accumulates. Candidate areas beyond the three above:

- Content production agent (brief → full article)
- Amazon listing optimizer (dedicated vertical)
- YouTube/TikTok short-form keyword angle
- Google Ads campaign builder (overlaps with existing 6.1)
- Multi-language keyword research
- Competitive gap tracker (agent version of 6.6)

Review cadence: after each agent ships, re-read `C:\Projects\ideas\claude-code-research\agent-sdk.md` and check `https://code.claude.com/docs/en/agent-sdk/overview` for new capabilities.

---

## Technical Debt & Maintenance

- [ ] Add unit tests for scoring formulas
- [ ] Add integration tests for search pipeline
- [ ] Set up CI/CD (GitHub Actions → Firebase deploy)
- [ ] Monitor API costs and rate limits
- [ ] Set up error reporting (Sentry or similar)
- [ ] Regular Gemini prompt tuning based on user feedback
