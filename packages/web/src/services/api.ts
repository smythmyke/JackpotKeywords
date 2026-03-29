import type { SearchResult } from '@jackpotkeywords/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/demo-jackpotkeywords/us-central1/api';

async function authedFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function initUser(token: string) {
  return authedFetch('/api/auth/init', token, { method: 'POST' });
}

export async function runSearch(
  token: string,
  params: { description: string; url?: string; mode: 'keyword' | 'concept'; budget?: number },
): Promise<SearchResult> {
  return authedFetch('/api/search', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSearchResult(token: string, searchId: string): Promise<SearchResult> {
  return authedFetch(`/api/search/${searchId}`, token);
}

export async function listSearches(token: string) {
  return authedFetch('/api/search', token);
}
