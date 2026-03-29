import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import type {
  KeywordCategory,
  KeywordResult,
  CategorySummary,
  ConceptReport,
  SearchMode,
  CompetitionLevel,
} from '@jackpotkeywords/shared';
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

/**
 * Step 1: Generate keyword seeds across 10 intent categories
 */
export async function generateSeeds(
  description: string,
  url: string | undefined,
  mode: SearchMode,
): Promise<SeedResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = mode === 'concept'
    ? `You are a market research analyst. Analyze this business concept and generate keyword seeds to assess market demand and competition.

${url ? `Primary source — analyze this URL to understand the business: ${url}` : ''}
${url && description ? `Additional context from user: "${description}"` : ''}
${!url && description ? `Business concept: "${description}"` : ''}

Generate 40-65 keyword seeds across these 10 categories. Return ONLY valid JSON, no markdown.

Categories:
1. direct - Short head terms describing the product/service category (3-5 seeds)
2. feature - Keywords for specific features (5-10 seeds)
3. problem - How-to and pain-point queries (5-8 seeds)
4. audience - Keywords identifying the target user (3-5 seeds)
5. competitor_brand - Names of competing products/services (5-10 seeds)
6. competitor_alt - "X alternative", "vs", "best" comparison terms (3-5 seeds)
7. use_case - Specific scenarios when the product is needed (3-5 seeds)
8. niche - Sub-niche and industry-specific terms (3-5 seeds)
9. benefit - Result/outcome-focused keywords (3-5 seeds)
10. adjacent - Related topics that attract the same audience (3-5 seeds)

Return JSON format:
{
  "productLabel": "3-5 word descriptive label for this business concept",
  "seeds": [
    { "keyword": "example keyword", "category": "direct" },
    ...
  ]
}`
    : `You are an expert keyword researcher specializing in finding advertising and SEO opportunities for specific products. Your job is to generate HIGHLY RELEVANT keyword seeds that someone searching for THIS EXACT type of product would type into Google.

${url ? `Primary source — analyze this URL to understand the product: ${url}` : ''}
${url && description ? `Additional context from user: "${description}"` : ''}
${!url && description ? `Product/service: "${description}"` : ''}

IMPORTANT RULES:
- Every keyword MUST be directly relevant to this specific product, not the general technology it uses
- If the product uses AI, do NOT generate generic "AI" or "ChatGPT" keywords — focus on what the product DOES
- For competitors, find tools that solve the SAME specific problem, not general-purpose tools in a broader category
- Keywords should be what a potential BUYER would search, not what a developer or researcher would search

Generate 50-70 keyword seeds across these 10 categories. Return ONLY valid JSON, no markdown.

Categories:
1. direct (4-6 seeds) - Short head terms for this specific product category. What would someone type to find this exact type of tool? NOT the underlying technology.
2. feature (6-10 seeds) - A keyword variation for each distinct feature mentioned. Extract every feature from the description and create a searchable phrase for each.
3. problem (5-8 seeds) - Pain points and "how to" queries that this product solves. What frustration leads someone to need this tool? Include the specific task they're struggling with.
4. audience (4-6 seeds) - Keywords that identify the target user by role, job title, or industry. Who buys this? "[role] tools", "[industry] software", etc.
5. competitor_brand (5-8 seeds) - Names of DIRECT competitors that solve the same specific problem. Search your knowledge thoroughly. These must be real products, not general-purpose tools. If unsure, use the product's category to infer likely competitors.
6. competitor_alt (4-6 seeds) - "[competitor] alternative", "[competitor] vs [this product category]", "best [product category]" comparison queries. Use the competitors from category 5.
7. use_case (4-6 seeds) - Specific scenarios or workflows where this product is needed. "[task] tool", "how to [accomplish goal] faster", "[specific workflow] automation".
8. niche (3-5 seeds) - Industry-specific or sub-niche terms. What vertical or specialty does this product serve?
9. benefit (4-6 seeds) - Outcome-focused keywords. "save time [doing X]", "increase [metric]", "automate [task]", "best tool for [result]".
10. adjacent (3-5 seeds) - Related topics that the same target audience also searches for. Complementary tools, related workflows, adjacent needs.

Return JSON format:
{
  "productLabel": "3-5 word descriptive label for this product",
  "seeds": [
    { "keyword": "example keyword", "category": "direct" },
    ...
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI seed response');

  const parsed = JSON.parse(jsonMatch[0]);
  const productLabel = parsed.productLabel || 'Keyword Research';
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
    const boostSeeds = await boostWeakCategories(model, description, url, productLabel, weakCategories);
    allSeeds = [...allSeeds, ...boostSeeds];
    functions.logger.info(`Multi-pass: added ${boostSeeds.length} additional seeds`);
  }

  // Top 10 seeds for autocomplete expansion (highest-value, broadest terms)
  const topSeeds = allSeeds
    .filter((s: any) => ['direct', 'feature', 'problem'].includes(s.category))
    .slice(0, 10)
    .map((s: any) => s.keyword);

  return { allSeeds, topSeeds, productLabel };
}

/**
 * Multi-pass: re-prompt Gemini for categories that had fewer than 3 seeds
 */
async function boostWeakCategories(
  model: any,
  description: string,
  url: string | undefined,
  productLabel: string,
  weakCategories: string[],
): Promise<{ keyword: string; category: string; source: string }[]> {
  const categoryInstructions: Record<string, string> = {
    competitor_brand: `Find 5-8 DIRECT competitors to "${productLabel}". These must be real products/tools that solve the same specific problem. Think: what would someone use INSTEAD of this product? Search your knowledge thoroughly for tools in this exact niche.`,
    competitor_alt: `Generate 5-8 "alternative to" and comparison queries. Use format: "[competitor name] alternative", "best [product type]", "[product type] comparison", "[competitor] vs [competitor]". Focus on competitors that a buyer would compare.`,
    problem: `Generate 5-8 pain-point and "how to" queries that would lead someone to discover this product. What specific frustrations, tasks, or questions does this product solve? Think: what is the user struggling with BEFORE they find this tool?`,
    use_case: `Generate 5-8 specific use-case scenarios. When exactly does someone need this product? What workflow or task triggers the need? Include "[task] tool", "[workflow] automation", "how to [accomplish specific goal]".`,
    benefit: `Generate 5-8 outcome-focused keywords. What results does this product deliver? "save time [doing X]", "increase [metric]", "automate [specific task]", "best way to [achieve result]".`,
  };

  const categoryList = weakCategories
    .map((cat) => `- ${cat}: ${categoryInstructions[cat] || 'Generate 5 relevant keywords'}`)
    .join('\n');

  const prompt = `You previously generated keyword seeds for this product but some categories were too weak. Generate additional seeds ONLY for the categories listed below.

Product: "${productLabel}"
${description ? `Description: "${description.substring(0, 500)}"` : ''}
${url ? `URL: ${url}` : ''}

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
  description: string,
  mode: SearchMode,
  budget?: number,
): Promise<{
  keywords: KeywordResult[];
  categories: CategorySummary[];
  conceptReport?: ConceptReport;
}> {
  // Score each keyword
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

  // Generate concept report if in concept mode
  let conceptReport: ConceptReport | undefined;
  if (mode === 'concept') {
    conceptReport = await generateConceptReport(scored, description, budget);
  }

  return { keywords: scored, categories, conceptReport };
}

async function generateConceptReport(
  keywords: KeywordResult[],
  description: string,
  budget?: number,
): Promise<ConceptReport> {
  const totalVolume = keywords.reduce((sum, k) => sum + k.avgMonthlySearches, 0);
  const avgCpc = keywords.reduce((sum, k) => sum + (k.lowCpc + k.highCpc) / 2, 0) / keywords.length;
  const lowComp = keywords.filter((k) => k.competition === 'LOW').length;
  const medComp = keywords.filter((k) => k.competition === 'MEDIUM').length;
  const highComp = keywords.filter((k) => k.competition === 'HIGH').length;
  const quickWins = keywords.filter((k) => k.adScore >= 75).length;
  const contentPlays = keywords.filter((k) => k.seoScore >= 60 && k.adScore < 75).length;
  const goldmines = keywords.filter((k) => (k.lowCpc + k.highCpc) / 2 < 1 && k.avgMonthlySearches >= 100).length;
  const expensive = keywords.filter((k) => k.adScore < 30).length;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a market analyst. Based on keyword research data, write a brief verdict (2-3 sentences) for this business concept.

Concept: "${description}"
Total keywords found: ${keywords.length}
Total addressable monthly searches: ${totalVolume.toLocaleString()}
Average CPC: $${avgCpc.toFixed(2)}
Competition: ${lowComp} LOW, ${medComp} MEDIUM, ${highComp} HIGH
Quick win keywords (score 75+): ${quickWins}
Ad goldmines (< $1 CPC, 100+ vol): ${goldmines}

Give a demand score 0-100 and a short verdict. Return ONLY JSON:
{
  "demandScore": 78,
  "verdict": "Your verdict here",
  "relatedNiches": [
    { "name": "related niche name", "volume": 1000, "cpc": 0.50 }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { demandScore: 50, verdict: 'Analysis unavailable', relatedNiches: [] };

  const report: ConceptReport = {
    demandScore: parsed.demandScore,
    totalAddressableSearches: totalVolume,
    competitionAssessment: `${Math.round(lowComp / keywords.length * 100)}% LOW, ${Math.round(medComp / keywords.length * 100)}% MEDIUM, ${Math.round(highComp / keywords.length * 100)}% HIGH`,
    opportunityBreakdown: {
      quickWins,
      contentOpportunities: contentPlays,
      adGoldmines: goldmines,
      expensiveSaturated: expensive,
    },
    relatedNiches: parsed.relatedNiches || [],
    verdict: parsed.verdict,
  };

  if (budget) {
    const affordable = keywords.filter((k) => {
      const avgCpc = (k.lowCpc + k.highCpc) / 2;
      const dailyBudget = budget / 30;
      return avgCpc > 0 && dailyBudget / avgCpc >= 10;
    }).length;
    const affordableGoldmines = keywords.filter((k) => {
      const avgCpc = (k.lowCpc + k.highCpc) / 2;
      const dailyBudget = budget / 30;
      return k.adScore >= 80 && avgCpc > 0 && dailyBudget / avgCpc >= 10;
    }).length;

    report.budgetAnalysis = {
      affordableKeywords: affordable,
      totalKeywords: keywords.length,
      affordableGoldmines,
      bestValueKeyword: keywords.filter((k) => k.adScore >= 80)[0]?.keyword || 'N/A',
      budgetVerdict: affordable > keywords.length * 0.3
        ? 'Strong ROI potential — many goldmine keywords are affordable at this budget level'
        : 'Budget is tight — focus on the top goldmine keywords for maximum impact',
    };
  }

  return report;
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
