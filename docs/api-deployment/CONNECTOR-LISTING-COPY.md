# JackpotKeywords — Claude Connector Directory listing copy (draft 2026-06-07)

Working draft for the submission form (`clau.de/mcp-directory-submission`).
Field limits per `CONNECTOR-DIRECTORY-PLAYBOOK-2026-06-05.md` §2.

## Page 1 — Server details

**Server name** (no "MCP"/"Server"): `JackpotKeywords`

**Universal URL:** `https://jackpotkeywords.web.app`
**MCP URL:** `https://jackpotkeywords.web.app/api/mcp`

**Tagline** (≤55 chars, 47 used):
> Find low-competition keywords from a description

**Description** (50–100 words, ~72 used):
> JackpotKeywords turns a plain-English product description — or just a URL —
> into ranked keyword opportunities backed by real Google Ads Keyword Planner
> data. Each keyword gets a composite Jackpot Score blending search volume,
> CPC, competition, multi-platform autocomplete depth, and AI relevance to
> your specific product. Unlike traditional SEO suites built around seed
> keywords you already know, JackpotKeywords starts from what your product
> *does* — ideal for new products, indie makers, and niche markets. Includes
> SEO audits and AI-visibility (AEO) scans.

**Use cases with example prompts (≥3):**

1. **Keyword research from a product description** —
   "Find low-competition keywords for my AI meeting-notes app for remote teams."
2. **Keyword research from a URL** —
   "Run keyword research for https://myproduct.com and show me the top opportunities under $2 CPC."
3. **SEO audit** —
   "Audit https://myproduct.com for SEO issues and tell me the quickest wins."
4. **AI visibility (AEO) check** —
   "Check whether AI assistants mention my product when asked about meeting-notes tools."
5. **Campaign planning** —
   "Research keywords for my Chrome extension, then group the best ones into ad groups for a $10/day budget."

**Connection requirements:** Free account (created automatically on first
sign-in via email). Includes a free monthly keyword report; additional reports
and deep research use prepaid credits purchased at jackpotkeywords.web.app.

**Read/Write:** Write (metered tools consume the free monthly allowance /
credits; report tools create research jobs).
*(Confirm against final tool annotations — if everything is judged
non-destructive read-style, GovToolsPro precedent may allow Read Only.)*

**MCP App (interactive UI):** No

**Third-party connections:** Third-party data retrieval (Google Ads Keyword
Planner, Google/Bing/YouTube/DuckDuckGo autocomplete, Google Trends, Gemini).
NOT "web access" (specific APIs, not arbitrary URLs). *(Note: the audit/AEO
tools DO fetch a user-supplied URL — disclose in the form's free-text if asked.)*

**Data handling:** ticks = "only accesses requested data", "HTTPS/TLS".
Do NOT tick "no data stored beyond session" (accounts/credits/jobs persist).
GDPR tick: only if /privacy says so — verify before submitting.

**Categories:** Business & Productivity (primary). Alternative: Data &
Analytics. (No SEO/marketing bucket exists.)

**Ads:** No.

## Page 2 — Categories / Ads / Authentication / Docs & support
*(Verbatim form options as of 2026-06-07 submission — reusable for other products.)*

- **Categories** (fixed list): Business & Productivity · Communication · Data &
  Analytics · Development tools · Financial Services · Consumer Health · Health &
  Life Sciences · Media & Entertainment · Commerce & Shopping · Other.
  JK answer: **Business & Productivity** (+ Data & Analytics if multi-select).
- **Sponsored content/ads:** "No, there is no sponsored content or advertisements".
- **Authentication Type:** "OAuth 2.0 (required for servers/tools needing auth)".
- **Auth Client:** "Dynamic OAuth Client (e.g., DCR, CIMD)". Static ID/Secret blank.
- **Transport Support:** **Streamable HTTP only** (don't tick SSE — the form notes
  SSE may be deprecated later this year; our servers are Streamable-only anyway).
- **Docs link:** `https://jackpotkeywords.web.app/connector` (must let users set
  up, debug, and self-serve support — setup + tools + troubleshooting trio).
- **Privacy:** `https://jackpotkeywords.web.app/privacy`
- **DPA URL:** blank.
- **Support channel:** `smythmyke@gmail.com` (displayed publicly on the listing).

## Page 4 — Test account
- Login: `mcp-review@anthropic.com` (AuthKit one-time email code; email
  self-signup must be ON).
- Pre-seed credits for that email (create-doc-if-missing grant script).
  ✅ Done 2026-06-07: `node scripts/grant-api-credits.mjs mcp-review@anthropic.com 1000`
  → apiCustomers/nBX1zqfLwOh2zuweZ6y8, $10.00.
- Setup steps text: "1. Add the connector with the MCP URL. 2. Claude opens the
  sign-in page — enter mcp-review@anthropic.com and the emailed 6-digit code.
  3. Toggle JackpotKeywords ON in the chat's tools menu. The account is
  pre-loaded with $10.00 credits plus the free monthly report."
- Example prompts that return live data: use cases 1–4 above.
- Tool list (comma-separated `tool_name (Title)` — titles from mcp.ts tools/list):
  `jackpotkeywords_recommend (Keyword research (free monthly report)),
  jackpotkeywords_recommend_deep (Deep keyword research (competitors + clusters)),
  jackpotkeywords_audit (SEO site audit), jackpotkeywords_aeo_scan (AI visibility
  (AEO) scan), jackpotkeywords_get_report (Get research report),
  jackpotkeywords_usage_status (Free usage status), jackpotkeywords_credit_balance
  (Credit balance)`

## Page 5 — Launch readiness
- Surfaces tested: Claude.ai web ✅ (all 7 tools e2e 2026-06-07) + Claude Code.
- Logo: square gold "J" (same mark as favicon) at a hosted URL.
- Screenshots: 3–5 PNGs **≥1000px wide**, cropped to the **response only — do NOT
  include the prompt in the image**; provide the prompt TEXT separately per
  screenshot (official docs wording, verified 2026-06-07). Claude.ai's response
  column is ~800px at 100% zoom → capture at 125–150% browser zoom, or upscale
  (HighQualityBicubic to 1280px worked fine for text shots).
- JK final set (Drive folder `connector-screenshots/` + `prompts.txt` pairing
  file): 1-keyword-table (lead), 2-clusters-competitors, 3-seo-audit, logo PNG.

## Differentiation notes (for tool descriptions, not the form)
- Directory already has Ahrefs + Semrush. Win the narrower intent:
  **keywords from a plain-English description** (neither does this), AEO scan,
  $9.99 entry price vs enterprise suites. Suggestions in Claude are ad-free and
  relevance-ranked — clear, specific tool descriptions are the ranking lever.
