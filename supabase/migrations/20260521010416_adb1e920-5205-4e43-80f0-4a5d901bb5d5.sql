-- Insert Termo de Responsabilidade Técnica Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Termo de Responsabilidade Técnica',
  'Documento técnico onde o engenheiro responsável assume a responsabilidade pelas informações e serviços prestados no processo naval.',
  'technical',
  'TERMO DE RESPONSABILIDADE TÉCNICA

1. IDENTIFICAÇÃO DO RESPONSÁVEL TÉCNICO:
Nome: {{engenheiro.nome}}
CREA: {{engenheiro.crea}}
CPF: {{engenheiro.cpf}}

2. IDENTIFICAÇÃO DO CLIENTE / PROPRIETÁRIO:
Nome: {{cliente.nome}}
CPF: {{cliente.cpf}}
Endereço: {{cliente.endereco}}

3. IDENTIFICAÇÃO DA EMBARCAÇÃO:
Nome: {{embarcacao.nome}}
Tipo: {{embarcacao.tipo}}
Inscrição: {{embarcacao.inscricao}}
Comprimento: {{embarcacao.comprimento}} m

4. MOTORIZAÇÃO:
Fabricante: {{motor.fabricante}}
Modelo: {{motor.modelo}}
Potência: {{motor.potencia}} HP

5. DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA:
O responsável técnico abaixo identificado declara, para os devidos fins, que as informações técnicas apresentadas neste processo de {{processo.tipo}} foram analisadas e elaboradas sob sua responsabilidade profissional, atendendo às normas aplicáveis e assumindo responsabilidade técnica pelas informações fornecidas perante a Autoridade Marítima.

6. OBSERVAÇÕES TÉCNICAS:
O serviço técnico refere-se à análise de conformidade e regularização da embarcação supracitada, garantindo que a mesma atende aos requisitos de segurança da navegação vigentes.

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{engenheiro.nome}}
Responsável Técnico

__________________________________________
{{cliente.nome}}
Proprietário

EMPRESA:
{{empresa.nome}} (CNPJ: {{empresa.cnpj}})',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Termo de Responsabilidade Técnica'
ON CONFLICT DO NOTHING;
