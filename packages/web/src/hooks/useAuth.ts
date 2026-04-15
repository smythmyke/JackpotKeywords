import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { initUser } from '../services/api';
import { trackSignUp } from '../services/analytics';
import { trackEvent } from '../lib/analytics';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        initUserProfile(user);
      } else {
        setState({ user: null, profile: null, credits: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  }, [initUserProfile]);

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
