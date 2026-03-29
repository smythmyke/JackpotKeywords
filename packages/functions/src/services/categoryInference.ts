/**
 * Pattern-based category inference for keywords without a known category.
 * Used by autocomplete merge and Keyword Planner related keywords.
 */
export function inferCategory(keyword: string): string {
  const kw = keyword.toLowerCase();

  // Problem-based patterns
  if (/^how (to|do|can|does)|^why |^what (is|are)|troubleshoot|fix |solve |issue|problem|error|fail|broken/.test(kw)) {
    return 'problem';
  }

  // Competitor alternative patterns
  if (/alternative|vs |versus | vs$|compared to|better than|switch from|instead of|replacement/.test(kw)) {
    return 'competitor_alt';
  }

  // Benefit/outcome patterns
  if (/^best |fastest|cheapest|easiest|most efficient|save time|increase|improve|boost|reduce cost|free /.test(kw)) {
    return 'benefit';
  }

  // Use case patterns
  if (/^use |for (small|large|my|your)|when to|template|example|workflow|automate/.test(kw)) {
    return 'use_case';
  }

  // Audience patterns
  if (/for (contractors|businesses|startups|freelancer|developer|designer|marketer|manager|team|enterprise|small business)/.test(kw)) {
    return 'audience';
  }

  // Feature patterns
  if (/tool|software|app|platform|plugin|extension|dashboard|generator|builder|analyzer|tracker|manager|integration/.test(kw)) {
    return 'feature';
  }

  return 'direct';
}

/**
 * Find the best matching category from seed keywords based on word overlap.
 * Returns the category of the seed that shares the most words with the keyword.
 */
export function inferCategoryFromSeeds(
  keyword: string,
  seedLookup: Map<string, { category: string; source: string }>,
): string | null {
  const kwWords = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let bestMatch: string | null = null;
  let bestOverlap = 0;

  for (const [seedKey, seedInfo] of seedLookup) {
    const seedWords = seedKey.split(/\s+/).filter((w) => w.length > 2);
    const overlap = kwWords.filter((w) => seedWords.includes(w)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = seedInfo.category;
    }
  }

  // Require at least 2 word overlap to inherit category
  return bestOverlap >= 2 ? bestMatch : null;
}
