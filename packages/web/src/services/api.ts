import type { SearchResult, SeoAuditResult } from '@jackpotkeywords/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/demo-jackpotkeywords/us-central1/api';

async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function initUser(token: string, attribution?: any) {
  return apiFetch('/api/auth/init', token, {
    method: 'POST',
    body: attribution ? JSON.stringify({ attribution }) : undefined,
  });
}

export async function runSearch(
  token: string | null,
  params: { description: string; url?: string; budget?: number; location?: string },
): Promise<SearchResult> {
  return apiFetch('/api/search', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSearchResult(token: string, searchId: string): Promise<SearchResult> {
  return apiFetch(`/api/search/${searchId}`, token);
}

export async function listSearches(token: string) {
  return apiFetch('/api/search', token);
}

export async function claimSearch(token: string): Promise<{ paid: boolean }> {
  return apiFetch('/api/search/claim', token, { method: 'POST' });
}

export async function saveSearch(
  token: string,
  data: {
    query: string;
    productLabel?: string;
    url?: string;
    budget?: number;
    keywords: any[];
    categories?: any[];
    clusters?: any[];
    marketIntelligence?: any;
    metadata?: any;
  },
): Promise<{ id: string }> {
  return apiFetch('/api/search/save', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function forecastKeywords(
  token: string,
  keywords: { keyword: string; lowCpc?: number; highCpc?: number; avgMonthlySearches?: number }[],
  dailyBudget: number,
) {
  return apiFetch('/api/search/forecast', token, {
    method: 'POST',
    body: JSON.stringify({ keywords, dailyBudget }),
  });
}

export async function scoreKeywordRelevance(
  keywords: string[],
  context: any,
): Promise<{ scores: Record<string, number> }> {
  return apiFetch('/api/search/score-relevance', null, {
    method: 'POST',
    body: JSON.stringify({ keywords, context }),
  });
}

export async function nameClusters(
  clusters: any[],
): Promise<{ clusters: any[] }> {
  return apiFetch('/api/search/name-clusters', null, {
    method: 'POST',
    body: JSON.stringify({ clusters }),
  });
}

export async function expandResults(
  token: string,
  data: {
    topSeeds: string[];
    existingKeywords: string[];
    productContext: any;
    budget?: number;
  },
): Promise<{ keywords: any[]; clusters: any[]; platforms: string[]; expandedCount: number }> {
  return apiFetch('/api/search/expand', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refineSearch(
  token: string,
  searchId: string,
  input: string,
  category: string,
): Promise<{ added: number; refineCount: number; keywords: any[] }> {
  return apiFetch(`/api/search/${searchId}/refine`, token, {
    method: 'POST',
    body: JSON.stringify({ input, category }),
  });
}

export async function runSeoAudit(
  token: string | null,
  params: { url: string },
): Promise<SeoAuditResult> {
  return apiFetch('/api/audit', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function claimAudit(token: string): Promise<{ paid: boolean }> {
  return apiFetch('/api/audit/claim', token, { method: 'POST' });
}
