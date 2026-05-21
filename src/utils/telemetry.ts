import { supabase } from "@/integrations/supabase/client";

export const telemetry = {
  track: async (event_type: string, module_name?: string, metadata: any = {}) => {
    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user profile for company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      await supabase.from('telemetry_logs').insert({
        user_id: session.user.id,
        company_id: profile?.company_id,
        event_type,
        module_name,
        metadata: {
          ...metadata,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Telemetry tracking failed:', error);
    }
  },

  trackModuleAccess: (moduleName: string) => {
    return telemetry.track('module_access', moduleName);
  },

  trackFlowStart: (flowName: string, metadata?: any) => {
    return telemetry.track('flow_start', undefined, { flowName, ...metadata });
  },

  trackFlowStep: (flowName: string, stepName: string, metadata?: any) => {
    return telemetry.track('flow_step', undefined, { flowName, stepName, ...metadata });
  },

  trackFlowComplete: (flowName: string, durationMs?: number, metadata?: any) => {
    return telemetry.track('flow_complete', undefined, { flowName, duration_ms: durationMs, ...metadata });
  },

  trackError: (errorName: string, errorMessage: string, metadata?: any) => {
    return telemetry.track('error', undefined, { errorName, errorMessage, ...metadata });
  },

  trackOCRPerformance: (jobId: string, docType: string, confidence: number, durationMs: number) => {
    return telemetry.track('ocr_performance', 'OCR', { jobId, docType, confidence, durationMs });
  }
};
