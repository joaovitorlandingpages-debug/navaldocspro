-- 1. ART / CREA
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'ART / CREA - Responsabilidade Técnica',
  'technical',
  'Anotação de Responsabilidade Técnica para serviços de engenharia naval.',
  '{
    "fields": [
      {"name": "engineer_name", "label": "Nome do Engenheiro", "type": "text", "required": true},
      {"name": "crea_number", "label": "Número do CREA", "type": "text", "required": true},
      {"name": "client_name", "label": "Nome do Cliente", "type": "text", "required": true},
      {"name": "vessel_name", "label": "Nome da Embarcação", "type": "text", "required": true},
      {"name": "technical_service", "label": "Serviço Técnico", "type": "textarea", "required": true},
      {"name": "process_id", "label": "Número do Processo", "type": "text", "required": false},
      {"name": "issue_date", "label": "Data de Emissão", "type": "date", "required": true}
    ]
  }'::jsonb
);

-- 2. Declaração de Extravio / Perda
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Declaração de Extravio ou Perda de Documento',
  'legal',
  'Declaração formal para casos de perda ou extravio de documentos da embarcação.',
  '{
    "fields": [
      {"name": "client_name", "label": "Nome do Declarante", "type": "text", "required": true},
      {"name": "lost_document", "label": "Documento Extraviado", "type": "text", "required": true},
      {"name": "vessel_name", "label": "Nome da Embarcação", "type": "text", "required": true},
      {"name": "reason", "label": "Motivo / Circunstância", "type": "textarea", "required": true},
      {"name": "location_date", "label": "Local e Data", "type": "text", "required": true}
    ]
  }'::jsonb
);

-- 4. Autorização de Terceiros
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Autorização para Terceiros - Representação',
  'legal',
  'Autorização para que terceiros representem o proprietário junto aos órgãos.',
  '{
    "fields": [
      {"name": "grantor_name", "label": "Nome do Autorizante", "type": "text", "required": true},
      {"name": "grantee_name", "label": "Nome do Autorizado", "type": "text", "required": true},
      {"name": "grantee_cpf", "label": "CPF do Autorizado", "type": "text", "required": true},
      {"name": "purpose", "label": "Finalidade da Autorização", "type": "text", "required": true},
      {"name": "vessel_name", "label": "Nome da Embarcação", "type": "text", "required": false},
      {"name": "process_ref", "label": "Referência do Processo", "type": "text", "required": false}
    ]
  }'::jsonb
);

-- 5. Autorização para Motor
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Autorização para Substituição de Motor',
  'technical',
  'Solicitação oficial para alteração de motorização da embarcação.',
  '{
    "fields": [
      {"name": "client_name", "label": "Nome do Proprietário", "type": "text", "required": true},
      {"name": "vessel_name", "label": "Nome da Embarcação", "type": "text", "required": true},
      {"name": "old_engine", "label": "Dados do Motor Antigo", "type": "text", "required": true},
      {"name": "new_engine", "label": "Dados do Motor Novo", "type": "text", "required": true},
      {"name": "invoice_number", "label": "Número da Nota Fiscal", "type": "text", "required": true},
      {"name": "engineer_name", "label": "Engenheiro Responsável", "type": "text", "required": true}
    ]
  }'::jsonb
);

-- 6. Requerimento Simplificado
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Requerimento Simplificado Naval',
  'official',
  'Modelo simplificado para solicitações diversas e processos de baixa complexidade.',
  '{
    "fields": [
      {"name": "requester_name", "label": "Nome do Requerente", "type": "text", "required": true},
      {"name": "request_subject", "label": "Assunto da Solicitação", "type": "text", "required": true},
      {"name": "request_details", "label": "Descrição do Pedido", "type": "textarea", "required": true},
      {"name": "vessel_name", "label": "Nome da Embarcação", "type": "text", "required": false}
    ]
  }'::jsonb
);

-- 7. Termo de Ciência de Pendências
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Termo de Ciência de Pendências Processuais',
  'legal',
  'Documento onde o cliente declara estar ciente das exigências e pendências do processo.',
  '{
    "fields": [
      {"name": "client_name", "label": "Nome do Cliente", "type": "text", "required": true},
      {"name": "process_id", "label": "Identificação do Processo", "type": "text", "required": true},
      {"name": "pending_items", "label": "Lista de Pendências", "type": "textarea", "required": true},
      {"name": "acknowledgment", "label": "Declaração de Ciência", "type": "textarea", "required": true}
    ]
  }'::jsonb
);

-- 8. Procuração Avançada
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Procuração Avançada - Poderes Específicos',
  'legal',
  'Procuração completa com poderes para protocolo, retirada de exigências e representação total.',
  '{
    "fields": [
      {"name": "grantor_full_data", "label": "Dados Completos do Outorgante", "type": "textarea", "required": true},
      {"name": "grantee_full_data", "label": "Dados Completos do Outorgado", "type": "textarea", "required": true},
      {"name": "specific_powers", "label": "Poderes Específicos", "type": "textarea", "required": true},
      {"name": "validity_date", "label": "Prazo de Validade", "type": "text", "required": false}
    ]
  }'::jsonb
);

-- 9. Declaração Embarcação Antiga
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Declaração de Propriedade - Embarcação Antiga',
  'legal',
  'Declaração de procedência e posse para embarcações sem documento original.',
  '{
    "fields": [
      {"name": "owner_name", "label": "Nome do Proprietário", "type": "text", "required": true},
      {"name": "vessel_characteristics", "label": "Características da Embarcação", "type": "textarea", "required": true},
      {"name": "origin_history", "label": "Histórico de Procedência", "type": "textarea", "required": true},
      {"name": "possession_time", "label": "Tempo de Posse", "type": "text", "required": true},
      {"name": "responsibility_clause", "label": "Termo de Responsabilidade", "type": "textarea", "required": true}
    ]
  }'::jsonb
);

-- 10. Recibo Compra e Venda Oficial
INSERT INTO public.document_templates (name, category, description, fields_config)
VALUES (
  'Recibo de Compra e Venda de Embarcação',
  'official',
  'Recibo oficial para transferência de propriedade com dados de pagamento.',
  '{
    "fields": [
      {"name": "seller_name", "label": "Nome do Vendedor", "type": "text", "required": true},
      {"name": "buyer_name", "label": "Nome do Comprador", "type": "text", "required": true},
      {"name": "vessel_data", "label": "Dados da Embarcação", "type": "textarea", "required": true},
      {"name": "sale_value", "label": "Valor da Venda", "type": "text", "required": true},
      {"name": "payment_method", "label": "Forma de Pagamento", "type": "text", "required": true},
      {"name": "sale_date", "label": "Data da Transação", "type": "date", "required": true}
    ]
  }'::jsonb
);

-- Log final
INSERT INTO public.enterprise_audit_logs (action, entity_type, old_data)
VALUES ('REMAINING_DOCUMENTS_READY', 'SYSTEM', '{"message": "Biblioteca documental estendida com 10 novos templates operacionais."}'::jsonb);
