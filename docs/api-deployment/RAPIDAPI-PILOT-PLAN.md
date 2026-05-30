# RapidAPI Pilot — Build Plan (JackpotKeywords)

**Date:** 2026-05-29
**Status:** Planned — not started. JK is the portfolio's first RapidAPI surface (best fit + lowest effort; patent-search and GovToolsPro reuse this playbook).
**Parent plan:** [`DEPLOYMENT-PLAN-2026-05-25.md`](./DEPLOYMENT-PLAN-2026-05-25.md) → Conditional surfaces → RapidAPI entry.
**Cross-portfolio surface tracker:** `C:/Projects/MarkItUp/planning/MCP-DISTRIBUTION-SURFACES.md`.

> **What this is.** RapidAPI (Rapid Hub) is a REST-API *marketplace + gateway*, **not** an MCP surface. It proxies developer traffic to JK's existing v1 REST endpoints, meters/bills its own subscribers, and pays out 75% (25% marketplace fee, PayPal-only, ~5–6 weeks after charge). This plan adds RapidAPI as a parallel distribution channel with **near-zero change to JK's internal billing** — RapidAPI is the ledger for this channel.

---

## Locked decisions (2026-05-29)

| Decision | Choice | Consequence |
|---|---|---|
| **Billing model** | **RapidAPI is the ledger.** RapidAPI consumers do *not* get a `jk_live_` key or a JK `balanceCents`. RapidAPI meters per-call via the `X-RapidAPI-Billing` header and bills its own subscribers. | No JK credit account per consumer. JK reconciles the monthly 75% PayPal payout. Internal credit ledger stays for direct/MCP/n8n customers only. |
| **Endpoint scope** | **Full v1 data surface:** `/recommend`, `/recommend-deep`, `/aeo-scan`, `/audit`. Plus a RapidAPI-specific `/me`-style health/plan endpoint. | Account-management endpoints (`/signup`, `/topup`, `/keys`, `/jobs`) are **NOT** listed — they make no sense when RapidAPI owns billing. |
| **Deliverable now** | This plan doc only; no code yet. | Backend shim + listing config are the build phases below. |

---

## How JK's v1 works today (grounding)

All under `packages/functions/src/api/v1.ts`, mounted as the Express `/v1` router; auth via `middleware/apiKeyAuth.ts`; per-key rate limit via `middleware/apiRateLimit.ts`.

- **Auth:** `Authorization: Bearer jk_live_<key>` → `getCustomerByApiKey()` → `req.apiCustomer`. (Also an internal `x-internal-secret` path for the async job worker.)
- **Billing per call:** each data endpoint checks `c.balanceCents >= COST`, calls `deductBalance(c.id, COST, endpoint, source)`, runs the pipeline, returns 200; on failure returns **500** after `refundBalance()`. Costs (cents, `apiCredits.ts:32-35`):

  | Endpoint | Constant | Cost |
  |---|---|---|
  | `/v1/recommend` | `RECOMMEND_COST_CENTS` | 10¢ ($0.10) |
  | `/v1/recommend-deep` | `RECOMMEND_DEEP_COST_CENTS` | 30¢ ($0.30) |
  | `/v1/audit` | `AUDIT_COST_CENTS` | 50¢ ($0.50) |
  | `/v1/aeo-scan` | `AEO_SCAN_COST_CENTS` | 100¢ ($1.00) |

- **Billing-exempt already exists:** `deductBalance()` (`apiCredits.ts:333-342`) skips the balance mutation when the account is admin (`ADMIN_EMAILS`), but **still writes the `apiCalls` analytics doc**. This is the mechanism the RapidAPI house account rides on.
- **Source attribution:** `req.apiSource` is `'mcp' | 'api'`, derived from User-Agent (`apiKeyAuth.ts:36-39`). Needs widening to add `'rapidapi'`.
- **Status-code contract aligns with RapidAPI's billing rule for free:** RapidAPI does **not** increment usage on response codes **≥500**, and JK already returns 500 on pipeline failure → failed calls are automatically not billed. ✅

---

## Target request flow

```
Developer (RapidAPI subscriber)
  │  calls https://<jk-api>.cloudfunctions.net/... via RapidAPI's proxy
  ▼
RapidAPI Runtime  ── meters plan quota, enforces plan rate limits, bills subscriber
  │  injects: X-RapidAPI-Proxy-Secret, X-RapidAPI-User, X-RapidAPI-Subscription
  ▼
JK Cloud Function (existing v1 router)
  ├─ apiKeyAuth (MODIFIED): proxy-secret present+valid → bind RapidAPI house customer
  │                          (billing-exempt), apiSource='rapidapi'; else fall through
  │                          to existing jk_live_ Bearer path unchanged
  ├─ apiRateLimit (MODIFIED): skip JK's internal limiter on the rapidapi path
  ├─ existing handler runs pipeline; deductBalance() no-ops balance, logs apiCalls
  └─ billing-header middleware (NEW): on 2xx set X-RapidAPI-Billing: Credits=<costCents>;
                                       on 4xx client error set Credits=0 (don't charge dev
                                       for their own bad input); 5xx → RapidAPI skips anyway
```

**Credit mapping (the resolved credits-vs-quota question):** define a single custom quota object named **`Credits`** on the listing, with **1 Credit = 1 US cent of list price**. Each endpoint emits `X-RapidAPI-Billing: Credits=<costCents>` → `/recommend`=10, `/recommend-deep`=30, `/audit`=50, `/aeo-scan`=100. RapidAPI plan tiers are sold as monthly Credit allotments; no per-endpoint plans, no parallel billing logic. (Values are integers, no commas — commas cause a RapidAPI Parse Error.)

---

## Phase 1 — Backend shim (the only real code)

Small, additive, behind the proxy-secret gate so existing `jk_live_` / MCP / n8n traffic is untouched.

- **1.1 — RapidAPI house customer.** Provision one dedicated `apiCustomers/{id}` doc representing all RapidAPI traffic. Mark it **billing-exempt but NOT admin** (admin emails are filtered out of attribution rollups per commit `6ec5386`; we want RapidAPI revenue *visible*). Add a `billingExempt: true` flag (or `kind: 'house'`) and update `deductBalance()`'s skip condition from `ADMIN_EMAILS.has(...)` to `isAdmin || data.billingExempt` so the no-op-balance-but-log behavior applies. Store its id in env: `JK_RAPIDAPI_HOUSE_CUSTOMER_ID`.
- **1.2 — Proxy-secret auth path in `apiKeyAuth.ts`.** Before the Bearer check: if `req.headers['x-rapidapi-proxy-secret']` is present, compare (constant-time) against `process.env.JK_RAPIDAPI_PROXY_SECRET`.
  - match → load house customer via `getApiCustomerById(JK_RAPIDAPI_HOUSE_CUSTOMER_ID)`, set `req.apiCustomer`, `req.apiSource = 'rapidapi'`, `next()`.
  - present-but-mismatch → `401` (spoof attempt; do not fall through).
  - absent → fall through to the existing internal-secret / Bearer logic unchanged.
- **1.3 — Widen `ApiSource`.** Add `'rapidapi'` to the `ApiSource` union (`apiCredits.ts`) and `coerceApiSource`. Pass it through `deductBalance` / `apiCalls` as today. (Dashboard column split lives in the sellerdashboard repo — separate, do when measurement matters.)
- **1.4 — Bypass internal rate limit on the rapidapi path.** `apiRateLimit` is keyed per-customer; all RapidAPI traffic shares the one house customer, so the per-key limiter would throttle *all* RapidAPI users collectively. On `req.apiSource === 'rapidapi'`, skip JK's limiter and rely on RapidAPI's per-plan rate limits (configured in Phase 2).
- **1.5 — Billing-header middleware (NEW).** Add response middleware on the v1 router that, when `req.apiSource === 'rapidapi'`, sets `X-RapidAPI-Billing` based on the final status:
  - `2xx` → `Credits=<costCents for this route>` (route→cost map already exists as `OPERATION_COST_CENTS` + the per-route constants).
  - `4xx` client error (bad input, 400/402) → `Credits=0` (don't bill the dev for their own mistake).
  - `5xx` → don't set it / set `Credits=0`; RapidAPI ignores ≥500 anyway.
  Implement by capturing the route's cost on the request (e.g. set `res.locals.rapidApiCredits` in each handler, or a route→cost lookup in the middleware) and writing the header in an `on('finish')`/wrapper before send.
- **1.6 — `/me` on the RapidAPI path.** House-account `/me` would leak the house balance and is meaningless to a subscriber. Either (a) exclude `/me` from the listing, or (b) return a RapidAPI-friendly static payload (plan name, docs links, per-endpoint Credit costs). Recommend (b) as a free `Credits=0` "are-my-creds-working" probe.
- **1.7 — Defense-in-depth.** Keep the proxy-secret as the *only* way the house account can be reached — never expose a `jk_live_` key bound to it. Document that the direct CF URL still serves `jk_live_` customers, so we cannot globally require the proxy secret (the header's presence is the switch).

**Files touched:** `middleware/apiKeyAuth.ts`, `middleware/apiRateLimit.ts`, `services/apiCredits.ts` (`ApiSource`, `deductBalance` skip condition, house flag), `api/v1.ts` (billing-header middleware + `/me` branch). New env: `JK_RAPIDAPI_PROXY_SECRET`, `JK_RAPIDAPI_HOUSE_CUSTOMER_ID`. Add both to `.env.example`.

---

## Phase 2 — RapidAPI listing configuration (mostly UI, no code)

- **2.1 — Provider account + Studio listing.** Create/confirm the RapidAPI provider account; add a new API "JackpotKeywords — Keyword & SEO Intelligence".
- **2.2 — Base URL / Gateway. ✅ Timeout resolved (2026-05-29).** Point the listing's base URL at JK's **direct Cloud Function URL** (avoids the Firebase Hosting 60s edge timeout that bit JK — `/recommend` runs 60–180s). **RapidAPI's Rapid Runtime gateway timeout is 180s default, configurable only *up to* 180s max** ([gateway-configuration docs](https://docs.rapidapi.com/docs/gateway-configuration)); over that → 504 to the dev. All four endpoints fit → **v1 uses the synchronous endpoints directly, no async `/jobs` infra needed** (same verdict the n8n analysis reached). **Action:** set the listing gateway timeout to the **180s max**. **Residual check:** the 180s configurable timeout is documented under the Rapid Runtime / Enterprise Hub; confirm the *standard public Hub* honors the same ceiling by sending a deliberately slow (~150s) test call through the gateway during setup — if the public tier caps lower, `/recommend`'s tail moves to the async fallback.
- **2.3 — Firewall secret.** Copy the listing's `X-RapidAPI-Proxy-Secret` from Gateway → Firewall settings into `JK_RAPIDAPI_PROXY_SECRET` (Phase 1.2). Redeploy functions.
- **2.4 — Define endpoints + OpenAPI.** Add the 4 data endpoints (+ `/me` probe). Import/author an OpenAPI spec: request bodies (`description`/`url`/`budget`/`location`/`limit` for recommend; `url` for audit/aeo-scan), example responses, error codes. Document the Credit cost of each endpoint **explicitly in the description** (RapidAPI best practice — prevents dev confusion about quota burn).
- **2.5 — Define the `Credits` custom quota object.** Quota objects: keep default `Requests` for rate-limit display, add custom **`Credits`**. Map all 4 endpoints to the `Credits` object.
- **2.6 — Plans (Monetize tab).** See Phase 3.
- **2.7 — Listing content.** Logo (reuse `mcp-server/icon.png` / brand), long description, category = **SEO / Tools**, tags (keyword research, SERP, SEO audit, AEO/AI-visibility). Cross-link from JK's `/developers` page.

---

## Phase 3 — Pricing tiers (illustrative — finalize against `PRICING-RESEARCH-2026-05-23.md`)

Plans priced as monthly **Credit** allotments. Use **Soft Limit** so over-quota calls bill an overage per Credit rather than hard-blocking. RapidAPI's hard floor: $0.00003/call minimum on paid plans over 500K req/mo; RapidAPI free-tier cap is 1000 req/hr & 500K/mo.

| Plan | Monthly price | Included Credits | Overage / Credit | Rough call mix | Rate limit |
|---|---|---|---|---|---|
| **Basic (Free)** | $0 | e.g. 300 Credits | hard limit (no overage) | ~30 recommend or ~3 aeo-scan | low (e.g. 30/min) |
| **Pro** | TBD | e.g. 5,000 Credits | small per-Credit overage | ~500 recommend | medium |
| **Ultra** | TBD | e.g. 30,000 Credits | smaller per-Credit overage | volume | higher |

**Pricing constraints to honor when setting numbers:**
- Net of RapidAPI's **25%** fee, each Credit must still clear JK's *marginal* cost per call (Gemini + Keyword Planner + Serper). `/aeo-scan` (Serper + grounding) and `/recommend` (KP + Gemini) have real per-call cost — price the Credit so 75% × Credit price > marginal cost.
- Keep RapidAPI list price **at or above** JK's direct per-call price so the marketplace channel doesn't undercut direct sales.
- `/v1/score` stays **off** this surface entirely (Path D — Google Ads ToS exposure).

---

## Phase 4 — Test & launch checklist

- [ ] **Local/staging:** call each endpoint through the RapidAPI test console; confirm 200 + correct payload.
- [ ] **Metering correctness:** verify `X-RapidAPI-Billing: Credits=N` matches the endpoint's cent cost on success; verify a bad-input 400 charges **0 Credits**; verify a forced pipeline failure (500) charges 0 Credits and is not metered.
- [ ] **Anti-bypass:** hit the direct CF URL *without* the proxy secret using no `jk_live_` key → confirm 401 (can't reach house account); with a wrong proxy secret → 401; confirm existing `jk_live_` customers still work unchanged.
- [ ] **Rate limit:** confirm RapidAPI's per-plan limit returns 429 to the dev, and JK's internal limiter is bypassed on the rapidapi path (no collective throttle).
- [ ] **Quota limits:** subscribe a test account to Basic, exhaust Credits, confirm hard-limit block (free) / soft-limit overage (paid) behaves as configured; confirm 85% + 100% RapidAPI alerts fire.
- [ ] **Attribution:** confirm `apiCalls` docs land with `source: 'rapidapi'` and are **not** filtered as admin.
- [ ] **Publish** the listing public; smoke-test as an external subscriber.
- [ ] **Payout setup:** connect PayPal on the provider account; note the ~5–6 week settlement lag in revenue tracking.

---

## Open design points / risks

1. **Long-endpoint timeout through RapidAPI's proxy. ✅ MOSTLY RESOLVED (2026-05-29).** Rapid Runtime timeout is **180s max** (configurable up to, not beyond). All four endpoints fit → v1 runs synchronous, no async infra. **Two residuals:** (a) confirm the *public* (non-Enterprise) Hub honors 180s, not a lower cap — verify with a ~150s test call in Phase 2.2; (b) `/recommend` / `/recommend-deep` worst case (180s) sits at the ceiling, so the slowest tail may 504 — dev isn't billed (≥500 rule) but JK still burns the compute. **Mitigation:** ship sync, monitor the 504 rate on `apiCalls`, escalate only the `/recommend*` endpoints to the async `/v1/jobs` pattern if the tail proves material.
2. **House-account analytics granularity.** All RapidAPI traffic shares one customer id, so per-subscriber breakdown lives on RapidAPI's side, not JK's. JK sees aggregate `source: 'rapidapi'` volume only. Acceptable for v1 (RapidAPI owns the ledger); revisit if per-subscriber JK-side analytics ever matter.
3. **Refund semantics differ.** Direct JK customers get balance refunds on failure; RapidAPI devs simply aren't metered on 5xx (no refund concept). Already aligned via the ≥500 rule — just don't return 200-with-error on hard failures.
4. **`billingExempt` flag blast radius.** Changing `deductBalance`'s skip condition touches the core billing transaction — unit-test the admin path still works and only the house account is newly exempted.
5. **Marketplace fee math.** 25% + PayPal fees + the per-call cost floor make thin-margin endpoints (`/recommend` at 10¢) marginal on RapidAPI. Confirm each tier clears cost before publishing (Phase 3).

---

## Reuse for the rest of the portfolio

Once this ships, patent-search (Bull-Generator) and GovToolsPro reuse the same four moves: house account + proxy-secret auth path, billing-exempt deduction reuse, `X-RapidAPI-Billing: Credits=<n>` per route, distinct source attribution. See each project's `PLAN-PUBLIC-API.md` "Future distribution surfaces" section. GovToolsPro carries the extra constraint: **value-add/AI endpoints only, never raw SAM.gov/FPDS passthrough** (ToS).

## References

- RapidAPI docs: [Monetize tab](https://docs.rapidapi.com/docs/hub-listing-monetize-tab) · [Custom Quotas / `X-RapidAPI-Billing`](https://docs.rapidapi.com/v1.0/docs/custom-quotas) · [Gateway / proxy secret](https://docs.rapidapi.com/docs/hub-listing-gateway-tab) · [Payouts & Finance (25%, PayPal)](https://docs.rapidapi.com/docs/payouts-and-finance)
- JK code: `packages/functions/src/api/v1.ts`, `middleware/apiKeyAuth.ts`, `middleware/apiRateLimit.ts`, `services/apiCredits.ts`
- `docs/api-deployment/DEPLOYMENT-PLAN-2026-05-25.md` (parent), `PRICING-RESEARCH-2026-05-23.md` (tier pricing)
</content>
</invoke>
