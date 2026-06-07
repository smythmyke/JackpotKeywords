# jackpotkeywords-zapier

Zapier integration for [JackpotKeywords](https://jackpotkeywords.web.app) — AI-powered keyword research and AI-visibility (AEO) scans. Built with `zapier-platform-core` (CLI app).

## Actions

| Action | Backend | Pattern | Cost |
|---|---|---|---|
| **Recommend Keywords** | `POST /v1/jobs` (`operation: recommend`) | async callback (1-3 min) | $0.10 |
| **Run AEO Scan** | `POST /v1/jobs` (`operation: aeo-scan`) | async callback (~30-120s) | $1.00 |
| **Get Balance** | `GET /v1/me` | synchronous | free |

### Why the callback pattern
Zapier hard-times-out action requests at **30 seconds**, but the JackpotKeywords pipeline runs **60-180s**. The two long actions therefore use Zapier's async pattern: `perform` generates a callback URL with `z.generateCallbackUrl()`, enqueues a job via `POST /v1/jobs`, and returns. The JackpotKeywords worker runs the job in the background and POSTs the result to the callback URL, which resumes the Zap in `performResume`. Billing happens server-side exactly as a direct API call would.

## Authentication
API key (`jk_live_…`) sent as `Authorization: Bearer <key>`, validated against `GET /v1/me`. Get a key at [jackpotkeywords.web.app/developers](https://jackpotkeywords.web.app/developers).

## Develop / deploy

```bash
npm install
npm install -g zapier-platform-cli   # if not already installed
# NOTE: in zapier-platform-cli v17+ the command is `zapier-platform`, NOT `zapier`.
zapier-platform login                      # interactive — your Zapier account
zapier-platform register "JackpotKeywords" # first time only, links this dir to a Zapier app
zapier-platform push                       # upload this version
zapier-platform validate                   # schema check
```

Then test in the Zapier editor (Developer Platform → your app → Test), and submit for public review when ready (4-6 week passive wait).

## Backend dependency
Requires the async job layer in `packages/functions` (`POST /v1/jobs`, the `processApiJob` Firestore trigger, and the `JK_INTERNAL_JOB_SECRET` env var). Deploy functions before pushing this app.
