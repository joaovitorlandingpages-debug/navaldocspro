-- Insert Requerimento de Licença Rádio / ANATEL Template
INSERT INTO public.document_templates (
    name, 
    base_content, 
    fields_config, 
    description, 
    category, 
    version_number,
    document_type_io
)
VALUES (
    'Requerimento de Licença Rádio / ANATEL',
    '# REQUERIMENTO DE LICENÇA DE ESTAÇÃO RÁDIO (ANATEL)

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}
**Cidade/UF:** {{cliente.cidade_uf}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}

## 3. DADOS DA ESTAÇÃO RÁDIO E EQUIPAMENTOS
**Fabricante Equipamento:** {{radio.fabricante}}
**Modelo:** {{radio.modelo}}
**Número de Série:** {{radio.numero_serie}}

**Call Sign (Indicativo de Chamada):** {{radio.callsign}}
**MMSI:** {{radio.mmsi}}

## 4. TIPO DE SOLICITAÇÃO
( ) Concessão de Nova Licença
( ) Renovação de Licença
( ) Alteração de Equipamento
( ) Segunda Via de Licença
( ) Regularização Cadastral

## 5. SOLICITAÇÃO
O requerente solicita o **CADASTRAMENTO / LICENCIAMENTO** da estação rádio da embarcação acima identificada, declarando que as informações apresentadas e documentos anexados correspondem à realidade, assumindo total responsabilidade pelas informações constantes neste processo perante a Autoridade Marítima e a ANATEL.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Requerente / Representante Legal

---
**Processo Interno:** {{processo.numero}}
**Empresa Responsável:** {{empresa.nome}} - CNPJ: {{empresa.cnpj}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "cliente.cidade_uf": "cidade_uf_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "radio.fabricante": "fabricante_radio",
        "radio.modelo": "modelo_radio",
        "radio.numero_serie": "serie_radio",
        "radio.callsign": "callsign_radio",
        "radio.mmsi": "mmsi_radio",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional para Requerimento de Licença Rádio / ANATEL com mapeamento de MMSI, Call Sign e equipamentos.',
    'REQUERIMENTO',
    1,
    'out'
);

-- Link template to all process types as a mandatory document
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT id, (SELECT id FROM public.document_templates WHERE name = 'Requerimento de Licença Rádio / ANATEL' LIMIT 1), true
        FROM public.process_types;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('RADIO_TEMPLATE_READY', 'Template de Requerimento Rádio/ANATEL implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
