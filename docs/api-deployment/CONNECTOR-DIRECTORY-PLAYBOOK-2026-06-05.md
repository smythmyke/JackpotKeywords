# Claude Connector Directory — Playbook (proven on GovToolsPro, 2026-06-05)

**Status of this doc:** GovToolsPro was taken end-to-end into the Claude Connector
Directory on 2026-06-05 (submitted, in review). This captures everything that worked,
the corrections to earlier assumptions, the full submission-form walkthrough, the
gotchas, and the **JackpotKeywords-specific to-do list**. A fresh session should be
able to ship JK from this doc alone. Companion: `CLAUDE-CONNECTOR-REPLICATION-RUNBOOK.md`
(the technical OAuth/MCP code reference) — still valid, except for the domain claim
corrected below.

---

## 0. The big corrections (read first)

1. **A custom domain is NOT required to ship.** Earlier docs said production WorkOS
   AuthKit needs a custom-domain CNAME and that JK was "BLOCKED" on `*.web.app`. **That
   was wrong.** GovToolsPro's connector ran end-to-end on the WorkOS-provided
   `*.authkit.app` domain before we ever added a custom one. So:
   - **OAuth** works on the free WorkOS `*.authkit.app` domain. Custom `auth.<domain>` is
     branding-only, optional.
   - **MCP endpoint** can be served on a `*.web.app` URL via a Firebase Hosting rewrite.

2. **`*.web.app` DNS is NOT controllable** (Google owns the `web.app` zone — no CNAME/A/
   TXT editing, ever). "Controlling CNAME" requires a **registered domain bought at a
   registrar**. BUT you don't need to control DNS to *use* `jackpotkeywords.web.app/api/mcp`
   as-is — you're using Google's URL, not customizing it.

3. **DECISION (2026-06-05): JackpotKeywords ships on `web.app`.** Rationale: average users
   don't know what `.web.app` is — it just looks like a normal website. $0, no domain
   purchase, no DNS. A custom domain (`jackpotkeywords.com`) stays a *later* nice-to-have
   for SEO/polish, not a blocker.

---

## 1. Proven build sequence (what worked for GovToolsPro)

The remote connector is **separate from the stdio npm server**. It's a stateless,
hand-rolled JSON-RPC-over-HTTP endpoint (CommonJS — the MCP SDK is ESM and fights Cloud
Functions). Copy the two reference files (`mcpOAuth` + `mcp` transport) from the runbook.

1. **Remote MCP endpoint** — Streamable HTTP, wraps the project's existing tool handlers
   via a synthetic req/res adapter (zero changes to existing handlers). Mount at `/api/mcp`.
2. **Auth at CONNECT** ⭐ — return **401 + `WWW-Authenticate: Bearer resource_metadata="…"`**
   on EVERY unauthenticated POST **including `initialize`**. (Allowing anonymous initialize
   = client connects without OAuth, never logs in; tell-tale = greyed-out Disconnect.)
3. **OAuth verify** — jose-free `node:crypto` JWKS verification; check iss/exp/signature.
   Issuer is derived from `WORKOS_AUTHKIT_DOMAIN` env (`https://<that>`), JWKS at
   `…/oauth2/jwks`. Audience: log-and-allow (don't hard-fail).
4. **PRM** — serve RFC 9728 at `<mcp>/.well-known/oauth-protected-resource`
   (`{resource, authorization_servers:[issuer], jwks_uri, scopes_supported,
   bearer_methods_supported:["header"]}`); point the `WWW-Authenticate` at it.
5. **Tool annotations** — every tool in `tools/list` needs `title` + `readOnlyHint` (and
   `destructiveHint` for writes). **#1 rejection cause.** Read+write must be SEPARATE tools.
6. **Email identity** — map verified email → your customer record, keyless get-or-create.
   If email absent from token, look up `GET https://api.workos.com/user_management/users/{sub}`
   with `Bearer WORKOS_API_KEY`.

### WorkOS Phase 0 (dashboard, ~15 min — USER does this)
- Applications → Client ID (`client_…`); API Keys → secret (`sk_…`; note WorkOS keys are
  `sk_<base64>`, no test/live infix).
- AuthKit domain = the `*.authkit.app` shown in the dashboard = the **issuer**. (Use this;
  no custom domain needed.)
- **Connect → Configuration → enable DCR + CIMD**, scopes `openid profile email`.
  ⚠️ Per-environment. The `/oauth2/register` endpoint shows in metadata regardless of the
  toggle — it *looks* enabled but isn't until you flip it. Skipping = "Couldn't register".
- Hand back 3 env values (gitignored `.env`): `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`,
  `WORKOS_AUTHKIT_DOMAIN`.

### Deploy + verify
- Add a **Firebase Hosting rewrite** so the connector URL is on `web.app`: `/api/mcp` AND
  `/api/mcp/**` → the MCP function. (⚠️ GovToolsPro needed BOTH the exact path and the glob;
  the glob alone missed the bare path and fell through to the SPA.)
- Deploy the **whole functions codebase**, not a single function (a bare single-function
  deploy can drag in a broken sibling codebase's predeploy build).
- Verify with curl: PRM → 200 JSON with your issuer; unauth `initialize` → 401 +
  `WWW-Authenticate`; `<issuer>/oauth2/jwks` → keys; then connect in Claude + call a tool.

---

## 2. Submission form walkthrough — `clau.de/mcp-directory-submission` (6 pages)

This is the REMOTE form (local MCPB `.mcpb` servers use a different form). Fields we filled
for GovToolsPro:

**Page 1 — Company + Server details**
- Company name, URL, primary contact (name/email/role).
- **Server name** (no "MCP"/"Server" in it). **Universal URL** + the `/api/mcp` URL.
- **Tagline** ≤55 chars. **Description** 50–100 words. **≥3 use cases with example prompts.**
- **Connection requirements** (free account? credits? signup?).
- **Read/Write** (Read Only if all tools are read-only). **MCP App?** No (unless interactive UI).
- **Third-party connections**: tick "Third-party data retrieval" if your backend aggregates
  external sources; NOT "web access" if you call specific APIs (not arbitrary URLs).
- **Data handling**: tick "only accesses requested data" + "HTTPS/TLS"; tick GDPR only if your
  privacy policy says so; DON'T tick "no data stored beyond session" if you persist accounts/credits.
- **Categories**: list is fixed (Business & Productivity, Communication, Data & Analytics, Dev
  tools, Financial Services, Consumer Health, Health & Life Sciences, Media & Entertainment,
  Commerce & Shopping, Other). No Government/SEO/Legal → pick closest or use **Other**.
- **Ads?** No.

**Page 2 — Authentication**
- Auth type **OAuth 2.0**; Auth client **Dynamic (DCR/CIMD)**; leave static client id/secret blank.
- Transport **Streamable HTTP** (not SSE).

**Page 3 — Documentation & support**
- Docs link (a public README/blog/help article — must include setup, tool descriptions, AND a
  troubleshooting section). Privacy policy URL. DPA URL (optional). Support channel (email or
  GitHub Issues).

**Page 4 — Test account** (blocks review if missing)
- Use **`mcp-review@anthropic.com`** as the login email — reviewers control that inbox, AuthKit
  emails a one-time code (no password, no 2FA). ⚠️ **WorkOS AuthKit must allow email self-signup.**
- If tools are metered, **pre-seed credits** for that email so they can test freely.
- Provide step-by-step setup instructions + example prompts that return live data. Tick "sample
  data ready" + "credentials valid ≥30 days".
- Also asks for **list of tools** as `tool_name (Human Title)`, comma-separated; resources/prompts
  (blank if none); confirm titles + annotations.

**Page 5 — Launch readiness & media**
- GA date: blank if already live. Tick surfaces tested (Claude.ai web at minimum).
- **Server Logo**: square 1:1 SVG/PNG, hosted URL (Drive link OK).
- **Favicon**: Anthropic fetches `https://www.google.com/s2/favicons?domain=<MCP-URL-domain>&sz=64`.
  Ensure that domain serves a real `/favicon.ico` AND declares `<link rel="icon">` in its root
  HTML. ⚠️ Google's favicon cache lags hours–days; the source being correct is what matters.
- **Promo screenshots**: 3–5 PNGs, **≥1000px wide**, cropped to just the response, hosted (Drive
  or your own hosting). Lead with your most visual tool output.

**Page 6 — Skills & Plugins (optional)** + **final checklist**
- Optional: submit a SKILL.md via a public GitHub URL (name <100 chars, description, repo link).
- Final checklist: policy (no cross-service automation, no financial transactions, live, you own
  the API), technical (OAuth, annotations, HTTPS, CORS, tested on Claude.ai), docs (published,
  privacy + ToS live), testing (test acct + valid ≥30d + all tools tested). **ToS must be live.**

---

## 3. Gotchas / hard-won lessons
- **Favicon** is per the **MCP-URL domain**, fetched via Google's `s2/favicons` (caches hard).
  Serve `/favicon.ico` + `<link rel="icon">` in the root `index.html` of that host.
- **Logo & favicon should be the same real mark** (reviewers see the favicon on every tool call).
- If tools are **metered with refund-on-failure**: the empty-result guard must test *real data
  presence*, not array `.length` (GovToolsPro shipped a bug where padded zero-filled arrays meant
  empty NAICS still charged; fix = `every(bucket => !bucket.count)` style checks → 5xx → refund).
- **Reviewer credit seeding**: use a `grant` script that *creates the doc if missing* (the pool
  doc won't exist until first sign-in). GovToolsPro's `grant-gtp-credits.js` was enhanced for this.
- Category mismatch is normal — there's no Government/SEO/Legal bucket; pick closest or Other.
- Two valid Anthropic directories: **remote connector** (this form) AND **local MCPB** (`.mcpb`
  desktop extension, separate form). A project with both an npm/stdio server and a remote endpoint
  can submit to both.

---

## 4. JackpotKeywords — specifics & TO-DO

**Current state (per `CONNECTOR-DIRECTORIES-PLAN-2026-06-03.md`):**
- Remote MCP endpoint BUILT + deployed at `https://us-central1-even-plate-378520.cloudfunctions.net/api/api/mcp`,
  but **dev-auth gated** (`JK_MCP_DEV_AUTH`). Firebase project `even-plate-378520`.
- WorkOS OAuth NOT wired yet (this is the real remaining lift). Tool annotations NOT on `mcp.ts` yet.
- Tools (connector): `jackpotkeywords_recommend`, `jackpotkeywords_recommend_deep`,
  `jackpotkeywords_audit`, `jackpotkeywords_aeo_scan`, `jackpotkeywords_usage_status`,
  `jackpotkeywords_credit_balance`. (Confirm exact set + which are metered before submitting.)

**TO-DO (in order):**
1. **WorkOS Phase 0** (dashboard) — create app, enable DCR+CIMD, grab the 3 env values. Use the
   `*.authkit.app` domain as issuer (NO custom domain).
2. **Wire OAuth** — replace the `JK_MCP_DEV_AUTH` bypass with real `node:crypto` JWKS verification
   + PRM + auth-at-connect (copy GovToolsPro/the runbook). Map verified email → `apiCustomers`.
3. **Tool annotations** — add `title` + `readOnlyHint`/`destructiveHint` to `mcp.ts` `tools/list`.
4. **Hosting rewrite** — add `/api/mcp` + `/api/mcp/**` → the MCP function so the connector URL is
   **`https://jackpotkeywords.web.app/api/mcp`** (the public-facing URL for the listing). Deploy.
5. **Verify** end-to-end in Claude (connect → OAuth on `*.authkit.app` → call a tool).
6. **Submission assets**: privacy policy URL (confirm live), ToS URL (confirm live), docs link
   (README w/ setup + tools + troubleshooting), square logo, favicon on `jackpotkeywords.web.app`,
   3–5 promo screenshots ≥1000px, reviewer test account `mcp-review@anthropic.com` (+ seed credits
   if metered), category (SEO has no bucket → **Business & Productivity** or **Data & Analytics**,
   or Other: "SEO / marketing").
7. **Submit** the remote form. Optional: SKILL.md later.

**Open questions to resolve:** which JK tools are metered (seed reviewer credits accordingly);
is there a live privacy policy + ToS for JackpotKeywords; final category choice.
