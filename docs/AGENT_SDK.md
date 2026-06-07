# Claude Agent SDK — Opportunities for JackpotKeywords

## Where you are today

- Web app (Firebase-hosted), Cloud Functions backend
- Tagline: "AI-powered keyword research tool that undercuts SEMrush/Ahrefs by 10x"
- Single-shot flow: product description → keyword list scored across 12 intent categories, 4 data sources, Google Ads metrics
- Pricing: 3 free searches, $1.99/search, $4.99/3 searches, $9.99/mo unlimited

You've validated "AI does the keyword generation" at a price ~10x cheaper than incumbents. The unlock: SEMrush/Ahrefs charge $100–500/mo because they sell **workflows**, not just keywords. An agent layer lets you close that gap.

## Where single-shot hits its ceiling

Today: user gets a scored keyword list. They still have to:
- Pick which to target
- Research competing SERPs
- Draft the content/ad copy
- Monitor performance

Each of those is a multi-step task. That's agent territory.

## Three agents to consider

### 1. Full-Funnel Campaign Agent (build first — new $29/mo tier)

**Flow:** User gives a product description + campaign goal (SEO blog / Google Ads / Amazon listing) → agent runs your existing keyword engine → WebSearches top SERPs for the winners → WebFetches top 3 results → writes content brief (for SEO) OR 5 ad copy variants (for PPC) OR product listing copy (for Amazon) → delivers as exportable markdown/JSON.

**Why this tier exists:** Unlimited-search users are your most engaged segment. They're already searching repeatedly. Offer a tier that turns their search habit into done-for-you campaign outputs.

**Price:** $29/mo tier (3x your current top tier). Users who'd pay $99/mo for Ahrefs will pay $29 for less data + more action.

**Tools:** WebSearch, WebFetch, Write, plus a custom MCP tool wrapping your existing `/search` endpoint so the agent can run keyword searches as one of its steps.

### 2. Saved-Search Watcher (included in $9.99 tier)

**Flow:** User saves a search → weekly Routine (or Cloud Scheduler) re-runs the same search → diffs against last week → flags:
- New long-tail keywords with growing volume
- CPC shifts (>20% up or down)
- New competitors entering the top SERP
- Dropped keywords

Emails a weekly digest.

**Why included in current tier:** retention feature. Turns JackpotKeywords from a tool you use once per product into a monitor you never churn from.

### 3. Niche Auditor (one-time $49 / SaaS $149)

**Flow:** User inputs a niche ("keto desserts", "minimalist home office", "pickleball paddles") → agent does full competitive research: who ranks in the top 10, what keywords they target, content gaps, estimated traffic, monetization approach → delivers 15–25 page competitive audit report as PDF.

**Why this price is defensible:** agencies/consultants currently pay $500–2000 for this kind of audit from freelancers on Fiverr. You can deliver it in 15 minutes for $49 and still have 80%+ margin.

## Architecture integration

You already have the pieces:
- `@jackpotkeywords/functions` — Cloud Functions
- `@jackpotkeywords/shared` — shared types
- `@jackpotkeywords/web` — frontend

**Add a new package:** `@jackpotkeywords/agents` — Agent SDK entrypoints for each agent flow.

Key pattern: **expose your existing keyword-search function as an MCP tool for the agent**. That way the agent can call your proprietary scoring as a native tool, not re-invent keyword research.

## Starter code (full-funnel agent)

```typescript
import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { runKeywordSearch } from "@jackpotkeywords/shared";

const jackpotTools = createSdkMcpServer({
  name: "jackpot",
  version: "1.0.0",
  tools: [
    tool(
      "run_keyword_search",
      "Run JackpotKeywords AI scoring on a product description. Returns scored keywords with Google Ads metrics.",
      { description: z.string(), mode: z.enum(["seo", "ppc"]) },
      async ({ description, mode }) => {
        const results = await runKeywordSearch(description, mode);
        return { content: [{ type: "text", text: JSON.stringify(results) }] };
      }
    )
  ]
});

export const fullFunnelCampaign = async (userId, description, goal) => {
  const result = query({
    prompt: `A user wants to run a ${goal} campaign for: "${description}"

    Your job:
    1. Call run_keyword_search with the description and appropriate mode
    2. Take the top 10 keywords by Jackpot score
    3. For the top 3 keywords, WebSearch and WebFetch the #1 result to understand what's ranking
    4. ${goal === "seo"
        ? "Write a content brief: target keyword, search intent, outline with H2s, target word count, unique angles not yet covered in top SERPs"
        : goal === "ppc"
        ? "Write 5 ad copy variants: headline + description, each targeting different intent slice"
        : "Write optimized listing copy: title, bullets, description for the primary keyword"}
    5. Save output to /tmp/campaign-{userId}.md

    Cite sources for every competitive claim.`,
    options: {
      allowedTools: [
        "WebSearch", "WebFetch", "Write",
        "mcp__jackpot__run_keyword_search"
      ],
      mcpServers: { jackpot: jackpotTools },
      permissionMode: "acceptEdits",
      maxTurns: 40
    }
  });

  for await (const msg of result) {
    await streamToUser(userId, msg);
  }
};
```

## Pricing math

Current cost per search (your existing backend): roughly 1 API call, ~$0.01–0.03.

Full-funnel agent per run:
- 1 keyword search call (~$0.02)
- 3 WebSearches (free via Anthropic)
- 3 WebFetches (~5K tokens each = ~$0.05)
- Output generation (~10K tokens = ~$0.15)
- **Total: ~$0.25 per run**

At $29/mo with ~20 runs per user average, that's $5 in COGS per user on a $29 subscription. 83% margin. Healthy.

## Risks

1. **Users who already write their own content** will balk at the brief. Frame it as a "competitive intel report" for experienced SEOs, not a "do it for me" tool.
2. **SEMrush/Ahrefs will ship something similar** within 12 months. Your moat is price + speed + focus on solo marketers.
3. **Hallucinated metrics** — agent may invent search volume. Pin it: "all metrics must come from run_keyword_search tool, never estimate."
4. **Latency** — a full funnel run takes 60–120s. Show progress in the UI with step-by-step streaming.

## First concrete step

1. Scaffold `packages/agents` alongside existing workspaces
2. Install SDK: `npm install @anthropic-ai/claude-agent-sdk -w @jackpotkeywords/agents`
3. Build the full-funnel agent as a CLI script first: `npm run agent:funnel -- "keto protein bars" seo`
4. Run on 10 real niches, grade outputs yourself
5. Put the 5 best outputs in front of 3 existing paying users. Ask: "would this replace your Ahrefs content brief workflow?"
6. If yes → wire to Cloud Function + Stripe + new tier in UI
7. If no → the output quality isn't there; keep iterating the prompt

## Related research

- `C:\Projects\ideas\claude-code-research\agent-sdk.md` — full SDK deep dive
- https://code.claude.com/docs/en/agent-sdk/mcp — custom MCP tools (how to expose your keyword function)
- https://github.com/anthropics/claude-agent-sdk-demos
