# JackpotKeywords — AEO Module Research

**Status:** Research phase complete. **Decision (2026-04-17):** Build reconnaissance script in this repo as a standalone CLI/package. Test against Michael's own products. Evaluate integration into the JK web app after MVP ships.
**Date:** 2026-04-17
**Originating context:** Spun out of `C:\Projects\ideas\reddit-seed-pipeline\VIABILITY.md` research. The Reddit seed pipeline needed an AEO reconnaissance step to validate its niche selection; the reconnaissance tool is itself a natural JK feature.

**Build plan (tracked in `ROADMAP.md` under "AEO Scan Module Track"):**
- Phase A-1 — build standalone script in this repo (no web app / auth / credits yet)
- Phase A-2 — internal validation against Michael's products (GovToolsPro, BulkListingPro, Markitup)
- Phase A-3 — only after JK MVP ships + A-2 validates: port logic into a Cloud Function and wrap in existing auth/credit system

---

## What AEO means (for docs)

**AEO = Answer Engine Optimization.** SEO targets Google's blue links. AEO targets the answer itself — getting your product named or cited when someone asks Gemini, ChatGPT, Perplexity, or Google AI Overviews a question. Buyers increasingly ask an AI instead of scrolling search results; invisible to the AI = invisible to buyers.

## Why AEO fits JackpotKeywords

JK already does "tell me what keywords to target." AEO extends that to "tell me where the AI is already sending buyers so I can intercept." Same input (product description or URL), same AI (Gemini), same credit/auth system, adjacent output.

Classic keyword volume is becoming less predictive of traffic as AI Overviews eat clicks. Big tools (Semrush, Ahrefs) are scrambling to add AEO features. A faster-moving niche player could ship it first in specific verticals.

## Citation landscape (source: Tinuiti Q1 2026 AI Citations Trends Report)

| AI platform | Reddit share | Notable preferences |
|---|---|---|
| Google AI Overviews | 21% | Reddit 44% of social citations |
| Perplexity | 24% | 31% of citations are social overall |
| ChatGPT | 5%+ | Mixed sources |
| **Gemini** | **0.1%** | Medium 28% of social, YouTube 29% |
| Google AI Mode | ~9% | — |

**Implication for JK customers:** the right seeding surface depends on which AI their buyers use. JK should report per-platform recommendations, not a single "post to Reddit" verdict.

## Proposed flow — "AEO Scan"

### Input
Same as existing JK flows. Product description (Flow A) or URL (Flow B, scrape → description).

### Pipeline
1. **Query generation (Gemini).** Generate 5–10 *buyer-voice queries* — what a real customer would type, not keyword-fragment form. Example: "I'm an Etsy seller with 200+ listings and need to bulk upload — what's the best tool?" (Reuses JK's existing Gemini client; new prompt template.)
2. **Volume enrichment (Google Ads API).** Optional overlay — reuses existing Keyword Planner integration to attach volume to each query.
3. **Citation capture across 4 surfaces:**
   - Gemini API with Grounding/Search tool → returns citation URLs
   - OpenAI Responses API with `web_search` tool → returns citations
   - Perplexity Sonar API → citations native
   - Google AI Overview via SerpAPI or DataForSEO → partial reliability
4. **Classification.** Each citation tagged as: Reddit thread / Medium article / vendor blog / YouTube / docs / forum / other.
5. **Scoring.** Per-site AEO Score aggregating visibility × platform coverage × citation quality.

### Output — what the user sees

**A. Per-query citation table**

| Query | Volume | Gemini cites | ChatGPT cites | Perplexity cites | Google AIO cites | Your product named? | Competitors named |
|---|---|---|---|---|---|---|---|
| [query] | [vol] | [urls+types] | [urls+types] | [urls+types] | [urls+types] | ✓ / ✗ | [list] |

**B. AEO Score card**
- **Visibility Score (0–100):** share of queries × platforms where the user's product is cited
- **Citation type mix:** Reddit X%, Medium Y%, vendor blog Z%, YouTube, docs — tells the user *where* to create content
- **Platform skew:** per-surface breakdown ("Gemini favors Medium for your niche, Perplexity favors Reddit")
- **Competitor dominance:** which competitors are winning which surfaces

**C. Action list**
- **Reddit threads to join:** specific thread URLs cited by AI today — join in comments as a human to propagate into future answers
- **Medium gaps:** queries with no Medium article cited — opportunity to own via a single long-form post
- **Competitor hijack targets:** queries where a competitor is cited from thin/outdated content
- **Coverage gaps:** queries with zero presence across all 4 platforms — content strategy targets

## Why this is repeatable/integratable per user

The pipeline is a pure function: `aeoScan(productDescription) → AEOReport`. No per-user customization of logic — every user runs the same 4-surface loop on their own product. SaaS shape is clean.

**Integration with JK flows:**
- Flow A — describe product → "Run AEO Scan" as a follow-on action after keyword results
- Flow B — URL → existing scrape feeds product description into AEO scan
- Flow D — Competitor Spy → AEO scan of a competitor URL reveals *their* citation footprint

## Credit economics

AEO scan hits **4 external APIs per query** vs. keyword search's 1. Per-scan cost is ~3–5x baseline:
- Gemini API: cheap (already in JK budget)
- OpenAI Responses API + web search tool: moderate
- Perplexity Sonar API: moderate
- SerpAPI / DataForSEO: expensive per call — likely the cost driver

**Pricing options:**
- Gated to Pro tier ($9.99/mo) as a differentiator
- Or premium credit pack: e.g., $4.99 for 3 AEO scans (vs. keyword scans)
- Free tier: 1 AEO scan at signup as a conversion hook (parallel to the 3 free keyword searches)

## Risks / caveats

1. **Non-determinism.** AI citation behavior varies run-to-run. Need to either run each query 2–3x and aggregate, or disclose volatility in the UI. Worth specifying in UX before building.
2. **Sparse niches.** Some buyer queries produce no citations at all — the AI doesn't ground in small niches. That's itself useful data (AEO gap = opportunity), but UX needs to frame "blank" as signal, not bug.
3. **Rate limits & cost variance.** Four APIs with different rate limits and pricing. A 10-query scan × 4 platforms × 2–3 reruns = 80–120 API calls. Budget modeling required before pricing.
4. **Google AI Overview reliability.** SerpAPI's AIO extraction isn't 100% reliable; Google actively evolves the surface. Build expecting partial coverage on that one platform.
5. **Competitive window.** Semrush and Ahrefs will ship AEO features at scale. JK's window is "first in specific verticals" or "deepest in action-oriented output (join-this-thread lists)" rather than "most comprehensive."

## Recommended path — build sequence

1. **Script-first (inside this repo, not inside the web app).** Build a standalone CLI reconnaissance script that lives in the JK monorepo (tentative: `packages/aeo-scan/` or `scripts/aeo-scan/`). Runs independently — does not touch the Firebase backend, auth, or credit system. Output: CSV + Markdown report.
2. **Validate output quality.** Run against Michael's own products (GovToolsPro, BulkListingPro, Markitup) and the Reddit seed pipeline's candidate niches. Critical read of outputs — is the signal-to-noise ratio acceptable? Are the action lists genuinely actionable?
3. **Decide: migrate or park.** If output is useful → port logic into JK Cloud Function and wrap in existing auth/credit system. If noisy/low-value → park the idea; Reddit seed pipeline still has its data and the script still served its purpose internally.
4. **JK product integration (post-MVP + post-validation).** Only after JK MVP ships AND A-2 validation passes. Adding AEO pre-MVP = scope creep on unshipped software.

**Why the script lives in the JK repo rather than a separate project:**
- Minimizes friction when migrating proven logic into the web app
- Keeps Gemini client, prompt templates, and query-generation patterns in one codebase
- Internal use for Michael's other products still works — it's a CLI, doesn't require the web app to be running

## Open questions to resolve before building

1. Does JK's existing Gemini client support grounding/search tool, or only text generation? (Affects dev effort.)
2. What's Michael's appetite for a second AI provider (OpenAI/Perplexity) in JK's infra? Adds key management, billing separation, error surfaces.
3. Is AEO a Pro-tier differentiator or a standalone credit pack? Pricing model decision affects landing-page copy.
4. How many queries per scan is the sweet spot? 5 (cheap, shallow) vs. 15 (thorough, expensive)?
5. Do users want per-competitor AEO breakdown as a separate scan type, or bundled into the main scan?

## Related files

- `C:\Projects\ideas\reddit-seed-pipeline\VIABILITY.md` — origin research. Detailed thesis on why AEO matters, citation percentages per platform, niche-specific findings for GovTools/BulkListingPro.
- `C:\Projects\JackpotKeywords\PRODUCT-DESIGN.md` — existing flows this would extend.
- `C:\Projects\JackpotKeywords\ROADMAP.md` — current MVP roadmap; AEO is **not** in Phase 1–3 and should not block MVP.
