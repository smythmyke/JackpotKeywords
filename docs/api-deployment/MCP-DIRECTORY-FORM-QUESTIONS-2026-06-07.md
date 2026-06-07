# MCP Directory Submission Form — verbatim questions + JK answers (captured 2026-06-07)

Captured live while submitting JackpotKeywords at `clau.de/mcp-directory-submission`
(Google Form, 6 pages). Purpose: reusable question bank so the next product
(MarkItUp / patent-search / GovToolsPro updates) can prep every answer in advance.
Companion docs: `CONNECTOR-DIRECTORY-PLAYBOOK-2026-06-05.md` (§2 walkthrough),
`CONNECTOR-LISTING-COPY.md` (JK listing copy).

> Page 1 (Company + Server details) was NOT captured verbatim this run — see the
> playbook §2 for its field list (company/contact, server name, universal + MCP
> URLs, tagline ≤55 chars, description 50–100 words, ≥3 use cases with prompts,
> connection requirements, read/write, MCP App?, third-party connections, data
> handling). Capture it verbatim on the next submission.

---

## Page: Categories / Ads (end of server details)

**Categories** (single/multi select, fixed list):
Business & Productivity · Communication · Data & Analytics · Development tools ·
Financial Services · Consumer Health · Health & Life Sciences · Media &
Entertainment · Commerce & Shopping · Other: ___

→ JK: **Business & Productivity**

**Does this MCP serve sponsored content or advertisements?*** (radio)
- No, there is no sponsored content or advertisements
- Yes, there are banner ads or other paid visual elements
- Yes, the returned content or ranking of returned content is impacted by sponsorship or ad placement
- Other: ___

→ JK: **No, there is no sponsored content or advertisements**

## Page: Authentication Details

"How users connect to your MCP in Claude"

**Authentication Type*** (radio): No auth needed · OAuth 2.0 (required for
servers/tools needing auth) · Custom URL (not supported)
→ JK: **OAuth 2.0**

**Auth Client** (radio): Static OAuth Client · Dynamic OAuth Client (e.g., DCR, CIMD)
→ JK: **Dynamic OAuth Client**

**Static Client ID (if applicable)** → blank
**Static Client Secret (if applicable)** → blank

**Transport Support*** (checkboxes): Streamable HTTP · SSE
Form note: "Claude.ai, Claude Code, and API all support both SSE & Streamable
HTTP, but recommend that your server supports Streamable HTTP as we may
deprecate SSE support later this year."
→ JK: **Streamable HTTP only**

## Page: Documentation & Support

"It's important users can effectively use your MCP server, and reach out to
developers when things go wrong."

**MCP Server Documentation Link*** — "externally facing link shown to users…
understand what your MCP does and how to set it up, debug issues, or self serve
support… docs, blog, support center, etc."
→ JK: `https://jackpotkeywords.web.app/connector`

**Privacy Policy*** — "clear, accessible privacy policy explaining data
collection, usage, and retention. Displayed with your Directory listing."
→ JK: `https://jackpotkeywords.web.app/privacy`

**Data Processing Agreement URL (if applicable)** → blank

**Support Channel*** — "link or email… displayed with your Directory listing."
→ JK: `smythmyke@gmail.com`

## Page: Test Account Access

"Test credentials are necessary if your server requires authentication…
Incomplete or missing test credentials will block review."

**Testing Account Credentials*** — "standard testing credentials, with sample
data… You can use client credentials (if supported) or a custom email (as long
as 2FA is not required). If an accessible email is required for a test account
(e.g., for Google OAuth or 2FA), use mcp-review@anthropic.com."
→ JK: mcp-review@anthropic.com; no password (Magic Auth one-time email code);
pre-seeded $10.00 credits + free monthly report (grant script run 2026-06-07).

**Test Account Server URL (if different from main server URL)** → blank

**Test Account Setup Instructions** — "Review teams may not be familiar with
your service… ready-to-go example data, or extremely clear guidance."
→ JK: 3 steps (add connector w/ MCP URL → email code sign-in → toggle ON in
tools menu) + 5 example prompts + async-job note (tools return job id, Claude
polls jackpotkeywords_get_report, 1–3 min, auto-refund on failure).

**Test Data Availability** (checkboxes):
- Test account includes sample data ✅
- All tools can be tested with provided data ✅

## Page: Server Technical Details

"These questions will help with automated review of the server, and will be
used when listing the server in the directory."

**List of tools in your MCP Server*** — "Comma-separated… Format: tool_name
(human-readable name)"
→ JK: jackpotkeywords_recommend (Keyword research (free monthly report)),
jackpotkeywords_recommend_deep (Deep keyword research (competitors + clusters)),
jackpotkeywords_audit (SEO site audit), jackpotkeywords_aeo_scan (AI visibility
(AEO) scan), jackpotkeywords_get_report (Get research report),
jackpotkeywords_usage_status (Free usage status), jackpotkeywords_credit_balance
(Credit balance)

**Tool Titles & Annotations*** (checkboxes):
- I've specified user-friendly titles for all tools in my server ✅
- I've specified accurate tool annotations for all tools in my server ✅

**List of resources in your MCP Server** → blank (none)
**List of prompts in your MCP Server** → blank (none)

## Page: Launch Readiness & Listing Media Materials

**Timeline — Server GA Date** — "we can only include servers in our Directory
that are in GA." → blank (JK already GA)

**Confirm testing is complete & your server works as intended in:*** (checkboxes)
Claude.ai (web) · Claude Desktop · Claude Code · Cowork
Form note: "Claude Code and Cowork compatibility is not required"
→ JK: Claude.ai (web) ✅ + Claude Code ✅ (both genuinely tested 2026-06-07)

**Server Logo*** — "square logo (1:1 aspect ratio) in SVG format… You can either
list it as a URL (preferred, Google Drive link is okay)."
→ JK: Drive link to jackpotkeywords-logo.png (192×192 PNG — PNG was accepted
for GovToolsPro despite the SVG ask).

**Server Logo URL*** — "Please verify that
https://www.google.com/s2/favicons?domain=<YOUR_DOMAIN>&sz=64 points to the
logo that you want displayed… This Google favicon link is where we fetch the
logo displayed for tool calls and the directory from."
Checkbox: "I have verified that the favicon is correct"
→ ⚠️ JK gotcha 2026-06-07: site favicon was fixed days earlier and verified at
the source, but Google s2 STILL served the 16px generic globe (cache lags
hours–days and can't be force-refreshed). Lesson for future products: fix the
favicon a WEEK before submitting. Options: tick + note "favicon recently
updated, s2 cache refreshing", or pause submission until s2 shows the real mark.

**Promotional Images of MCP Server** — "3–5 screenshots ideal… at least 1000px
width, each should come with a paired prompt (provided separately). Cropped
directly to just the app response itself. PNG format. Videos welcome but may
not be used. Share a link to a drive, dropbox, box, or other filestore."
→ JK: Drive folder with 1-keyword-table.png / 2-clusters-competitors.png /
3-seo-audit.png + prompts.txt (pairings) + logo.
Gotcha: claude.ai's response column is ~800px at 100% zoom — capture at 125–150%
browser zoom or upscale (HighQualityBicubic → 1280px worked).

**Link to Promotional Materials** — "If you have matching prompts for the
promotional images, share them here."
→ JK: same Drive link + "prompts.txt in the folder pairs each screenshot with
its prompt text."

## Page: Skills & Plugins (all optional)

"Agent Skills are modular capabilities that extend Claude's functionality…
Skills can help guide Claude in creative and useful ways to use your MCP
server. To submit a related Skill alongside your MCP server, enter the details
below. This is not required for MCP server submission. Similarly, custom
Plugins help extend Claude Code… To submit a Plugin, follow this link to a
separate form."

- **Skill Name** — "<100 characters, displayed on a directory of Skills" → blank
- **Skill Description** → blank
- **GitHub URL of Skill** — "Skills are currently submitted via a GitHub URL…
  publicly accessible. Multiple Skills: all in the same repository." → blank
- **Extra Information on Skills** → blank
- **Related Plugins** — "planning to submit (or already have) a plugin or
  plugin marketplace alongside this MCP? link it here for cross promotion" → blank

→ JK: all blank. Post-listing idea: a `keyword-research-workflow` SKILL.md
(mirror GovToolsPro's federal-opportunity-triage) = free Skills-directory
cross-promo slot.

## Page: Submission Requirements Checklist (final page)

"Please confirm that your integration complies with all guidelines listed here,
and that you've reviewed and agree to the MCP Directory Terms… Anything missing
from this list will delay review."

**Policy Compliance*** (tick all):
- I have reviewed and agree to the Software Directory Policy.
- My server does NOT enable cross-service automation
- My server does NOT transfer money, cryptocurrency, or execute financial transactions
- My MCP server is live, published, and ready to accept production traffic.
- I work for the company that owns or controls the API endpoint(s) that my server connects to.

**Technical Requirements*** (tick all):
- OAuth 2.0 is fully implemented for ALL tools requiring authentication
- All tools include proper safety annotations (readOnlyHint, destructiveHint)
- Server is accessible via HTTPS (not HTTP)
- CORS is properly configured for browser-based authentication
- Claude.ai and Claude Code IP addresses are allowlisted (if applicable)
- I have tested this works with Claude.ai on the latest build

**Documentation Requirements*** (tick all):
- Complete server documentation is published and publicly accessible
- Documentation includes setup instructions, tool descriptions, and troubleshooting guide
- Company privacy policy is published and accessible
- Terms of service are published and accessible

**Testing Requirements*** (tick all):
- Test account with sample data is ready (if relevant)
- Test credentials are valid for at least 30 days (if relevant)
- All server tools are functional and tested in the surfaces in which they'll be available

**Additional Information** (free text) → JK used it to preempt the favicon
s2-cache lag + explain the async-job pattern + reviewer credit seeding.

---

## ✅ SUBMITTED 2026-06-07

Including the optional Skill: `Keyword Research Workflow` at
`https://github.com/smythmyke/jackpotkeywords-mcp-server/tree/main/skills/keyword-research-workflow`.
Post-submit freeze: keep mcp-review@anthropic.com working ≥30 days, no WorkOS
config changes, prod stays stable. Benchmark: GovToolsPro submitted 2026-06-05.
