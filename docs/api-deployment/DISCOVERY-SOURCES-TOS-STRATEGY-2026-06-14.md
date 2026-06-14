# Discovery Tools — Applying the Composite-Score ToS Defense to New Data Sources

**Date:** 2026-06-14
**Scope:** Extend the proven "Shape A-prime" derived-score strategy (see `[[project_ads_tos_derived_score]]`) to the new data sources powering Product Search, Media Topic Search, and the Niche Opportunity Report (Option B).
**Status:** Research only — no code. Decision support for how to ingest the new sources without inheriting their ToS risk.

---

## 1. The strategy we're extending (recap)

JK's working defense for Google Ads Keyword Planner data: **never expose raw Report Data; fold it into a non-invertible composite score where GKP is a minority signal blended with non-Google inputs.** Legal posture becomes "same as Ahrefs/SEMrush" rather than "same as DataForSEO" (raw resale).

The risk spectrum (from the KP analysis) generalizes to any restricted source:

| Architecture | Risk |
|---|---|
| Score = f(one restricted source only) | 🔴 High — coded version of that source's data |
| Score = f(restricted minority + clickstream/SERP) | 🟢 Low — survivable |
| Score = f(restricted minority + free/open + Gemini + suggest) | 🟡 Defensible |
| Coarse output (tiers/bands, no exact numbers) | 🟡 Better — less bit-leakage |
| Bundle output (ranked list, no scores) | 🟢 Safest |

---

## 2. CRITICAL distinction — what the composite defense does and does NOT cure

The composite/derivation strategy addresses **ONE** kind of ToS problem:

- ✅ **Redistribution / repackaging** of data you are *permitted to access*. Deriving a non-invertible score is a real transformation defense here.

It does **NOT** cure two other kinds:

- ❌ **Access / commercial-license prohibitions** — if a source forbids commercial use or requires a paid contract (Reddit free tier), mixing its data into a score does not grant you a license. You still need the license.
- ❌ **Prohibited acquisition (scraping)** — if data was obtained by scraping against ToS (Amazon/Etsy listings, 1688/Alibaba), the violation happened at *collection*, before any scoring. A composite can't launder an unauthorized fetch.

**Rule of thumb:** the composite defense converts a "redistribution" problem into a "transformation" defense. It is useless against an "you weren't allowed to touch this at all" problem.

---

## 3. Per-source classification

### Tier 1 — Free / open anchors (can show raw; SHOULD carry real weight)
These are the legitimizers. The more weight they carry, the more defensible every composite becomes.

| Source | Posture | Use |
|---|---|---|
| **Wikipedia Pageviews API** | CC0 / open data, no auth | Show raw; load-bearing momentum/interest anchor |
| **GDELT 2.0** | 100% free/open, no auth | Show raw; news/theme momentum anchor |
| **Hacker News (Firebase) API** | Open, no auth | Show raw (tech niches) |
| **Google Trends** (BigQuery public dataset) | Google-published, already normalized/indexed/aggregated | Strong anchor; redistribution of *raw* still best minimized → prefer derived |

### Tier 2 — Access-permitted but redistribution-restricted (minority signal; derive; show bands not exact values)
The composite defense is exactly for these.

| Source | Posture | Use |
|---|---|---|
| **Google Ads Keyword Planner** | "shall not sell/redistribute… any portion of Report Data" | ≤~25–30% weight; never expose raw volume/CPC verbatim — show **bands/buckets** |
| **YouTube Data API v3** | API ToS restricts storage/display, 30-day refresh rules | Derive a trend signal; don't warehouse raw rows long-term |
| **Google Merchant / Shopping best-sellers** | account-gated, redistribution-restricted | If/when accessed: minority signal only, derived |
| **Search-suggest / autocomplete** (Google/YouTube/Amazon/Bing/eBay/Pinterest/TikTok/Etsy) | unofficial endpoints, ToS-gray | Derive **suggest depth/breadth** signal; do NOT republish raw suggestion lists verbatim |

### Tier 3 — Access/license-restricted → ABANDONED (decision 2026-06-14)
The composite trick does not cure these. **Decision: abandon them entirely** — no scraping, no reselling paid third-party data. Consequence: the whole profitability/sourcing dimension (margin, units sold, supplier cost, marketplace saturation) is **off the roadmap**, since it depended exclusively on these. There is no "Sourcing module pending license" — there is no Sourcing module.

| Source | Posture | Decision |
|---|---|---|
| **Reddit API** | free tier = non-commercial; commercial needs a contract | DROPPED — won't license/operate commercially |
| **Amazon / Etsy listing+sales data** | scraping against ToS; APIs paid/gated | DROPPED — won't scrape or pay-to-resell |
| **1688 / Alibaba pricing** | official API needs CN business reg; rest = paid scrapers | DROPPED — won't scrape or pay-to-resell |

---

## 4. Application to the three scores

All three surfaced scores are built as composites from day one, restricted sources held to minority weight, free/open anchors load-bearing, outputs non-invertible:

- **Goldmine Score (Product Search)** — KP (band, minority) + Trends (anchor) + suggest-depth + Gemini relevance + competition gap.
- **Interest Score (Media Topic Search)** — Wikipedia + GDELT (anchors, load-bearing) + YouTube most-popular + suggest-depth. NO commerce/KP. (This tool is the *most* defensible — its spine is open data.)
- **Opportunity Score (Niche Opportunity Report)** — same as Goldmine plus seasonality (Trends/KP-derived) and Ads budget forecast (derived, not raw).

**Output discipline (banding NOT adopted — decision 2026-06-14):** we considered showing volume/CPC as bands/buckets in the discovery tools, but **rejected it.** The existing Keyword Search product already displays near-exact KP volume/CPC, so banding *only* the new tools buys ~zero marginal ToS protection (the same raw data is already exposed elsewhere in the same product) while degrading the new feature's UX. So: **show exact figures, consistent with Keyword Search.** The real, load-bearing defenses remain (a) the composite *scores* are non-invertible, (b) free/open anchors carry real weight, (c) consumer-feature-first, not a metered public API.

---

## 5. Reconciling with the "honesty" rule we set for the mockups

We attribute **methodology** for the composite signals, and show raw KP volume/CPC at the same fidelity as the existing Keyword Search product (no banding — see §4):
- Honest: "blended demand signal from Google Trends + Wikipedia + search-suggest" for the *scores* ✅
- Honest: per-platform momentum labeled "≈ proxy (re-polled suggest)" ✅
- Raw volume/CPC: shown exact, consistent with Keyword Search — banding only the new tools would not reduce real exposure.

Honesty = we say *what goes into the scores and how confident the proxies are*. The composite *scores* remain non-invertible; raw-value display matches the consumer app's existing, accepted posture.

---

## 6. Residual risks (unchanged from the KP analysis)

1. **Novel test case** — no ruling on "derivative" vs "transferred portion" under the Ads API Terms. Defense is expensive even if we win.
2. **Token-revocation risk** — Google can pull the Ads developer token unilaterally; that would also kill the consumer app. Independent of any lawsuit.
3. **Consumer-app-first is the lower-risk path** — per the A-prime recommended sequence, ship discovery tools as **consumer-app features**, not a public API, first. Get an attorney opinion before any public/agent API that meters this data.

---

## 7. Recommendation (decisions locked 2026-06-14)

- Build all discovery-tool scores as **non-invertible composites with free/open anchors (Wikipedia/GDELT/Trends) carrying real weight** and restricted sources (KP/YouTube/Merchant) as ≤~25–30% minority inputs.
- **No banding** — show raw volume/CPC at the same fidelity as the existing Keyword Search product (banding only the new tools adds ~no protection; see §4).
- **Media Topic Search is the safest to lead with** — its spine is open data; no KP dependency.
- **Tier 3 (Reddit-commercial, marketplace, 1688) is ABANDONED**, not deferred. No scraping, no paid-data resale. Therefore no profitability/sourcing features; the Option B report carries an honest "what we don't do (and why)" note instead — a trust signal, not a coming-soon teaser.
- Revisit attorney opinion only if/when any of this becomes a **public/agent-metered API** (not needed for consumer-app features).

## Related
- `[[project_ads_tos_derived_score]]` — the original KP derived-score analysis (Shape A-prime)
- `[[project_discovery_tools]]` — the two tools + Option B
- `[[reference_platform_suggest_apis]]` — non-Google demand signals
- `docs/REVENUE-BENCHMARKS.md` — original Shape A/B/C audit
