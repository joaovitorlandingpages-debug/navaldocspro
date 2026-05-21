import { useEffect } from 'react';
import { telemetry } from '@/utils/telemetry';

export function useTelemetry(moduleName?: string) {
  useEffect(() => {
    if (moduleName) {
      telemetry.trackModuleAccess(moduleName);
    } else {
      telemetry.track('page_view');
    }
  }, [moduleName]);

  return telemetry;
}
