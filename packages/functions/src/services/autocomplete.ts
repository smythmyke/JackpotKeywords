import * as functions from 'firebase-functions';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search';

interface AutocompleteResult {
  keyword: string;
  source: 'autocomplete';
  parentSeed?: string;
}

/**
 * Step 2: Expand seed keywords via Google Autocomplete
 * Top 10 seeds get full a-z expansion, rest get raw suggestions only
 * Now tracks parent seed for category inheritance
 */
export async function expandAutocomplete(
  topSeeds: string[],
): Promise<AutocompleteResult[]> {
  const results = new Map<string, AutocompleteResult>();

  // Top 10 seeds: full a-z expansion
  const topExpansions = topSeeds.slice(0, 10);
  const restSeeds = topSeeds.slice(10);

  // Batch a-z queries for top seeds
  for (const seed of topExpansions) {
    // Raw suggestion (no suffix)
    const rawSuggestions = await fetchSuggestions(seed);
    for (const s of rawSuggestions) {
      const key = s.toLowerCase().trim();
      if (!results.has(key)) {
        results.set(key, { keyword: s, source: 'autocomplete', parentSeed: seed });
      }
    }

    // A-Z expansion
    for (const letter of ALPHABET) {
      try {
        const suggestions = await fetchSuggestions(`${seed} ${letter}`);
        for (const s of suggestions) {
          const key = s.toLowerCase().trim();
          if (!results.has(key)) {
            results.set(key, { keyword: s, source: 'autocomplete', parentSeed: seed });
          }
        }
      } catch {
        // Rate limited, skip this letter
      }

      // Small delay to avoid rate limiting
      await sleep(50);
    }
  }

  // Rest: raw suggestions only
  for (const seed of restSeeds) {
    try {
      const suggestions = await fetchSuggestions(seed);
      for (const s of suggestions) {
        const key = s.toLowerCase().trim();
        if (!results.has(key)) {
          results.set(key, { keyword: s, source: 'autocomplete', parentSeed: seed });
        }
      }
    } catch {
      // Skip on error
    }
    await sleep(50);
  }

  functions.logger.info(`Autocomplete expanded: ${results.size} unique keywords`);
  return Array.from(results.values());
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const url = `${SUGGEST_URL}?client=firefox&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    throw new Error(`Autocomplete request failed: ${response.status}`);
  }

  const data: any = await response.json();
  // Response format: ["query", ["suggestion1", "suggestion2", ...]]
  return (data[1] || []) as string[];
}

/**
 * Discover competitors via autocomplete suggestions
 * Searches for "[product type] alternative", "best [product type]", "[product type] vs"
 */
export async function discoverCompetitors(
  productLabel: string,
  existingSeeds: { keyword: string; category: string; source: string }[],
): Promise<{ keyword: string; category: string; source: string }[]> {
  const results: { keyword: string; category: string; source: string }[] = [];
  const seen = new Set(existingSeeds.map((s) => s.keyword.toLowerCase().trim()));

  // Get direct category seeds for query building
  const directSeeds = existingSeeds
    .filter((s) => s.category === 'direct')
    .slice(0, 3)
    .map((s) => s.keyword);

  const queries = [
    `${productLabel} alternative`,
    `${productLabel} vs`,
    `best ${productLabel}`,
    ...directSeeds.map((s) => `${s} alternative`),
    ...directSeeds.map((s) => `best ${s}`),
    ...directSeeds.map((s) => `${s} vs`),
  ];

  for (const query of queries) {
    try {
      const suggestions = await fetchSuggestions(query);
      for (const s of suggestions) {
        const key = s.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          // Determine if it's a competitor_alt or competitor_brand
          const isAlt = /alternative|vs |versus|compared|better than|instead of|switch from/.test(key);
          results.push({
            keyword: s,
            category: isAlt ? 'competitor_alt' : 'competitor_brand',
            source: 'autocomplete',
          });
        }
      }
    } catch {
      // Skip on error
    }
    await sleep(50);
  }

  functions.logger.info(`Competitor discovery: found ${results.length} keywords from ${queries.length} queries`);
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
