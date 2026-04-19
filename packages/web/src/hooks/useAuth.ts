import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { initUser } from '../services/api';
import { trackSignUp } from '../services/analytics';
import { trackEvent } from '../lib/analytics';

const ADMIN_EMAILS = ['smythmyke@gmail.com'];
const ADMIN_BYPASS_TOKEN = 'smythmyke-dev-2026-bypass';

function maybeEnableAdminBypass(email: string | null | undefined) {
  if (!email || !ADMIN_EMAILS.includes(email)) return;
  try {
    if (localStorage.getItem('jk_admin_bypass') !== ADMIN_BYPASS_TOKEN) {
      localStorage.setItem('jk_admin_bypass', ADMIN_BYPASS_TOKEN);
    }
  } catch {
    // ignore storage failures
  }
}

/**
 * Drops cached server-masked result payloads. Call on any auth/plan
 * transition so stale "locked N" placeholders don't persist after the
 * user's paid status changes.
 */
function clearMaskedResultCaches() {
  try {
    sessionStorage.removeItem('jk_results');
    sessionStorage.removeItem('jk_results_path');
    sessionStorage.removeItem('jk_audit_results');
    sessionStorage.removeItem('jk_audit_results_path');
    sessionStorage.removeItem('jk_maxCpc');
  } catch {
    // ignore storage failures
  }
}
import { readAttribution, clearAttribution } from '../services/attribution';
import type { UserProfile, UserCredits } from '@jackpotkeywords/shared';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  credits: UserCredits | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    credits: null,
    loading: true,
    error: null,
  });

  const initUserProfile = useCallback(async (user: User) => {
    try {
      // Auto-enable admin bypass on first sign-in so admin testing (including
      // signed-out flows afterwards) doesn't hit the free-tier cap. Persists
      // in localStorage until explicitly removed.
      maybeEnableAdminBypass(user.email);
      const token = await user.getIdToken();
      const attribution = readAttribution();
      const data = await initUser(token, attribution);
      // Clear attribution once successfully sent so we don't keep re-sending it
      if (attribution && data?.user?.attribution) {
        clearAttribution();
      }
      setState({
        user,
        profile: data.user,
        credits: data.credits,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        user,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  // Track the last-seen user id + plan so we can detect transitions across
  // renders and drop stale masked caches. Refs (not state) so we don't cause
  // extra renders just for bookkeeping.
  const prevUidRef = useRef<string | null>(null);
  const prevPlanRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Detect logout: a known user transitions to null.
      if (prevUidRef.current && !user) {
        clearMaskedResultCaches();
      }
      prevUidRef.current = user?.uid || null;

      if (user) {
        initUserProfile(user);
      } else {
        setState({ user: null, profile: null, credits: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  }, [initUserProfile]);

  // Detect plan transitions (e.g. free -> pro after subscription webhook).
  // When the plan changes, the cached masked payload in sessionStorage no
  // longer reflects what the user should see — drop it so the next page
  // mount fetches fresh from the server.
  useEffect(() => {
    const currentPlan = state.profile?.plan || null;
    if (prevPlanRef.current && currentPlan && prevPlanRef.current !== currentPlan) {
      clearMaskedResultCaches();
    }
    prevPlanRef.current = currentPlan;
  }, [state.profile?.plan]);

  const signInWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      if (isNewUser) {
        trackSignUp('google');
      }
      trackEvent('signin_completed', { method: 'google', isNewUser });
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return state.user ? state.user.getIdToken() : null;
  }, [state.user]);

  const refreshCredits = useCallback(async () => {
    if (!state.user) return;
    try {
      const token = await state.user.getIdToken();
      const data = await initUser(token);
      setState((prev) => ({ ...prev, credits: data.credits, profile: data.user }));
    } catch {
      // silent refresh failure
    }
  }, [state.user]);

  return {
    user: state.user,
    profile: state.profile,
    credits: state.credits,
    loading: state.loading,
    error: state.error,
    signInWithGoogle,
    logout,
    getToken,
    refreshCredits,
  };
}
