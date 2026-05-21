INSERT INTO public.document_templates (name, category, base_content, document_type_io, fields_config, description, is_active)
VALUES 
(
  'Requerimento de Licença de Estação (ANATEL)', 
  'Rádio e Comunicação', 
  'À AGÊNCIA NACIONAL DE TELECOMUNICAÇÕES - ANATEL

ASSUNTO: SOLICITAÇÃO DE LICENÇA DE ESTAÇÃO NAVAL

Eu, {{cliente.nome}}, proprietário da embarcação {{embarcacao.nome}}, venho por meio deste requerer a expedição/renovação da Licença de Estação de Rádio para a referida embarcação.

DADOS TÉCNICOS:
Equipamento: VHF/DSC
MMSI: {{embarcacao.mmsi}}
Indicativo de Chamada (Callsign): {{embarcacao.callsign}}

Declaro que os equipamentos operam nas frequências autorizadas para o Serviço Móvel Marítimo.

{{data_atual}}

________________________________________________
{{cliente.nome}}',
  'out',
  '{"required_fields": ["cliente.nome", "embarcacao.nome"]}',
  'Modelo de requerimento para licenciamento de rádio vhf/dsc junto à Anatel.',
  true
),
(
  'Invoice de Serviços Navais', 
  'Financeiro e GRU', 
  'INVOICE DE SERVIÇOS TÉCNICOS

EMISSOR: {{empresa.nome}}
CLIENTE: {{cliente.nome}}
PROCESSO: {{processo.numero}}

DESCRIÇÃO DOS SERVIÇOS:
- Assessoria Técnica para {{process_type}}
- Elaboração de Memorial Descritivo (Embarcação: {{embarcacao.nome}})
- Taxas DPC/Capitania (GRU)

VALOR TOTAL: R$ _______________

Condições de Pagamento: À vista na aprovação do protocolo.

{{data_atual}}',
  'out',
  '{"required_fields": ["cliente.nome", "processo.numero"]}',
  'Modelo de fatura profissional para cobrança de honorários técnicos e serviços.',
  true
)
ON CONFLICT (name) DO UPDATE 
SET base_content = EXCLUDED.base_content,
    fields_config = EXCLUDED.fields_config,
    description = EXCLUDED.description;