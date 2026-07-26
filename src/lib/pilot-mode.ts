/**
 * PILOT_MODE — configuração global da Fase 4 (RC1).
 *
 * Habilitação:
 *  - Build: defina VITE_PILOT_MODE=true (padrão: true durante a RC1)
 *  - Runtime (por navegador/sessão): localStorage.setItem('navaldocs.pilot_mode', 'true' | 'false')
 *
 * Quando ativo: logs detalhados, métricas completas, auditoria reforçada e
 * monitoramento das operações críticas. NÃO altera comportamento funcional.
 */

const STORAGE_KEY = 'navaldocs.pilot_mode';

function envDefault(): boolean {
  const raw = (import.meta as any)?.env?.VITE_PILOT_MODE;
  if (raw === undefined || raw === null || raw === '') return true; // RC1: piloto ligado por padrão
  return String(raw).toLowerCase() === 'true';
}

export function isPilotMode(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const override = localStorage.getItem(STORAGE_KEY);
      if (override === 'true') return true;
      if (override === 'false') return false;
    }
  } catch {
    /* storage indisponível (SSR / modo privado) */
  }
  return envDefault();
}

export function setPilotMode(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    /* noop */
  }
}

export function clearPilotModeOverride(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Log detalhado — só emite quando o modo piloto está ativo. */
export function pilotLog(scope: string, message: string, data?: unknown): void {
  if (!isPilotMode()) return;
  // eslint-disable-next-line no-console
  console.info(`[PILOT][${scope}] ${message}`, data ?? '');
}

/** Gera um correlation_id para rastrear uma operação de ponta a ponta. */
export function newCorrelationId(prefix = 'op'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}
