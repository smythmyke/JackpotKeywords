# MCP Registry Expansion — JackpotKeywords

**Date:** 2026-05-26
**Status:** Planning — companion of MarkItUp's Phase 9

> **Cross-portfolio master doc:** `C:/Projects/MarkItUp/planning/MCP-DISTRIBUTION-SURFACES.md` is the single source of truth for every place a smythmyke MCP server is published. This JK-specific doc only covers the JackpotKeywords-side priority + action items. Always update the master doc when shipping a new release on any surface.

## Context

JackpotKeywords MCP server is live on Glama + Official MCP Registry + Smithery (as of 2026-05-27). Research identified additional MCP directories worth evaluating. This doc captures registry data, JK-specific priority, and the action list.

Companion docs:
- `C:/Projects/MarkItUp/planning/MCP-REGISTRY-EXPANSION-2026-05-26.md`
- `C:/Projects/Bull-Generator/planning/MCP-REGISTRY-EXPANSION-2026-05-26.md`
- `C:/Projects/GovToolsPro-extension/docs/MCP-REGISTRY-EXPANSION-2026-05-26.md`

## Current footprint for JackpotKeywords

| Registry | Status | Notes |
|---|---|---|
| Glama | ✅ Live | id `adgzv68gbg`, Glama Release published 2026-05-27, grades resolving (last seen 67% profile complete, Maintenance C pending GitHub-release re-crawl) |
| Official MCP Registry | ✅ Live | Published via `mcp-publisher` CLI; 3 search results for "jackpotkeywords-mcp-server" |
| Smithery | ✅ Live as hosted .mcpb bundle | Published 2026-05-27 via `smithery mcp publish ./jackpotkeywords-mcp-server.mcpb -n smythmyke/jackpotkeywords-mcp-server`. **Initial external-URL publish failed** (Smithery tried to connect to GitHub as MCP endpoint — HTTP 422). Fixed by building a `.mcpb` bundle using `mcpb pack`. Latest deployment id: `1db81cb4-3f83-42bd-a4ad-2c26ad8b7309` (status: SUCCESS). Hosted MCP URL: https://jackpotkeywords-mcp-server--smythmyke.run.tools. Listing: https://smithery.ai/servers/smythmyke/jackpotkeywords-mcp-server. Manual followup: change visibility from unlisted → public via the banner. |
| awesome-mcp-servers | ❌ Not submitted | In `awesome-mcp-servers-appcypher` fork (line 264) but not punkpeye's. **Phase 7 task** |
| Cursor Directory | ❌ Not submitted | |
| MCP.so | ❌ Not submitted | |
| Stacklok ToolHive | ❌ N/A | No compliance angle — skip |
| MCP Market | ❌ Not submitted | Low value — skip |

Baseline organic adoption: **388 npm downloads/week** (highest of the three current servers — SEO/keyword audience pulls hardest).

## Registry data — May 2026

| Registry | Monthly traffic | Catalog size | Submission | Verdict |
|---|---|---|---|---|
| Smithery | **~446K visits** | 7,000–7,300 | Web form / auto-index | ⭐⭐⭐ Mandatory |
| Cursor Directory | High via cursor.com | 1,800+ | Form at `cursor.directory/plugins/new` | ⭐ marginal — SEO folks aren't heavy IDE users, but cost is so low it's worth it |
| MCP.so | Mid-tier SEO | 19,700–21,469 | GitHub Issue | ⭐⭐ Worth 5 min |
| awesome-mcp-servers | GitHub social proof; 88K ⭐ | Thousands | PR; ~1,300 PR backlog | ⭐⭐ Fire-and-forget (Phase 7) |
| MCP Market | Smaller than Smithery | 10K+ | Web form | ⭐ Skip |
| Stacklok ToolHive | Low direct, high enterprise signal | Small hand-curated | Security-vetted PR | Skip — no fit |
| Official MCP Registry | Low direct, propagates downstream | ~2,000 | `mcp-publisher` CLI | ⭐⭐⭐ Done |

## JackpotKeywords-specific priority

Keyword research + AEO (AI-visibility) scanning. Audience: SEO consultants, marketing-ops teams, AEO researchers. **Marketing-category** placement on directories matters more than developer-focused placement.

| Registry | Priority | Why |
|---|---|---|
| Smithery | ⭐⭐⭐ | Biggest single funnel; Marketing category is heavily browsed |
| MCP.so | ⭐⭐ | Long-tail SEO surface — ironic but real for an SEO product |
| awesome-mcp-servers | ⭐⭐ | The Marketing section drives 88K-star-backed traffic; PR is Phase 7 work already |
| Cursor Directory | ⭐ marginal | SEO folks usually aren't in Cursor; submit anyway because the form takes 5 min |
| MCP Market, ToolHive | Skip | No fit |

## Action list

1. ~~Verify Smithery listing~~ ✅ **Done 2026-05-27.** Live at https://smithery.ai/servers/smythmyke/jackpotkeywords-mcp-server. Config schema attached via second publish (`mcp-server/smithery-config-schema.json`).
2. **Submit to MCP.so** — file GitHub issue at `chatmcp/mcp-directory` with `https://github.com/smythmyke/jackpotkeywords-mcp-server` + description. (~5 min)
3. **Open awesome-mcp-servers PR** — Marketing section (line 1819 in our local fork copy). **Phase 7 of the master plan handles this.** (~10 min)
4. **Cursor Directory submission** — low-priority but cheap; do once Smithery + MCP.so are done. (~5 min)
5. **Track impact** — after 14 days, compare npm weekly-downloads to the 388/week baseline.

## Templates ready to paste

**Glama-style condensed description (377 chars — see current Glama listing):**
> MCP server for JackpotKeywords — AI keyword research and AI-visibility (AEO) scanning. Three tools: recommend (keywords ranked by composite Jackpot Score using real Google Ads volume/CPC + AI relevance); aeo_scan (10 buyer-intent queries via Gemini grounded search, reports whether your URL is cited/mentioned/absent); credit_balance. Install: npx -y jackpotkeywords-mcp-server

**One-line for awesome-mcp-servers / MCP.so:**
> AI keyword research and AI-visibility (AEO) scanning powered by JackpotKeywords. Three tools: keyword recommendations ranked by composite Jackpot Score (real Google Ads volume/CPC/competition + AI relevance); AEO scan that fires 10 buyer-intent queries through Gemini grounded search and reports whether your URL is cited/mentioned/absent; plus credit balance lookup.

## Source data

- `smythmyke/jackpotkeywords-mcp-server` — standalone GitHub repo (created 2026-05-26 during MCP-portfolio cleanup)
- npm: `jackpotkeywords-mcp-server@0.1.2`
- MCP Registry: `io.github.smythmyke/jackpotkeywords-mcp-server`
- Glama: `https://glama.ai/mcp/servers/smythmyke/jackpotkeywords-mcp-server`
- GitHub Release: `v0.1.2` published 2026-05-27
