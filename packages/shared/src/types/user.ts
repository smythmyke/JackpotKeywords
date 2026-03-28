export type UserPlan = 'free' | 'pro' | 'agency';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: UserPlan;
  stripeCustomerId?: string;
  createdAt: string;
}

export interface UserCredits {
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  freeSearchesUsed: number;
}

export const FREE_SEARCH_LIMIT = 3;

export function canSearch(credits: UserCredits, plan: UserPlan): boolean {
  if (plan === 'pro' || plan === 'agency') return true;
  if (credits.freeSearchesUsed < FREE_SEARCH_LIMIT) return true;
  if (credits.balance > 0) return true;
  return false;
}

export function isSearchPaid(credits: UserCredits, plan: UserPlan): boolean {
  if (plan === 'pro' || plan === 'agency') return true;
  if (credits.balance > 0) return true;
  return false;
}
