import type { KeywordResult, KeywordCategory, KeywordCluster, SearchIntent } from '@jackpotkeywords/shared';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'my', 'your', 'do', 'you',
  'i', 'me', 'we', 'can', 'how', 'what', 'why', 'when', 'where', 'which',
]);

/**
 * Extract significant words from a keyword (lowercase, no stop words, 2+ chars)
 */
function getSignificantWords(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Check if two keywords are similar enough to cluster together.
 * Similar if they share 2+ significant words or one is a substring of the other.
 */
function areSimilar(wordsA: string[], wordsB: string[], kwA: string, kwB: string): boolean {
  // Substring check
  const a = kwA.toLowerCase();
  const b = kwB.toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap check
  const setB = new Set(wordsB);
  let shared = 0;
  for (const w of wordsA) {
    if (setB.has(w)) shared++;
    if (shared >= 2) return true;
  }
  return false;
}

/**
 * Get the most common intent from a list of keywords
 */
function getDominantIntent(keywords: KeywordResult[]): SearchIntent {
  const counts: Record<string, number> = {};
  for (const kw of keywords) {
    const intent = kw.intent || 'commercial';
    counts[intent] = (counts[intent] || 0) + 1;
  }
  let best = 'commercial';
  let bestCount = 0;
  for (const [intent, count] of Object.entries(counts)) {
    if (count > bestCount) { best = intent; bestCount = count; }
  }
  return best as SearchIntent;
}

/**
 * Cluster keywords across all categories using word-overlap grouping.
 * Returns clusters with computed metadata (no names yet — naming is done by Gemini).
 */
export function clusterKeywords(keywords: KeywordResult[]): KeywordCluster[] {
  // Group keywords by category
  const byCategory = new Map<KeywordCategory, KeywordResult[]>();
  for (const kw of keywords) {
    const cat = kw.category as KeywordCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(kw);
  }

  const allClusters: KeywordCluster[] = [];
  let clusterId = 0;

  for (const [category, catKeywords] of byCategory) {
    // Pre-compute significant words for each keyword
    const wordMap = new Map<string, string[]>();
    for (const kw of catKeywords) {
      wordMap.set(kw.keyword, getSignificantWords(kw.keyword));
    }

    // Sort by adScore descending so highest-scoring keywords seed clusters
    const sorted = [...catKeywords].sort((a, b) => b.adScore - a.adScore);
    const assigned = new Set<string>();
    const categoryClusters: { keywords: KeywordResult[] }[] = [];

    for (const kw of sorted) {
      if (assigned.has(kw.keyword)) continue;

      // Start a new cluster with this keyword as seed
      const cluster: KeywordResult[] = [kw];
      assigned.add(kw.keyword);
      const seedWords = wordMap.get(kw.keyword) || [];

      // Find all unassigned keywords similar to any keyword in the cluster
      let changed = true;
      while (changed) {
        changed = false;
        for (const candidate of sorted) {
          if (assigned.has(candidate.keyword)) continue;
          const candidateWords = wordMap.get(candidate.keyword) || [];

          // Check similarity against any keyword already in the cluster
          for (const member of cluster) {
            const memberWords = wordMap.get(member.keyword) || [];
            if (areSimilar(memberWords, candidateWords, member.keyword, candidate.keyword)) {
              cluster.push(candidate);
              assigned.add(candidate.keyword);
              changed = true;
              break;
            }
          }
        }
      }

      categoryClusters.push({ keywords: cluster });
    }

    // Merge singletons into an "Other" cluster
    const singletons: KeywordResult[] = [];
    const realClusters: { keywords: KeywordResult[] }[] = [];
    for (const c of categoryClusters) {
      if (c.keywords.length === 1) {
        singletons.push(c.keywords[0]);
      } else {
        realClusters.push(c);
      }
    }
    if (singletons.length > 0) {
      realClusters.push({ keywords: singletons });
    }

    // Cap at 20 clusters per category (merge smallest into "Other" if needed)
    const MAX_CLUSTERS = 20;
    if (realClusters.length > MAX_CLUSTERS) {
      realClusters.sort((a, b) => b.keywords.length - a.keywords.length);
      const keep = realClusters.slice(0, MAX_CLUSTERS - 1);
      const overflow = realClusters.slice(MAX_CLUSTERS - 1);
      const mergedOverflow: KeywordResult[] = [];
      for (const c of overflow) mergedOverflow.push(...c.keywords);
      keep.push({ keywords: mergedOverflow });
      realClusters.length = 0;
      realClusters.push(...keep);
    }

    // Build KeywordCluster objects with metadata
    for (const c of realClusters) {
      const totalVolume = c.keywords.reduce((sum, k) => sum + k.avgMonthlySearches, 0);
      const avgCpc = c.keywords.reduce((sum, k) => sum + (k.lowCpc + k.highCpc) / 2, 0) / c.keywords.length;
      const bestAdScore = Math.max(...c.keywords.map((k) => k.adScore));
      const bestSeoScore = Math.max(...c.keywords.map((k) => k.seoScore));

      allClusters.push({
        id: `cluster-${clusterId++}`,
        name: `Cluster ${clusterId}`, // Placeholder, Gemini will name these
        category,
        keywordKeys: c.keywords.map((k) => k.keyword),
        totalVolume,
        avgCpc: Math.round(avgCpc * 100) / 100,
        bestAdScore,
        bestSeoScore,
        dominantIntent: getDominantIntent(c.keywords),
        isJackpot: bestAdScore >= 75 || bestSeoScore >= 75,
      });
    }
  }

  return allClusters;
}
