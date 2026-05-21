import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    ...context,
    isAdmin: context.profile?.role === 'admin_master' || context.profile?.role === 'admin_master_global',
    isGlobalAdmin: context.profile?.role === 'admin_master_global',
    isClient: context.profile?.role === 'customer' || context.profile?.role === 'client'
  };
};
