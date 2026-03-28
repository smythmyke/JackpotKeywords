export type SearchMode = 'keyword' | 'concept';

export type KeywordCategory =
  | 'direct'
  | 'feature'
  | 'problem'
  | 'audience'
  | 'competitor_brand'
  | 'competitor_alt'
  | 'use_case'
  | 'niche'
  | 'benefit'
  | 'adjacent';

export type KeywordSource = 'ai' | 'autocomplete' | 'planner_related';
export type TrendDirection = 'rising' | 'rising_slight' | 'stable' | 'declining_slight' | 'declining';
export type CompetitionLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED';
export type OpportunityType = 'quick_win' | 'long_term_seo' | 'ad_goldmine' | 'content_play' | 'expensive';
export type BudgetFit = 'great' | 'tight' | 'over';

export const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  direct: 'Direct / Head Terms',
  feature: 'Feature-Based',
  problem: 'Problem-Based',
  audience: 'Audience-Based',
  competitor_brand: 'Competitor Brands',
  competitor_alt: 'Competitor Alternatives',
  use_case: 'Use Case / Scenario',
  niche: 'Industry / Niche',
  benefit: 'Benefit / Outcome',
  adjacent: 'Adjacent / Tangential',
};

export interface SearchRequest {
  description: string;
  url?: string;
  mode: SearchMode;
  budget?: number;
}

export interface KeywordResult {
  keyword: string;
  category: KeywordCategory;
  source: KeywordSource;
  avgMonthlySearches: number;
  lowCpc: number;
  highCpc: number;
  competition: CompetitionLevel;
  jackpotScore: number;
  adScore: number;
  seoScore: number;
  relevance: number;
  opportunityType: OpportunityType;
  trendDirection?: TrendDirection;
  trendInfo?: string;
  budgetFit?: BudgetFit;
  clicksPerDay?: number;
  suggestion?: string;
}

export interface CategorySummary {
  category: KeywordCategory;
  label: string;
  keywordCount: number;
  avgCpc: number;
  avgVolume: number;
  topScore: number;
  competitionBreakdown: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ConceptReport {
  demandScore: number;
  totalAddressableSearches: number;
  competitionAssessment: string;
  opportunityBreakdown: {
    quickWins: number;
    contentOpportunities: number;
    adGoldmines: number;
    expensiveSaturated: number;
  };
  relatedNiches: {
    name: string;
    volume: number;
    cpc: number;
  }[];
  verdict: string;
  budgetAnalysis?: {
    affordableKeywords: number;
    totalKeywords: number;
    affordableGoldmines: number;
    bestValueKeyword: string;
    budgetVerdict: string;
  };
}

export interface SearchResult {
  id: string;
  query: string;
  url?: string;
  mode: SearchMode;
  budget?: number;
  createdAt: string;
  paid: boolean;
  keywords: KeywordResult[];
  categories: CategorySummary[];
  conceptReport?: ConceptReport;
  metadata: {
    seedCount: number;
    autocompleteCount: number;
    plannerRelatedCount: number;
    trendsOverlayCount: number;
    totalKeywords: number;
    executionTimeMs: number;
  };
}
