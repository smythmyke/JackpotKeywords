import type { SearchResult } from '@jackpotkeywords/shared';

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

export async function initUser(token: string) {
  return apiFetch('/api/auth/init', token, { method: 'POST' });
}

export async function runSearch(
  token: string | null,
  params: { description: string; url?: string; budget?: number },
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

export async function saveAnonymousResult(
  token: string,
  result: SearchResult,
): Promise<{ id: string; paid: boolean }> {
  return apiFetch('/api/search/save-anonymous', token, {
    method: 'POST',
    body: JSON.stringify({ result }),
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
