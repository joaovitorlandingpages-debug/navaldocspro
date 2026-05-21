-- Insert Procuração Template
INSERT INTO public.document_templates (name, description, category, base_content, version_number)
VALUES (
  'Procuração para Representação em Processo Naval',
  'Documento formal para representação junto à Autoridade Marítima e órgãos competentes.',
  'legal',
  'PROCURAÇÃO PARA REPRESENTAÇÃO EM PROCESSO NAVAL

OUTORGANTE:
Nome: {{cliente.nome}}
CPF: {{cliente.cpf}}
RG: {{cliente.rg}}
Endereço: {{cliente.endereco}}
Telefone: {{cliente.telefone}}
E-mail: {{cliente.email}}

OUTORGADO:
Empresa: {{empresa.nome}}
CNPJ: {{empresa.cnpj}}
Responsável: {{empresa.responsavel}}
Endereço: {{empresa.endereco}}
Telefone: {{empresa.telefone}}

EMBARCAÇÃO:
Nome: {{embarcacao.nome}}
Inscrição/TIE: {{embarcacao.inscricao}}
Tipo: {{embarcacao.tipo}}

PROCESSO:
Número: {{processo.numero}}
Tipo: {{processo.tipo}}

PODERES:
O outorgante nomeia e constitui seu bastante procurador para representá-lo perante a Autoridade Marítima, Capitania dos Portos, Delegacias, Agências, órgãos públicos competentes e demais entidades relacionadas, podendo assinar requerimentos, apresentar documentos, acompanhar processos, retirar exigências, prestar declarações e praticar todos os atos necessários ao andamento do processo naval.

FINALIDADE:
A presente procuração destina-se especificamente ao processo de {{processo.tipo}} da embarcação acima identificada.

{{cliente.cidade}}, {{data_atual}}.

__________________________________________
{{cliente.nome}}
Outorgante

TESTEMUNHAS:

1. _______________________________________
CPF:

2. _______________________________________
CPF:',
  1
);

-- Link to all process types
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory)
SELECT pt.id, dt.id, true
FROM public.process_types pt, public.document_templates dt
WHERE dt.name = 'Procuração para Representação em Processo Naval'
ON CONFLICT DO NOTHING;
