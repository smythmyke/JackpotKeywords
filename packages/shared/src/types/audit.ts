export type SeoAuditCategory =
  | 'technical'
  | 'content'
  | 'local_geo'
  | 'structured_data'
  | 'crawlability'
  | 'performance'
  | 'ai_readiness'
  | 'social_sharing';

export const SEO_AUDIT_CATEGORY_LABELS: Record<SeoAuditCategory, string> = {
  technical: 'Technical Foundation',
  content: 'Content Structure',
  local_geo: 'Local & Geo SEO',
  structured_data: 'Structured Data',
  crawlability: 'Crawlability & Indexing',
  performance: 'Performance & Core Web Vitals',
  ai_readiness: 'AI Search Readiness',
  social_sharing: 'Social & Sharing',
};

export const SEO_AUDIT_CATEGORY_WEIGHTS: Record<SeoAuditCategory, number> = {
  technical: 20,
  content: 15,
  crawlability: 20,
  structured_data: 10,
  performance: 15,
  ai_readiness: 10,
  local_geo: 5,
  social_sharing: 5,
};

export const SEO_AUDIT_CATEGORY_DESCRIPTIONS: Record<SeoAuditCategory, string> = {
  technical: 'Core HTML elements that help search engines understand your pages',
  content: 'How well your site\'s pages cover topics with enough depth',
  crawlability: 'Whether search engines can find, read, and index your pages',
  structured_data: 'Special code that helps Google show rich results like ratings and FAQs',
  performance: 'Page speed and Core Web Vitals (LCP, CLS) — a Google ranking factor',
  ai_readiness: 'Whether AI answer engines (ChatGPT, Perplexity, Gemini) can access and cite your site',
  local_geo: 'Signals that help your site appear in local map and city-based searches',
  social_sharing: 'How your pages look when shared on Facebook, Twitter, and other platforms',
};

export interface SeoAuditCheckItem {
  id: string;
  category: SeoAuditCategory;
  label: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  details: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SeoAuditPageResult {
  url: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  wordCount?: number;
  issues: SeoAuditCheckItem[];
}

export interface SeoAuditKeywordGap {
  keyword: string;
  opportunity: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sampleKeywords?: string[];
}

export interface SeoAuditRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'significant';
  category: SeoAuditCategory;
}

export interface AeoCitation {
  url: string;
  title: string;
}

export interface AeoQuery {
  query: string;
  citations: AeoCitation[];
  productCited: boolean;
  productMentionedInAnswer: boolean;
  competitorsCited: string[];
  answerSnippet: string;
}

export interface AeoResult {
  visibilityScore: number;
  queriesChecked: number;
  queriesCited: number;
  queriesMentioned: number;
  competitorFrequency: Record<string, number>;
  queries: AeoQuery[];
  actionItems: string[];
}

export interface MiniKeywordResult {
  keyword: string;
  monthlyVolume: number;
  lowCpc: number;
  highCpc: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
}

export interface SeoAuditResult {
  id: string;
  url: string;
  domain: string;
  createdAt: string;
  paid: boolean;
  overallScore: number;
  categoryScores: Record<SeoAuditCategory, { score: number | null; passed: number; total: number }>;
  checks: SeoAuditCheckItem[];
  pageResults: SeoAuditPageResult[];
  keywordGaps: SeoAuditKeywordGap[];
  recommendations: SeoAuditRecommendation[];
  keywordPreview?: MiniKeywordResult[] | null;
  aeoResult?: AeoResult | null;
  performanceMetrics?: {
    score: number | null;
    lcp?: string;
    cls?: string;
    tbt?: string;
  } | null;
  metadata: {
    pagesAnalyzed: number;
    executionTimeMs: number;
  };
}
