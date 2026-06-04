import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { telemetry } from '@/utils/telemetry';

export function useFieldTracking() {
  const location = useLocation();

  useEffect(() => {
    // Log page access
    telemetry.track('page_access', 'field_validation', {
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [location.pathname]);

  const trackAction = (action: string, metadata: any = {}) => {
    telemetry.track('user_action', 'field_validation', {
      action,
      ...metadata
    });
  };

  return { trackAction };
}
