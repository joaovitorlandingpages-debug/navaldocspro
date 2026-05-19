import { supabase } from "@/integrations/supabase/client";

export type AuditCategory = 'auth' | 'ocr' | 'document' | 'billing' | 'process' | 'security' | 'system';

export async function logAudit(
  action: string,
  category: AuditCategory = 'general' as any,
  metadata: any = {},
  entityType?: string,
  entityId?: string
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    await supabase.from('activity_logs').insert({
      user_id: session?.user?.id,
      action,
      category,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
      entity_type: entityType,
      entity_id: entityId,
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
}
