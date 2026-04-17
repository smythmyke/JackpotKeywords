/**
 * AEO (Answer Engine Optimization) Scan Service
 *
 * Checks AI platform citations for a product by generating buyer-voice
 * queries and running Gemini grounded search to see if the product
 * appears in AI-generated answers.
 *
 * Two modes:
 * - Light: 3-5 queries, Gemini only (used in SEO audit)
 * - Full: 10 queries, Gemini grounding (standalone scan)
 */

import { GoogleGenAI } from '@google/genai';
import * as functions from 'firebase-functions';
import type { AeoResult, AeoQuery, AeoCitation } from '@jackpotkeywords/shared';
import type { ProductContext } from '@jackpotkeywords/shared';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const MODEL = 'gemini-2.5-flash';

// Known competitors for citation analysis
const KNOWN_COMPETITORS = [
  'semrush', 'ahrefs', 'ubersuggest', 'moz', 'se ranking', 'mangools',
  'kwfinder', 'spyfu', 'longtailpro', 'keyword tool', 'surfer seo',
  'wordtracker', 'keywords everywhere', 'canva', 'glorify', 'picmonkey',
  'adobe express', 'photoshop express',
];

// ── Retry wrapper ────────────────────────────────────────────

async function geminiGenerate(
  prompt: string,
  config?: any,
  retries = 3,
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        ...config,
      });
    } catch (err: any) {
      const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (attempt < retries && is503) {
        const delay = attempt * 3000;
        functions.logger.info(`AEO Gemini 503, retry ${attempt}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ── Step 1: Generate buyer-voice queries ─────────────────────

async function generateBuyerQueries(
  description: string,
  queryCount: number,
  productName?: string,
): Promise<string[]> {
  const prompt = `You are simulating real buyers searching for a product like this:

${productName ? `Product name: ${productName}` : ''}
Description: ${description}

Generate ${queryCount} realistic queries that a potential buyer would type into an AI assistant (ChatGPT, Gemini, Perplexity) when looking for this type of tool or service. These should be natural questions, NOT keyword fragments.

Mix these types:
- Direct product searches ("What's the best [product type]?")
- Problem-based ("How do I solve [problem] without [expensive alternative]?")
- Comparison ("What are cheaper alternatives to [competitor]?")
- Use-case specific ("Best tool for [specific task] for [audience]")
- Feature-specific ("Is there a [product type] that [specific feature]?")

Return ONLY a JSON array of strings, no markdown:
["query 1", "query 2", ...]`;

  const response = await geminiGenerate(prompt);
  const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    functions.logger.warn('AEO: Failed to parse buyer queries, using fallback');
    return [`What is the best ${description.substring(0, 50)}?`];
  }
}

// ── Step 2: Run grounded search ──────────────────────────────

interface GroundedResult {
  query: string;
  citations: AeoCitation[];
  searchQueries: string[];
  answerText: string;
}

async function groundedSearch(query: string): Promise<GroundedResult> {
  const response = await geminiGenerate(query, {
    config: { tools: [{ googleSearch: {} }] },
  });

  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks || [];
  const citations: AeoCitation[] = chunks
    .filter((c: any) => c.web)
    .map((c: any) => ({
      url: c.web.uri || '',
      title: c.web.title || '',
    }));

  return {
    query,
    citations,
    searchQueries: metadata?.webSearchQueries || [],
    answerText: response.text || '',
  };
}

// ── Step 3: Analyze citations ────────────────────────────────

function analyzeCitations(
  results: GroundedResult[],
  domain: string,
  productName?: string,
): AeoQuery[] {
  const domainClean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const matchPatterns = [domainClean];
  if (productName) matchPatterns.push(productName.toLowerCase());

  return results.map((r) => {
    const productCited = r.citations.some((c) => {
      const url = c.url.toLowerCase();
      const title = c.title.toLowerCase();
      return matchPatterns.some((p) => url.includes(p) || title.includes(p));
    });

    const productMentionedInAnswer = matchPatterns.some((p) =>
      r.answerText.toLowerCase().includes(p),
    );

    const competitorsCited: string[] = [];
    for (const comp of KNOWN_COMPETITORS) {
      const inCitations = r.citations.some((c) =>
        c.url.toLowerCase().includes(comp.replace(/\s/g, '')) ||
        c.title.toLowerCase().includes(comp),
      );
      const inText = r.answerText.toLowerCase().includes(comp);
      if (inCitations || inText) competitorsCited.push(comp);
    }

    return {
      query: r.query,
      citations: r.citations.slice(0, 10),
      productCited,
      productMentionedInAnswer,
      competitorsCited,
      answerSnippet: r.answerText.substring(0, 300),
    };
  });
}

// ── Step 4: Generate action items ────────────────────────────

async function generateActionItems(
  analysis: AeoQuery[],
  domain: string,
  productName?: string,
): Promise<string[]> {
  const cited = analysis.filter((a) => a.productCited).length;
  const mentioned = analysis.filter((a) => a.productMentionedInAnswer).length;
  const total = analysis.length;
  const gaps = analysis.filter((a) => !a.productCited && !a.productMentionedInAnswer);
  const topCompetitors = Object.entries(
    analysis.reduce((acc, a) => {
      for (const c of a.competitorsCited) acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const prompt = `You are an AEO (Answer Engine Optimization) strategist. Based on this AI visibility scan, generate 3-5 specific, actionable recommendations.

Product: ${productName || domain}
Domain: ${domain}
Visibility: ${cited}/${total} queries cite the product, ${mentioned}/${total} mention it in answers
${gaps.length > 0 ? `Queries with ZERO presence:\n${gaps.map((g) => `- "${g.query}" (competitors present: ${g.competitorsCited.join(', ') || 'none'})`).join('\n')}` : 'Product appears in all queries.'}
${topCompetitors.length > 0 ? `Top competitors in AI results:\n${topCompetitors.map(([c, n]) => `- ${c}: ${n}/${total} queries`).join('\n')}` : ''}

Generate 3-5 specific, actionable recommendations. Each should be one sentence describing exactly what to do. Focus on:
- Content to create that would get cited by AI (blog posts, comparison pages, FAQs)
- Platforms to publish on (Reddit threads, Medium, YouTube)
- Competitor gaps to exploit
- Structured data to add for AI crawlers

Return ONLY a JSON array of strings, no markdown:
["recommendation 1", "recommendation 2", ...]`;

  try {
    const response = await geminiGenerate(prompt);
    const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return ['Create comparison content targeting queries where competitors are cited but you are not.'];
  }
}

// ── Score calculation ────────────────────────────────────────

function calculateVisibilityScore(analysis: AeoQuery[]): number {
  if (analysis.length === 0) return 0;
  // Cited = 1.0 weight, mentioned in text = 0.5 weight
  const score = analysis.reduce((sum, a) => {
    if (a.productCited) return sum + 1.0;
    if (a.productMentionedInAnswer) return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / analysis.length) * 100);
}

// ── Public API ───────────────────────────────────────────────

/**
 * Light AEO scan — 3-5 queries, Gemini grounding only.
 * Used inside SEO audit. Non-fatal — callers should catch errors.
 */
export async function runAeoScanLight(
  contentSummary: string,
  domain: string,
  productName?: string,
): Promise<AeoResult> {
  const queryCount = 4;

  functions.logger.info(`AEO light scan: ${domain} (${queryCount} queries)`);

  // Step 1: Generate queries from content summary
  const queries = await generateBuyerQueries(contentSummary, queryCount, productName);
  functions.logger.info(`AEO: ${queries.length} buyer queries generated`);

  // Step 2: Run grounded searches
  const results: GroundedResult[] = [];
  for (const query of queries) {
    try {
      const result = await groundedSearch(query);
      results.push(result);
    } catch (err: any) {
      functions.logger.warn(`AEO grounded search failed for "${query.substring(0, 40)}": ${err.message}`);
      results.push({ query, citations: [], searchQueries: [], answerText: '' });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 3: Analyze
  const analysis = analyzeCitations(results, domain, productName);

  // Step 4: Action items
  const actionItems = await generateActionItems(analysis, domain, productName);

  // Build competitor frequency
  const competitorFrequency: Record<string, number> = {};
  for (const a of analysis) {
    for (const c of a.competitorsCited) {
      competitorFrequency[c] = (competitorFrequency[c] || 0) + 1;
    }
  }

  return {
    visibilityScore: calculateVisibilityScore(analysis),
    queriesChecked: analysis.length,
    queriesCited: analysis.filter((a) => a.productCited).length,
    queriesMentioned: analysis.filter((a) => a.productMentionedInAnswer).length,
    competitorFrequency,
    queries: analysis,
    actionItems,
  };
}

/**
 * Full AEO scan — 10 queries, Gemini grounding.
 * Used as standalone feature from keyword results.
 */
export async function runAeoScanFull(
  context: ProductContext,
  domain: string,
): Promise<AeoResult> {
  const queryCount = 10;
  const description = `${context.productName || context.productLabel}: ${context.whatItDoes}
Key features: ${context.keyFeatures.join(', ')}
Competitors: ${context.competitors.join(', ')}
Target audience: ${context.targetAudience.join(', ')}`;

  functions.logger.info(`AEO full scan: ${domain} (${queryCount} queries)`);

  // Step 1: Generate queries from full product context
  const queries = await generateBuyerQueries(description, queryCount, context.productName);
  functions.logger.info(`AEO: ${queries.length} buyer queries generated`);

  // Step 2: Run grounded searches
  const results: GroundedResult[] = [];
  for (const query of queries) {
    try {
      const result = await groundedSearch(query);
      results.push(result);
    } catch (err: any) {
      functions.logger.warn(`AEO grounded search failed for "${query.substring(0, 40)}": ${err.message}`);
      results.push({ query, citations: [], searchQueries: [], answerText: '' });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 3: Analyze
  const analysis = analyzeCitations(results, domain, context.productName);

  // Step 4: Action items
  const actionItems = await generateActionItems(analysis, domain, context.productName);

  // Build competitor frequency
  const competitorFrequency: Record<string, number> = {};
  for (const a of analysis) {
    for (const c of a.competitorsCited) {
      competitorFrequency[c] = (competitorFrequency[c] || 0) + 1;
    }
  }

  return {
    visibilityScore: calculateVisibilityScore(analysis),
    queriesChecked: analysis.length,
    queriesCited: analysis.filter((a) => a.productCited).length,
    queriesMentioned: analysis.filter((a) => a.productMentionedInAnswer).length,
    competitorFrequency,
    queries: analysis,
    actionItems,
  };
}
