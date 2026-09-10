/**
 * NavalDocs Pro - Cross-Document Consistency Engine (Anti-Divergência)
 * Valida cruzamento de dados entre múltiplos documentos náuticos antes do protocolo na Capitania.
 */

export interface ExtractedDocumentData {
  documentType: 'TIE' | 'TIEM' | 'CNH' | 'RG' | 'CPF' | 'CNPJ' | 'PROCURACAO' | 'CONTRATO_SOCIAL' | 'NOTA_FISCAL_MOTOR' | 'LAUDO_ARQUEACAO' | 'OTHER';
  fields: {
    owner_name?: string | null;
    owner_cpf?: string | null;
    owner_cnpj?: string | null;
    vessel_name?: string | null;
    registration_number?: string | null;
    hull_id?: string | null;
    engine_serial?: string | null;
    engine_power_hp?: number | string | null;
    engine_model?: string | null;
    length?: number | string | null;
    beam?: number | string | null;
    gross_tonnage?: number | string | null;
    expiry_date?: string | null;
    issue_date?: string | null;
    grantor_name?: string | null;
    grantor_cpf?: string | null;
    grantee_name?: string | null;
    grantee_cpf?: string | null;
    powers_description?: string | null;
  };
}

export type DiscrepancySeverity = 'critical' | 'warning' | 'info';

export interface CrossValidationIssue {
  id: string;
  field: string;
  severity: DiscrepancySeverity;
  sourceDocA: string;
  sourceDocB: string;
  valueA: string | number;
  valueB: string | number;
  description: string;
  recommendation: string;
}

export interface CrossValidationResult {
  score: number; // 0 to 100
  passed: boolean;
  issues: CrossValidationIssue[];
  totalChecked: number;
  summary: string;
}

function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeCpfCnpj(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

export function performCrossValidation(docs: ExtractedDocumentData[]): CrossValidationResult {
  const issues: CrossValidationIssue[] = [];
  let totalChecked = 0;

  const tieDoc = docs.find((d) => d.documentType === 'TIE' || d.documentType === 'TIEM');
  const personalDocs = docs.filter((d) => d.documentType === 'CNH' || d.documentType === 'RG' || d.documentType === 'CPF');
  const procuracaoDoc = docs.find((d) => d.documentType === 'PROCURACAO');
  const motorInvoice = docs.find((d) => d.documentType === 'NOTA_FISCAL_MOTOR');
  const laudoDoc = docs.find((d) => d.documentType === 'LAUDO_ARQUEACAO');

  // 1. Validar CPF / Nome do proprietário entre TIE e Documento Pessoal (CNH/RG)
  if (tieDoc && personalDocs.length > 0) {
    personalDocs.forEach((pDoc) => {
      // Comparar CPF
      if (tieDoc.fields.owner_cpf && pDoc.fields.owner_cpf) {
        totalChecked++;
        const cpfTie = normalizeCpfCnpj(tieDoc.fields.owner_cpf);
        const cpfPersonal = normalizeCpfCnpj(pDoc.fields.owner_cpf);
        if (cpfTie !== cpfPersonal) {
          issues.push({
            id: `cpf-mismatch-${pDoc.documentType}`,
            field: 'CPF do Proprietário',
            severity: 'critical',
            sourceDocA: tieDoc.documentType,
            sourceDocB: pDoc.documentType,
            valueA: tieDoc.fields.owner_cpf,
            valueB: pDoc.fields.owner_cpf,
            description: `Divergência crítica de CPF entre ${tieDoc.documentType} e ${pDoc.documentType}. A Capitania dos Portos recusará o processo sumariamente.`,
            recommendation: 'Verifique se foi anexada a CNH/RG da pessoa correta ou se é caso de transferência de propriedade.',
          });
        }
      }

      // Comparar Nome do Proprietário
      if (tieDoc.fields.owner_name && pDoc.fields.owner_name) {
        totalChecked++;
        const nameTie = normalizeText(tieDoc.fields.owner_name);
        const namePersonal = normalizeText(pDoc.fields.owner_name);
        if (nameTie !== namePersonal && !nameTie.includes(namePersonal) && !namePersonal.includes(nameTie)) {
          issues.push({
            id: `name-mismatch-${pDoc.documentType}`,
            field: 'Nome do Proprietário',
            severity: 'warning',
            sourceDocA: tieDoc.documentType,
            sourceDocB: pDoc.documentType,
            valueA: tieDoc.fields.owner_name,
            valueB: pDoc.fields.owner_name,
            description: `Nome no ${tieDoc.documentType} difere do nome na ${pDoc.documentType}.`,
            recommendation: 'Verifique se houve alteração de estado civil, sobrenome de casada(o) ou erro de digitação no TIE.',
          });
        }
      }
    });
  }

  // 2. Validar Procuração (Outorgante deve coincidir com Proprietário do TIE)
  if (tieDoc && procuracaoDoc) {
    totalChecked++;
    if (tieDoc.fields.owner_cpf && procuracaoDoc.fields.grantor_cpf) {
      const cpfTie = normalizeCpfCnpj(tieDoc.fields.owner_cpf);
      const cpfGrantor = normalizeCpfCnpj(procuracaoDoc.fields.grantor_cpf);
      if (cpfTie !== cpfGrantor) {
        issues.push({
          id: 'procuracao-grantor-mismatch',
          field: 'Outorgante da Procuração',
          severity: 'critical',
          sourceDocA: 'TIE',
          sourceDocB: 'PROCURACAO',
          valueA: tieDoc.fields.owner_cpf,
          valueB: procuracaoDoc.fields.grantor_cpf,
          description: 'O outorgante da procuração não é o proprietário registrado no TIE/TIEM.',
          recommendation: 'Solicite procuração assinada pelo proprietário de registro ou anexe a cadeia dominial (contrato de compra e venda com firma reconhecida).',
        });
      }
    }
  }

  // 3. Validar Motor e Número de Série com Nota Fiscal
  if (tieDoc && motorInvoice) {
    totalChecked++;
    if (tieDoc.fields.engine_serial && motorInvoice.fields.engine_serial) {
      const serialTie = normalizeText(tieDoc.fields.engine_serial);
      const serialInv = normalizeText(motorInvoice.fields.engine_serial);
      if (serialTie !== serialInv) {
        issues.push({
          id: 'engine-serial-mismatch',
          field: 'Número de Série do Motor',
          severity: 'critical',
          sourceDocA: 'TIE',
          sourceDocB: 'NOTA_FISCAL_MOTOR',
          valueA: tieDoc.fields.engine_serial,
          valueB: motorInvoice.fields.engine_serial,
          description: 'Número de série do motor na Nota Fiscal não coincide com o cadastro da embarcação.',
          recommendation: 'Se for troca de motor, certifique-se de instruir o processo como "Substituição de Motor" e anexar o Termo de Responsabilidade Técnica.',
        });
      }
    }

    if (tieDoc.fields.engine_power_hp && motorInvoice.fields.engine_power_hp) {
      totalChecked++;
      const pTie = Number(tieDoc.fields.engine_power_hp);
      const pInv = Number(motorInvoice.fields.engine_power_hp);
      if (!isNaN(pTie) && !isNaN(pInv) && pTie !== pInv) {
        issues.push({
          id: 'engine-power-mismatch',
          field: 'Potência do Motor (HP)',
          severity: 'warning',
          sourceDocA: 'TIE',
          sourceDocB: 'NOTA_FISCAL_MOTOR',
          valueA: `${pTie} HP`,
          valueB: `${pInv} HP`,
          description: `Potência informada (${pInv} HP) difere do registro (${pTie} HP).`,
          recommendation: 'Verifique se a nova potência respeita o limite máximo de motorização homologado no projeto do casco.',
        });
      }
    }
  }

  // 4. Validar Dimensões e Arqueação com Laudo Técnico
  if (tieDoc && laudoDoc) {
    if (tieDoc.fields.length && laudoDoc.fields.length) {
      totalChecked++;
      const lenTie = Number(tieDoc.fields.length);
      const lenLaudo = Number(laudoDoc.fields.length);
      if (!isNaN(lenTie) && !isNaN(lenLaudo) && Math.abs(lenTie - lenLaudo) > 0.05) {
        issues.push({
          id: 'length-discrepancy',
          field: 'Comprimento Total (m)',
          severity: 'warning',
          sourceDocA: 'TIE',
          sourceDocB: 'LAUDO_ARQUEACAO',
          valueA: `${lenTie}m`,
          valueB: `${lenLaudo}m`,
          description: `Divergência de comprimento (${lenTie}m vs ${lenLaudo}m).`,
          recommendation: 'Laudos navais exigem precisão centimétrica. Confirme a medição de boca e comprimento de roda a roda.',
        });
      }
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  let score = 100;
  score -= criticalCount * 35;
  score -= warningCount * 15;
  score = Math.max(0, Math.min(100, score));

  const passed = criticalCount === 0;

  let summary = 'Documentação em perfeita consonância cadastral. Apto para envio à Capitania.';
  if (criticalCount > 0) {
    summary = `Detectadas ${criticalCount} divergência(s) crítica(s) que causarão indeferimento imediato na Capitania.`;
  } else if (warningCount > 0) {
    summary = `Documentos aprovados com ${warningCount} ressalva(s) para conferência preventiva.`;
  }

  return {
    score,
    passed,
    issues,
    totalChecked: Math.max(totalChecked, 1),
    summary,
  };
}
