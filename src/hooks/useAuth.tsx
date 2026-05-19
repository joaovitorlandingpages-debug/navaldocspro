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

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          // Only stop loading if there's no user (no profile to fetch)
          if (!session?.user) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Initial auth session error:", err);
        if (mounted) setLoading(false);
      }
    };
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (!newUser) {
        setLoading(false);
        queryClient.setQueryData(['profile', null], null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle missing profiles
      
      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      // If profile doesn't exist, create one
      if (!data) {
        console.log("Profile not found, creating for user:", user.email);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            role: 'user', // Default role
          })
          .select('*, companies(*)')
          .single();

        if (createError) {
          console.error("Error creating profile:", createError);
          return null;
        }
        return newProfile;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate final loading state
  // It's loading if the session is still being initialized
  // OR if we have a user but the profile is still being fetched
  const finalLoading = loading || (!!user && isLoadingProfile);

  return { 
    user, 
    profile, 
    loading: finalLoading,
    isAdmin: profile?.role === 'admin_master' || profile?.role === 'admin_master_global',
    isGlobalAdmin: profile?.role === 'admin_master_global'
  };
};
