import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log("AUTH_START");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            console.log("SESSION_FOUND", session.user.id);
            setUser(session.user);
          } else {
            console.log("SESSION_NOT_FOUND");
            setUser(null);
            setLoading(false);
            console.log("AUTH_LOADING_FINISHED - No Session");
          }
        }
      } catch (err) {
        console.error("AUTH_ERROR_INIT:", err);
        if (mounted) setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (!mounted) return;
      console.log("AUTH_STATE_CHANGE:", event);
      
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (!newUser) {
        setLoading(false);
        queryClient.setQueryData(['profile', null], null);
        console.log("AUTH_LOADING_FINISHED - State Change Logged Out");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      console.log("PROFILE_LOADING", user.id);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error("PROFILE_ERROR:", error);
          throw error;
        }

        if (!data) {
          console.log("PROFILE_NOT_FOUND - Creating profile...");
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
              role: 'user',
            })
            .select('*, companies(*)')
            .single();

          if (createError) {
            console.error("PROFILE_CREATED_ERROR:", createError);
            return null;
          }
          console.log("PROFILE_CREATED_SUCCESS");
          return newProfile;
        }

        console.log("PROFILE_FOUND", data.role);
        return data;
      } catch (err) {
        console.error("PROFILE_FETCH_CATCH:", err);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  useEffect(() => {
    if (user && !isLoadingProfile) {
      setLoading(false);
      console.log("AUTH_LOADING_FINISHED - Profile Loaded");
    }
  }, [user, isLoadingProfile]);

  return { 
    user, 
    profile, 
    loading,
    isAdmin: profile?.role === 'admin_master' || profile?.role === 'admin_master_global',
    isGlobalAdmin: profile?.role === 'admin_master_global'
  };
};
