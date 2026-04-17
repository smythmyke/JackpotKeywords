/**
 * Idea Board generation service.
 *
 * Takes ProductContext + top keywords and generates a comprehensive
 * content plan: blog posts, video ideas, social media drafts, SEO actions.
 */

import * as functions from 'firebase-functions';
import { geminiGenerate, safeParseGeminiJSON } from './gemini';
import type { ProductContext, KeywordResult, AeoResult, IdeaBoardItem } from '@jackpotkeywords/shared';

const YT_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search';

async function fetchYouTubeSuggestions(query: string): Promise<string[]> {
  try {
    const url = `${YT_SUGGEST_URL}?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return [];
    const text = await response.text();
    // YouTube suggest returns JSONP-like: window.google.ac.h(...)
    const match = text.match(/\((\[.*\])\)/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    return (data[1] || []).map((item: any) => (Array.isArray(item) ? item[0] : item)).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Generate a complete Idea Board from search results.
 */
export async function generateIdeaBoard(
  context: ProductContext,
  keywords: KeywordResult[],
  domain: string,
  aeoResult?: AeoResult | null,
): Promise<IdeaBoardItem[]> {
  // Build keyword summary: top 20 by jackpot score with volume
  const topKeywords = [...keywords]
    .sort((a, b) => b.jackpotScore - a.jackpotScore)
    .slice(0, 20)
    .map((k) => `${k.keyword} (${k.avgMonthlySearches}/mo, ${k.competition})`);

  // Cluster summary: group by category, top 3 per category
  const categoryGroups = new Map<string, KeywordResult[]>();
  for (const kw of keywords) {
    const cat = kw.category || 'direct';
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(kw);
  }
  const clusterSummary = [...categoryGroups.entries()]
    .map(([cat, kws]) => {
      const top3 = kws.sort((a, b) => b.jackpotScore - a.jackpotScore).slice(0, 3);
      return `${cat}: ${top3.map((k) => k.keyword).join(', ')}`;
    })
    .join('\n');

  // YouTube autocomplete for video ideas
  let youtubeHints = '';
  try {
    const seeds = topKeywords.slice(0, 5).map((k) => k.split(' (')[0]);
    const ytResults: string[] = [];
    for (const seed of seeds) {
      const suggestions = await fetchYouTubeSuggestions(seed);
      ytResults.push(...suggestions.slice(0, 3));
      await new Promise((r) => setTimeout(r, 100));
    }
    const unique = [...new Set(ytResults)].slice(0, 10);
    if (unique.length > 0) {
      youtubeHints = `\nYouTube autocomplete suggestions (real queries):\n${unique.map((s) => `- ${s}`).join('\n')}`;
    }
  } catch {
    functions.logger.warn('Idea Board: YouTube autocomplete failed, continuing without');
  }

  // AEO context
  const aeoContext = aeoResult ? `
AEO Scan Results (AI Visibility):
- Visibility score: ${aeoResult.visibilityScore}/100
- Product cited in ${aeoResult.queriesCited}/${aeoResult.queriesChecked} AI queries
- Top competitors in AI results: ${Object.entries(aeoResult.competitorFrequency).sort(([, a], [, b]) => b - a).slice(0, 5).map(([c, n]) => `${c} (${n}/${aeoResult.queriesChecked})`).join(', ')}
- AEO action items: ${aeoResult.actionItems.join('; ')}` : '';

  const prompt = `You are a content strategist. Generate a comprehensive Idea Board for this product based on keyword research data.

Product: ${context.productName || context.productLabel}
Domain: ${domain}
Description: ${context.whatItDoes}
Target audience: ${context.targetAudience.join(', ')}
Competitors: ${context.competitors.join(', ')}
Key features: ${context.keyFeatures.join(', ')}

Top 20 keywords by opportunity:
${topKeywords.join('\n')}

Keyword categories:
${clusterSummary}
${youtubeHints}
${aeoContext}

Generate items for ALL of the following categories. Return ONLY valid JSON, no markdown:

{
  "content": [
    {
      "title": "Blog: Article title here",
      "contentType": "Guide|Comparison|FAQ|Tutorial|Landing",
      "difficulty": "Easy|Medium|Hard",
      "trafficEstimate": "~200-400/mo",
      "targetKeywords": "keyword1 (vol/mo), keyword2 (vol/mo)"
    }
  ],
  "videos": [
    {
      "title": "YouTube video title in quotes",
      "videoFormat": "Tutorial · 8-12 min|Comparison · 6-10 min|Short · 30-60s",
      "youtubeVolume": "2,400/mo or N/A"
    }
  ],
  "reddit": [
    {
      "title": "r/subreddit — Post title hook",
      "platform": "r/subreddit · member count",
      "draftBody": "Full post text, 400-800 chars. Authentic tone, value-first, no direct self-promotion. End with a question to invite discussion.",
      "draftMeta": ["char count", "Tone: Authentic", "CTA: Soft question"]
    }
  ],
  "twitter": [
    {
      "title": "Thread: Title or Single tweet description",
      "platform": "Thread · N tweets|Single · N variants",
      "draftBody": "Full thread or tweet text. For threads: number each tweet 1/ 2/ 3/. For singles: separate with --- between variants.",
      "draftMeta": ["N tweets or N variants", "Tone: description", "CTA: description"]
    }
  ],
  "linkedin": [
    {
      "title": "Article: Title here",
      "platform": "Article · word range",
      "draftBody": "Hook paragraph + outline with numbered sections + CTA. Include suggested hashtags.",
      "draftMeta": ["Article outline", "Tone: Professional", "CTA: Engagement question"]
    }
  ],
  "seo": [
    {
      "title": "Action item description",
      "source": "Keyword Research|AEO Scan|SEO Best Practice",
      "impact": "High|Medium|Low"
    }
  ]
}

RULES:
- Generate 5-8 content items based on keyword clusters (each targets a specific cluster)
- Generate 3-4 YouTube video ideas + 2 YouTube Shorts ideas (use YouTube autocomplete hints if provided)
- Generate 2 Reddit posts for relevant subreddits (authentic, value-first, no spam)
- Generate 1 Twitter/X thread (7 tweets) + 1 set of 3-5 single tweet variants
- Generate 1 LinkedIn article outline with hook paragraph
- Generate 3-5 SEO action items (based on keyword gaps and AEO data if available)
- Social media drafts must be CUSTOMIZED to this specific product and its keywords — not generic templates
- Reddit posts should NOT directly promote the product — provide genuine value, mention the tool naturally only if relevant
- Each draft should be ready to post with minimal editing`;

  functions.logger.info('Idea Board: generating items via Gemini...');
  const text = await geminiGenerate(prompt);
  const parsed = await safeParseGeminiJSON(text, 'object', prompt);

  const items: IdeaBoardItem[] = [];
  let idCounter = 0;

  // Content items
  for (const item of (parsed.content || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'content',
      title: item.title || 'Untitled content',
      completed: false,
      contentType: item.contentType,
      difficulty: item.difficulty,
      trafficEstimate: item.trafficEstimate,
      targetKeywords: item.targetKeywords,
    });
  }

  // Video items
  for (const item of (parsed.videos || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'video',
      title: item.title || 'Untitled video',
      completed: false,
      videoFormat: item.videoFormat,
      youtubeVolume: item.youtubeVolume,
    });
  }

  // Reddit items
  for (const item of (parsed.reddit || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'reddit',
      title: item.title || 'Reddit post',
      completed: false,
      platform: item.platform,
      draftBody: item.draftBody,
      draftMeta: Array.isArray(item.draftMeta) ? item.draftMeta : [],
    });
  }

  // Twitter items
  for (const item of (parsed.twitter || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'twitter',
      title: item.title || 'Twitter post',
      completed: false,
      platform: item.platform,
      draftBody: item.draftBody,
      draftMeta: Array.isArray(item.draftMeta) ? item.draftMeta : [],
    });
  }

  // LinkedIn items
  for (const item of (parsed.linkedin || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'linkedin',
      title: item.title || 'LinkedIn post',
      completed: false,
      platform: item.platform,
      draftBody: item.draftBody,
      draftMeta: Array.isArray(item.draftMeta) ? item.draftMeta : [],
    });
  }

  // SEO items
  for (const item of (parsed.seo || [])) {
    items.push({
      id: `idea_${++idCounter}`,
      type: 'seo',
      title: item.title || 'SEO action',
      completed: false,
      source: item.source,
      impact: item.impact,
    });
  }

  functions.logger.info(`Idea Board: generated ${items.length} items (${parsed.content?.length || 0} content, ${parsed.videos?.length || 0} videos, ${(parsed.reddit?.length || 0) + (parsed.twitter?.length || 0) + (parsed.linkedin?.length || 0)} social, ${parsed.seo?.length || 0} seo)`);

  return items;
}
