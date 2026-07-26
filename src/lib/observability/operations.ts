import { supabase } from '@/integrations/supabase/client';
import { telemetry } from '@/utils/telemetry';
import { isPilotMode, newCorrelationId, pilotLog } from '@/lib/pilot-mode';
import { RELEASE } from '@/lib/release';

/** Módulos críticos monitorados na RC1. */
export const MONITORED_MODULES = [
  'login',
  'ocr',
  'workspace',
  'process_analyzer',
  'action_engine',
  'documents',
  'signatures',
  'certificates',
  'dossiers',
  'finalization',
] as const;

export type MonitoredModule = (typeof MONITORED_MODULES)[number];

export interface OperationContext {
  correlationId: string;
  module: MonitoredModule;
}

interface OperationRecord {
  module: MonitoredModule;
  operation: string;
  correlation_id: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

async function persist(record: OperationRecord) {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .maybeSingle();

    await supabase.from('telemetry_logs').insert({
      user_id: session.user.id,
      company_id: profile?.company_id ?? null,
      event_type: record.success ? 'operation_success' : 'operation_failure',
      module_name: record.module,
      flow_name: record.operation,
      duration_ms: record.duration_ms,
      metadata: {
        ...record.metadata,
        correlation_id: record.correlation_id,
        started_at: record.started_at,
        finished_at: record.finished_at,
        success: record.success,
        error_message: record.error_message,
        tenant: profile?.company_id ?? null,
        user: session.user.id,
        release: RELEASE.version,
        pilot_mode: isPilotMode(),
      },
    });
  } catch (e) {
    console.warn('OPERATION_TELEMETRY_FAILED_SAFE', e);
  }
}

/**
 * Envolve uma operação crítica, registrando início, fim, duração,
 * sucesso/falha, correlation_id, tenant e usuário.
 * Nunca altera o resultado nem engole exceções.
 */
export async function trackOperation<T>(
  module: MonitoredModule,
  operation: string,
  fn: (ctx: OperationContext) => Promise<T> | T,
  metadata: Record<string, unknown> = {},
): Promise<T> {
  const correlationId = newCorrelationId(module);
  const startedAt = new Date();
  const t0 = Date.now();
  pilotLog(module, `▶ ${operation}`, { correlationId, metadata });

  try {
    const result = await fn({ correlationId, module });
    const duration = Date.now() - t0;
    pilotLog(module, `✔ ${operation} (${duration}ms)`, { correlationId });
    void persist({
      module,
      operation,
      correlation_id: correlationId,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      success: true,
      metadata,
    });
    return result;
  } catch (error: any) {
    const duration = Date.now() - t0;
    pilotLog(module, `✖ ${operation} (${duration}ms)`, { correlationId, error: error?.message });
    void persist({
      module,
      operation,
      correlation_id: correlationId,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      success: false,
      error_message: error?.message ?? String(error),
      metadata,
    });
    const { captureException } = await import('@/lib/observability/error-monitor');
    await captureException(error, { module, correlationId, operation, ...metadata });
    throw error;
  }
}

/** Marca um evento pontual de módulo monitorado (sem duração). */
export function trackModuleEvent(
  module: MonitoredModule,
  event: string,
  metadata: Record<string, unknown> = {},
) {
  pilotLog(module, `• ${event}`, metadata);
  return telemetry.track(event, module, {
    ...metadata,
    release: RELEASE.version,
    pilot_mode: isPilotMode(),
  });
}
