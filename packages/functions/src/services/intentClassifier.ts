import type { SearchIntent, KeywordCategory } from '@jackpotkeywords/shared';

const NAVIGATIONAL_PATTERNS = /\b(login|log in|sign in|signin|website|\.com|\.org|\.net|\.io)\b/;
const TRANSACTIONAL_PATTERNS = /\b(buy|purchase|price|pricing|discount|coupon|deal|cheap|order|subscribe|free trial|download|sign up|signup|get started|install)\b/;
const COMMERCIAL_PATTERNS = /\b(best|top \d|review|reviews|vs|versus|compare|comparison|alternative|alternatives|worth it|which|recommend|rated)\b/;
const INFORMATIONAL_PATTERNS = /\b(how to|how do|how can|what is|what are|why|guide|tutorial|tips|learn|example|examples|definition|explain|meaning|difference between|fix|troubleshoot|solve|issue|error|not working)\b/;

const CATEGORY_INTENT_DEFAULTS: Partial<Record<KeywordCategory, SearchIntent>> = {
  competitor_brand: 'navigational',
  competitor_alt: 'commercial',
  problem: 'informational',
  benefit: 'commercial',
  adjacent: 'informational',
};

/**
 * Rule-based search intent classifier.
 * Evaluates keyword text against pattern rules, falls back to category hint.
 */
export function classifyIntent(keyword: string, category?: KeywordCategory): SearchIntent {
  const lower = keyword.toLowerCase();

  // Check patterns in order of specificity
  if (INFORMATIONAL_PATTERNS.test(lower)) return 'informational';
  if (TRANSACTIONAL_PATTERNS.test(lower)) return 'transactional';
  if (COMMERCIAL_PATTERNS.test(lower)) return 'commercial';
  if (NAVIGATIONAL_PATTERNS.test(lower)) return 'navigational';

  // Fall back to category-based defaults
  if (category && CATEGORY_INTENT_DEFAULTS[category]) {
    return CATEGORY_INTENT_DEFAULTS[category]!;
  }

  return 'commercial';
}
