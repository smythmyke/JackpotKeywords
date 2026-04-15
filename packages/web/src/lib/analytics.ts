import { getAnonId } from './anonId';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/demo-jackpotkeywords/us-central1/api';

export type FunnelEvent =
  | 'paywall_viewed'
  | 'upgrade_clicked'
  | 'signin_prompted'
  | 'signin_completed'
  | 'anon_search_completed';

export function trackEvent(
  event: FunnelEvent,
  details: Record<string, string | number | boolean | null> = {},
  token?: string | null,
): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Anon-Id': getAnonId(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fire-and-forget — telemetry must not block UX
  fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, details }),
    keepalive: true,
  }).catch(() => {
    // Swallow — no retries, no error surface
  });
}
