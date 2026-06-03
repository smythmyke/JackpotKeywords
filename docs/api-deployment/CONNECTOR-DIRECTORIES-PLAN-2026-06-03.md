# In-Product AI Directories — Activation Plan (Claude Connector Directory + OpenAI Apps)

**Date:** 2026-06-03. **Scope:** get JackpotKeywords listed in the two in-product AI discovery surfaces. **Decision: Claude Connector Directory FIRST, OpenAI Apps second** (rationale in §3). **Do not start the build until the one blocking user action in §6 is done.**

This is the *activation + decision* layer. The full OpenAI build design lives in `OPENAI-APPS-SDK-PLAN-2026-05-29.md` (7 phases); this doc adds the Claude track and the prioritization, since both share one build.

---

## 1. Status (confirmed 2026-06-03)
The seller dashboard shows both as "planned," but the infrastructure is ~60% built:
- **Remote MCP endpoint** — ✅ BUILT + DEPLOYED. `packages/functions/src/api/mcp.ts` is mounted at `/api/mcp` (stateless Streamable HTTP), live at `https://us-central1-even-plate-378520.cloudfunctions.net/api/api/mcp`. Currently gated by a dev-auth bypass (`JK_MCP_DEV_AUTH`). Pipeline extraction + free-quota wiring done (SURF-3 Phases 1–3).
- **Claude Connector Directory (CONN-1)** — ⬜ not started, but reuses the same remote-MCP + OAuth lift.
- **Neither is submitted/live in a directory.** The single shared blocker is **OAuth 2.1**.
- **Privacy policy** — ✅ already live at `/privacy`. **Tool annotations** — added to the npm stdio server, still ⬜ on the remote `mcp.ts` endpoint.

## 2. Volume exposure (researched 2026-06-03)
| | OpenAI Apps (ChatGPT) | Claude Connector Directory |
|---|---|---|
| Audience | **~900M weekly active users** (Feb 2026, → 1B) | **~30M monthly**, technical/paying skew |
| Directory | chatgpt.com/apps; brand-heavy (Canva, Figma, Spotify, Stripe…) | **~418 verified connectors**, 30 categories — far less crowded |
| Discovery | Massive ceiling, **competitive**; listed ≠ traffic | One-click install in Claude.ai/Desktop/Mobile/Code; easier to stand out |
| Monetization | ❌ **OpenAI bans in-app digital-credit sales** → brand/funnel only | ✅ monetizable — prepaid `jk_live_` model works |
| Audience fit | Broad consumer | **High-intent: SEO/marketing work inside Claude = JK's exact ICP** |

**Honest caveat:** these are *in-product discovery* surfaces — the highest-quality distribution and exactly the demand lever JK needs (vs passive registries that converted ~0). But "listed" is necessary-not-sufficient; discovery *within* each directory still needs a compelling listing + the product to land. Treat as a demand experiment, measured by **web signups attributable to the surface**, not install counts.

## 3. Decision — Claude first
- **Monetizable** (no OpenAI-style digital-sales ban) → can actually produce revenue, not just brand.
- **Less crowded** (418 connectors vs ChatGPT's brand wall) → realistic shot at discovery.
- **Audience = ICP** (people doing marketing/SEO work inside Claude).
- **Same build** as OpenAI, so OpenAI follows immediately off the shared work as a brand/funnel play.

## 4. Shared build (do once, submit to both)
1. ✅ Remote MCP endpoint (`/api/mcp`) — done + deployed (dev-auth gated).
2. 🔴 **OAuth 2.1 (WorkOS AuthKit)** — the blocker. Serve `/.well-known/oauth-protected-resource` (PRM → AuthKit AS + `jwks_uri` + `resource`); verify JWT on every tool call (`jose` + AuthKit JWKS); map verified email → `apiCustomers`; **replace the `resolveCustomer()` dev bypass**. AuthKit hosts login+consent (no frontend to build). Details: SURF-3 plan §4 + Phase 4.
3. ⬜ **Tool annotations on `mcp.ts`** — add `readOnlyHint`/`destructiveHint`/`openWorldHint` to the remote endpoint's `tools/list` (mirror the npm-server annotations from 2026-06-03). #1 Connector-Directory rejection cause.
4. ✅ Privacy policy — live at `/privacy`.
5. ⬜ Production-ready check + a dedicated test account for reviewers.

## 5. Per-directory submission
- **Claude (CONN-1)** — submit at `claude.com/docs/connectors/building/submission` (~2-week review). Needs items 1–5 + a clear connector description + the privacy URL. Read-only/annotated tools required.
- **OpenAI (SURF-3)** — Dev-Mode private test → public submission. Free-tier exposure design: expose only `recommend` (1 free/customer/month, full results) + a `usage_status` tool; premium tools (`recommend_deep`/`aeo_scan`/`audit`) stay web. No in-app sales until OpenAI opens digital monetization (**monitor** — primary trigger to revisit revenue there).

## 6. 🔴 The one blocking action — YOU: create the WorkOS AuthKit project (Phase 0)
Everything else is buildable by me. Steps (current WorkOS dashboard, [AuthKit MCP docs](https://workos.com/docs/authkit/mcp)):
1. Sign up / log in at **dashboard.workos.com**. Start in the **Staging** environment (move to Production at launch). AuthKit is on by default.
2. **Applications → Create application** (or use the default). Copy the **Client ID** (`client_…`).
3. **API Keys →** copy the **Secret key** (`sk_…`).
4. Find your **AuthKit domain** (e.g. `your-project.authkit.app`) under Authentication/AuthKit settings — this is the **issuer**.
5. **Applications → Configuration → Dynamic Client Registration → Manage →** enable **DCR** (and optionally **CIMD**) under MCP Auth settings; set default scopes `openid profile email`. (This lets Claude/ChatGPT self-register as OAuth clients.)
6. Register the MCP server URL as the **Resource Indicator / `resource`**: `https://us-central1-even-plate-378520.cloudfunctions.net/api/api/mcp`.
7. Confirm DCR isn't behind a paid wall (AuthKit is free to ~1M MAU; if walled, Auth0/Stytch are fallbacks).
8. **Hand back three values** (go in `packages/functions/.env`, gitignored): `WORKOS_CLIENT_ID`, `WORKOS_AUTHKIT_DOMAIN`, `WORKOS_API_KEY` (secret).

## 7. Effort + sequence
Once Phase 0 values arrive: **~1–2 days** to wire OAuth (Phase 4) + annotate `mcp.ts` + serve PRM, deploy, Dev-Mode test, then submit to Claude (review ~2wk) and OpenAI. Phase 0 (you) and the annotation/PRM code (me) can proceed in parallel; OAuth wiring is the only part that hard-blocks on Phase 0.

## 8. Risks
- **Discovery ≠ listing** (same vanity-metric lesson as npm) — measure web signups, not installs.
- **OpenAI no-revenue** until digital monetization opens (brand/funnel only).
- **Review timelines** (~2wk Claude; OpenAI variable).
- **WorkOS preview/MCP-auth** surface may shift; keep AuthKit specifics isolated in the Phase-4 code.

## Sources
- [TechCrunch — ChatGPT 900M WAU](https://techcrunch.com/2026/02/27/chatgpt-reaches-900m-weekly-active-users/) · [DemandSage — Claude stats](https://www.demandsage.com/claude-ai-statistics/) · [awesome-claude-connectors (418 connectors)](https://github.com/rdmgator12/awesome-claude-connectors)
- [OpenAI — developers can submit apps](https://openai.com/index/developers-can-now-submit-apps-to-chatgpt/) · [WorkOS AuthKit MCP docs](https://workos.com/docs/authkit/mcp) · [WorkOS — add OAuth to your MCP server](https://workos.com/blog/how-to-add-authentication-to-your-mcp-server)
- `OPENAI-APPS-SDK-PLAN-2026-05-29.md` (full SURF-3 build) · ROADMAP CONN-1 / SURF-3
