# JackpotKeywords — Product Design & Feature Research

## Date: March 28, 2026

---

## Architecture Decision: Web App First, Extension Later

### Web App (MVP)
- Core product — keyword research is a sit-down workflow, not a page-injection use case
- React + TypeScript + Tailwind frontend
- Firebase backend (Auth/Firestore/Functions) + Stripe
- Google Ads API (KeywordPlanIdeaService) + Gemini AI

### Chrome Extension (V2)
- Companion to web app, not standalone
- Use case: Right-click any website → "Find keywords for this site" → 5 free results → funnels to web app
- Phase 2 "Competitor Spy": browse competitor's site → extension scrapes → runs analysis
- Lightweight entry point driving web app signups

### Timeline
- MVP: Web app only
- V2: Chrome extension companion (competitive spy + quick lookup)

---

## User Flows

### Flow A: "Describe Your Product" (Primary)

```
[1] User enters free-text description
    "I sell a Chrome extension that helps government contractors
     analyze RFPs and write proposals on SAM.gov"
                    ↓
[2] AI extracts intent categories
    → Direct: "sam.gov tool", "government proposal software"
    → Feature: "RFP analysis", "bid estimation", "capability statement"
    → Problem: "how to win government contracts", "how to write government proposal"
    → Competitor: "govwin alternative", "govdash alternative"
    → Audience: "small business government contracts", "veteran government contracts"
                    ↓
[3] Google Ads API enriches each keyword
    → Volume, CPC, competition (real data)
                    ↓
[4] AI scores each keyword (Jackpot Score 0-100)
    → Combines volume + CPC + competition + trend + relevance
                    ↓
[5] Results dashboard
    → Sortable table with color-coded scores
    → Filter by category, score range, volume
    → Tier breakdown (Jackpot / Solid / Expensive)
    → Export CSV, PDF report, Google Ads import
```

### Flow B: "Enter a URL" (Secondary)

```
[1] User pastes URL
    "https://govtoolspro.com"
                    ↓
[2] AI scrapes the page
    → Extracts: title, meta description, H1-H3, key content phrases
    → Identifies: product name, features, value props, target audience
                    ↓
[3] AI generates product description from scraped data
    → User can edit/refine before proceeding
                    ↓
[4] Merges into Flow A at step [2]
    → Same keyword generation + enrichment + scoring pipeline
                    ↓
[5] BONUS: "Page vs Keywords" analysis
    → "Your page mentions 'RFP analysis' but doesn't mention
       'capability statement' (2,900/mo, $1.47 CPC) — add it"
    → Keyword gap: what you're missing
    → On-page SEO suggestions
```

### Flow C: "Competitor Spy" (Phase 2 / Extension)

```
[1] User enters competitor URL
    "https://govwin.com"
                    ↓
[2] AI scrapes competitor page
    → Extracts their keywords, positioning, features
                    ↓
[3] Runs keyword research on competitor's terms
                    ↓
[4] Gap analysis
    → "They rank for X, you don't"
    → "They're paying $20 CPC for Y — you could get it for $3"
    → Side-by-side comparison table
```

---

## Feature Set

### MVP Features
1. **Product Description Input** — free-text or URL
2. **AI Keyword Generation** — multi-category seed generation across 10 intent categories
3. **Autocomplete Expansion** — long-tail discovery from Google Autocomplete
4. **Google Ads API Enrichment** — real volume, CPC, competition for ALL discovered keywords
5. **Google Trends Overlay** — trend direction + seasonal detection for top results
6. **Jackpot Scoring** — 0-100 composite score with Ad Score + SEO Score views
7. **Results Dashboard** — grouped by 10 categories, sortable, filterable, color-coded, trend arrows
8. **CSV Export** — download results
9. **Save Searches** — to user account

### V2 Features
- **Google Ads Campaign Builder** — export ready-to-import campaign (CSV for Google Ads Editor, with match types, CPC bids, ad group structure)
- **Goldmine Report PDF** — branded, shareable one-click export with charts and tier rankings
- **Landing Page Keyword Matcher** — paste URL → AI compares page content to keyword opportunities → suggests title/meta/H1 rewrites
- **Chrome Extension Companion** — right-click any site → quick keyword lookup → funnels to web app
- **Google Search Console Integration** — connect GSC → overlay actual rankings/impressions on Jackpot results → "low-hanging fruit" tab showing keywords user already ranks for

### V3 Features
- **Competitor Spy** — enter competitor URL → see their keyword strategy → gap analysis
- **Niche/Industry Presets** — pre-built seed keyword templates for common verticals (Etsy sellers, SaaS, government contracting, local services, etc.)
- **Keyword Monitoring Dashboard** — save goldmine keywords → track volume/CPC changes monthly → alerts on price drops
- **Chrome Web Store Keyword Optimizer** — unique niche: help extension developers optimize CWS store listings
- **Ad Copy Generator** — pick keywords → AI generates Google Ads headlines/descriptions
- **SEO Content Planner** — keyword clusters → blog topic suggestions, titles, outlines
- **Trend Alerts** — weekly email: "Keyword X jumped 40% this month"

---

## MVP Data Source Stack

| Source | Role | Step | Cost | Priority |
|---|---|---|---|---|
| Gemini AI | Seed generation + scoring + classification | 1, 6 | ~$0.02/search | Core |
| Google Autocomplete | Long-tail seed discovery | 2 | Free | Core |
| Google Ads Keyword Planner | Volume, CPC, competition enrichment | 4 | Free | Core |
| Google Trends | Trend direction + seasonal detection | 5 | Free | Core |

### Data sources evaluated and deferred

| Source | Why Deferred |
|---|---|
| Google Search Console | Pro/Agency feature — requires OAuth, adds onboarding friction |
| Google PageSpeed Insights | Nice-to-have for landing page analyzer, not core keyword tool |
| Wikipedia/Wikidata | Gemini already knows niche taxonomies from training data. Adds 200-500ms latency for negligible seed quality improvement. Cut from MVP. |
| Common Crawl / BuiltWith | V2 Competitor Spy feature, not MVP |

### What each source uniquely contributes

| Source | Volume | CPC | Competition | Trends | Long-tail | Seasonal | Rankings |
|---|---|---|---|---|---|---|---|
| Keyword Planner | Exact | Yes | Yes | No | Weak | No | No |
| Google Trends | Relative | No | No | **Yes** | No | **Yes** | No |
| Autocomplete | No | No | No | No | **Yes** | No | No |
| Search Console (V2) | Impressions | No | Position | No | Some | No | **Yes** |

No single source covers everything. **The combination is the product.**

---

## Search Methodology: 10 Keyword Intent Categories

When a user describes their product, AI generates seed keywords across all 10 categories:

### 1. Direct / Head Terms (What it IS)
Short, high-volume, obvious terms describing the product category.
```
Example: etsy bulk upload, etsy listing tool, etsy bulk lister
```
- 1-3 words. Highest volume, highest competition. Brand awareness.
- Seeds per search: 3-5

### 2. Feature-Based (What it DOES)
Keywords for each specific feature.
```
Example: etsy tag generator, etsy title generator, etsy csv import
```
- 2-4 words. Medium volume, often lower competition. High conversion.
- Seeds per search: 5-10

### 3. Problem-Based (What pain it SOLVES)
How-to queries and frustration-driven searches.
```
Example: how to upload multiple listings to etsy, etsy listing takes too long
```
- 4-8 words, often questions. Lower volume, very high intent.
- Seeds per search: 5-8

### 4. Audience-Based (WHO uses it)
Keywords identifying the target user, not the product.
```
Example: etsy seller tools, digital product seller tools, tools for etsy beginners
```
- People who don't know they need the product yet. Medium volume.
- Seeds per search: 3-5

### 5. Competitor Brand Terms (WHO they'd switch from)
Names of competing products/services.
```
Example: erank, alura etsy, marmalead, vela etsy
```
- Often massive volume at low CPC. Trademark considerations.
- Seeds per search: 5-10

### 6. Competitor Alternative Terms (Comparison shoppers)
People actively comparing or switching.
```
Example: erank alternative, marmalead vs alura, best etsy seo tool
```
- "alternative", "vs", "best", "cheapest", "free" modifiers. Ultra-high purchase intent.
- Seeds per search: 3-5

### 7. Use Case / Scenario Terms (WHEN they'd use it)
Specific situations where the product is needed.
```
Example: launch etsy shop fast, upload 100 etsy listings, etsy holiday listing rush
```
- 3-6 words. Very specific intent, high conversion. Seasonal opportunities.
- Seeds per search: 3-5

### 8. Industry/Niche Terms (WHERE they operate)
Keywords specific to the user's sub-niche.
```
Example: svg seller etsy, printables seller tools, cricut design upload
```
- Narrow but highly relevant. Very low competition. Catches what competitors miss.
- Seeds per search: 3-5

### 9. Benefit/Outcome Terms (WHY they'd buy)
Keywords focused on the result, not the tool.
```
Example: save time listing on etsy, increase etsy sales, etsy seo optimization
```
- Outcome-focused. Appeals to "what's in it for me" searchers.
- Seeds per search: 3-5

### 10. Adjacent/Tangential Terms (Traffic funnel plays)
Keywords that attract the same audience but aren't directly about the product.
```
Example: etsy fees calculator, etsy profit calculator, how much does etsy take
```
- Often massive volume at ultra-low CPC. Requires free tool/content to capture.
- Seeds per search: 3-5
- AI provides brief suggestion: "Consider building a free calculator page for this traffic"

**Total seeds per search: ~40-65 across all categories**

---

## Methodology Flow (Revised — All Seeds First, Then Enrich)

Core principle: **Gather seeds from ALL sources first, deduplicate, THEN enrich everything through Keyword Planner in one batch.**

```
USER INPUT (description or URL)
         ↓
[Step 1] AI Seed Generation (Gemini)
         → 40-65 seeds across 10 intent categories
         → Output: seed keyword list + category tags
         ↓
[Step 2] Autocomplete Expansion
         → Top 10 seeds get full a-z expansion (~260 queries)
         → Remaining seeds get raw suggestions only (~40-55 queries)
         → Output: ~100-300 additional keyword candidates
         ↓
[Step 3] MERGE & DEDUPLICATE
         → Combine: AI seeds + Autocomplete discoveries
         → Remove exact duplicates
         → Tag source: "ai-generated" vs "autocomplete-discovered"
         → Output: master keyword list (~150-350 unique terms)
         ↓
[Step 4] Google Ads Keyword Planner (SINGLE BATCH ENRICHMENT)
         → Feed ENTIRE master list as seeds
         → API limit: ~20 seeds per call → 8-18 API calls
         → Returns for EACH keyword: volume, CPC, competition
         → ALSO returns additional related keywords we didn't seed
         → Output: ~500-2,000 enriched keywords
         → Keywords with 0 volume tagged as "Emerging / Long-tail"
         ↓
[Step 5] Google Trends Overlay (top 100 by volume)
         → Trend direction: ↑ ↗ → ↘ ↓
         → Tooltip: "Rising 45% over 12 months" or "Seasonal: peaks in November"
         → Rising keywords get Jackpot Score bonus (+10-20 points)
         ↓
[Step 6] AI Scoring & Classification (Gemini)
         → Jackpot Score (0-100) with dual Ad Score + SEO Score views
         → Category assignment (10 buckets)
         → Relevance rating (1-5 match to product)
         → Opportunity type: "Quick Win", "Long-term SEO", "Ad Goldmine", "Content Play"
         → For adjacent/tangential: brief suggestion
           "This keyword has 2,900/mo at $0.05 — consider a free
            calculator page to capture this traffic"
         ↓
[Step 7] Results Dashboard
         → Grouped by 10 categories (visible tabs/sections)
         → All keywords have volume/CPC data (or "< 10/mo" for zero-return)
         → Trend arrows with small accompanying info
         → Source badge: "AI" / "Autocomplete" / "Planner Related"
         → Separate "Emerging / Long-tail" section for zero-volume keywords
         → Dual toggle: Ad Score view / SEO Score view
         → Export: CSV, PDF Goldmine Report, Google Ads Editor import
```

### Zero-volume keyword handling

Keywords discovered via Autocomplete that return 0 volume from Keyword Planner:
- Shown in separate "Emerging / Long-tail" section at bottom of results
- Labeled: "These keywords appear in Google search suggestions but have fewer than 10 tracked monthly searches. They represent low-competition, early-stage opportunities ideal for SEO content and niche targeting."
- Still scored for relevance by AI
- No Jackpot Score (insufficient data) — instead marked as "Emerging"

---

## Jackpot Scoring Formula

### Ad Score (optimized for paid ads — low CPC = better)

```
Ad Score = (Volume × 0.30) + (CPC_inverse × 0.25) + (Competition_inverse × 0.20)
         + (Relevance × 0.15) + (Trend_bonus × 0.10)

Where:
- Volume: log-scaled 0-100 (10=10, 100=40, 1000=70, 10000=90, 50000+=100)
- CPC_inverse: $0.01=100, $1=70, $5=40, $10=20, $50+=0
- Competition_inverse: LOW=100, MEDIUM=50, HIGH=10
- Relevance: AI-assessed 0-100
- Trend_bonus: Rising=+20, Stable=0, Declining=-10
```

### SEO Score (optimized for organic ranking — high CPC = valuable keyword)

```
SEO Score = (Volume × 0.30) + (CPC_direct × 0.20) + (Competition_inverse × 0.25)
          + (Relevance × 0.15) + (Trend_bonus × 0.10)

Where:
- CPC_direct: HIGH CPC means the keyword is commercially valuable, worth ranking for
  $50+=100, $10=70, $5=50, $1=30, $0.01=10
- Competition_inverse: same (easier to rank = better)
```

A keyword like "construction estimating software" (6,600/mo, $10.76 CPC, MEDIUM comp):
- **Ad Score: ~25** (expensive to bid on)
- **SEO Score: ~75** (valuable to rank for organically)

A keyword like "gov bids" (2,400/mo, $0.14 CPC, LOW comp):
- **Ad Score: ~90** (ultra-cheap goldmine)
- **SEO Score: ~45** (low commercial value per click)

---

## UI Decisions

### Category visibility
- All 10 categories shown as tabs/sections in results
- Reinforces thoroughness and quality of the search
- Users see the methodology, not just a flat list

### User seed editing
- Users do NOT manually add/edit seeds before the search runs
- Prioritizes trust and speed — "describe your product, we handle the rest"
- If users want different results, they refine their description and re-run

### Trend display
- Trend arrows (↑ ↗ → ↘ ↓) in the results table
- Small accompanying text on hover/tooltip: "Rising 45% YoY" or "Peaks in Nov-Dec"
- No inline charts for MVP — arrows + text keep the UI clean

### Source badges
- Small pill badges on each keyword: "AI" / "Autocomplete" / "Related"
- Shows thoroughness of methodology
- Trust signal: "we found keywords from 3 different sources"

### Adjacent/tangential suggestions
- Shown as a brief note under relevant keywords
- "Consider building a free calculator page to capture this traffic"
- Positioned as a suggestion, not a core feature — most users can't build tools on the fly

---

## Pricing & Free Tier Design

### Pricing Tiers

| Tier | Price | Searches | Data Access |
|---|---|---|---|
| Free | $0 | 3 lifetime | Blurred report — proves value, not actionable |
| Pro | $5.99/mo | Unlimited | Full data, trends, CSV export, Ad + SEO scores |
| Agency | $19.99/mo | Unlimited | Everything + branded PDF, Google Ads Editor export, multi-project, monitoring, competitor gap |

### Free Tier: "Prove Value, Not Actionable"

Core principle: **show the metrics, mask the keywords.** Users see that valuable, affordable keywords exist for their product — but can't identify which keywords they are. The keyword text is the paywall-protected asset.

**What free users SEE (full data):**
- Total keyword count: "1,247 keywords found across 10 categories"
- Category tabs with counts: "Feature: 156 keywords, Problem: 94..."
- 3 keywords per category — **partially masked** (first letter of each word, rest asterisked)
- **Exact volume per masked keyword** (e.g., "2,400/mo")
- **Exact CPC range per masked keyword** (e.g., "$0.14 - $3.93")
- **Competition level per masked keyword** (LOW / MEDIUM / HIGH)
- **Jackpot Score per masked keyword** (exact number + color: 92/100 green)
- Loading animation explaining methodology steps

**What free users DO NOT see:**
- Full keyword text (masked — this is the protected asset)
- Keywords beyond top 3 per category (locked)
- Trend arrows and seasonal data (Pro only)
- SEO Score view (Ad Score only in free)
- Export buttons (all locked)

**Masking format — keywords blurred, metrics fully visible:**
```
Feature-Based Keywords: 156 found

  Keyword                              Volume    CPC Range        Comp    Score
  e*** t** g********                   480/mo    $0.41 - $2.09    LOW     94 🟢
  e*** d********** g********           110/mo    $0.34 - $2.63    LOW     88 🟢
  e*** b**** e******                    40/mo    $0.93 - $7.60    MED     61 🟡
  ... and 153 more → [Unlock with Pro]

Problem-Based Keywords: 94 found

  Keyword                              Volume    CPC Range        Comp    Score
  h** t* u***** m******* l*******      880/mo    $0.12 - $2.70    LOW     91 🟢
  a******* e*** l*******                10/mo    $0.00 - $0.00    N/A     34 🔴
  ... and 92 more → [Unlock with Pro]
```

**Why this works:**
- User sees a keyword with 2,400/mo volume at $0.14 CPC scoring 95/100 — they KNOW it's a goldmine
- But "g** b***" tells them nothing. They can't type that into Google Ads.
- The frustration of seeing great metrics on an unreadable keyword is the strongest conversion driver
- Every masked row is a reason to upgrade

**Why 3 lifetime searches (not monthly):**
- Keyword research is project-based, not daily-use. Users won't return monthly.
- 3 searches = enough to test different descriptions and build trust
- Each search reinforces what they're missing (1,200+ masked keywords with visible metrics)
- After 3, they've hit the frustration threshold — conversion moment
- "Lifetime" not "monthly" because monthly resets give too much free value over time

**Conversion pressure points:**
1. Sees "1,247 keywords found" — impressed by scale
2. Sees masked keywords with real metrics — 480/mo at $0.41 CPC, Jackpot Score 94 — WANTS it
3. Sees a $0.14 CPC keyword scoring 95 — can't read it — NEEDS it
4. Clicks a masked keyword → "Unlock this keyword with Pro"
5. Clicks Export → paywall
6. Clicks Trends column → paywall
7. Uses 3rd search → "You've used all free searches. Unlock unlimited with Pro →"

### Pro vs Agency Distinction

- **Pro** = individual researcher. Full data, full export, full scoring.
- **Agency** = acting on it at scale. Branded reports for clients, Google Ads Editor ready-to-import, multi-project workspaces, keyword monitoring over time, competitor gap analysis.

### Economics

**API Costs Per Search:**
- Google Ads API: Free (with active ad spend account)
- Google Autocomplete: Free
- Google Trends: Free
- Gemini AI (seed generation + scoring): ~$0.02-0.05 per search
- Per search total: ~$0.02-0.05

**Margin Analysis:**
- Free tier (3 lifetime searches): ~$0.15 total cost → acquisition cost
- Pro ($5.99/mo): $5.99 revenue, ~$1.50 cost (est. 30 searches) → **75% margin**
- Agency ($19.99/mo): $19.99 revenue, ~$5.00 cost (est. 100 searches) → **75% margin**

**Revenue Projections:**
- 100 Pro + 50 Agency = ~$1,600/mo at modest scale
- API costs at that scale: ~$50-100/mo

---

## Competitive Advantages
1. Near-zero marginal cost (3 free data sources + Gemini pennies)
2. Existing Google Ads developer token + active spend account
3. AI intelligence layer — no massive keyword database to maintain
4. Multi-source methodology (Keyword Planner + Autocomplete + Trends + AI) that no single competitor combines at this price
5. 10-23x cheaper than any competitor
6. Proven workflow — manually validated on BulkListingPro and GovToolsPro
7. Campaign builder export — competitors show data, we help users ACT on it
8. Dual Ad Score / SEO Score — serves both paid and organic strategies
9. 10-category taxonomy — shows thoroughness competitors don't surface
