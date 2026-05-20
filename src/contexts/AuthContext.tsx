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
          
          // Fetch profile in background without blocking the UI
          supabase
            .from('profiles')
            .select('*, companies(*)')
            .eq('id', initialSession.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setProfile(data);
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
          .then(({ data }) => {
            if (data) setProfile(data);
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
