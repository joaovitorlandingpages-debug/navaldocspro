import { describe, it, expect } from 'vitest';
import { 
  computeDaysRemaining, 
  getDeadlineStatus, 
  evaluateNauticalDeadlines 
} from '@/services/deadlinesGuardianService';

describe('Deadlines Guardian Service (Guardião de Prazos Náuticos)', () => {
  it('deve calcular dias restantes e classificar como vencido (expired) se a data estiver no passado', () => {
    const refDate = new Date('2026-06-01T00:00:00Z');
    const pastDate = '2026-05-15';
    const days = computeDaysRemaining(pastDate, refDate);
    expect(days).toBeLessThan(0);
    expect(getDeadlineStatus(days)).toBe('expired');
  });

  it('deve classificar como crítico se faltarem menos de 30 dias para o vencimento do TIE/CSN', () => {
    const refDate = new Date('2026-06-01T00:00:00Z');
    const soonDate = '2026-06-20'; // 19 dias
    const days = computeDaysRemaining(soonDate, refDate);
    expect(days).toBe(19);
    expect(getDeadlineStatus(days)).toBe('critical');
  });

  it('deve classificar como alerta (warning) se faltarem entre 31 e 90 dias', () => {
    const refDate = new Date('2026-06-01T00:00:00Z');
    const warningDate = '2026-08-01'; // ~61 dias
    const days = computeDaysRemaining(warningDate, refDate);
    expect(getDeadlineStatus(days)).toBe('warning');
  });

  it('deve processar uma lista mista de documentos e retornar resumo com contadores corretos', () => {
    const refDate = new Date('2026-06-01T00:00:00Z');
    const summary = evaluateNauticalDeadlines(
      [
        {
          id: '1',
          category: 'TIE_TIEM',
          title: 'Título de Inscrição (TIE)',
          entityName: 'Lancha Sol e Mar',
          entityId: 'ves-1',
          expiryDate: '2026-05-01', // vencido
        },
        {
          id: '2',
          category: 'CSN',
          title: 'Certificado de Segurança da Navegação',
          entityName: 'Barco Pesqueiro I',
          entityId: 'ves-2',
          expiryDate: '2026-06-15', // crítico (14 dias)
        },
        {
          id: '3',
          category: 'CHA_HABILITACAO',
          title: 'Habilitação de Mestre Amador',
          entityName: 'Comandante Silva',
          entityId: 'cust-1',
          expiryDate: '2026-07-20', // warning (49 dias)
        },
        {
          id: '4',
          category: 'DPEM',
          title: 'Seguro Obrigatório DPEM',
          entityName: 'Veleiro Albatroz',
          entityId: 'ves-3',
          expiryDate: '2027-01-01', // regular
        },
      ],
      refDate
    );

    expect(summary.totalMonitored).toBe(4);
    expect(summary.expiredCount).toBe(1);
    expect(summary.criticalCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.regularCount).toBe(1);
    expect(summary.urgentItems.length).toBe(3);
  });
});
