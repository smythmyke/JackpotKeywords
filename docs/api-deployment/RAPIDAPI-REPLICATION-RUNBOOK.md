# RapidAPI Replication Runbook (portable)

**Purpose:** A streamlined, copy-and-adapt guide to add an existing JK-style REST API to the **RapidAPI** marketplace. Written from the **JackpotKeywords pilot (shipped 2026-05-30)** — the first RapidAPI surface in the portfolio. Copy this file into the target project (GovToolsPro, patent-search) and follow it; the JK specifics are marked so you know what to swap.

> **Why this exists:** RapidAPI's public docs are **stale vs the live Studio UI**, and there are a few non-obvious gotchas (quota-object name matching, 180s timeout, 500px logo) that cost time on the first run. This captures all of it so the 2nd/3rd listing takes ~30 min, not an afternoon.

---

## 0. Mental model (read once)

- **RapidAPI = REST marketplace + gateway. NOT MCP.** It proxies developer traffic to your existing REST endpoints. Keep your MCP listings (Smithery/Glama) separate — this is a parallel surface.
- **"RapidAPI is the ledger."** RapidAPI meters + bills its own subscribers and pays you **75%** (25% marketplace fee; **PayPal-only** payout, consolidated monthly, ~5–6 week lag). Your own credit/Stripe system is untouched.
- **One billing-exempt "house account"** absorbs all RapidAPI traffic on your backend — no per-developer key, no balance deduction. Your backend just tells RapidAPI how much to bill via a response header.

---

## 1. What we learned about the RapidAPI platform (the facts that matter)

| Fact | Detail | Implication |
|---|---|---|
| **Gateway timeout** | **180s max** (configurable *up to*, not beyond). Over → 504 to the dev. | Endpoints must finish < 180s, or use an async/callback pattern. JK's 60–180s endpoints fit (sync, no async needed). Set the listing timeout to **180**. |
| **Metering override** | Backend returns `X-RapidAPI-Billing: <Object>=<n>` response header. Default is **1 unit per request**. | This is how variable per-call pricing maps onto RapidAPI. Multiple objects: `Credits=10; Foo=1`. **No commas** in values (Parse Error). |
| **Free on failure** | Responses with status **≥500 are NOT metered**. | Return real 5xx on hard failures so devs aren't charged. Matches a "refund on failure" model automatically. |
| **Quota object name** | The custom Object name must **exactly match** the header your backend emits (we use `Credits`). | ⚠️ **Biggest gotcha.** Mismatch = 200 responses but **no metering** (silent). Test this. |
| **Anti-bypass** | RapidAPI stamps every proxied call with `X-RapidAPI-Proxy-Secret` (unique per API). | Validate it server-side and 401 if absent/wrong, so nobody hits your direct backend URL to dodge billing. |
| **Injected headers** | `X-RapidAPI-Proxy-Secret`, `X-RapidAPI-User`, `X-RapidAPI-Subscription`. | `X-RapidAPI-User` = the consumer id if you ever want per-subscriber attribution. |
| **Logo** | Max **500×500** px (512 is rejected). | Resize first (PowerShell `System.Drawing` works; ImageMagick `convert.exe` on Windows is the *disk* tool, not image — don't use it). |
| **Free-tier shape** | RapidAPI free plans are **recurring monthly** (they compound). | Keep the free tier **tighter** than any one-time direct credit. JK BASIC = 100 Credits/mo, **hard** limit. |
| **Price floor** | $0.00003/call min on paid plans >500K req/mo; free-tier cap 1000 req/hr & 500K/mo. | Rarely binding at indie volume. |
| **Payout** | PayPal only; monthly; ~5–6 wk after charge. | Connect PayPal in Payment Settings or you can't get paid. |

---

## 2. Backend shim — the four moves (the only real code)

All additive, gated behind the proxy-secret header so existing direct/MCP traffic is untouched. (JK reference files: `packages/functions/src/{middleware/apiKeyAuth.ts, middleware/apiRateLimit.ts, services/apiCredits.ts, api/v1.ts}`.)

1. **House account.** Provision ONE `apiCustomers`-style doc, flagged **`billingExempt: true`** (and NOT admin, so its usage stays visible in attribution rather than being filtered out). Update the balance-deduction function to skip deduction when `billingExempt` — but still log the call. Store its id in env (`*_RAPIDAPI_HOUSE_CUSTOMER_ID`). JK ships a script: `scripts/provision-rapidapi-house.mjs` (idempotent; prints the id).
2. **Proxy-secret auth path.** In your auth middleware, *before* the normal key check: if the `x-rapidapi-proxy-secret` header is present, constant-time compare it to `*_RAPIDAPI_PROXY_SECRET`. Match → bind the house account + set source `'rapidapi'`. Present-but-wrong (or path unconfigured) → **401**. Absent → fall through to your existing auth (so direct/MCP keys still work).
3. **Billing header.** Add response middleware: when source is `'rapidapi'`, set `X-RapidAPI-Billing: <Object>=<cost>` based on the route — the route's price on **2xx**, `=0` on **4xx** (don't charge the dev for their own bad input), nothing/`=0` on 5xx (RapidAPI ignores it anyway). Read the status at `res.json` call time (patch `res.json`), since auth runs per-route after the router-level middleware registers.
4. **Rate-limit bypass.** Your internal per-customer limiter would throttle ALL RapidAPI users collectively (they share one house account). Skip it when source is `'rapidapi'`; RapidAPI enforces per-plan limits itself.

Plus: widen your source enum to include `'rapidapi'`; add the two env vars to `.env` (keep `.env` gitignored — it holds the proxy secret) and document them in `.env.example`; make sure hard failures return 5xx.

**Deploy, then verify server-side BEFORE touching the RapidAPI dashboard** (see §5a).

---

## 3. Current Studio UI navigation (2026-05-30 — docs are stale, trust this)

Provider area: **`provider.rapidapi.com`** or top-nav **Studio** (top nav reads: *API Marketplace | Console | Studio*). The UI is mid-migration, so you may see EITHER of these tab layouts — both map to the same things:

| You need to… | Older layout | Newer layout |
|---|---|---|
| Name, logo, category, website, terms, visibility | **General** tab | **Global Settings** / Settings |
| Base URL | General → Base URL section | **API Specs → Settings** → Base URL |
| Endpoints + **OpenAPI import** | **Definitions** tab | **API Specs → Endpoints**; import via **Definitions → CI/CD → Import OpenAPI → Upload File** |
| Proxy secret + timeout | **Gateway** tab | **Security** tab → *Firewall Settings* (secret) + *Request Configurations* → Proxy Timeout |
| Plans + custom quota | **Monetize** tab | **Hub Listing → Monetize → Public Plans** (grid: objects=rows, plans=cols) |
| Consumer usage / quota used | — | **Apps** (top-right) / Developer Dashboard → **Subscriptions & Usage** |

Notes:
- **Base URL auto-populates** from the OpenAPI `servers` field on import — verify it's your **direct Cloud Function URL** (not the Firebase Hosting URL, which has a 60s edge timeout). The full path looking like `.../api/api/v1/...` is correct if your function is named `api` and routes mount at `/api/v1`.
- **OpenAPI import groups endpoints by your spec's `tags`.** It may also auto-create a stray empty group (e.g. `api`) — delete it so it doesn't show as an empty section.
- The old Provider Dashboard's Monetize is **deprecated** — it'll tell you to use the new Studio UI. Follow that.

---

## 4. Order of operations (the streamlined checklist)

**Backend (do first, verify before the dashboard):**
1. Build the 4-move shim; provision the house account; set the two env vars; **deploy**.
2. Server-side verify with curl (§5a) — 401 without secret, 200 + billing header with secret, ledger logs source+cost, house balance unchanged.

**RapidAPI dashboard:**
3. **Add New API** in Studio. Set **Base URL** = direct CF URL.
4. **Import OpenAPI** (Definitions → CI/CD). Verify endpoints; delete any stray empty group.
5. **Security:** copy `X-RapidAPI-Proxy-Secret` → your `*_RAPIDAPI_PROXY_SECRET` env → **redeploy**. Set **Proxy Timeout = 180**. Leave Threat Protection + Schema Validation **off** (your backend validates; they cause false-positive blocks).
6. **Docs tab:** paste your markdown API docs (reuse the OpenAPI content).
7. **Monetize:** **Add Object** named exactly `Credits` → attach all billable endpoints. Configure plans: free tier **hard** limit + tight monthly allotment; paid tiers **soft** limit + per-Credit overage. Turn off unused tiers (MEGA).
8. **General/Settings:** logo (**≤500px**), category, short + long description, website, terms, tags. Visibility **Private** during setup.
9. **Payment Settings:** connect **PayPal**.
10. **Test via the playground** (§5b); confirm Credits decrement.
11. Flip **Visibility → Public**.

---

## 5. Testing — where to go and what to expect

### 5a. Server-side pre-check (no RapidAPI needed — catches bugs early)
Hit your **direct CF URL** with curl. `<SECRET>` = your proxy secret; `<URL>` = a 0-cost probe endpoint (e.g. `/v1/me`) then a billable one:
```bash
# No secret → expect 401
curl -s -o /dev/null -w "%{http_code}\n" "<URL>/v1/me"
# Wrong secret → expect 401 invalid_proxy_secret
curl -s -w "%{http_code}\n" -H "x-rapidapi-proxy-secret: WRONG" "<URL>/v1/me"
# Correct secret → 200 + header "x-rapidapi-billing: Credits=0"
curl -s -D - -o /dev/null -H "x-rapidapi-proxy-secret: <SECRET>" "<URL>/v1/me"
# Billable route, bad input → 400 + "Credits=0" (don't bill bad input)
curl -s -D - -o /dev/null -X POST -H "Content-Type: application/json" \
  -H "x-rapidapi-proxy-secret: <SECRET>" -d '{}' "<URL>/v1/<billable>"
```
Then confirm in your DB: the call logged with `source: 'rapidapi'`, the right `costCents`, `admin=false`, and the **house balance unchanged (0)**. (JK used an ad-hoc `firebase-admin` node script against `apiCalls` + the house `apiCustomers` doc.)

### 5b. Gateway test (the part only RapidAPI can do)
This is the ONLY thing the server-side check can't prove: RapidAPI reading your `Credits` header and decrementing the quota.
1. Studio → **View in Hub** → on your listing, **Subscribe** to the free (BASIC) plan.
2. **Endpoints** tab → pick an endpoint → set the JSON **Body** → **Test Endpoint**.
3. Expect **200** + your payload (allow 60–180s for slow endpoints).
4. Check **Apps → Subscriptions & Usage**: the **Credits** used should equal that endpoint's cost.

⚠️ **Only gateway (playground/consumer) calls count on RapidAPI's counter.** Your §5a curl tests hit the backend directly, so they show in *your* ledger but NOT in RapidAPI's usage — expect RapidAPI's number to be lower than your backend total. If a gateway 200 does **not** move the Credits counter → the quota Object name ≠ the header name. Fix that first.

---

## 6. Gotchas (quick reference)
- **Quota Object name must exactly match the `X-RapidAPI-Billing` header name** (`Credits`). Silent failure otherwise.
- **Logo ≤ 500×500** (512 rejected). Resize via PowerShell `System.Drawing`, not Windows `convert.exe`.
- **Docs site lags the live UI** — use §3's mapping.
- **Only gateway calls are metered** by RapidAPI; direct backend tests aren't.
- **Free tier recurs monthly** → keep it tight vs one-time direct credits.
- **`balanceCents` (or any house-account field) leaks into responses** — cosmetic; strip per-source only if it bothers you.
- **180s ceiling:** endpoints near the top may occasionally 504; dev isn't billed (≥500 rule), you just burn compute. Monitor.
- **PayPal-only payout**, ~5–6 wk lag — set expectations in revenue tracking.

---

## 7. Per-project adaptation notes
- **patent-search (Bull-Generator):** clean reuse. Object name + endpoints differ; same 4 moves. Niche-but-real legal-research dev market.
- **GovToolsPro:** ⚠️ **list value-add / AI endpoints ONLY — never raw SAM.gov/FPDS passthrough** (redundant + ToS-sensitive). Restrict the listing to the derived/AI `workflowsApi` tier. Its API/MCP work lives in the backend repo (`OneDrive/.../GovToolsPro`), not the extension repo.
- **MarkItUp:** skip — image annotation as a stateless REST call has thin dev demand; MCP fits, RapidAPI doesn't.

Cross-portfolio tracker (update when you ship a surface): `C:/Projects/MarkItUp/planning/MCP-DISTRIBUTION-SURFACES.md`. JK worked example: this folder's `RAPIDAPI-PILOT-PLAN.md`.
