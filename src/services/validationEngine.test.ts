import { describe, it, expect } from 'vitest';
import { DocumentValidationEngine } from '../src/services/validationEngine';

describe('DocumentValidationEngine', () => {
  it('should correctly fill placeholders in base_content', () => {
    const baseContent = "Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, declaro ser proprietário da embarcação {{embarcacao.nome}}.";
    const data = {
      customer: { name: "João Silva", cpf: "123.456.789-00" },
      vessel: { name: "Estrela do Mar" }
    };
    
    const result = DocumentValidationEngine.fillPlaceholder(baseContent, data);
    
    expect(result).toContain("João Silva");
    expect(result).toContain("123.456.789-00");
    expect(result).toContain("Estrela do Mar");
    expect(result).not.toContain("{{cliente.nome}}");
  });

  it('should use underscores for missing data instead of [placeholder]', () => {
    const baseContent = "Eu, {{cliente.nome}}, CPF {{cliente.cpf}}.";
    const data = {
      customer: { name: "João Silva" }
      // cpf is missing
    };
    
    const result = DocumentValidationEngine.fillPlaceholder(baseContent, data);
    
    expect(result).toContain("João Silva");
    expect(result).toContain("____________________");
    expect(result).not.toContain("{{cliente.cpf}}");
  });
});
