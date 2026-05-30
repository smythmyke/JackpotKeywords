# API Deployment — Research & Plans

Active planning for JackpotKeywords' public API, MCP server, and marketplace integrations. All Shape A / Shape A-prime / Shape B / Shape C decisions and Phase 0–6 deployment work tracked here.

## Documents in this folder

- **`DEPLOYMENT-PLAN-2026-05-25.md`** — **Active plan.** Streamlined solo-dev playbook adopted after comparison with MarkItUp's API/MCP execution model. Drops design-partner framing and coordinated launches; self-serve from day one, dogfood-only builds, Path D for `/v1/score`.
- **`RAPIDAPI-PILOT-PLAN.md`** — Build plan for the RapidAPI marketplace surface (portfolio pilot). RapidAPI-as-ledger model, `X-RapidAPI-Billing`/`Credits` quota mapping, proxy-secret auth shim, phased backend + listing + pricing + launch checklist.
- **`openapi-rapidapi.yaml`** — OpenAPI 3.0 spec for the RapidAPI listing's Definitions tab (one-click import). Covers `/recommend`, `/recommend-deep`, `/audit`, `/aeo-scan`, `/me` with request/response schemas + per-endpoint Credit costs.
- **`DEPLOYMENT-PLAN-2026-05-23.md`** — Superseded predecessor. Six-phase plan combining composite-scoring refactor with API/MCP/marketplace surfaces. Preserved for history.
- **`SCORING-V2-DESIGN.md`** — refactor sketch for `scoring.ts` v2 with composite signal weights. Phase 0 shipped 2026-05-23.
- **`PRICING-RESEARCH-2026-05-23.md`** — competitor pricing audit + locked decisions (PAYG model, per-call prices, $5 signup credit). Q1 resolved 2026-05-23.
- **`DESIGN-PARTNER-1PAGER.md`** — Drafted under prior plan; deprecated by 2026-05-25 revision. Retained as reference for the worked API examples it contains.

## Related research (already in `docs/`)

- **`../REVENUE-BENCHMARKS.md`** — 2026-05-19 audit of Shape A/B/C against Google Ads API ToS, including the SerpAPI lawsuit context. **Read this first.**
- **`../AEO-API-RESEARCH-2026-05-21.md`** — Shape C (AEO scan) market and pricing.
- **`../AGENT_SDK.md`** — Claude Agent SDK + MCP server design for exposing keyword search to agents.
- **`../PORTFOLIO-INTEGRATION-RESEARCH-2026-05-21.md`** — cross-project workflow unification.
- **`../PORTFOLIO-OUTLOOK.md`** — portfolio-level revenue/strategy outlook.

## Related memories

- `project_ads_tos_derived_score` — Shape A-prime legal/architectural analysis (derived scores vs raw KP resale)
- `project_relevance_scoring` — existing Gemini `aiRelevance` pipeline
- `reference_platform_suggest_apis` — non-Google demand signals (YouTube/Amazon/Bing/eBay/Pinterest/DuckDuckGo)
- `reference_google_ads_api_gotchas` — existing Ads API constraints
