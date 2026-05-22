import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    console.log("AUTH_INIT");
    console.log("AUTH_STABLE");
    console.log("RLS_PROFILES_FIXED");
    
    const initAuth = async () => {
      console.log("GET_SESSION_START");
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("GET_SESSION_ERROR:", error);
        }
        
        if (initialSession) {
          console.log("GET_SESSION_SUCCESS", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile in background and ensure workspace
          supabase
            .from('profiles')
            .select('*, companies(*)')
            .eq('id', initialSession.user.id)
            .maybeSingle()
            .then(async ({ data }: { data: any }) => {
              if (data) {
                setProfile(data);
                // Auto-recovery: ensure workspace exists
                if (!data.company_id) {
                  const { ensureWorkspace } = await import("@/utils/workspace-recovery");
                  await ensureWorkspace(initialSession.user, data);
                  // Refresh profile after creation
                  const { data: updatedProfile } = await supabase
                    .from('profiles')
                    .select('*, companies(*)')
                    .eq('id', initialSession.user.id)
                    .single();
                  if (updatedProfile) setProfile(updatedProfile);
                }
              }
            });
        } else {
          console.log("GET_SESSION_EMPTY");
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("GET_SESSION_CATCH:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      console.log("AUTH_STATE_CHANGED:", event);
      
      if (isTransitioningRef.current) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', currentSession.user.id)
          .maybeSingle()
          .then(async ({ data }: { data: any }) => {
            if (data) {
              setProfile(data);
              // Auto-recovery for state changes
              if (!data.company_id) {
                const { ensureWorkspace } = await import("@/utils/workspace-recovery");
                await ensureWorkspace(currentSession.user, data);
                const { data: updatedProfile } = await supabase
                  .from('profiles')
                  .select('*, companies(*)')
                  .eq('id', currentSession.user.id)
                  .single();
                if (updatedProfile) setProfile(updatedProfile);
              }
            }
          });
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log("LOGOUT");
    isTransitioningRef.current = true;
    try {
      setSession(null);
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("LOGOUT_ERROR:", err);
    } finally {
      setTimeout(() => {
        isTransitioningRef.current = false;
        window.location.href = "/auth/login";
      }, 500);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
