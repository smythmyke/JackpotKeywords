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
}

/**
 * Step 1: Generate keyword seeds across 10 intent categories
 */
export async function generateSeeds(
  description: string,
  url: string | undefined,
  mode: SearchMode,
): Promise<SeedResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = mode === 'concept'
    ? `You are a market research analyst. Analyze this business concept and generate keyword seeds to assess market demand and competition.

Business concept: "${description}"
${url ? `URL: ${url}` : ''}

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
  "seeds": [
    { "keyword": "example keyword", "category": "direct" },
    ...
  ]
}`
    : `You are an expert keyword researcher. Generate keyword seeds for this product/service to find advertising and SEO opportunities.

Product/service: "${description}"
${url ? `URL: ${url}` : ''}

Generate 40-65 keyword seeds across these 10 categories. Return ONLY valid JSON, no markdown.

Categories:
1. direct - Short head terms describing the product category (3-5 seeds)
2. feature - Keywords for each specific feature (5-10 seeds)
3. problem - How-to queries and pain-point searches (5-8 seeds)
4. audience - Keywords identifying the target user (3-5 seeds)
5. competitor_brand - Names of competing products/services (5-10 seeds)
6. competitor_alt - "X alternative", "vs", "best" comparison terms (3-5 seeds)
7. use_case - Specific scenarios when the product is needed (3-5 seeds)
8. niche - Sub-niche and industry-specific terms (3-5 seeds)
9. benefit - Result/outcome-focused keywords (3-5 seeds)
10. adjacent - Related topics that attract the same audience (3-5 seeds)

Return JSON format:
{
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
  const allSeeds = parsed.seeds.map((s: any) => ({
    keyword: s.keyword,
    category: s.category,
    source: 'ai' as const,
  }));

  // Top 10 seeds for autocomplete expansion (highest-value, broadest terms)
  const topSeeds = allSeeds
    .filter((s: any) => ['direct', 'feature', 'problem'].includes(s.category))
    .slice(0, 10)
    .map((s: any) => s.keyword);

  return { allSeeds, topSeeds };
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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
