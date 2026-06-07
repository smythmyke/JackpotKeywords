# n8n-nodes-jackpotkeywords

An [n8n](https://n8n.io) community node for [JackpotKeywords](https://jackpotkeywords.web.app) — AI-powered keyword research, SEO audits, and AI-visibility (AEO) scans, backed by real Google Ads Keyword Planner data.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Operations

| Operation | Endpoint | Cost | Notes |
|---|---|---|---|
| **Recommend Keywords** | `POST /v1/recommend` | $0.10 | Ranked keywords by composite Jackpot Score. Provide a URL and/or description. |
| **Recommend Keywords (Deep)** | `POST /v1/recommend-deep` | $0.30 | Adds competitor discovery + cluster/category/competitor aggregates. |
| **AEO Scan** | `POST /v1/aeo-scan` | $1.00 | AI-visibility scan: is the URL cited/mentioned across 10 buyer-intent AI queries? |
| **SEO Audit** | `POST /v1/audit` | $0.50 | Page-quality checks, keyword gaps, recommendations. |
| **Get Balance** | `GET /v1/me` | free | Current credit balance for the account. |

> The research and scan endpoints run **60–180 seconds**. This node sets a 5-minute request timeout to accommodate that. On n8n Cloud, be mindful of your plan's per-execution limit; self-hosted instances have no issue.

## Credentials

1. Generate an API key at [jackpotkeywords.web.app/developers](https://jackpotkeywords.web.app/developers) (new accounts ship with $2 of starter credit).
2. In n8n, create a **JackpotKeywords API** credential and paste the `jk_live_…` key.
3. The credential is validated against `GET /v1/me`.

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). In a self-hosted n8n, go to **Settings → Community Nodes → Install** and enter `n8n-nodes-jackpotkeywords`.

## Build from source

```bash
npm install
npm run build
```

## Resources

- [JackpotKeywords API docs](https://jackpotkeywords.web.app/developers)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://github.com/smythmyke/JackpotKeywords/blob/master/LICENSE)
