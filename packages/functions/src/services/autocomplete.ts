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

  const topExpansions = topSeeds.slice(0, 10);
  const restSeeds = topSeeds.slice(10);

  // Process all seeds in parallel — each seed expands a-z concurrently
  const seedResults = await Promise.allSettled(
    topExpansions.map(async (seed) => {
      const seedHits: AutocompleteResult[] = [];

      // Build all queries for this seed: raw + a-z
      const queries = [seed, ...ALPHABET.map((l) => `${seed} ${l}`)];

      // Run all 27 queries in groups of 9 to avoid overwhelming
      for (let i = 0; i < queries.length; i += 9) {
        const group = queries.slice(i, i + 9);
        const settled = await Promise.allSettled(
          group.map((q) => fetchSuggestions(q)),
        );
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            for (const s of result.value) {
              seedHits.push({ keyword: s, source: 'autocomplete', parentSeed: seed });
            }
          }
        }
        if (i + 9 < queries.length) await sleep(100);
      }
      return seedHits;
    }),
  );

  for (const result of seedResults) {
    if (result.status === 'fulfilled') {
      for (const hit of result.value) {
        const key = hit.keyword.toLowerCase().trim();
        if (!results.has(key)) results.set(key, hit);
      }
    }
  }

  // Rest: raw suggestions in parallel
  if (restSeeds.length > 0) {
    const restResults = await Promise.allSettled(
      restSeeds.map((seed) => fetchSuggestions(seed).then((suggestions) =>
        suggestions.map((s) => ({ keyword: s, source: 'autocomplete' as const, parentSeed: seed }))
      )),
    );
    for (const result of restResults) {
      if (result.status === 'fulfilled') {
        for (const hit of result.value) {
          const key = hit.keyword.toLowerCase().trim();
          if (!results.has(key)) results.set(key, hit);
        }
      }
    }
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
  const seen = new Set(existingSeeds.filter((s) => s.keyword && typeof s.keyword === 'string').map((s) => s.keyword.toLowerCase().trim()));

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

// ---- Multi-platform autocomplete for Expand Results ----

type ExpandPlatform = 'youtube' | 'amazon' | 'ebay' | 'bing' | 'duckduckgo' | 'pinterest';

interface ExpandResult {
  keyword: string;
  source: ExpandPlatform;
  parentSeed?: string;
}

async function fetchYouTubeSuggestions(query: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const data: any = await res.json();
  return (data[1] || []) as string[];
}

async function fetchAmazonSuggestions(query: string): Promise<string[]> {
  const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=aps&prefix=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.suggestions || []).map((s: any) => s.value).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchEbaySuggestions(query: string): Promise<string[]> {
  const url = `https://autosug.ebay.com/autosug?kwd=${encodeURIComponent(query)}&sId=0&fmt=osr`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.res?.sug || []) as string[];
  } catch {
    return [];
  }
}

async function fetchBingSuggestions(query: string): Promise<string[]> {
  const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}&Market=en-US`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data[1] || []) as string[];
  } catch {
    return [];
  }
}

async function fetchDuckDuckGoSuggestions(query: string): Promise<string[]> {
  const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data[1] || []) as string[];
  } catch {
    return [];
  }
}

async function fetchPinterestSuggestions(query: string): Promise<string[]> {
  const options = JSON.stringify({ options: { pin_scope: 'pins', count: 5, term: query, no_fetch_context_on_resource: false }, context: null });
  const url = `https://www.pinterest.com/resource/AdvancedTypeaheadResource/get/?source_url=/&data=${encodeURIComponent(options)}&_=${Date.now()}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Pinterest-PWS-Handler': 'www/index.js' },
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const items = data?.resource_response?.data?.items || [];
    return items.filter((i: any) => i.type === 'query').map((i: any) => i.query).filter(Boolean);
  } catch {
    return [];
  }
}

const PLATFORM_FETCHERS: Record<ExpandPlatform, (q: string) => Promise<string[]>> = {
  youtube: fetchYouTubeSuggestions,
  amazon: fetchAmazonSuggestions,
  ebay: fetchEbaySuggestions,
  bing: fetchBingSuggestions,
  duckduckgo: fetchDuckDuckGoSuggestions,
  pinterest: fetchPinterestSuggestions,
};

/**
 * Select which platforms to expand to based on product type.
 * Digital/SaaS = YouTube + Bing + DuckDuckGo
 * Visual/design = YouTube + Bing + DuckDuckGo + Pinterest
 * Physical/ecommerce = YouTube + Amazon + eBay + Bing
 * Default = YouTube + Bing + DuckDuckGo
 */
export function selectExpandPlatforms(context: { whatItDoes: string; industryNiche: string[]; keyFeatures: string[] }): ExpandPlatform[] {
  const text = [context.whatItDoes, ...context.industryNiche, ...context.keyFeatures].join(' ').toLowerCase();
  const isDigital = /\b(software|saas|app|api|platform|tool|dashboard|plugin|extension|online|cloud|web)\b/.test(text);
  const isPhysical = /\b(buy|ship|physical|handmade|product|store|shop|retail|wholesale|inventory)\b/.test(text);
  const isVisual = /\b(image|photo|design|visual|graphic|screenshot|template|banner|mockup|logo)\b/.test(text);

  if (isPhysical && !isDigital) return ['youtube', 'amazon', 'ebay', 'bing'];
  if (isVisual) return ['youtube', 'bing', 'duckduckgo', 'pinterest'];
  if (isDigital) return ['youtube', 'bing', 'duckduckgo'];
  return ['youtube', 'bing', 'duckduckgo'];
}

/**
 * Expand keywords via YouTube, Amazon, and/or eBay autocomplete.
 * Takes top seeds, queries each platform, deduplicates.
 */
export async function expandAutocompleteMultiPlatform(
  topSeeds: string[],
  platforms: ExpandPlatform[],
): Promise<ExpandResult[]> {
  const results = new Map<string, ExpandResult>();
  const seeds = topSeeds.slice(0, 8);

  for (const platform of platforms) {
    const fetcher = PLATFORM_FETCHERS[platform];
    const settled = await Promise.allSettled(
      seeds.map(async (seed) => {
        const suggestions = await fetcher(seed);
        return suggestions.map((s) => ({ keyword: s, source: platform as ExpandPlatform, parentSeed: seed }));
      }),
    );
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        for (const hit of result.value) {
          const key = hit.keyword.toLowerCase().trim();
          if (!results.has(key)) results.set(key, hit);
        }
      }
    }
    await sleep(100);
  }

  functions.logger.info(`Multi-platform expand: ${results.size} unique keywords from ${platforms.join(', ')}`);
  return Array.from(results.values());
}
