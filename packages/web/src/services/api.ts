import type { SearchResult, SeoAuditResult, MiniKeywordResult, AeoResult, ProductContext, IdeaBoard } from '@jackpotkeywords/shared';
import { getAnonId } from '../lib/anonId';
import { isAdminDisabled } from '../lib/adminMode';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/demo-jackpotkeywords/us-central1/api';

async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Anon-Id': getAnonId(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Admin testing bypass — forward via header (primary), query param (fallback),
  // and body field for POSTs (belt-and-suspenders). Any proxy that strips the
  // header can't also strip the URL and body.
  let bypass: string | null = null;
  try {
    bypass = localStorage.getItem('jk_admin_bypass');
  } catch {
    // ignore storage failures
  }
  if (bypass) headers['X-Admin-Bypass'] = bypass;

  // Admin "preview as free user" toggle. When set, server skips all admin
  // bypass paths for this request so the admin sees exactly what a regular
  // free-plan user would see (paywalls, credit deductions, masked keywords).
  if (isAdminDisabled()) headers['X-Disable-Admin'] = '1';

  let finalPath = path;
  let finalOptions = options;
  if (bypass) {
    // Append query-param fallback
    finalPath = path.includes('?')
      ? `${path}&adminBypass=${encodeURIComponent(bypass)}`
      : `${path}?adminBypass=${encodeURIComponent(bypass)}`;
    // Merge into JSON body for POSTs that already have one
    if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body);
        finalOptions = { ...options, body: JSON.stringify({ ...parsed, adminBypass: bypass }) };
      } catch {
        // body isn't JSON, leave it alone
      }
    }
  }

  const res = await fetch(`${API_URL}${finalPath}`, {
    ...finalOptions,
    headers: { ...headers, ...(finalOptions.headers || {}) },
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
  token: string | null,
): Promise<{ scores: Record<string, number> }> {
  return apiFetch('/api/search/score-relevance', token, {
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

export async function listAudits(token: string): Promise<{ audits: any[] }> {
  return apiFetch('/api/audit', token);
}

export async function getAuditResult(token: string, auditId: string): Promise<SeoAuditResult> {
  return apiFetch(`/api/audit/${auditId}`, token);
}

export async function fetchAuditKeywords(
  token: string | null,
  auditId: string,
): Promise<{ keywordPreview: MiniKeywordResult[] | null; paid: boolean; cached: boolean }> {
  return apiFetch(`/api/audit/${auditId}/keywords`, token, { method: 'POST' });
}

export async function generateIdeaBoardApi(
  token: string,
  params: { searchId: string },
): Promise<IdeaBoard> {
  return apiFetch('/api/ideas/generate', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listIdeaBoards(
  token: string,
): Promise<{ boards: IdeaBoard[] }> {
  return apiFetch('/api/ideas', token);
}

export async function toggleIdeaItem(
  token: string,
  boardId: string,
  itemId: string,
  completed?: boolean,
): Promise<{ id: string; completed: boolean }> {
  return apiFetch(`/api/ideas/${boardId}/items/${itemId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function runAeoScan(
  token: string,
  params: { searchId?: string; productContext?: ProductContext; domain?: string },
): Promise<AeoResult & { id: string }> {
  return apiFetch('/api/aeo-scan', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
