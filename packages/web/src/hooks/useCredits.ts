import { useCallback } from 'react';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS, type CreditPack, type SubscriptionPlan } from '@jackpotkeywords/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UseCreditsOptions {
  getToken: () => Promise<string | null>;
  refreshCredits: () => Promise<void>;
}

export function useCredits({ getToken, refreshCredits }: UseCreditsOptions) {
  const authedFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    },
    [getToken],
  );

  const buyCreditPack = useCallback(
    async (packId: CreditPack['id']) => {
      const res = await authedFetch('/api/stripe/create-credit-checkout', {
        method: 'POST',
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) throw new Error('Failed to create checkout');
      const { url } = await res.json();
      window.location.href = url;
    },
    [authedFetch],
  );

  const subscribe = useCallback(
    async (planId: SubscriptionPlan['id']) => {
      const res = await authedFetch('/api/stripe/create-subscription-checkout', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error('Failed to create checkout');
      const { url } = await res.json();
      window.location.href = url;
    },
    [authedFetch],
  );

  return {
    creditPacks: CREDIT_PACKS,
    subscriptionPlans: SUBSCRIPTION_PLANS,
    buyCreditPack,
    subscribe,
    refreshCredits,
  };
}
