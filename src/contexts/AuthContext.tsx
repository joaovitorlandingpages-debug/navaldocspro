import React, { createContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { setCachedCompanyId, clearCachedCompanyId } from '@/lib/currentCompany';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  companyId: string | null;
  role: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Onda 3C.2: single bootstrap fetch + filtered auth listener.
// - Only refetch profile on SIGNED_IN / SIGNED_OUT / USER_UPDATED.
// - TOKEN_REFRESHED (hourly + tab focus) and INITIAL_SESSION no longer refire
//   the profile query — eliminates seq_scan storm on `profiles`.
// - `companyId`/`role` exposed so consumers stop re-querying profiles.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const isTransitioningRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (u: User) => {
    if (lastFetchedUserIdRef.current === u.id) return;
    lastFetchedUserIdRef.current = u.id;
    const { data } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', u.id)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setCachedCompanyId(u.id, data.company_id ?? null);
      if (!data.company_id) {
        const { ensureWorkspace } = await import('@/utils/workspace-recovery');
        await ensureWorkspace(u, data);
        const { data: updated } = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', u.id)
          .single();
        if (updated) {
          setProfile(updated);
          setCachedCompanyId(u.id, updated.company_id ?? null);
        }
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user) {
          setSession(s);
          setUser(s.user);
          loadProfile(s.user);
        }
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (isTransitioningRef.current) return;

        // Ignore noisy events: INITIAL_SESSION, TOKEN_REFRESHED, PASSWORD_RECOVERY, MFA_CHALLENGE_VERIFIED.
        if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          lastFetchedUserIdRef.current = null;
          setProfile(null);
          clearCachedCompanyId();
          return;
        }

        // On USER_UPDATED, force refetch by clearing sentinel.
        if (event === 'USER_UPDATED') lastFetchedUserIdRef.current = null;
        loadProfile(currentSession.user);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    isTransitioningRef.current = true;
    try {
      setSession(null);
      setUser(null);
      setProfile(null);
      lastFetchedUserIdRef.current = null;
      clearCachedCompanyId();
      await supabase.auth.signOut();
    } finally {
      setTimeout(() => {
        isTransitioningRef.current = false;
        window.location.href = '/auth/login';
      }, 500);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    lastFetchedUserIdRef.current = null;
    await loadProfile(user);
  }, [user, loadProfile]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    profile,
    companyId: profile?.company_id ?? null,
    role: profile?.role ?? null,
    signOut,
    refreshProfile,
  }), [user, session, loading, profile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
