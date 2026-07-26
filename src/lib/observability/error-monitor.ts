import { supabase } from '@/integrations/supabase/client';
import { isPilotMode, pilotLog } from '@/lib/pilot-mode';
import { RELEASE } from '@/lib/release';

export interface ErrorContext {
  module?: string;
  correlationId?: string;
  operation?: string;
  componentStack?: string;
  [key: string]: unknown;
}

/**
 * Registra uma exceção com módulo, mensagem, stack trace, usuário, tenant,
 * data/hora e contexto. Nenhum erro é descartado silenciosamente:
 * falhas de persistência ainda são logadas no console.
 */
export async function captureException(error: unknown, context: ErrorContext = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const module = context.module ?? 'unknown';

  // Log sempre visível — nunca engolir o erro.
  console.error(`[ERROR][${module}] ${err.message}`, { context, stack: err.stack });

  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    let companyId: string | null = null;
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();
      companyId = profile?.company_id ?? null;
    }

    await supabase.from('frontend_errors' as any).insert({
      user_id: session?.user.id ?? null,
      company_id: companyId,
      error_message: err.message,
      error_stack: err.stack ?? null,
      component_stack: context.componentStack ?? null,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      metadata: {
        ...context,
        module,
        tenant: companyId,
        user: session?.user.id ?? null,
        occurred_at: new Date().toISOString(),
        release: RELEASE.version,
        pilot_mode: isPilotMode(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    });
  } catch (persistError) {
    console.error('ERROR_MONITOR_PERSIST_FAILED', persistError, { original: err.message });
  }
}

let registered = false;

/** Captura erros e promessas rejeitadas não tratadas em toda a aplicação. */
export function registerGlobalErrorMonitor(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;

  window.addEventListener('error', (event) => {
    void captureException(event.error ?? new Error(event.message), {
      module: 'global',
      source: (event as ErrorEvent).filename,
      line: (event as ErrorEvent).lineno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    void captureException(event.reason, { module: 'global', kind: 'unhandledrejection' });
  });

  pilotLog('error-monitor', 'monitor global registrado');
}
