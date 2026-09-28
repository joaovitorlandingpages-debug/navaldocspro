import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const userEmail = (context.user?.email || context.profile?.email || '').toLowerCase().trim();
  const isPlatformAdmin = userEmail === 'joaovitor.f0725@gmail.com' || userEmail === 'douglas_faresi@hotmail.com';

  return {
    ...context,
    isAdmin: isPlatformAdmin || context.profile?.role === 'admin_master' || context.profile?.role === 'admin_master_global',
    isGlobalAdmin: isPlatformAdmin || context.profile?.role === 'admin_master_global',
    isClient: context.profile?.role === 'customer' || context.profile?.role === 'client'
  };
};
