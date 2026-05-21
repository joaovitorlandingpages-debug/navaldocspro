-- Insert Requerimento de Alteração de Motor Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Requerimento de Alteração de Motor',
  'Documento oficial para solicitação de alteração de motorização de embarcação perante a Autoridade Marítima.',
  'technical',
  'REQUERIMENTO DE ALTERAÇÃO DE MOTOR

1. IDENTIFICAÇÃO DO PROPRIETÁRIO (REQUERENTE):
Nome: {{cliente.nome}}
CPF/CNPJ: {{cliente.cpf}}
RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}

2. IDENTIFICAÇÃO DA EMBARCAÇÃO:
Nome: {{embarcacao.nome}}
Número de Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}
Comprimento: {{embarcacao.comprimento}} m

3. DADOS DO MOTOR ANTIGO (A SUBSTITUIR):
Fabricante: {{motor_antigo.fabricante}}
Modelo: {{motor_antigo.modelo}}
Número de Série: {{motor_antigo.numero_serie}}
Potência: {{motor_antigo.potencia}} HP

4. DADOS DO MOTOR NOVO (A INSTALAR):
Fabricante: {{motor_novo.fabricante}}
Modelo: {{motor_novo.modelo}}
Número de Série: {{motor_novo.numero_serie}}
Potência: {{motor_novo.potencia}} HP

5. SOLICITAÇÃO E JUSTIFICATIVA:
O requerente acima identificado solicita à Autoridade Marítima a alteração do motor da embarcação descrita, declarando que as informações técnicas e os documentos apresentados correspondem à realidade dos fatos, assumindo total responsabilidade pelas informações constantes neste processo de {{processo.tipo}}.

A alteração justifica-se pela necessidade de modernização e melhoria da eficiência operacional da embarcação.

6. RESPONSÁVEL TÉCNICO:
Engenheiro: {{engenheiro.nome}}
CREA: {{engenheiro.crea}}

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{cliente.nome}}
Proprietário (Requerente)

__________________________________________
{{engenheiro.nome}}
Responsável Técnico

EMPRESA / RESPONSÁVEL:
{{empresa.nome}} (CNPJ: {{empresa.cnpj}})',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Requerimento de Alteração de Motor'
ON CONFLICT DO NOTHING;
