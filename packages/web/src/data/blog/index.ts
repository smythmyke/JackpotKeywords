export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readTime: string;
  category: 'guide' | 'comparison' | 'use-case' | 'tutorial';
  keywords: string[];
  heroImage?: string;
  content: string;
}

// Import all posts here
import { post as whatIsKeywordResearch } from './what-is-keyword-research';
import { post as googleKeywordPlannerGuide } from './google-keyword-planner-guide';
import { post as findGoodSeoKeywords } from './find-good-seo-keywords';
import { post as findProfitableKeywords } from './find-profitable-keywords';
import { post as freeKeywordResearchTool } from './free-keyword-research-tool';
import { post as ppcKeywordResearch } from './ppc-keyword-research';
import { post as ecommerceKeywordResearch } from './ecommerce-keyword-research';
import { post as keywordResearchNewWebsite } from './keyword-research-new-website';
import { post as localSeoKeywordResearch } from './local-seo-keyword-research';
import { post as findCompetitorKeywords } from './find-competitor-keywords';
import { post as keywordResearchForEtsy } from './keyword-research-for-etsy-sellers';
import { post as keywordResearchForSaas } from './keyword-research-for-saas';
import { post as spyfuFreeAlternative } from './spyfu-free-alternative';
import { post as longtailproAlternative } from './longtailpro-alternative';
import { post as semrushOpenSourceAlternative } from './semrush-open-source-alternative';
import { post as bestKeywordResearchTool2026 } from './best-keyword-research-tool-2026';
import { post as jackpotkeywordsVsSemrush } from './jackpotkeywords-vs-semrush';
import { post as jackpotkeywordsVsAhrefs } from './jackpotkeywords-vs-ahrefs';
import { post as freeSeoAuditTool } from './free-seo-audit-tool';

export const BLOG_POSTS: BlogPost[] = [
  whatIsKeywordResearch,
  googleKeywordPlannerGuide,
  findGoodSeoKeywords,
  findProfitableKeywords,
  freeKeywordResearchTool,
  ppcKeywordResearch,
  ecommerceKeywordResearch,
  keywordResearchNewWebsite,
  localSeoKeywordResearch,
  findCompetitorKeywords,
  keywordResearchForEtsy,
  keywordResearchForSaas,
  spyfuFreeAlternative,
  longtailproAlternative,
  semrushOpenSourceAlternative,
  bestKeywordResearchTool2026,
  jackpotkeywordsVsSemrush,
  jackpotkeywordsVsAhrefs,
  freeSeoAuditTool,
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
