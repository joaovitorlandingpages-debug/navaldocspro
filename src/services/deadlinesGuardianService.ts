/**
 * NavalDocs Pro - Deadlines Guardian Service (Guardião de Prazos Náuticos)
 * Monitora e audita vencimentos regulatórios da Capitania dos Portos e Marinha do Brasil.
 */

export interface NauticalDeadlineItem {
  id: string;
  category: 'TIE_TIEM' | 'CSN' | 'DPEM' | 'CHA_HABILITACAO' | 'LAUDO_ESTABILIDADE' | 'EXTINTOR_SALVATAGEM' | 'OTHER';
  title: string;
  entityName: string; // Nome da Embarcação ou Cliente
  entityId: string;
  registrationNumber?: string;
  expiryDate: string; // ISO format YYYY-MM-DD
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'regular';
  recommendedAction: string;
  regulatoryCode: string; // ex: NORMAM-01/DPC Cap. 2
}

export interface DeadlinesSummary {
  totalMonitored: number;
  expiredCount: number;
  criticalCount: number; // < 30 days
  warningCount: number; // 30 - 90 days
  regularCount: number;
  urgentItems: NauticalDeadlineItem[];
}

export function computeDaysRemaining(expiryDateIso: string, referenceDate = new Date()): number {
  const expiry = new Date(expiryDateIso);
  const diffTime = expiry.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(daysRemaining: number): 'expired' | 'critical' | 'warning' | 'regular' {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'critical';
  if (daysRemaining <= 90) return 'warning';
  return 'regular';
}

export function evaluateNauticalDeadlines(
  items: Array<{
    id: string;
    category: NauticalDeadlineItem['category'];
    title: string;
    entityName: string;
    entityId: string;
    registrationNumber?: string;
    expiryDate: string;
    regulatoryCode?: string;
  }>,
  referenceDate = new Date()
): DeadlinesSummary {
  const processed: NauticalDeadlineItem[] = items.map((item) => {
    const days = computeDaysRemaining(item.expiryDate, referenceDate);
    const status = getDeadlineStatus(days);

    let action = 'Monitoramento de rotina. Nenhuma ação requerida.';
    if (status === 'expired') {
      action = 'URGENTE: Documento vencido. Embarcação sujeita a apreensão/multa pela Capitania. Iniciar processo de renovação imediatamente.';
    } else if (status === 'critical') {
      action = 'Protocolar pedido de renovação junto à Capitania dos Portos nos próximos 15 dias.';
    } else if (status === 'warning') {
      action = 'Notificar cliente sobre vencimento próximo e coletar documentação atualizada.';
    }

    return {
      ...item,
      daysRemaining: days,
      status,
      recommendedAction: action,
      regulatoryCode: item.regulatoryCode || 'NORMAM-01/DPC',
    };
  });

  const expiredCount = processed.filter((i) => i.status === 'expired').length;
  const criticalCount = processed.filter((i) => i.status === 'critical').length;
  const warningCount = processed.filter((i) => i.status === 'warning').length;
  const regularCount = processed.filter((i) => i.status === 'regular').length;

  const urgentItems = processed
    .filter((i) => i.status === 'expired' || i.status === 'critical' || i.status === 'warning')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    totalMonitored: processed.length,
    expiredCount,
    criticalCount,
    warningCount,
    regularCount,
    urgentItems,
  };
}
