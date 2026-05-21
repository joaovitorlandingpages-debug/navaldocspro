INSERT INTO public.document_templates (name, category, base_content, document_type_io, fields_config, description, is_active)
VALUES 
(
  'Requerimento DPC-2211', 
  'Propriedade e Registro', 
  'À CAPITANIA DOS PORTOS / DELEGACIA / AGÊNCIA EM: ____________________

REQUERIMENTO DE SERVIÇO NAVAL

Senhor Capitão dos Portos,

Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, venho requerer a V.Sa. o serviço de {{process_type}} para a embarcação {{embarcacao.nome}}, inscrita sob o nº {{embarcacao.inscricao}}.

Nestes termos, pede deferimento.

Local e Data: {{data_atual}}

________________________________________________
Assinatura do Requerente',
  'out',
  '{"required_fields": ["cliente.nome", "embarcacao.nome"]}',
  'Modelo padrão de requerimento para diversos serviços junto à Autor Autoridade Marítima.',
  true
),
(
  'Declaração de Residência', 
  'Identificação Pessoal', 
  'DECLARAÇÃO DE RESIDÊNCIA

Eu, {{cliente.nome}}, portador do CPF {{cliente.cpf}}, declaro sob as penas da lei que resido no endereço abaixo descrito:

Endereço: ____________________________________________________________________
Cidade: __________________________ UF: ____ CEP: ______________

Declaro ainda estar ciente de que a falsidade ideológica em documento público é crime previsto no Código Penal.

{{data_atual}}

________________________________________________
{{cliente.nome}}',
  'out',
  '{"required_fields": ["cliente.nome", "cliente.cpf"]}',
  'Declaração de residência para fins de cadastro na Marinha e órgãos navais.',
  true
),
(
  'BADE (Bilhete de Seguro Obrigatório)', 
  'Propriedade e Registro', 
  'BADE - BILHETE DE SEGURO OBRIGATÓRIO (DPEM)

Este documento comprova a solicitação e validade do seguro obrigatório DPEM para a embarcação {{embarcacao.nome}}.

Proprietário: {{cliente.nome}}
Inscrição: {{embarcacao.inscricao}}
AB: {{embarcacao.ab}}

Vigência: {{data_atual}} a ____________________

Emitido eletronicamente via {{empresa.nome}}.',
  'out',
  '{"required_fields": ["cliente.nome", "embarcacao.nome"]}',
  'Comprovante de seguro obrigatório contra danos pessoais causados por embarcações.',
  true
)
ON CONFLICT (name) DO UPDATE 
SET base_content = EXCLUDED.base_content,
    fields_config = EXCLUDED.fields_config,
    description = EXCLUDED.description;