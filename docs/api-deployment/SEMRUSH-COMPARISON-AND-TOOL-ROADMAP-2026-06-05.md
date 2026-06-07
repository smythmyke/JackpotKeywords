# JackpotKeywords MCP — SEO-incumbent comparison & tool roadmap (2026-06-05)

Created after reviewing Semrush's AND Ahrefs's Claude connectors and auditing the JK codebase
for capabilities we already have but haven't exposed as MCP tools. Companion to
`CONNECTOR-DIRECTORY-PLAYBOOK-2026-06-05.md` (how to ship the connector).

## ⚠️ Headline correction (after seeing Ahrefs)
Earlier (vs Semrush) this doc called **AEO scan a unique wedge**. **Ahrefs kills that claim.**
Ahrefs' **Brand Radar** is a deep, dedicated AI-search-visibility suite (10 tools: share-of-
voice in LLM responses, mentions, citations, impressions — tracked over time) that outclasses
JK's single-shot `aeo_scan`. So AEO is NOT a "big players don't have this" differentiator.
JK's real, durable wedges vs Ahrefs/Semrush are: (1) **free / low-friction** (they paywall;
JK gives an instant free result — #1 wedge), (2) **plain-language keyword generation** (they
need seed keywords/a domain; JK turns "describe your business" → keywords), (3) **simplicity
for non-experts** (vs a 13–61-tool firehose). `aeo_scan` still has value as the FREE, instant
version for users who'd never buy Ahrefs Brand Radar. **Build to the wedge, not to parity.**

## Competitor: Ahrefs Claude connector (Claude-MCP only)
- **61 tools** — full SEO suite: Site Explorer (~25: backlinks, referring-domains, domain-
  rating, organic-keywords/competitors, top-pages, anchors), Keywords Explorer (7), Rank
  Tracker (6) + serp-overview, Site Audit (4), Management/crawler/batch, AND **Brand Radar**
  (10, AI-search visibility). Paid Ahrefs subscription required.
- JK has **no backend** for backlinks, organic-keyword database, or rank tracking — and can't
  match Brand Radar's tracked AI-visibility. Do NOT chase these.

## Competitor: Semrush Claude connector (Claude-MCP only)
- 13 tools, all **research/retrieval over Semrush's database**: `keyword_research`,
  `organic_research`, `overview_research`, `url_research`, `subdomain_research`,
  `subfolder_research`, `backlink_research`, `trends_research`, `siteaudit_research`,
  `tracking_research`, `projects_research`, + `get_report_schema`/`execute_report` (generic
  report runner). Connector URL `mcp.semrush.com/claude/v1/mcp`.
- **Access:** OAuth 2.0; **requires a paid Semrush subscription + API-unit metering** (SEO/
  Trends plans; each call burns units). Heavy/expensive.
- **No AEO tool.** No public Claude-MCP usage numbers.

## JackpotKeywords today
- **Remote connector (`packages/functions/src/api/mcp.ts`) exposes only 2 tools:**
  `jackpotkeywords_recommend`, `jackpotkeywords_usage_status`.
- The stdio/npm server already has more: `recommend`, `recommend_deep`, `aeo_scan`, `audit`,
  `credit_balance`. **So the remote connector is behind its own product.**
- Wedge vs Semrush: **AI keywords from a plain description**, **real Google Ads volumes**,
  **AEO scan** (free/instant — Semrush has none; Ahrefs Brand Radar is deeper, so AEO is NOT a
  unique wedge, just the free/simple version), free/cheap. Don't compete on backlinks /
  competitor-organic database / rank tracking (Semrush+Ahrefs-only, data-heavy).

## Layer A — PARITY GAP (handlers exist; add to remote `mcp.ts` now)
Add these to the `TOOLS` array + `tools/call` switch in `mcp.ts` (wrap existing handlers,
mirror the `recommend` pattern). Takes the connector from 2 → 6 tools:
1. **`jackpotkeywords_aeo_scan`** ⭐ — `api/aeoScan.ts` + `services/aeoScan.ts`. The free/
   instant AEO check (Ahrefs Brand Radar is deeper but paywalled); currently not on the
   connector at all — surface it as the low-friction AEO option.
2. **`jackpotkeywords_audit`** — `api/audit.ts` + `services/seoAudit.ts` + `pageSpeed.ts` +
   `htmlParser.ts`.
3. **`jackpotkeywords_recommend_deep`** — `services/recommendPipeline.ts` (deep variant).
4. **`jackpotkeywords_credit_balance`** — `services/apiCredits.ts`.
Annotate all with `title` + `readOnlyHint` (audit/aeo_scan/recommend are read-only analyses).

## Layer B — NEW capabilities (services exist, not exposed anywhere)
In `packages/functions/src/services/`:
| Service | New tool | Notes |
|---|---|---|
| `googleTrends.ts` | **`trends_research`** ⭐ | Closes Semrush `trends_research`. Likely stateless (Google Trends). |
| `clustering.ts` | **`cluster_keywords`** | Group a keyword list into themes. Value-add. |
| `intentClassifier.ts` | **`classify_intent`** | Label keywords by search intent. |
| `autocomplete.ts` | **`keyword_suggestions`** | Cheap autocomplete-based ideas. |
| `searchConsole.ts` | **`my_organic_performance`** | Partial organic/tracking match — but needs PER-USER Google OAuth (heavier; defer). |
| `ideaBoard.ts` / `api/ideas.ts` | saved ideas | Stateful; low priority. |

Each: confirm the service is callable standalone (some are used inside `recommendPipeline`),
then wrap in `mcp.ts` (and the stdio server) with annotations + creditGate if metered.

## Skip (Semrush-only, no backend / data-heavy)
Backlinks, competitor organic-keyword database, domain/url/subdomain/subfolder research,
rank tracking. Net-new data products — not worth chasing; lean into AEO + AI-keyword wedge.

## Sequence
1. **Parity (Layer A)** — add `aeo_scan`, `audit`, `recommend_deep`, `credit_balance` to the
   remote connector. Do this as part of the connector launch (see the playbook). 2 → 6 tools.
2. **`trends_research`** (expose `googleTrends`) — real Semrush gap-closer. 7 tools.
3. **`cluster_keywords` + `keyword_suggestions` + `classify_intent`** — cheap value-adds. 10 tools.
4. Later: `my_organic_performance` (Search Console, per-user Google OAuth).

After adding: refresh connector tool count + docs + (if made) a Skill that chains
recommend → cluster → intent → audit → aeo_scan into a "keyword strategy" workflow.
