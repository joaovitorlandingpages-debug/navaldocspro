import React, { createContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    console.log("AUTH_PROVIDER_INIT");
    
    // Initial session check
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("AUTH_INIT_ERROR:", error);
        }
        
        if (initialSession) {
          console.log("SESSION_FOUND", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          // Fetch profile in background
          fetchProfile(initialSession.user.id);
        } else {
          console.log("SESSION_NOT_FOUND");
        }
      } catch (err) {
        console.error("AUTH_CATCH_ERROR:", err);
      } finally {
        setLoading(false);
        console.log("AUTH_LOADING_FINISHED");
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      console.log("AUTH_STATE_CHANGE:", event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log("PROFILE_LOADING", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("PROFILE_ERROR:", error);
        return;
      }

      if (data) {
        console.log("PROFILE_FOUND", data.role);
        setProfile(data);
      } else {
        console.log("PROFILE_NOT_FOUND - Background creation...");
        // Handle background creation if needed, but don't block
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: userData.user.id,
              email: userData.user.email,
              name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Usuário',
              role: 'user',
            })
            .select('*, companies(*)')
            .single();
          if (newProfile) setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error("PROFILE_FETCH_CATCH:", err);
    }
  };

  const signOut = async () => {
    console.log("SIGN_OUT_START");
    try {
      // Clear state first to avoid session mismatch
      setSession(null);
      setUser(null);
      setProfile(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("SUPABASE_SIGNOUT_ERROR:", error);
      }
    } catch (err) {
      console.error("SIGN_OUT_CATCH:", err);
    } finally {
      console.log("SIGN_OUT_COMPLETE");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
