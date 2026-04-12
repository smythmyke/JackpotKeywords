export type SeoAuditCategory =
  | 'technical'
  | 'content'
  | 'local_geo'
  | 'structured_data'
  | 'crawlability'
  | 'social_sharing';

export const SEO_AUDIT_CATEGORY_LABELS: Record<SeoAuditCategory, string> = {
  technical: 'Technical Foundation',
  content: 'Content Structure',
  local_geo: 'Local & Geo SEO',
  structured_data: 'Structured Data',
  crawlability: 'Crawlability & Bot Access',
  social_sharing: 'Social & Sharing',
};

export const SEO_AUDIT_CATEGORY_WEIGHTS: Record<SeoAuditCategory, number> = {
  technical: 25,
  content: 20,
  crawlability: 20,
  structured_data: 15,
  local_geo: 10,
  social_sharing: 10,
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
}

export interface SeoAuditRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'significant';
  category: SeoAuditCategory;
}

export interface SeoAuditResult {
  id: string;
  url: string;
  domain: string;
  createdAt: string;
  paid: boolean;
  overallScore: number;
  categoryScores: Record<SeoAuditCategory, { score: number; passed: number; total: number }>;
  checks: SeoAuditCheckItem[];
  pageResults: SeoAuditPageResult[];
  keywordGaps: SeoAuditKeywordGap[];
  recommendations: SeoAuditRecommendation[];
  metadata: {
    pagesAnalyzed: number;
    executionTimeMs: number;
  };
}
