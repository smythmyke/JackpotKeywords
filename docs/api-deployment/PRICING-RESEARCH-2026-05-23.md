# API Pricing Research — Locked Decisions

**Date:** 2026-05-23
**Status:** Q1 resolved. Pricing model + per-call rates + free tier all locked.

This doc captures the competitive research and reasoning behind the locked pricing decisions. Companion to `DEPLOYMENT-PLAN-2026-05-23.md` (Q1 section).

---

## Locked decisions

### Pricing model: PAYG-only for Stage 1
- No subscription tiers in Stage 1
- Reserved + overage hybrid layered in once usage data from first 5–10 design partners reveals call distributions
- Reasoning: AI-wrappers under $50/mo see 65% churn in 90 days; pure subscription at low prices is a known trap. PAYG lets us learn before committing to tiers.

### Per-call prices

| Endpoint | Price | COGS | Margin |
|---|---|---|---|
| `/v1/score` | **$0.005 per keyword scored** (batch up to 200 = $0.10–$1.00 per call) | ~$0.0005/100 kw | 99.9% |
| `/v1/recommend` | **$0.10 per call** | ~$0.008 | 92% |
| `/v1/aeo-scan` | **$1.00 per scan** | ~$0.015 | 98.5% |

### Free tier: $5 signup credit, no expiration, no card required
- Matches OpenAI/Anthropic norm (both $5 credit, both no card)
- More generous on expiration (OpenAI 3mo, Anthropic 14d, us = none)
- Translates to ~1,000 keyword scores OR 50 recommends OR 5 aeo-scans — enough to fully evaluate the API
- Phone verification gate may be needed at scale to prevent abuse (decide when we see signups)

---

## Competitor pricing snapshot

### Keyword data APIs (relevant to `/v1/score` and `/v1/recommend`)

| Provider | Model | Price | Min commitment |
|---|---|---|---|
| **DataForSEO** | PAYG | $0.0006/SERP query, $0.01/AI summary | $50 first deposit |
| **SemRush API** | Subscription + units | $0.00005/unit (varies $20–$250 per million units) | **$499.95/mo** before any API access |
| **Ahrefs API** | Subscription + overage | $0.35–$1.00 per 1,000 rows | **$449/mo** (Advanced plan minimum) |
| **Keywords Everywhere** | PAYG credits | ~$0.0001/credit | $10 minimum |
| **Serper.dev** (SERP only) | PAYG credits | $1.00/1K → $0.30/1K at scale | None |

**Key takeaway:** Space is bimodal. SemRush/Ahrefs gate behind $449+/mo subscriptions. DataForSEO and others are PAYG sub-$50. Our positioning works only in the PAYG camp — which is where we live.

### AI visibility APIs (relevant to `/v1/aeo-scan`)

| Provider | Entry price | API tier | Effective per-scan |
|---|---|---|---|
| **Profound** | $99–$399/mo | Enterprise only ($2K–$5K+/mo) | $9.98/scan at Lite |
| **Otterly.AI** | $29/mo (15 prompts) → $489/mo | No standalone API | $1.93/scan at Lite |
| **Peec AI** | $99/mo (25 prompts) → $530+/mo | No standalone API | $3.96/scan at Starter |
| **Athena HQ** | Opaque | No standalone API | n/a |

**Key takeaway:** Every competitor sells subscriptions with prompt-based limits. None sell "per scan." Our PAYG `/v1/aeo-scan` is whitespace — significant differentiation play.

### Dev API free-tier norms

| Provider | Free credit | Card? | Expiration |
|---|---|---|---|
| **OpenAI** | $5 | No | 3 months |
| **Anthropic** | $5 | No (phone) | 14 days |
| **Serper.dev** | 2,500 queries | No | None |
| **DataForSEO** | None | Yes ($50 deposit) | N/A |

**Key takeaway:** $5 credit at signup is industry table-stakes for 2026 dev APIs. Matching is necessary; being more generous on expiration is cheap differentiation.

---

## Where we sit vs competitors at locked pricing

### `/v1/aeo-scan` at $1.00

| Competitor | Per-scan amortized | Our multiple cheaper |
|---|---|---|
| Otterly Lite | $1.93 | 1.9x |
| Peec AI Starter | $3.96 | 4.0x |
| Profound Lite | $9.98 | 10.0x |

### `/v1/score` at $0.005 per keyword

| Competitor | Effective per-keyword | Our multiple cheaper |
|---|---|---|
| SemRush API | ~$0.05 (+ $499/mo sub) | 10x + no subscription |
| Ahrefs API | ~$0.0004/row (gated behind $449/mo sub) | competitive, no subscription |
| DataForSEO (raw SERP) | $0.0006 | 8x more expensive — but we deliver composite score, classification, intent, AI relevance per row |

### `/v1/recommend` at $0.10

No direct PAYG competitor. SemRush keyword tool API equivalents ~$0.50+ per call effectively, gated behind $499/mo. We're 5x cheaper without the subscription.

---

## Profit modeling at locked rates

Assumes revenue mix: 60% `/v1/recommend`, 25% `/v1/aeo-scan`, 15% `/v1/score`.

| Stage | Customers | ARPU | MRR | ARR | Annual gross profit |
|---|---|---|---|---|---|
| Stage 1 (design partners) | 5–10 | $50/mo | $250–$500 | $3K–$6K | $2.8K–$5.6K |
| Stage 2 (public launch) | 100 | $75/mo | $7.5K | $90K | ~$87K |
| Stage 3 (scaled) | 1,000 | $100/mo | $100K | $1.2M | ~$1.10M |

**Sensitivity:** COGS is so low (~$0.0005–$0.015 per call) that profit barely changes across aggressive/moderate/premium pricing tiers. The lever that matters is customer count, not per-call price.

---

## Why we chose original pricing (not the more aggressive scenarios researched)

Three pricing scenarios were modeled. All three undercut every competitor by 1.9x–25x.

| Scenario | `/v1/score` | `/v1/recommend` | `/v1/aeo-scan` | Headline |
|---|---|---|---|---|
| **C (chosen)** | $0.005/kw | $0.10 | $1.00 | 2x cheaper than cheapest aeo competitor, 10x cheaper than SemRush |
| B | $0.003/kw | $0.075 | $0.75 | 2.6x cheaper, less margin |
| A | $0.002/kw | $0.05 | $0.50 | 4x+ cheaper but risks "if it's this cheap, must be junk" signaling |

Reasoning for C:
- We're already cheaper than every competitor at C — no need to drop further to make the marketing line work
- COGS difference between scenarios is negligible (~$50K/yr at Stage 3 between A and C)
- Pricing low and raising is harder than pricing fair and discounting selectively
- Dev API buyers see "$1/scan" as approachable; "$0.50/scan" might trigger quality skepticism

---

## What's still open

- **Phone verification at signup** — defer until we see whether $5 credit gets abused at scale. If first 100 signups burn the credit without converting, add SMS verification.
- **Volume discount tiers** — none for Stage 1. Layer in once usage data shows the call-volume distribution among first 10–20 customers.
- **Enterprise / private contracts** — defer; revisit once we have someone asking for one.

---

## Sources

- [DataForSEO API v3 Pricing](https://dataforseo.com/pricing)
- [Serper.dev pricing](https://serper.dev/)
- [Semrush API pricing 2026 (TMB)](https://thatmarketingbuddy.com/blog/semrush-api-pricing)
- [Ahrefs API pricing 2026 (aeoengine)](https://aeoengine.ai/blog/ahrefs-pricing-change)
- [Profound AI pricing 2026 (workduo)](https://www.workduo.ai/blog/profound-ai-pricing)
- [Otterly.AI pricing](https://otterly.ai/pricing)
- [Peec AI / Otterly comparison 2026](https://www.tryhikoo.com/en/blog/comparisons/otterly.ai-vs-peec-ai)
- [Anthropic $5 free credit guide 2026](https://aicreditmart.com/ai-credits-providers/how-to-get-5-in-free-anthropic-claude-api-credits-2026/)
- [OpenAI API free credits 2026](https://www.getaiperks.com/en/blogs/19-openai-free-credits)
