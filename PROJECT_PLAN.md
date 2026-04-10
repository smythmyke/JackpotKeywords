# JackpotKeywords — Project Plan

## What It Is
AI-powered keyword research tool that undercuts SEMrush/Ahrefs by 10x. User describes their product or business in plain English, gets ranked keyword opportunities with real Google Ads data (volume, CPC, competition) and AI opportunity scoring.

**Tagline idea:** "Describe your product. Find your goldmine keywords."

## The Problem
- SEMrush ($140/mo), Ahrefs ($99/mo), SE Ranking ($44/mo) — all too expensive for indie makers, small businesses, solopreneurs
- Google Keyword Planner is free but has no AI layer, no opportunity scoring, requires manual work
- ChatGPT/Claude can brainstorm keywords but has no real volume/CPC data
- No tool does: "describe your product → get actionable keyword opportunities"

## The Solution
1. User describes their product/service in plain English
2. AI maps that to keyword intent categories (features, problems solved, alternatives, use cases)
3. Google Ads API pulls real volume + CPC + competition for those keywords
4. AI scores opportunities: high volume + low CPC + low competition = jackpot
5. User gets a ranked, exportable list they can act on immediately

## Unfair Advantage
- Near-zero marginal cost (Google Ads API is free, Gemini is pennies)
- Existing Google Ads developer token + active spend account (from MarkItUp)
- AI is the intelligence layer, not a massive keyword database to maintain
- 10x cheaper than any competitor

## Pricing Model

| Tier | Price | Features |
|---|---|---|
| Free | $0 | 3 lifetime searches, blurred keywords, full metrics visible |
| Credits | $0.99/1, $1.99/3, $4.99/10 | A-la-carte — full experience per search, identical to Pro |
| Pro | $9.99/mo | Unlimited searches, full experience |
| Agency | $19.99/mo | Everything + branded PDF reports, Google Ads Editor export, multi-project, keyword monitoring |

**Credit system:** Same Firebase + Stripe + credits pattern as GovToolsPro/BulkListingPro. 1 credit = 1 search. No feature differentiation between credits and subscription — paid is paid. Pro breaks even vs credits at ~10 searches/mo.

### Free Tier Design (Blurred Keywords, Full Metrics)

Core principle: **show the metrics, mask the keywords.** The keyword text is the paywall-protected asset. Users see that valuable, affordable keywords exist for their product — but can't identify which ones. Seeing real metrics on unreadable keywords is the strongest conversion driver.

**What free users SEE (full data):**
- Total keyword count ("1,247 keywords found across 10 categories")
- Category tabs with keyword counts ("Feature: 156, Problem: 94...")
- 3 keywords per category — **partially masked** (first letter per word, rest asterisked)
- **Exact volume** per masked keyword (e.g., "2,400/mo")
- **Exact CPC range** per masked keyword (e.g., "$0.14 - $3.93")
- **Competition level** per masked keyword (LOW / MEDIUM / HIGH)
- **Jackpot Score** per masked keyword (exact number + color coding)
- Loading animation explaining methodology steps

**What free users DO NOT see:**
- Full keyword text (masked — the protected asset)
- Keywords beyond top 3 per category (locked)
- Trend arrows and seasonal data (Pro only)
- SEO Score view (Ad Score only)
- Export buttons (all locked)

**Masking format — keywords blurred, metrics fully visible:**
```
  e*** t** g********    480/mo   $0.41-$2.09   LOW   94 🟢 Jackpot
  g** b***            2,400/mo   $0.14-$3.93   LOW   95 🟢 Jackpot
  ... and 153 more → [Unlock with Pro]
```

**Conversion driver:** User sees a keyword with 2,400/mo at $0.14 CPC scoring 95/100 — they KNOW it's a goldmine. But "g** b***" tells them nothing. They can't act on it. That frustration converts.

## Revenue Projections
- 100 Pro subscribers = $999/mo
- 50 Agency subscribers = $999/mo
- Combined = ~$2,000/mo at modest scale
- API costs at that scale: ~$20-50/mo

## Tech Stack (Proposed)
- **Frontend:** React + TypeScript + Tailwind (same as MarkItUp)
- **Backend:** Firebase (Auth/Firestore/Functions) + Stripe (same pattern as MarkItUp)
- **APIs:** Google Ads API (KeywordPlanIdeaService), Google Trends, Gemini AI
- **Domain:** TBD — jackpotkeywords.com or keymine.com (need to check registrar)

## Existing Assets
- Google Ads developer token: already approved
- `google-ads-api` npm package: already in MarkItUp (v23)
- Google Ads Customer ID: configured
- OAuth credentials: via gcloud application default credentials
- Firebase + Stripe + credits pattern: proven in MarkItUp and Bull-Generator
- Active ad spend account: qualifies for exact volume data

## Core Features (MVP)

### 1. Product Description Input
- Free-text input: "I sell a Chrome extension that creates marketing visuals from screenshots using AI"
- Optional: URL input to auto-scrape product features
- AI extracts: features, use cases, target audience, competitor landscape

### 2. Keyword Generation
- AI generates keyword candidates across categories:
  - Direct intent ("screenshot marketing tool")
  - Feature-based ("ai background remover", "add text to image")
  - Problem-based ("how to make product mockups")
  - Competitor alternatives ("canva alternative", "placeit alternative")
  - Long-tail ("free background remover for product photos")
- Google Ads API enriches each with: exact monthly volume, CPC range, competition level

### 3. Opportunity Scoring
- Jackpot Score (0-100) based on:
  - Volume (higher = better)
  - CPC (lower = better for ads, higher = valuable for SEO)
  - Competition (lower = better)
  - Trend direction (rising = bonus)
  - Intent match to product (AI-assessed relevance)
- Color-coded: green (jackpot), yellow (solid), red (expensive/saturated)

### 4. Results Dashboard
- Sortable table: keyword, volume, CPC, competition, jackpot score
- Filter by category, score range, volume range
- Export to CSV
- Save searches to account

## Expansion Services (Future)

### Phase 2: Competitor Spy
- Enter competitor URL → see what keywords they rank for / bid on
- Gap analysis: keywords they have that you don't
- "Steal their strategy" feature

### Phase 3: Ad Copy Generator
- Pick keywords from your research → AI generates Google Ads copy
- Headlines, descriptions, sitelinks optimized for the keyword
- A/B test suggestions

### Phase 4: Landing Page Analyzer
- Paste your landing page URL → AI scores it for keyword relevance
- Suggestions to improve Quality Score
- "Your page talks about X but your keywords target Y"

### Phase 5: Trend Alerts
- Monitor your saved keywords for volume/CPC changes
- Weekly email: "Keyword X jumped 40% this month"
- Seasonal opportunity detection

### Phase 6: SEO Content Planner
- Turn keyword research into a content calendar
- AI suggests blog post topics, titles, outlines based on keyword clusters
- Difficulty vs. opportunity matrix

## Domain Research

| Name | Domain | Status |
|---|---|---|
| JackpotKeywords | jackpotkeywords.com | Likely available |
| KeyMine | keymine.com | Likely available |
| NicheHound | nichehound.com | Likely available |
| AdVein | advein.com | Taken (active site) |
| MindKey | mindkey.com | Taken (HR software) |
| MineKey | minekey.com | For sale (defunct startup, likely $2-5K) |

**Top picks:** JackpotKeywords (descriptive, brandable) or KeyMine (short, clean)

## Competitive Landscape

| Tool | Price | Data Source | AI Layer | Our Advantage |
|---|---|---|---|---|
| SEMrush | $140/mo | Own database | Basic | 14x cheaper |
| Ahrefs | $99/mo | Own crawl index | Basic | 10x cheaper |
| SE Ranking | $44/mo | Own database | Some | 4x cheaper |
| Ubersuggest | $29/mo | Google autocomplete | Minimal | 3x cheaper + real API data |
| KeywordTool.io | $89/mo | Autocomplete scraping | None | 9x cheaper + AI scoring |
| **JackpotKeywords** | **$9.99/mo** | **Google Ads API (real data)** | **Full AI pipeline** | — |

## Next Steps
1. Check domain availability on registrar (jackpotkeywords.com, keymine.com)
2. Scaffold project (Firebase + React + Tailwind)
3. Build Google Ads API integration (KeywordPlanIdeaService)
4. Build AI keyword generation pipeline (Gemini)
5. Build scoring algorithm
6. Build frontend dashboard
7. Stripe integration for subscriptions
8. Launch MVP
