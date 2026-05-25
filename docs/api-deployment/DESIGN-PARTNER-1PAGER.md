# JackpotKeywords API — Design Partner Beta

**Status:** Private beta, 2026-05-25. Phase 1A + 1B shipped and verified in prod. You're one of ~2 partners helping us shake out the API before a coordinated public launch (Stage 2 in our internal plan: REST + MCP + Sheets, single launch day).

**What this is:** The same keyword research + AI-visibility pipeline that powers jackpotkeywords.com, callable directly as a REST API. Built for SEO ops, indie SaaS founders, agencies, and anyone wiring keyword research into a larger workflow.

**Why we need you:** We want to know whether the endpoints are usefully shaped, the latencies are tolerable, the billing UX is clear, and what's missing before we open signups publicly.

---

## What's in the beta

Two endpoints today, one more after a reversibility test passes (~August 2026):

| Endpoint | What it does | Price | Latency |
|---|---|---|---|
| `POST /v1/recommend` | Full keyword research pipeline: context extraction → seed generation → autocomplete → KP enrichment → trend analysis → AI relevance scoring. Returns recommendations ranked by composite `jackpotScore`. | **$0.10 / call** | ~60–180s |
| `POST /v1/aeo-scan` | AI visibility check: runs 10 buyer-intent queries against Gemini grounded search + Serper, reports cited/mentioned/missing per query plus top citations. | **$1.00 / scan** | ~30–120s |
| `POST /v1/score` *(internal)* | Score individual keyword candidates by composite metric. Held until reversibility test passes. | TBD | — |

---

## Getting started

**Base URL (private beta):**
```
https://us-central1-even-plate-378520.cloudfunctions.net/api/api
```
*A cleaner `https://jackpotkeywords.web.app/api/...` URL is coming after hosting redeploy. Both will work; the cleaner one is preferred once live.*

**1. Sign up** — one call, returns your first key + $5 credit (no card required, no expiration):
```bash
curl -X POST $BASE/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}'
```
Response:
```json
{ "apiKey": "jk_live_...", "balanceCents": 500, "customerId": "..." }
```

**Save the raw `apiKey` immediately — we only show it once.** All subsequent calls authenticate with `Authorization: Bearer jk_live_...`.

**2. Check balance:**
```bash
curl $BASE/v1/me -H "Authorization: Bearer $JK_KEY"
```

---

## `/v1/recommend` — worked example

```bash
curl -X POST $BASE/v1/recommend \
  -H "Authorization: Bearer $JK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourproduct.com",
    "description": "AI-powered keyword research tool for indie makers",
    "limit": 25
  }'
```

`url` and `description` are both optional but at least one must be present. `limit` defaults to 50, max 200. Skips competitor discovery for latency; if you want the full search (slower, includes competitor pass), let us know — we may expose a flag.

Response (truncated):
```json
{
  "recommendations": [
    {
      "keyword": "ebay bulk listing tool",
      "monthlyVolume": 720,
      "lowCpc": 1.42, "highCpc": 4.18,
      "competition": "LOW",
      "trendDirection": "UP",
      "jackpotScore": 88,
      "aiRelevance": 9,
      "intent": "commercial",
      "category": "competitor"
    }
  ],
  "balanceCents": 490
}
```

**When to use it:** Bulk keyword discovery for a single product/URL. Costs $0.10 regardless of `limit`. Refunded automatically if the pipeline fails.

---

## `/v1/aeo-scan` — worked example

```bash
curl -X POST $BASE/v1/aeo-scan \
  -H "Authorization: Bearer $JK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourproduct.com"}'
```

Response (truncated):
```json
{
  "visibilityScore": 10,
  "queriesChecked": 10,
  "queriesCited": 0,
  "queriesMentioned": 1,
  "queries": [
    {
      "query": "best ebay bulk listing tool",
      "productCited": false,
      "productMentionedInAnswer": false,
      "answerSnippet": "Top tools include InkFrog, ListPerfectly...",
      "citations": [{ "url": "..." }]
    }
  ],
  "balanceCents": 390
}
```

**When to use it:** Track AI-search visibility for a product. Refunded on failure. Per our Gemini ToS, callers must render the `searchEntryPoint` HTML in any user-facing surface — talk to us if you're wiring this into a customer-facing UI.

---

## Managing keys

```bash
# Create a named key (raw key shown once)
curl -X POST $BASE/v1/keys -H "Authorization: Bearer $JK_KEY" \
  -H "Content-Type: application/json" -d '{"name": "production"}'

# List your active keys (sanitized — no raw keys)
curl $BASE/v1/keys -H "Authorization: Bearer $JK_KEY"

# Revoke a key by keyId
curl -X DELETE $BASE/v1/keys/$KEY_ID -H "Authorization: Bearer $JK_KEY"
```

Revoked keys 401 immediately. Multiple keys per account is fine — useful for per-env or per-integration separation.

---

## Billing

- **$5 signup credit, no expiration.** Burns down at $0.10/recommend and $1.00/aeo-scan.
- **Topup:** `POST /v1/topup` returns a Stripe Checkout URL. Pre-set packs at $25 / $100 / $500, or custom amount ≥ $25.
- **Refunds:** Pipeline failures auto-refund. If anything else looks wrong, email and we'll fix it manually during the beta.

---

## Rate limits

Per-key sliding window: **60 requests/min** and **1000 requests/hour**. Limits are per warm function instance during the beta, so the effective ceiling scales with traffic — if you hit a 429 unexpectedly, tell us.

---

## What we'd love feedback on

1. **Recommendation quality** — are the top-ranked keywords actually useful for your use case? Anything you'd expect to see that's missing?
2. **Latency tolerance** — `/v1/recommend` at 60–180s assumes a backgroundable workflow. If you need a sub-30s synchronous endpoint, we want to hear that early.
3. **Missing parameters** — categories, intent filters, language/region, competitor inclusion, anything else.
4. **Auth / billing UX** — anything confusing about signup, key rotation, topup, balance visibility?
5. **Docs gaps** — what did you have to guess at?
6. **Anything surprising** — good or bad.

---

## Support

Email **smythmyke@gmail.com** for anything: bugs, feature requests, billing issues, or just questions. Response within 24h during the beta.

Test script you can crib from: [`scripts/test-v1-api.mjs`](https://github.com/smythmyke/jackpotkeywords) — runs the full 9-step flow end-to-end against a fresh test account.

---

## What's coming next

- **MCP server** wrapping these same endpoints (Anthropic registry, Cursor, Windsurf) — Stage 1 build
- **Google Sheets add-on** for non-developer users — Stage 1 build
- **`/v1/score` endpoint** — once month-3 reversibility validation passes (~August 2026)
- **n8n / Zapier / Make.com** nodes — Stage 3, parallel
- **Vertical content + case studies** (Etsy, Shopify, content sites, SaaS) — Stage 2 onward

Public launch — REST + MCP + Sheets, single coordinated day — targeted for ~July–August 2026.
