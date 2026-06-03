# Claude Connector (Remote MCP + WorkOS OAuth) — Replication Runbook

**Portable playbook for connecting any portfolio project's remote MCP server to Claude (Connector Directory) + OpenAI Apps.** JackpotKeywords is the pilot — proven end-to-end via Claude 2026-06-03. Copy this for MarkItUp / patent-search / GovToolsPro; the only per-project work is wiring the existing 4 tools + env values.

Reference implementation (copy these two files almost verbatim): `packages/functions/src/services/mcpOAuth.ts` (OAuth verification, jose-free) + the auth/PRM parts of `packages/functions/src/api/mcp.ts`. JK commits: `1cce9ae` (OAuth), `86231e8` (auth-at-connect + fixes).

---

## The 10 things that actually matter (gotchas, learned the hard way)

1. **Remote MCP must be Streamable-HTTP, not the stdio npm server.** A stateless hand-rolled JSON-RPC POST endpoint works fine on Cloud Functions (CommonJS). Mount at e.g. `/api/mcp`.

2. **Require auth at CONNECT, not just on tool calls.** ⭐ The biggest trap. If you allow anonymous `initialize`/`tools/list`, Claude connects without ever doing OAuth and a later 401 on `tools/call` does **not** reliably trigger its login. Return **401 + `WWW-Authenticate: Bearer resource_metadata="…"`** on *every* unauthenticated JSON-RPC POST (incl. `initialize`). Symptom of getting this wrong: connector shows "connected" but **Disconnect is greyed out** (= no OAuth session).

3. **Enable DCR + CIMD in the WorkOS dashboard** under **Connect → Configuration** (default scopes `openid profile email`). The `/oauth2/register` endpoint is advertised in the metadata **regardless** of the toggle, so it looks enabled but isn't — registration fails with **"Couldn't register with …'s sign-in service"** until you flip it on. Connect → Configuration is in the **dashboard**, not the docs site.

4. **Verify tokens with `node:crypto`, not `jose`.** `jose` v5 is ESM-only and fights CommonJS Cloud Functions. Hand-roll: fetch JWKS (`https://<authkit-domain>/oauth2/jwks`), `crypto.createPublicKey({key: jwk, format:'jwk'})`, `crypto.verify('RSA-SHA256', …)`. Check `iss`, `exp`, signature. **Add a fetch timeout** (AbortController) — unbounded JWKS/userinfo fetches will hang the function.

5. **Token `aud` = Claude's DCR-registered client id, NOT your resource URL.** Don't hard-fail on audience or every call 401s. Log-and-allow; tighten later by registering the MCP URL as a **Resource Indicator** in WorkOS.

6. **Email isn't guaranteed in the token.** If absent, look it up: `GET https://api.workos.com/user_management/users/{sub}` with `Bearer WORKOS_API_KEY`. Then map verified email → your customer record with a **keyless** get-or-create (no API key minted per call).

7. **Serve RFC 9728 Protected Resource Metadata** at `<mcp>/.well-known/oauth-protected-resource` (public GET): `{ resource, authorization_servers:[issuer], jwks_uri, scopes_supported, bearer_methods_supported:["header"] }`. Point the `WWW-Authenticate` `resource_metadata` param at it.

8. **Add MCP tool annotations** (`readOnlyHint` / `destructiveHint` / `openWorldHint`). Claude sorts tools into "Read-only" vs "Write/delete" by these, and missing annotations are the #1 Connector-Directory rejection cause.

9. **The connector must be toggled ON per-conversation in Claude** ("Search and tools" / connector control near the message box) or its tools simply don't appear — even when fully connected. (Wasted real debugging time here.)

10. **Claude calls your server from Anthropic's cloud**, not the user's device → the endpoint must be public over the internet. Add **request diagnostics** (`log(methods, bearer?, auth-outcome)` + a PRM-fetch log) — they turn "it spun silently" into a one-glance diagnosis.

---

## WorkOS Phase 0 (per project, ~15 min, USER)
Dashboard (dashboard.workos.com), **Staging** env:
1. **Applications → Create application** → copy **Client ID** (`client_…`).
2. **API Keys** → copy **Secret key** (`sk_test_…`).
3. **Domains** → the **AuthKit** card shows the auto-generated domain (`<slug>.authkit.app`) → that's the **issuer** (`https://<slug>.authkit.app`; JWKS at `/oauth2/jwks`).
4. **Connect → Configuration** → enable **DCR** + **CIMD**, scopes `openid profile email`.
5. Env (gitignored `.env`): `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_AUTHKIT_DOMAIN`.
6. Verify live: `curl https://<domain>/.well-known/oauth-authorization-server` → should return issuer + jwks_uri + registration_endpoint.

## Adding the connector in Claude (test)
**Customize → Connectors → "+"** (top of the Connectors column, next to 🔍): Name + **Remote MCP server URL** (e.g. `https://<region>-<proj>.cloudfunctions.net/api/api/mcp`); leave Advanced/OAuth blank (DCR self-registers) → **Add** → WorkOS login → Authorize. Then toggle it **on per-chat** (gotcha #9) and call a tool.

## Success signature (server logs)
```
initialize bearer=false auth=anonymous   → 401
PRM fetched
initialize bearer=true  auth=ok          ← after sign-in
tools/list bearer=true  auth=ok
tools/call bearer=true  auth=ok
```

## Going public (after the in-Claude test passes)
1. Move WorkOS **Staging → Production**. ⚠️ **Production AuthKit has NO default `authkit.app` domain — it requires a CUSTOM DOMAIN via CNAME** (Dashboard → Domains → Configure AuthKit domain → add CNAME at your DNS provider; ~up to 72h verify). So **a project can only go public if it controls a real domain's DNS.** Portfolio status: MarkItUp (`markitup.app`) ✅, GovToolsPro (`govtoolspro.com`) ✅, patent-search needs one, **JackpotKeywords is on `jackpotkeywords.web.app` (Google-managed, no CNAME) → BLOCKED until it gets a custom domain** (also wanted for SEO). Re-enable DCR+CIMD in the Production env too (per-env). Then swap the 3 `WORKOS_*` env values to production + redeploy. Staging is fine for all private/Dev-Mode testing.
2. Privacy-policy URL live (`/privacy`).
3. Submit: **Claude Connector Directory** `claude.com/docs/connectors/building/submission` (~2-wk review). Same endpoint → **OpenAI Apps** via ChatGPT Dev Mode (brand/funnel; OpenAI bans in-app digital sales).
4. (Quality gate) Ensure the tools return clean results — JK note: fix `recommend` contamination first ([[project_recommend_contamination]]) so reviewers don't see garbage.

## Cross-portfolio
Other MCPs reuse `mcpOAuth.ts` verbatim + their own WorkOS Phase-0 values + their own tool set. Tracker: `C:/Projects/MarkItUp/planning/MCP-DISTRIBUTION-SURFACES.md`. Decision/volume context: `CONNECTOR-DIRECTORIES-PLAN-2026-06-03.md` + [[project_connector_directories]].
