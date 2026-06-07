# JackpotKeywords Self-Audit Notes

Tracking JackpotKeywords' own SEO/AEO posture over time. Each scan goes here with a brief interpretation so we don't re-derive findings later.

## 2026-04-23 — AEO scan (`2026-04-23-aeo-scan.pdf`)

**Score:** 0/100 AI Visibility. Cited in 0/10 buyer queries. 0/10 answer mentions.

### The 10 buyer queries are perfect fits for JackpotKeywords

Every query is JK's literal pitch:
1. Best AI-powered keyword research tools → JK headline
2. Find keywords without seed keywords → JK value prop
3. Affordable alternatives to SEMrush/Ahrefs → $1.99 vs $99/mo
4. Best for small business owners new to SEO → JK target audience
5. **Generates ideas by analyzing product description** → JK signature feature
6. Categorize keywords by intent → JK has 12 intent categories
7. Actual CPC bid data and competition → JK uses Google Ads data
8. Unlimited searches and analytics → JK Pro plan
9. Accurate monthly volumes + 12-month trends → JK has both
10. Discover search terms by domain → JK URL analysis

### Competitor dominance

| Competitor | Citations | Frequency |
|---|---|---|
| semrush | 9/10 | 90% |
| ahrefs | 8/10 | 80% |
| ubersuggest | 6/10 | 60% |
| keywordtool.io | 3/10 | 30% |
| se ranking | 2/10 | 20% |

### Why on-site work isn't moving the needle

JK has already shipped:
- llms.txt, robots.txt, sitemap.xml (46 URLs)
- JSON-LD: SoftwareApplication, FAQPage, Offer (in `index.html`, `Home.tsx`, `Pricing.tsx`)
- 34 blog posts including SEMrush/Ahrefs/Ubersuggest/Mangools/Longtailpro comparison posts
- 4 feature pages, About, Privacy, Terms, Disclaimer
- Schema markup, comprehensive blog content

**The audit can't see the real problem:** AI models cite based on training-data frequency + live web authority. SEMrush/Ahrefs have 15+ years of Reddit threads, Medium articles, third-party reviews, tens of thousands of authority backlinks. JK has ~zero third-party citations. No on-site change addresses this.

### What actually moves AI citations (ranked by leverage)

1. **Listings on g2.com / Capterra / AlternativeTo / SourceForge** — listicle authors scrape these. ~2 hrs total. Free.
2. **ProductHunt launch** — listing gets indexed everywhere; reviews build authority. (Plan exists in memory: `project_jackpot_press_plan.md`)
3. **Show HN** post — one viral post puts you in 10K+ AI training crawls.
4. **Reddit answers** in r/SEO, r/bigseo, r/marketing, r/Entrepreneur — answer the exact 10 buyer queries above with helpful answers + JK as one option. Live web search picks up Reddit in real-time.
5. **Medium / Substack articles under founder name** — personal-brand citations carry founder authority.
6. **Indie Hackers + BetaList + Demand Curve** newsletter submissions.

### Lagging vs leading indicators

- AI training data lags 3-6 months behind real changes. Today's audit reflects the world ~6 months ago.
- Live web search (Perplexity, Claude with browsing, Gemini grounding) reads Reddit and authority sites in real-time → citations possible within days of posting.
- **Don't expect this 0/100 score to move for 6-12 months** even with aggressive off-site work.

### Action items (from this conversation, ranked)

1. **Today:** Submit listings to g2.com, Capterra, AlternativeTo, SourceForge.
2. **This week:** ProductHunt launch (per existing plan). Show HN post.
3. **Ongoing:** Reddit answers targeting the 10 specific queries above. Compounds over months.
4. **Quarterly:** Founder-byline Medium piece embedding JK as the tool used.
5. **Skip:** More on-site landing pages or schema work — diminishing returns at this point.

### Cross-reference to existing memory

- `project_press_outreach.md` — Press strategy framework
- `project_jackpot_press_plan.md` — Tailored launch plan (target journalists, pitch angles, PH plan)
- `project_jk_self_audit_action.md` — Prior 4-audit progression (83→80→96→96→100). This AEO scan is a separate axis from those overall-score audits.
- `project_activity_log_findings.md` — 0% conversion finding. AEO citations only matter if conversion fixes are also in flight.

---

## 2026-04-23 — AEO scan tool review (post-scan analysis)

After the JK self-scan, audited the AEO scan tool itself by cross-referencing the report's findings against JK's actual on-site state. Findings inform the tool's next iteration.

### Audit recommendations vs actual JK state

| # | Audit said | Actual JK state | Verdict |
|---|---|---|---|
| 1 | Create dedicated landing page for "Jackpot Score" | Concept mentioned in About + Home, no dedicated page | VALID gap |
| 2 | Develop comparison content (vs SEMrush etc.) | **8 comparison/alternative posts shipped** (vs-semrush, vs-ahrefs, ubersuggest-alternative, spyfu, longtailpro, mangools, se-ranking, semrush-open-source) | STALE — already done |
| 3 | Detailed guides + case studies + video tutorial | Some guides exist, no case studies, no video | PARTIALLY valid |
| 4 | Schema.org markup (Product, FAQPage, HowTo) | Have SoftwareApplication + FAQPage + Offer. Missing Product, HowTo | PARTIALLY valid |
| 5 | Reddit + Medium presence | Off-site, can't audit. Plans exist in memory | VALID — the real lever |

**2 of 5 action items are stale.** The audit doesn't see what's already shipped → generates boilerplate recommendations.

### Bugs in `packages/functions/src/services/aeoScan.ts`

1. **Hardcoded competitor list contaminates light scan** (line 22-27)
   - List mixes keyword tools (semrush, ahrefs) with image tools (canva, glorify, picmonkey, adobe express, photoshop express)
   - Used by light scan when no product-specific competitors are passed
   - **Caused "moz" false positive on ten2one's audit** (moz is in the list, AI mentioned moz somewhere unrelated → flagged as ten2one competitor)

2. **Product name matching is single-pattern** (line 131)
   - Only matches `productName.toLowerCase()` exactly
   - "Jackpot Keywords" (with space) → MISSES the JK match
   - No variation matching for multi-word brands or common abbreviations

3. **Failed grounded searches count as "not cited"** (line 252-255)
   - On API failure: empty result, query scores 0 silently
   - Inflates negative score; user can't tell scan errors from real misses

4. **Action items prompt has no site-state context** (line 188-203)
   - Prompt sees only the AI answers + competitors
   - Has no idea what's shipped → recommends adding things that exist

### Reporting gaps in PDF (data captured but not surfaced)

| Captured in code | Shown in PDF? |
|---|---|
| `answerSnippet` (300 chars of AI answer per query) | NO — biggest diagnostic gap |
| `citations[]` (URLs the AI cited) | NO — shows authority sites winning |
| `searchQueries[]` (Google queries the AI ran) | NO |
| AI model used (Gemini 2.5 Flash + Google Search grounding) | NO disclosure |

### Critical insight: AEO scan is measuring search-grounded answers, not training-data recall

`aeoScan.ts:100-102` uses `tools: [{ googleSearch: {} }]` — Gemini grounded search reads live Google results. So the score reflects:
1. Google search ranking for the query
2. Gemini's selection bias toward established brands

Not "is this product in AI training data". This means **improving traditional Google rankings DOES improve AEO score** — contrary to the common AEO playbook framing.

### Fixes prioritized for tool's next iteration

1. **Surface `answerSnippet` per query in PDF** — biggest single value, code change in PDF rendering only
2. **Surface top 3-5 citation URLs per query in PDF** — directly identifies outreach targets
3. **Site-state-aware action items** — pass shipped-feature manifest into the prompt so it stops recommending what exists
4. **Brand variation matching** — try multiple patterns (with space, hyphen, common abbreviations); clean hardcoded competitor list
5. **Score history** — store scans timestamped, show trend over time
6. **Per-query "what would have helped"** — for each NOT FOUND, suggest specific outreach (which cited domain to pitch)
7. **Mark scan errors distinctly from "not found"**

Quick wins (1-3 above) chosen for next implementation pass.
