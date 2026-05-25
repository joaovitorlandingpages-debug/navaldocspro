import { supabase } from "@/integrations/supabase/client";

export type AuditCategory = 'auth' | 'ocr' | 'document' | 'billing' | 'process' | 'security' | 'system' | 'customers' | 'vessels';

export async function logAudit(
  action: string,
  category: AuditCategory = 'system',
  metadata: any = {},
  entityType?: string,
  entityId?: string,
  module: string = 'system'
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('activity_logs').insert({
      user_id: session?.user?.id,
      action,
      category,
      module, // Garantindo que o module seja enviado
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      },
      resource_type: entityType,
      resource_id: entityId,
    });

    if (error) {
      console.warn('ACTIVITY_LOG_FAILURE_SILENT:', error.message);
    } else {
      console.log('ACTIVITY_LOG_MODULE_FIXED');
    }
  } catch (err) {
    // Falha no log nunca deve interromper o fluxo principal
    console.warn('LOG_FAILURE_SAFE:', err);
  }
}
