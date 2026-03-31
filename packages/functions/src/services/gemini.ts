import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import type {
  KeywordCategory,
  KeywordResult,
  CategorySummary,
  CompetitionLevel,
  ProductContext,
  KeywordCluster,
} from '@jackpotkeywords/shared';
import { classifyIntent } from './intentClassifier';
import { clusterKeywords } from './clustering';
import {
  calculateAdScore,
  calculateSeoScore,
  calculateBudgetFit,
  CATEGORY_LABELS,
} from '@jackpotkeywords/shared';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SeedResult {
  allSeeds: { keyword: string; category: string; source: string }[];
  topSeeds: string[];
  productLabel: string;
}

const EMPTY_CONTEXT: ProductContext = {
  productName: '',
  productLabel: 'Keyword Research',
  whatItDoes: '',
  targetAudience: [],
  keyFeatures: [],
  painPoints: [],
  competitors: [],
  differentiators: [],
  useCases: [],
  industryNiche: [],
  benefits: [],
  relatedTopics: [],
};

/**
 * Step 0: Extract structured product context from raw user input
 */
export async function extractProductContext(
  description: string,
  url: string | undefined,
): Promise<ProductContext> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a product analyst. The user is describing a product, service, or business idea. It may be an existing product or an early-stage concept that doesn't exist yet. Extract as much structured information as possible, inferring where the user hasn't been explicit — do not leave fields empty unless truly impossible to determine.

${url ? `Product/Reference URL: ${url}` : ''}
${description ? `User's description: "${description}"` : ''}

Extract the following and return ONLY valid JSON, no markdown:

{
  "productName": "The product's name if mentioned, otherwise invent a short descriptive name",
  "productLabel": "3-5 word label describing what this product/concept is",
  "whatItDoes": "1-2 sentence summary of what this product does or would do",
  "targetAudience": ["who uses or would use this — roles, job titles, or user types"],
  "keyFeatures": ["each distinct feature as a short phrase — infer likely features if not stated"],
  "painPoints": ["specific problems/frustrations this solves — what users struggle with without this product"],
  "competitors": ["names of REAL products/tools that already exist in this space or solve similar problems — search your knowledge thoroughly, find ALL overlapping products"],
  "differentiators": ["what makes or would make this product different from competitors"],
  "useCases": ["specific scenarios or workflows where someone would need this"],
  "industryNiche": ["industries, verticals, or sub-niches this serves"],
  "benefits": ["outcomes and results users get — not features, but the VALUE of features"],
  "relatedTopics": ["adjacent topics, complementary tools, or related interests the same audience has"]
}

RULES:
- Every array should have at least 2-3 items. Infer from context if the user didn't explicitly state them.
- For competitors: find tools that solve the SAME specific problem, not general-purpose tools. These must be real products you know exist.
- For painPoints: think about what users experience WITHOUT this product — the frustration that drives someone to search for a solution.
- For benefits: translate features into outcomes. "auto-detects audio" → "never go live with broken audio".
- For relatedTopics: what else does this audience search for? Complementary tools, adjacent workflows.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    functions.logger.warn('Failed to parse extraction response, using fallback');
    return {
      ...EMPTY_CONTEXT,
      productLabel: description.substring(0, 50) || 'Unknown Product',
      whatItDoes: description.substring(0, 200),
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and fill defaults for every field
  return {
    productName: parsed.productName || '',
    productLabel: parsed.productLabel || description.substring(0, 50) || 'Keyword Research',
    whatItDoes: parsed.whatItDoes || description.substring(0, 200),
    targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : [],
    keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
    painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    differentiators: Array.isArray(parsed.differentiators) ? parsed.differentiators : [],
    useCases: Array.isArray(parsed.useCases) ? parsed.useCases : [],
    industryNiche: Array.isArray(parsed.industryNiche) ? parsed.industryNiche : [],
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
    relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
  };
}

/**
 * Step 1: Generate keyword seeds across 10 intent categories using structured context
 */
export async function generateSeeds(
  context: ProductContext,
): Promise<SeedResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const contextBlock = `Product: "${context.productName}" — ${context.whatItDoes}
Key features: ${context.keyFeatures.join(', ') || 'not specified'}
Target audience: ${context.targetAudience.join(', ') || 'not specified'}
Pain points it solves: ${context.painPoints.join(', ') || 'not specified'}
Known competitors: ${context.competitors.join(', ') || 'none identified'}
Differentiators: ${context.differentiators.join(', ') || 'not specified'}
Use cases: ${context.useCases.join(', ') || 'not specified'}
Industry/niche: ${context.industryNiche.join(', ') || 'not specified'}
Benefits/outcomes: ${context.benefits.join(', ') || 'not specified'}
Related topics: ${context.relatedTopics.join(', ') || 'not specified'}`;

  const prompt = `You are an expert keyword researcher. Your job is to generate HIGHLY RELEVANT keyword seeds based on the structured product analysis below. The product may be an existing tool or a business idea/concept — either way, generate keywords that real people would search for.

${contextBlock}

IMPORTANT RULES:
- Every keyword MUST be directly relevant to this specific product
- Use the structured data above — do NOT invent unrelated keywords
- For each feature, generate a keyword that someone searching for THAT feature would type
- For each pain point, generate a "how to" or problem query
- For competitors, use the names listed AND add any others you know that solve the same problem
- Keywords should be what a potential BUYER would search, not a developer or researcher

Generate 50-70 keyword seeds across these 10 categories. Return ONLY valid JSON, no markdown.

Categories:
1. direct (4-6 seeds) - Short head terms for this product category. What would someone type to find this exact type of tool?
2. feature (6-10 seeds) - A searchable keyword for EACH feature listed above. One keyword per feature.
3. problem (5-8 seeds) - A search query for EACH pain point listed above. "how to [fix problem]", "[problem] solution".
4. audience (4-6 seeds) - Keywords for EACH target audience listed above. "[role] tools", "[audience] software".
5. competitor_brand (5-8 seeds) - The competitors listed above. Add any real products you know that solve the same problem.
6. competitor_alt (4-6 seeds) - "[competitor] alternative", "best [product type]", "[competitor] vs [competitor]" using competitors above.
7. use_case (4-6 seeds) - A keyword for EACH use case listed above. "[task] tool", "how to [workflow]".
8. niche (3-5 seeds) - Terms for EACH industry/niche listed above. Industry-specific jargon.
9. benefit (4-6 seeds) - Outcome keywords for EACH benefit listed above. "save time [doing X]", "best tool for [result]".
10. adjacent (3-5 seeds) - Keywords for EACH related topic listed above. Complementary tools, adjacent needs.

Return JSON format:
{
  "seeds": [
    { "keyword": "example keyword", "category": "direct" },
    ...
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI seed response');

  const parsed = JSON.parse(jsonMatch[0]);
  let allSeeds = parsed.seeds.map((s: any) => ({
    keyword: s.keyword,
    category: s.category,
    source: 'ai' as const,
  }));

  // Multi-pass: check for weak categories and re-prompt
  const categoryCounts = new Map<string, number>();
  for (const seed of allSeeds) {
    categoryCounts.set(seed.category, (categoryCounts.get(seed.category) || 0) + 1);
  }

  const weakCategories = [
    'competitor_brand', 'competitor_alt', 'problem', 'use_case', 'benefit',
  ].filter((cat) => (categoryCounts.get(cat) || 0) < 3);

  if (weakCategories.length > 0) {
    functions.logger.info(`Multi-pass: ${weakCategories.length} weak categories detected: ${weakCategories.join(', ')}`);
    const boostSeeds = await boostWeakCategories(model, context, weakCategories);
    allSeeds = [...allSeeds, ...boostSeeds];
    functions.logger.info(`Multi-pass: added ${boostSeeds.length} additional seeds`);
  }

  // Top 10 seeds for autocomplete expansion (highest-value, broadest terms)
  const topSeeds = allSeeds
    .filter((s: any) => ['direct', 'feature', 'problem'].includes(s.category))
    .slice(0, 10)
    .map((s: any) => s.keyword);

  return { allSeeds, topSeeds, productLabel: context.productLabel };
}

/**
 * Multi-pass: re-prompt Gemini for categories that had fewer than 3 seeds
 */
async function boostWeakCategories(
  model: any,
  context: ProductContext,
  weakCategories: string[],
): Promise<{ keyword: string; category: string; source: string }[]> {
  const categoryInstructions: Record<string, string> = {
    competitor_brand: `Find 5-8 DIRECT competitors to "${context.productName || context.productLabel}". Known competitors: ${context.competitors.join(', ') || 'none identified'}. These must be real products that solve the same problem: ${context.whatItDoes}. Search your knowledge thoroughly.`,
    competitor_alt: `Generate 5-8 "alternative to" and comparison queries. Known competitors: ${context.competitors.join(', ') || 'none'}. Use format: "[competitor] alternative", "best [product type]", "[competitor] vs [competitor]".`,
    problem: `Generate 5-8 pain-point and "how to" queries. Known pain points: ${context.painPoints.join(', ') || 'not specified'}. What frustrations lead someone to need: ${context.whatItDoes}?`,
    use_case: `Generate 5-8 specific use-case keywords. Known use cases: ${context.useCases.join(', ') || 'not specified'}. Target audience: ${context.targetAudience.join(', ') || 'not specified'}. When exactly does someone need this product?`,
    benefit: `Generate 5-8 outcome-focused keywords. Known benefits: ${context.benefits.join(', ') || 'not specified'}. What results does this product deliver? "save time [doing X]", "best tool for [result]".`,
  };

  const categoryList = weakCategories
    .map((cat) => `- ${cat}: ${categoryInstructions[cat] || 'Generate 5 relevant keywords'}`)
    .join('\n');

  const prompt = `You previously generated keyword seeds for this product but some categories were too weak. Generate additional seeds ONLY for the categories listed below.

Product: "${context.productName}" — ${context.whatItDoes}
Key features: ${context.keyFeatures.join(', ') || 'not specified'}
Target audience: ${context.targetAudience.join(', ') || 'not specified'}

Generate seeds for ONLY these weak categories:
${categoryList}

Return ONLY valid JSON, no markdown:
{
  "seeds": [
    { "keyword": "example keyword", "category": "competitor_brand" },
    ...
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.seeds || []).map((s: any) => ({
      keyword: s.keyword,
      category: s.category,
      source: 'ai' as const,
    }));
  } catch (err: any) {
    functions.logger.warn(`Multi-pass boost failed: ${err.message}`);
    return [];
  }
}

/**
 * Step 6: Score and classify all enriched keywords
 */
export async function scoreAndClassify(
  keywords: KeywordResult[],
  context: ProductContext,
  budget?: number,
): Promise<{
  keywords: KeywordResult[];
  categories: CategorySummary[];
  clusters: KeywordCluster[];
}> {
  // Score each keyword and classify intent
  const scored = keywords.map((kw) => {
    const adScore = calculateAdScore(
      kw.avgMonthlySearches, kw.lowCpc, kw.highCpc,
      kw.competition, kw.relevance, kw.trendDirection, budget,
    );
    const seoScore = calculateSeoScore(
      kw.avgMonthlySearches, kw.lowCpc, kw.highCpc,
      kw.competition, kw.relevance, kw.trendDirection,
    );

    let budgetFit = undefined;
    let clicksPerDay = undefined;
    if (budget) {
      const bf = calculateBudgetFit(kw.lowCpc, kw.highCpc, budget);
      budgetFit = bf.fit;
      clicksPerDay = bf.clicksPerDay;
    }

    return {
      ...kw,
      jackpotScore: adScore,
      adScore,
      seoScore,
      budgetFit,
      clicksPerDay,
      intent: classifyIntent(kw.keyword, kw.category as KeywordCategory),
    };
  });

  // Sort by ad score descending
  scored.sort((a, b) => b.adScore - a.adScore);

  // Build category summaries
  const categoryMap = new Map<KeywordCategory, KeywordResult[]>();
  for (const kw of scored) {
    const cat = kw.category as KeywordCategory;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(kw);
  }

  const categories: CategorySummary[] = [];
  for (const [cat, kws] of categoryMap) {
    const avgCpc = kws.reduce((sum, k) => sum + (k.lowCpc + k.highCpc) / 2, 0) / kws.length;
    const avgVolume = kws.reduce((sum, k) => sum + k.avgMonthlySearches, 0) / kws.length;
    const topScore = Math.max(...kws.map((k) => k.adScore));
    const low = kws.filter((k) => k.competition === 'LOW').length;
    const medium = kws.filter((k) => k.competition === 'MEDIUM').length;
    const high = kws.filter((k) => k.competition === 'HIGH').length;

    categories.push({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      keywordCount: kws.length,
      avgCpc: Math.round(avgCpc * 100) / 100,
      avgVolume: Math.round(avgVolume),
      topScore,
      competitionBreakdown: { low, medium, high },
    });
  }

  // Run clustering algorithm (instant — relevance scoring moved to async endpoint)
  functions.logger.info('Clustering keywords...');
  const clusters = clusterKeywords(scored);
  functions.logger.info(`Clustered: ${clusters.length} clusters`);

  // Add cluster counts to category summaries
  for (const cat of categories) {
    cat.clusterCount = clusters.filter((c) => c.category === cat.category).length;
  }

  // Return unnamed clusters — naming happens async via /api/search/name-clusters
  return { keywords: scored, categories, clusters };
}

/**
 * Score keyword relevance to the product using Gemini
 */
export async function scoreRelevance(
  keywords: string[],
  context: ProductContext,
): Promise<Map<string, number>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const keywordList = keywords.map((k, i) => `${i + 1}. "${k}"`).join('\n');

  const prompt = `You are evaluating keyword relevance for a specific product.

Product: "${context.productName}" — ${context.whatItDoes}
Key features: ${context.keyFeatures.join(', ')}
Target audience: ${context.targetAudience.join(', ')}
Competitors: ${context.competitors.join(', ')}

Rate each keyword's relevance to THIS SPECIFIC product on a scale of 1-10:
- 10: Directly describes what this product does or a core feature
- 8-9: Highly relevant — someone searching this would want this product
- 6-7: Moderately relevant — related to the product's space
- 4-5: Tangentially related — same industry but not a direct match
- 1-3: Not relevant — different product category or unrelated

Keywords:
${keywordList}

Return ONLY valid JSON, no markdown:
[
  { "keyword": "example", "relevance": 8 },
  ...
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return new Map();

  const parsed = JSON.parse(jsonMatch[0]);
  const map = new Map<string, number>();
  for (const entry of parsed) {
    if (entry.keyword && typeof entry.relevance === 'number') {
      map.set(entry.keyword, Math.min(10, Math.max(1, Math.round(entry.relevance))));
    }
  }
  return map;
}

/**
 * Name all clusters in a single Gemini call
 */
export async function nameClustersBatch(
  clusters: KeywordCluster[],
): Promise<KeywordCluster[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const groupList = clusters.map((c, i) =>
    `Group ${i}: [${c.keywordKeys.slice(0, 8).map((k) => `"${k}"`).join(', ')}]`,
  ).join('\n');

  const prompt = `Name each keyword group with a short descriptive label (2-4 words). The name should describe the common topic/theme. Return ONLY valid JSON, no markdown.

${groupList}

Return JSON format:
[
  { "id": 0, "name": "Example Topic Name" },
  ...
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) return clusters;

  const names = JSON.parse(jsonMatch[0]);
  return clusters.map((c, i) => ({
    ...c,
    name: names.find((n: any) => n.id === i)?.name || c.name,
  }));
}

const REFINE_PROMPTS: Record<string, string> = {
  feature: 'Generate keyword seeds focused on this SPECIFIC FEATURE of the product. Include variations, long-tail phrases, and how-to queries related to this feature.',
  problem: 'Generate keyword seeds focused on this SPECIFIC PAIN POINT or problem. Include "how to" queries, troubleshooting phrases, and frustration-based searches.',
  audience: 'Generate keyword seeds that this SPECIFIC AUDIENCE would search for. Include role-based terms, industry-specific queries, and audience-intent phrases.',
  competitor_brand: 'Generate keyword seeds related to this SPECIFIC COMPETITOR. Include "[competitor] review", "[competitor] pricing", "[competitor] alternative", and comparison queries.',
  competitor_alt: 'Generate keyword seeds for people looking for ALTERNATIVES to this product/tool. Include "best [X] alternative", "vs", "compared to", "switch from" queries.',
  use_case: 'Generate keyword seeds for this SPECIFIC USE CASE or scenario. Include task-based queries, workflow terms, and situation-specific searches.',
  niche: 'Generate keyword seeds for this SPECIFIC INDUSTRY or NICHE. Include industry jargon, vertical-specific terms, and niche audience queries.',
  benefit: 'Generate keyword seeds focused on this SPECIFIC BENEFIT or OUTCOME. Include result-oriented phrases, "best [X] for [benefit]", and value-proposition queries.',
  adjacent: 'Generate keyword seeds for this RELATED TOPIC that shares the same target audience. Include cross-category terms, complementary tool queries, and adjacent interest keywords.',
};

/**
 * Generate refined keyword seeds for a specific category
 */
export async function generateRefineSeeds(
  userInput: string,
  category: KeywordCategory,
  productDescription: string,
): Promise<{ keyword: string; category: string; source: string }[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const categoryPrompt = REFINE_PROMPTS[category] || 'Generate keyword seeds related to this input.';

  const prompt = `You are an expert keyword researcher. The user has an existing keyword research for this product:

Product: "${productDescription}"

${categoryPrompt}

User's input for the "${CATEGORY_LABELS[category]}" category: "${userInput}"

Generate 10-20 keyword seeds. Each keyword should be directly searchable on Google — real queries people would type. Return ONLY valid JSON, no markdown.

{
  "seeds": [
    { "keyword": "example keyword" },
    ...
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse refine response');

  const parsed = JSON.parse(jsonMatch[0]);
  return (parsed.seeds || []).map((s: any) => ({
    keyword: s.keyword,
    category,
    source: 'ai' as const,
  }));
}
