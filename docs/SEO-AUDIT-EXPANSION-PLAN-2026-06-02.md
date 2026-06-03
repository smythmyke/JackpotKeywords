# SEO Audit Expansion Plan — Checks #1–9 (2026-06-02)

**Scope:** Add 9 new checks to the SEO audit. **Shelved for later:** keyword-rank check (Serper-metered), real GSC index coverage (owner-OAuth), backlinks/DA (paid data), IndexNow-usage detection (undetectable).

**Status:** PLAN ONLY — not executed. Two user decisions required before build (see §6).

Engine: `packages/functions/src/services/seoAudit.ts` + `htmlParser.ts`. Types: `@jackpotkeywords/shared` (built `.tgz` — consumed by web + functions).

---

## 1. The linchpin: fetch-layer refactor (prereq for #2, #4, #5)
`htmlParser.fetchHtml` returns only the body string and **discards HTTP status + headers**; it also returns `null` on non-2xx so the real status is lost. `seoAudit.fetchWithTimeout` (used for sitemap/robots) likewise drops headers.

**Changes:**
- `fetchHtml` → return `{ html, httpStatus, finalUrl, redirected, contentType, xRobotsTag }` instead of `string | null`. Keep `redirect: 'follow'` and use `response.redirected` + `response.url` for the redirect signal (full hop-by-hop chain is optional/out-of-scope — final status + "was redirected" + final URL covers the high-value case). Preserve current behavior: still treat non-HTML/oversize as a soft fail, but capture the status first.
- `ParsedPage` gains: `httpStatus?`, `redirected?`, `finalUrl?`, `hasXRobotsNoindex` (parse `X-Robots-Tag` header for `noindex`).
- `seoAudit.fetchWithTimeout` → return `{ body, status, contentType }` so the sitemap content-type check (#2) can see how the file is actually served.
- Add `collectImages($)` → `{ total, missingAlt }` for #9.

Regression note: every site's score will shift once new checks land (incl. JK's 98). Expected — verify the scoring still sums correctly (§5).

---

## 2. The 9 checks — logic + placement

| # | Check | Category | Pass / Warn / Fail logic | Source |
|---|---|---|---|---|
| 1 | **Sitemap in robots.txt** | crawlability | robots has a `Sitemap:` line → pass; sitemap exists but unreferenced → warn; no sitemap → (existing check) | parse robots (already fetched) |
| 2 | **Sitemap validity** | crawlability | `Content-Type` is xml + no BOM + parses + has `<lastmod>` → pass; served as `text/html`/BOM/no-lastmod → warn; unparseable → fail | richer `fetchWithTimeout` |
| 3 | **Canonical correctness** | technical | canonical present + absolute + same-origin + matches page path → pass; relative or cross-origin or mismatched → warn (not fail — legit cross-domain canonicals exist) | `canonicalUrl` vs page URL |
| 4 | **`X-Robots-Tag` noindex** | crawlability | header present with `noindex` → fail (silent de-index); else pass/skip | `xRobotsTag` header |
| 5 | **HTTP status / redirect** | technical | final 200 direct → pass; 200 after redirect → info (note final URL); 3xx loop / 4xx / 5xx → fail | `httpStatus`, `redirected`, `finalUrl` |
| 6 | **AI-crawler access** | **ai_readiness (NEW)** | robots allows GPTBot/ClaudeBot/PerplexityBot/Google-Extended/CCBot → pass; blocks one or more → warn (hurts AEO); silent (no rule) → info | parse robots user-agent blocks |
| 7 | **`llms.txt` present** | **ai_readiness (NEW)** | `/llms.txt` returns 200 w/ content → pass; absent → info (emerging, optional) | one extra fetch in `discoverSiteStructure` |
| 8 | **Performance / Core Web Vitals** | **performance (NEW)** | Lighthouse perf ≥90 pass / 50–89 warn / <50 fail; surface LCP + CLS; CrUX field data if present (absent for low-traffic sites → lab only) | **PageSpeed Insights API** (new `services/pageSpeed.ts`) |
| 9 | **Image alt-text** | content | 0 imgs or all have alt → pass; some missing alt → warn (report count) | `collectImages` |

---

## 3. Two new categories
Add to shared `SeoAuditCategory`: **`ai_readiness`** and **`performance`**. Requires editing the shared package + rebuilding/repacking `jackpotkeywords-shared-1.0.0.tgz` (consumed by both web + functions). Update:
- `CATEGORY_WEIGHTS` (must sum to 100) — proposed rebalance:
  `technical 20 · content 15 · crawlability 20 · structured_data 10 · performance 15 · ai_readiness 10 · local_geo 5 · social_sharing 5 = 100`
  *(rationale: performance is a real Google ranking factor; ai_readiness is JK's differentiator; local/social trimmed since they're often N/A.)*
- `calculateCategoryScores` categories array.
- Report renderer category labels (see §4).

## 4. Report / UI rendering touch-points
New checks with **existing** categories render automatically (they flow through the `checks[]` array by `category`). The **two new categories** need the renderers taught their labels + order:
- Consumer results UI: `SeoAuditResults.tsx` (web).
- PDF generator (the report we just reviewed) — confirm location during build; add the 2 category rows + check rows.
- Public `/v1/audit` already returns the raw `checks[]`/`categoryScores` — no contract break, just more entries.

## 5. PageSpeed Insights integration (#8 specifics)
- New `services/pageSpeed.ts` → GET `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&key={KEY}&strategy=mobile&category=performance`.
- Env: **`PAGESPEED_API_KEY`** (Google Cloud API key with "PageSpeed Insights API" enabled — free, generous quota).
- Run as a **parallel, non-fatal step** (like the AEO scan — `try/catch`, ~5–15s; never block the audit if it fails or the key is unset).
- Returns: Lighthouse performance score + LCP/CLS/TBT (lab, always present); CrUX field data when available.

## 6. Decisions needed from Michael before build
1. **PageSpeed API key** — create a Google Cloud API key + enable the PageSpeed Insights API, provide as `PAGESPEED_API_KEY`. (Or: defer #8, ship #1–7 + #9 now, add performance later. #8 is the only item needing a new credential.)
2. **Approve the category weights** in §3 (or adjust).

## 7. Build sequence (when approved)
1. Fetch-layer refactor (§1) — headers/status/redirect on `fetchHtml`+`ParsedPage`; richer `fetchWithTimeout`; `collectImages`.
2. Deterministic checks #1,2,3,4,5,9 in `buildChecklist`/`discoverSiteStructure`.
3. `ai_readiness` category + #6,#7.
4. `performance` category + #8 (`services/pageSpeed.ts` + key).
5. Shared types + weights + scoring + report/UI renderers.
6. Test: self-audit (jackpotkeywords.web.app) + 2 external sites; verify each new check fires, scoring sums to 100, PDF + UI render the new categories. tsc clean; `npm run build:functions`.

## 8. Verification it closes the original gap
Re-audit JK after build: the new crawlability/indexing checks (#1–5) + ai_readiness (#6–7) should pass (JK has sitemap-in-robots, valid sitemap, correct canonical, no X-Robots noindex, llms.txt, AI crawlers allowed), while performance reflects real Lighthouse. This makes the audit grade *indexability completeness*, not just "signals present" — the blind spot that let it score JK 98/100 while JK had 0 indexed pages.
