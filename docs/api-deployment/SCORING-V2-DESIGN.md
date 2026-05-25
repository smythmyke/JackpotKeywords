# Scoring v2 Design — Phase 0

**Status:** Phase 0 implementation in progress
**Started:** 2026-05-23
**Goal:** Refactor `jackpotScore` so Google Ads/Keyword Planner data is a minority signal (~25%), making Shape A-prime (derived-score public API) defensible vs Google Ads ToS.

See `DEPLOYMENT-PLAN-2026-05-23.md` (Phase 0) and `../../memory/project_ads_tos_derived_score.md` for legal context.

---

## Why v2 exists

**v1 problem.** Current `jackpotScore` is 75% pure GKP data (volume 30% + cpcInverse 25% + competitionInverse 20%). Exposing it through a public API is functionally equivalent to reselling GKP — the score is monotonic in the three raw fields. That is the same legal posture as DataForSEO and incompatible with the Google Ads API ToS clause "you shall not sell, redistribute, sublicense or otherwise disclose or transfer to any Third Party all or any portion of AdWords API Report Data."

**v2 goal.** Make GKP one of 5+ inputs at ≤25% weight, blended with signals Google does not own. The structural defense becomes: "the score is a composite where any single input contributes a minority of the variance, and the output cannot be inverted to recover any single raw GKP field." This is the Ahrefs/SEMrush posture.

**Non-goal.** v2 does not need to outperform v1 on the consumer app immediately. The 3–6 month validation clock starts when v2 ships alongside v1. We measure whether v2 ranks keywords as well as v1, whether the non-GKP signals are load-bearing or filler, and whether `clusterFit` and `suggestDepth` add real lift or just noise.

---

## Inputs by weight

| Input | Weight | Source | Owned by |
|---|---|---|---|
| `gkpComposite` | 25% | volume, CPC, competition (blended into one sub-score) | Google |
| `aiRelevance` | 30% | Gemini 1–10 relevance to product context | OpenRouter/Gemini |
| `suggestDepth` | 20% | Count of platforms that surfaced the keyword (YouTube, Amazon, Bing, eBay, DuckDuckGo, Pinterest, Google) | Multi-platform public Suggest APIs |
| `clusterFit` | 15% | Keyword's strength within its semantic cluster | Internal (our clustering) |
| `trendBonus` | 10% | Trend direction | Currently broken (pytrends archived 2025-04); reserved slot for Glimpse/Exploding Topics |

**GKP weight: 25%.** Below the ≤30% threshold cited in the legal analysis as "defensible." Note that even the 25% is itself a sub-composite of three GKP fields — knowing the output gives a one-equation-three-unknowns problem on the GKP side, not an invertible mapping.

---

## Score functions

### `gkpCompositeScore(volume, avgCpc, competition)`

Single blended sub-score replacing v1's three independent GKP terms. Blends with internal weights:
- 50% volumeScore (existing, log-scaled)
- 30% cpcInverseScore (existing, banded)
- 20% competitionScore (existing, banded)

Reason for blending into one term: the v1 formula treats volume/CPC/competition as three independent 25–30% contributors, so the score is essentially "what's in GKP." Blending into one 25% term means GKP's three fields collectively get 25%, not 75%.

### `suggestDepthScore(suggestHits, maxPlatforms)`

```
score = min(100, (suggestHits / maxPlatforms) * 100)
```

Where `suggestHits` is the count of distinct platforms among {google_autocomplete, youtube, amazon, ebay, bing, duckduckgo, pinterest} that surfaced the keyword. `maxPlatforms` is the count of platforms queried for this search (varies by product type, see `selectExpandPlatforms`).

A keyword that shows up in 4 of 6 queried platforms scores 67. A keyword from a single platform scores `100/6 ≈ 17`.

Why this signal matters: real consumer demand expresses itself across many surfaces. A query that exists on Amazon + YouTube + Google Suggest is more durable than one that only Google's algorithm guessed at.

### `clusterFitScore(keyword, cluster)`

```
score = min(100, (cluster.totalVolume / clusterVolumeP90) * 50 + (cluster.keywordCount / 20) * 50)
```

Where `clusterVolumeP90` is a runtime-computed 90th percentile of cluster volumes in the current search. This rewards keywords that belong to large, well-populated clusters — which signals semantic coherence beyond what the GKP score captures.

If `clusterFit` cannot be computed (clustering not yet finished, no cluster assigned), fall back to 50 (neutral).

### `aiRelevanceScore(aiRelevance)`

```
score = (aiRelevance / 10) * 100
```

Simple linear mapping from existing Gemini 1–10 score. If `aiRelevance` is undefined (relevance scoring failed or not yet run), fall back to 50 (neutral).

### `calculateJackpotScoreV2(...)`

```ts
function calculateJackpotScoreV2(input: {
  volume: number;
  lowCpc: number;
  highCpc: number;
  competition: CompetitionLevel;
  trend?: TrendDirection;
  suggestHits?: number;
  maxPlatforms?: number;
  cluster?: { totalVolume: number; keywordCount: number };
  clusterVolumeP90?: number;
  aiRelevance?: number;
}): number {
  const avgCpc = (input.lowCpc + input.highCpc) / 2;
  const gkp = gkpCompositeScore(input.volume, avgCpc, input.competition);
  const ai = aiRelevanceScore(input.aiRelevance);
  const depth = suggestDepthScore(input.suggestHits ?? 1, input.maxPlatforms ?? 1);
  const fit = input.cluster && input.clusterVolumeP90
    ? clusterFitScore(input.cluster, input.clusterVolumeP90)
    : 50;
  const trend = Math.max(0, 50 + trendBonus(input.trend));

  const score =
    gkp * 0.25 +
    ai * 0.30 +
    depth * 0.20 +
    fit * 0.15 +
    trend * 0.10;

  return Math.round(Math.min(100, Math.max(0, score)));
}
```

---

## Timing of inputs

Not all inputs are available at the same point in the pipeline:

1. **Seed → Autocomplete → KP enrich:** `volume`, `lowCpc`, `highCpc`, `competition`, `trend` available. `suggestHits` available if multi-platform expansion ran.
2. **Cluster step:** `cluster` and `clusterVolumeP90` available.
3. **Relevance step (async):** `aiRelevance` available (post-cluster, slice top 100).

**Implementation choice:** Compute v2 score in two passes.
- **Pass 1** (after KP enrich): compute with `aiRelevance=undefined` (fallback to 50) and `cluster=undefined` (fallback to 50). This is the score used during initial render.
- **Pass 2** (after relevance scoring + clustering): recompute with full inputs and update `jackpotScore_v2` on each `KeywordResult`.

v1 score continues to be computed in pass 1 only — it has no dependency on cluster or aiRelevance.

---

## Type changes

`KeywordResult` gains two optional fields:

```ts
export interface KeywordResult {
  // ... existing fields
  jackpotScore: number;           // v1, unchanged
  jackpotScore_v2?: number;       // NEW — written alongside v1, never replaces
  suggestHits?: number;           // NEW — count of platforms that surfaced this keyword
}
```

Backward compat: any consumer reading `jackpotScore` keeps working. v2 is purely additive.

---

## Feature flag

Admin-only toggle in `packages/web/src/pages/Admin.tsx` switches the keyword table to display `jackpotScore_v2` instead of `jackpotScore`. Stored in admin session state, not exposed to non-admin users.

Storage: `localStorage` key `jk_admin_scoring_version` with values `"v1"` or `"v2"`. Default `"v1"`.

No backend flag — both scores are always written; the toggle only affects display.

---

## Reversibility test methodology

To validate the legal posture, we need to demonstrate that knowing `jackpotScore_v2` does not let an attacker recover `volume`, `avgCpc`, or `competition` with meaningful accuracy.

**Test:**
1. Pull 1000 representative `KeywordResult` rows from production after Phase 0 ships.
2. Train a regression model (e.g., gradient boosting) to predict raw GKP fields from `jackpotScore_v2` alone.
3. Measure R² on a held-out 200-row test set.
4. **Pass criterion:** R² < 0.5 for each of volume, CPC, competition. (For comparison, raw GKP resale would give R² ≈ 1.0.)

If R² ≥ 0.5 for any field, the score is too informative about that input and weights need to shift further away from GKP — likely by adding a sixth input (SERP signals, Glimpse trends) and dropping `gkpComposite` toward 15–20%.

Test script will land as `scripts/scoring-v2-reversibility.mjs` once enough v2-scored keywords are in production.

---

## Validation milestones

- **Week 0 (now):** Phase 0 ships. v1 and v2 written side-by-side on every new search.
- **Week 1:** Confirm v2 distributions look sensible (no all-50 fallbacks, no clipping to 0/100). Admin spot-checks top-100 rankings on 10 searches.
- **Month 1:** Pull 100 search sessions. Compare top-20 jackpot rankings between v1 and v2 — measure Spearman correlation. Below 0.6 means v2 ranks meaningfully differently; investigate which signals are driving divergence.
- **Month 3:** Reversibility test. If pass, Shape A-prime becomes shippable pending legal opinion.
- **Month 6:** Decision point — keep v2 as primary, keep v1 as primary, or split (v1 for consumer app, v2 for API).

---

## Open questions deferred to implementation

- **`clusterVolumeP90` cost.** Computing a per-search percentile on every score recompute is cheap but not free. If it shows up in profile, cache once per search.
- **Pinterest weight.** Pinterest suggest is high-value for visual products but absent for SaaS. Should `maxPlatforms` be per-search-actual (queried) or per-keyword-applicable (subset that makes sense for product type)? Decision: per-search-actual — the platforms we queried are the denominator.
- **Trend slot.** With pytrends archived, `trendBonus` defaults to 0 for everything, making the 10% trend slot a constant 50% contribution. Either drop trend weight to 0 and redistribute, or accept the floor until Glimpse integration. **Decision in this implementation:** keep the slot at 10% weight as a structural placeholder, even though it contributes a constant for now. Future Glimpse work fills it.
