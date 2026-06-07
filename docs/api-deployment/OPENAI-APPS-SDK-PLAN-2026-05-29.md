# OpenAI Apps SDK (ChatGPT) Integration Plan — 2026-05-29

**Status:** Planned, not started. This is the last of the four expansion surfaces (n8n ✅, Zapier ✅ backend+app pushed, OpenAI ⬜).
**Posture decision (2026-05-29, Michael):** **Free discovery app → public submission.** Build the full OAuth + remote-MCP server, ship a genuinely useful *free* ChatGPT app, submit for public directory listing. Brand/funnel exposure to ChatGPT's ~900M weekly users; revenue conversion happens off-platform (on the web), because OpenAI prohibits in-app monetization of digital credits (see §1).

Supersedes the "OpenAI Apps SDK build — locked determinations" section of `DEPLOYMENT-PLAN-2026-05-25.md` where they differ. The auth/transport/code-reuse determinations there are carried forward and refined here; the monetization assumptions there are corrected.

---

## 1. The load-bearing constraint: no in-app monetization of digital credits

Verified first-hand 2026-05-29 against OpenAI's own pages.

From [App Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines), Commerce and Monetization:
> "Selling digital products or services—including subscriptions, digital content, tokens, or **credits**—is not allowed, whether offered directly or **indirectly (for example, through freemium upsells)**."
> "Apps should use external checkout, directing users to complete purchases on your own domain."
> "No other third-party checkout solutions may be embedded or hosted within the app experience."

From [Monetization](https://developers.openai.com/apps-sdk/build/monetization):
> "While current approval is limited to apps for **physical goods** purchases, we are actively working to support a wider range of commerce use cases."

**Consequence for JK:** We **cannot** clone our payment model into a submittable ChatGPT app. No in-app credit sale, no embedded Stripe checkout, no link-out to our top-up page, and (per the "indirectly / freemium upsells" clause) no in-app messaging that nudges users to go pay on the website. This is a temporary platform limitation by OpenAI's own statement — monetization for digital/usage-based goods is "coming," no date. **Track this; it is the trigger that would later unlock the full consistency goal.**

**What we CAN do today:** ship a *free* app. Free apps are the directory norm. JK appears as a useful free keyword/AEO tool; users discover the brand; conversion to paid happens later, on the web, on their own initiative.

---

## 2. Strategic positioning — discovery, not revenue

This surface is a **brand + funnel play**, not a revenue line. That is consistent with the existing plan's framing of OpenAI as a "discovery experiment" (reading the 427-downloads / 0-signups signal as a *findability* problem). The win condition is **directory placement + brand exposure to a mass audience**, measured by: app installs/connections, tool-call volume, and (the real KPI) **web signups attributable to ChatGPT discovery**.

Hard rule for this surface: the app must deliver **genuine standalone value for free** and must **not read as an advertising vehicle or an indirect upsell** — both are explicit rejection criteria. Design the free tier to be satisfying on its own, not a crippled teaser.

---

## 3. What clones vs. what's new

Verified against `packages/functions/src/services/apiCredits.ts` and `middleware/apiKeyAuth.ts`.

| Layer | Approach | Consistency |
|---|---|---|
| **Tools** | Reuse the 5 MCP tools + `mcp-server/src/api/client.ts` **verbatim**. Only the transport wrapper changes (stdio → Streamable HTTP). Same REST calls, "one API many surfaces" hard rule honored. | ✅ Identical |
| **Accounts** | OAuth identity → resolve to an `apiCustomers` doc **by verified email**. `createApiCustomer` is already email-keyed + idempotent (`apiCredits.ts:177-197`), so a ChatGPT user maps to the **same account** as their web/API signup. | ✅ Identical |
| **Credits/pricing** | Same `balanceCents`, same `SIGNUP_CREDIT_CENTS=200` ($2), same per-call costs (`RECOMMEND=10¢`, `AEO=100¢`, `RECOMMEND_DEEP=30¢`, `AUDIT=50¢`), same `deductBalance`/`refundBalance`/`recordApiCallResult`. Server-side deduction unchanged. | ✅ Identical |
| **Auth** | **NEW (platform-forced).** OAuth 2.1 via managed provider (Stytch — §4). API keys explicitly unsupported by ChatGPT. | ⚠️ New layer, bridges to existing accounts |
| **Transport/hosting** | Streamable HTTP, **stateless plain-POST JSON-RPC** (SSE optional). New `/mcp` router on the existing `api` Cloud Function. Direct `cloudfunctions.net` URL (NOT Hosting — 60s edge timeout). | ✅ Same infra pattern |
| **Payments** | 🔴 **Cannot clone.** No in-app sale / checkout / upsell. Top-up only on the web, user-initiated. | ❌ Forced divergence (§1) |
| **Attribution** | Distinct `jackpotkeywords-openai/…` User-Agent. Buckets as `'mcp'` under today's binary `ApiSource`; the distinct UA makes the later granular split free. | ✅ Same pattern |

---

## 4. Auth — WorkOS AuthKit (managed OAuth 2.1)

**Decision: WorkOS AuthKit (switched from Stytch 2026-05-29).** We initially picked Stytch for its dedicated Apps-SDK guide, but discovered during Phase 0 that **Stytch does not host the OAuth consent UI** — it requires us to build + host a login flow and an `/oauth/authorize` page (their `<IdentityProvider />` component) on our own frontend (confirmed: Stytch's project discovery doc 400s with `authorization_endpoint_not_configured_for_project` until a self-hosted Authorization URL is set). **WorkOS AuthKit hosts both login and consent** ("your application doesn't need to display any consent screens"), so there is **no frontend for us to build or maintain** — decisive for solo-dev capacity and the clone-don't-build goal. WorkOS is also free to **1M MAU**. Backend token verification is nearly identical either way (jose + JWKS). Auth0 (also hosted, heavier, ~7.5k free) and self-built were rejected.

WorkOS specifics (from [WorkOS AuthKit MCP docs](https://workos.com/docs/authkit/mcp)):
- **Issuer** = `https://<authkit-domain>` (e.g. `your-project.authkit.app`)
- **JWKS** = `https://<authkit-domain>/oauth2/jwks`
- **Audience** = our MCP server URL (`…/api/api/mcp`), registered as a **Resource Indicator** in the WorkOS dashboard
- **DCR**: Dashboard → Applications → Configuration → Dynamic Client Registration → Manage → enable + default scopes (`openid profile email`). CIMD optionally enabled.
- AuthKit implements the authorization + token endpoints and hosts consent automatically; ChatGPT registers itself via DCR.
- Backend env: `WORKOS_CLIENT_ID` (`client_…`), `WORKOS_API_KEY` (`sk_…`, secret), `WORKOS_AUTHKIT_DOMAIN`.

What ChatGPT requires the server to satisfy ([OpenAI auth docs](https://developers.openai.com/apps-sdk/build/auth)):
1. **Protected Resource Metadata** (RFC 9728) at `GET /.well-known/oauth-protected-resource` — lists the authorization server (AuthKit) + `jwks_uri` + `resource`. *We host this on the MCP server.*
2. **Authorization Server discovery** (RFC 8414 / OIDC) at `https://<authkit-domain>/.well-known/oauth-authorization-server` — *WorkOS provides.*
3. **Authorization-code flow with PKCE (S256)** + hosted consent — *WorkOS provides.*
4. **Client onboarding via DCR or CIMD** — *Stytch provides DCR.*
5. **Resource-server token verification** — signature, issuer, audience (`resource` → `aud`), expiry, scopes, verified **on every tool call**. → Use the `mcp-auth` library (resource-server half only) + `jose`.

**Identity mapping (the bridge):** On each tool call, verify the AuthKit JWT, read `sub` + verified `email`. Look up `apiCustomers` by that email; if absent, create it (reusing `createApiCustomer`'s email idempotency, **minus** issuing a `jk_live_` key — OAuth replaces the key here). WorkOS owns *authentication for the ChatGPT channel*; **Firestore `apiCustomers` + Stripe customer remain the source of truth for credits.** Same human via web (Firebase) and ChatGPT (WorkOS) links on verified email → one account, one ledger.

---

## 5. Transport & hosting

- **Streamable HTTP, stateless.** Per OpenAI, transport-agnostic but Streamable HTTP recommended; simple tool calls return JSON-RPC directly via POST, SSE is optional. Stateless server (no session-id generator) maps cleanly to Cloud Functions.
- **Mount on the existing `api` Cloud Function** as a new router (`app.use('/mcp', …)` in `index.ts`), reusing the 540s/1GB config. ChatGPT connects to `https://us-central1-even-plate-378520.cloudfunctions.net/api/mcp`.
- **CommonJS/ESM:** `packages/functions` is CommonJS; `@modelcontextprotocol/sdk` is ESM-only. → **Hand-roll the stateless JSON-RPC handler** (`initialize` / `tools/list` / `tools/call` is small for stateless tools), avoiding the ESM dep entirely. Dynamic-import is the fallback.
- **Validate during build:** confirm ChatGPT is happy with plain-POST (no long-lived SSE) against Cloud Functions. Documented fallback if SSE is forced: Cloud Run.

---

## 6. Free-tier design (RESOLVED 2026-05-29)

**The free app exposes exactly two tools: `recommend` (billable, given free) + a free usage-status tool. Everything else stays paid/web.**

**Quota: 1 free `recommend` per customer per month, full results.** A hard monthly call-count quota (a usage counter that resets monthly) — **not** a credit balance. This supersedes the earlier "$2/month floor" idea (which would have allowed ~20 calls); 1/month is simpler, cheaper, and easier to reason about for abuse. Decision rationale: JK needs new users; real `recommend` COGS is sub-penny (92–99.9% margin), so 1 full report/customer/month is immaterial cost; full results maximize brand impact and word-of-mouth.

**Value ladder — the product tiers already draw the free/paid line, so no results are withheld:**

| Tool | Adds | Surface |
|---|---|---|
| **`recommend`** (10¢) | Full keyword list + basic metrics | ✅ **Free in ChatGPT** (1/mo, full results) |
| `recommend-deep` (30¢) | Competitor discovery + clusters + categories | 🔒 Paid (web) |
| `aeo-scan` ($1) | AI-visibility scan — **highest real COGS** (Serper/Gemini) | 🔒 Paid (web) |
| `audit` (50¢) | SEO site audit — real crawl cost | 🔒 Paid (web) |

A free user gets the impressive *breadth* (full keyword list); the *intelligence layer* (competitors/clusters/AEO/audit) remains the reason to visit the web product. Don't expose `recommend-deep`/`aeo-scan`/`audit` on the free surface — premium value, real COGS on two of them, and fewer exposed endpoints keeps the app from reading as "a full paid product inside ChatGPT" (lower monetization-policy scrutiny).

**Usage-status tool:** repurpose `credit_balance` to report **"free searches remaining this month, resets [date]"** — sets up the come-back-next-month loop. 🔴 **Compliance:** present as *free usage remaining*, NEVER as a *balance you can top up* — a wallet-with-buy-button reads as prohibited digital-credits monetization.

**Accepted tradeoff:** full results mean some users are fully satisfied and leave. Accepted in exchange for max acquisition/brand impact, mitigated by (a) episodic keyword-research need making monthly return plausible and (b) the deep/AEO/audit tiers remaining as paid pull.

**Abuse hardening:** 1/month + Stytch verified-email OAuth is a reasonable floor (a throwaway email per month is high-friction for one keyword list). Add a **global monthly volume/spend cap + alert** as a backstop.

**Paying customers in ChatGPT (deferred):** letting an existing *paid* web customer spend their real balance on the full tool set inside ChatGPT is a possible later enhancement — spending pre-existing credits isn't an in-app *sale*, but it's a policy gray area. Defer; the free app ships with `recommend` + status only.

---

## 7. Submission & rollout

- **Developer Mode first** — build and connect the server **privately** in ChatGPT Developer Mode (no submission, no review) to validate OAuth + tools end-to-end. This is also how we'd dogfood before any public step.
- **Public submission requirements:** OpenAI Platform org **identity verification**; `api.apps.write` permission; MCP server on a **publicly reachable HTTPS domain** (no tunnels) with a defined CSP; metadata (name, logo, description, company + privacy-policy URLs, screenshots, localized test prompts with expected responses, country availability).
- **Review:** no published SLA ("timelines may vary"; "do not request expedited review"). Common rejection causes: unreachable server, failing test cases, undisclosed user data in tool responses, mismatched tool-hint annotations, thin value, advertising-vehicle.
- **Tools-only:** ship **no UI widgets** initially — OpenAI confirms "data-only apps can skip UI resources and just expose tools." UI components are a later enhancement if the surface earns it.

---

## 8. Build phases

Ordered to **fail-fast on the riskiest unknown** (hand-rolled JSON-RPC transport on Cloud Functions) before investing in the OAuth lift. Phases 1–3 are pure code (no external accounts); Phase 0 (Stytch) can proceed in parallel and only gates Phase 4; Phases 5–6 are user-driven.

- **Phase 0 — WorkOS AuthKit setup (USER, parallel).** Create WorkOS project + AuthKit; enable DCR (Applications → Configuration → DCR → Manage, scopes `openid profile email`); add MCP server URL as Resource Indicator. Capture `WORKOS_CLIENT_ID`, `WORKOS_AUTHKIT_DOMAIN` (+ `WORKOS_API_KEY` secret → `.env`). Gates Phase 4 only. (Switched from Stytch — Stytch requires a self-hosted consent page; AuthKit hosts login+consent. See §4.)
- **Phase 1 — MCP transport skeleton.** `packages/functions/src/api/mcp.ts`: hand-rolled **stateless** JSON-RPC (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`) mounted at `/api/mcp`; declares `jackpotkeywords_recommend` + `jackpotkeywords_usage_status`; `tools/call` returns stubs. No auth yet. **Validate the handshake locally with curl** — de-risks transport + the CommonJS hand-roll. ⬅️ *current*
- **Phase 2 — Shared recommend pipeline.** Extract the ~120-line pipeline from `v1.ts` `/recommend` into `services/recommendPipeline.ts`; refactor `/v1/recommend` (+ `/recommend-deep`) to call it. **No behavior change** — verify with tsc + a live smoke test. Removes surface drift.
- **Phase 3 — Free-quota + live tools.** `services/apiFreeQuota.ts` — per-customer monthly counter (1 `recommend`/mo, resets monthly), `checkAndConsume` + `getStatus` + global cap. Wire `mcp.ts` `recommend` → quota → shared pipeline (full results); `usage_status` → remaining. Still dev-bypass auth. Distinct `jackpotkeywords-openai/…` UA / source tag.
- **Phase 4 — OAuth 2.1 / WorkOS AuthKit.** Serve `/.well-known/oauth-protected-resource` (PRM → AuthKit AS + `jwks_uri` + `resource`); token verification (`jose` + AuthKit JWKS via env); resolve JWT `sub`/verified-email → `apiCustomers` (reuse email idempotency, no `jk_live_` key). Replace the `resolveCustomer()` dev bypass. **No frontend consent page needed — AuthKit hosts it.**
- **Phase 5 — Deploy + Developer Mode validation (USER-driven).** Deploy functions; connect privately in ChatGPT Developer Mode; exercise OAuth + both tools; confirm plain-POST transport works (Cloud Run fallback if SSE forced).
- **Phase 6 — Submission (USER-driven).** Org identity verification, metadata, screenshots, localized test prompts, CSP; submit; iterate on review.

**Progress (2026-05-29):**
- ✅ **Phase 1 DONE** — `packages/functions/src/api/mcp.ts` (stateless JSON-RPC) mounted at `/api/mcp`; validated by `scripts/test-mcp-local.cjs`.
- ✅ **Phase 2 DONE** — recommend pipeline extracted to `services/recommendPipeline.ts`; `/v1/recommend` + `/v1/recommend-deep` refactored to call it (behavior-preserving, tsc clean). Live behavioral smoke deferred to Phase 5 deploy (hits paid Gemini/Ads APIs).
- ✅ **Phase 3 DONE** — `services/apiFreeQuota.ts` (per-customer monthly counter, consume/refund/status + `_global` backstop + free-call logging). `mcp.ts` `recommend` → quota → shared pipeline (full results, 200, no balance touch, refunds quota on failure); `usage_status` → remaining. Auth is a DEV BYPASS (`JK_MCP_DEV_AUTH` + `x-dev-customer-id`). Heavy services lazy-imported. tsc clean; harness 12/12 (incl. unauthenticated→auth-error and discovery-without-auth). Live quota+pipeline execution validated at Phase 5 (emulator/deploy).
- ⏭️ **Phase 4 NEXT — BLOCKED on Phase 0 (WorkOS values from user).** **Provider switched Stytch → WorkOS AuthKit 2026-05-29** (Stytch needs a self-hosted consent page; AuthKit hosts login+consent — see §4). Replace `resolveCustomer()` dev bypass with AuthKit OAuth 2.1 JWT verification (jose + JWKS) + serve `/.well-known/oauth-protected-resource`; map verified email → `apiCustomers`. Need from user: `WORKOS_CLIENT_ID`, `WORKOS_AUTHKIT_DOMAIN`, `WORKOS_API_KEY` (secret).

**▶ RESUME HERE (paused 2026-05-29):** User is mid-Phase-0 in the WorkOS dashboard. Default application (auto-named after user's gmail) is auto-created — USE IT, don't make a new one. WorkOS UI doesn't match the doc screenshots, so guide INTERACTIVELY. Next action on resume: ask user to list (a) the left-sidebar items and (b) the tabs inside the default application, then give exact clicks to **enable Dynamic Client Registration** (scopes `openid profile email`; path is ~Applications→Configuration→DCR→Manage) and locate **Client ID** (`client_…`, ~API Keys page), **API Key secret** (`sk_…`, → into `.env`), and **AuthKit domain** (`…authkit.app`, ~Authentication/AuthKit section). Stytch project can be ignored/abandoned. Offer again to pre-build the Phase 4 PRM endpoint + jose/JWKS verification module against `WORKOS_*` placeholders while user finishes Phase 0.

---

## 9. Open questions / risks

- **Out-of-quota compliance** — exact passive wording for "free searches used up this month"; keep conservative, no active upsell, no top-up link. Gray area.
- **Streamable-HTTP-on-Cloud-Functions** — validate plain-POST works without SSE; Cloud Run fallback.
- **ChatGPT DCR quirks (build-time, validate in Developer Mode — Phase 5).** Provider-agnostic, surfaced in OpenAI dev forum: (1) clients must register as **public** (`token_endpoint_auth_method: none`) — WorkOS has explicit guidance; (2) the **`openid` scope must be present** in DCR defaults (our Phase 0 sets `openid profile email`); (3) client_id is required. **CIMD is a cleaner alternative to DCR** (both ChatGPT + WorkOS support it) and sidesteps these — fall back to CIMD if DCR misbehaves.
- **Email retrieval (Phase 4 code shape).** WorkOS access-token JWT carries `sub`/role/permissions/exp; **email is not guaranteed in the token** — look it up from WorkOS via `sub` + `WORKOS_API_KEY`. Confirm with the first real token whether email is present (would save the call).
- **WorkOS free tier** — pricing page doesn't gate DCR/Connect/MCP behind a paid plan (treated as included in AuthKit, free to 1M MAU); confirm in-dashboard there's no "upgrade to enable DCR" wall. Auth0 (~7.5k) / Stytch (10k, but self-hosted consent) are fallbacks.
- **App Review OAuth (de-risked 2026-05-29):** the "unsupported OAuth config type" submission failure was a **transient OpenAI infra bug fixed 2026-05-06**, not an OAuth-config requirement. No action needed.
- **Monetization unlock** — when OpenAI opens digital/usage-based commerce + external checkout for non-physical goods, revisit: this is what makes the full payment-consistency goal achievable. **Primary thing to monitor.**

---

## Sources
- OpenAI Apps SDK auth: https://developers.openai.com/apps-sdk/build/auth
- OpenAI monetization: https://developers.openai.com/apps-sdk/build/monetization
- OpenAI app submission guidelines (the prohibition): https://developers.openai.com/apps-sdk/app-submission-guidelines
- OpenAI MCP concept (transport, UI optional): https://developers.openai.com/apps-sdk/concepts/mcp-server
- OpenAI submission/deploy + developer mode: https://developers.openai.com/apps-sdk/deploy/submission
- Stytch OpenAI Apps SDK guide: https://stytch.com/blog/guide-to-authentication-for-the-openai-apps-sdk/
- Stytch MCP / pricing: https://stytch.com/docs/guides/connected-apps/mcp-servers · https://stytch.com/pricing
- WorkOS MCP / pricing (fallback): https://workos.com/docs/authkit/mcp · https://workos.com/pricing
- mcp-auth (resource-server half): https://github.com/mcp-auth/js
