import { describe, it, expect } from 'vitest';
import { performCrossValidation, type ExtractedDocumentData } from '@/services/crossValidationEngine';

describe('Cross-Document Consistency Engine (Anti-Divergência)', () => {
  it('deve aprovar com 100 pontos quando todos os dados entre TIE, CNH e Procuração forem idênticos', () => {
    const docs: ExtractedDocumentData[] = [
      {
        documentType: 'TIE',
        fields: {
          owner_name: 'Roberto Andrade Santos',
          owner_cpf: '123.456.789-00',
          vessel_name: 'Vento Forte',
          registration_number: '441-987654-3',
          engine_serial: 'OT654321',
          engine_power_hp: 150,
          length: 6.2,
        },
      },
      {
        documentType: 'CNH',
        fields: {
          owner_name: 'Roberto Andrade Santos',
          owner_cpf: '12345678900',
        },
      },
      {
        documentType: 'PROCURACAO',
        fields: {
          grantor_name: 'Roberto Andrade Santos',
          grantor_cpf: '123.456.789-00',
        },
      },
    ];

    const result = performCrossValidation(docs);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });

  it('deve reprovar e gerar alerta crítico quando houver divergência no CPF do proprietário', () => {
    const docs: ExtractedDocumentData[] = [
      {
        documentType: 'TIE',
        fields: {
          owner_name: 'Carlos Eduardo Silva',
          owner_cpf: '111.222.333-44',
          vessel_name: 'Mar Azul',
        },
      },
      {
        documentType: 'CNH',
        fields: {
          owner_name: 'Carlos Eduardo Silva',
          owner_cpf: '999.888.777-66', // CPF divergente
        },
      },
    ];

    const result = performCrossValidation(docs);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
    expect(result.issues.some((i) => i.severity === 'critical' && i.field === 'CPF do Proprietário')).toBe(true);
  });

  it('deve detectar divergência no número de série do motor entre TIE e Nota Fiscal', () => {
    const docs: ExtractedDocumentData[] = [
      {
        documentType: 'TIE',
        fields: {
          owner_cpf: '111.222.333-44',
          engine_serial: 'SN-123456',
          engine_power_hp: 200,
        },
      },
      {
        documentType: 'NOTA_FISCAL_MOTOR',
        fields: {
          engine_serial: 'SN-999999', // Divergente
          engine_power_hp: 200,
        },
      },
    ];

    const result = performCrossValidation(docs);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.id === 'engine-serial-mismatch')).toBe(true);
  });
});
