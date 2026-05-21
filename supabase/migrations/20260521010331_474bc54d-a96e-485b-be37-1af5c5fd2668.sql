-- Insert Declaração de Responsabilidade Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Declaração de Responsabilidade para Processo Naval',
  'Documento formal onde o declarante assume responsabilidade pelas informações e documentos apresentados no processo.',
  'legal',
  'DECLARAÇÃO DE RESPONSABILIDADE PARA PROCESSO NAVAL

IDENTIFICAÇÃO DO DECLARANTE:
Nome: {{cliente.nome}}
CPF: {{cliente.cpf}}
RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}

IDENTIFICAÇÃO DA EMBARCAÇÃO:
Nome: {{embarcacao.nome}}
Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}

MOTORIZAÇÃO (se aplicável):
Fabricante: {{motor.fabricante}}
Potência: {{motor.potencia}} HP

DECLARAÇÃO:
Declaro, para os devidos fins, que as informações apresentadas neste processo de {{processo.tipo}} são verdadeiras, assumindo integral responsabilidade civil, administrativa e criminal pelas informações prestadas e documentos apresentados perante a Autoridade Marítima, conforme previsto na legislação vigente.

Assevero ainda que os documentos originais que deram origem às cópias apresentadas encontram-se sob minha guarda e serão exibidos à Autoridade Marítima quando solicitados.

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{cliente.nome}}
Declarante

EMPRESA / DESPACHANTE RESPONSÁVEL:
{{empresa.nome}} (CNPJ: {{empresa.cnpj}})',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Declaração de Responsabilidade para Processo Naval'
ON CONFLICT DO NOTHING;
