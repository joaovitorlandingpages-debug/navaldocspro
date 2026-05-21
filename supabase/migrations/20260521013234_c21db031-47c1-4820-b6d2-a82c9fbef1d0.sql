-- Insert Requerimento de Segunda Via TIE/TIEM Template
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
    'Requerimento de Segunda Via TIE/TIEM',
    '# REQUERIMENTO DE SEGUNDA VIA DE TIE / TIEM

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}
**Cidade/UF:** {{cliente.cidade_uf}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}

## 3. DADOS DO DOCUMENTO ORIGINAL (TIE/TIEM)
**Número do Documento:** {{tie.numero}}
**Data de Emissão:** {{tie.data_emissao}}
**Validade:** {{tie.validade}}

## 4. MOTIVO DA SOLICITAÇÃO DE SEGUNDA VIA
( ) Perda
( ) Extravio
( ) Roubo / Furto
( ) Danificação (documento ilegível)
( ) Atualização de dados cadastrais

## 5. SOLICITAÇÃO
O requerente solicita a emissão de **SEGUNDA VIA** do TIE/TIEM da embarcação acima identificada, declarando que as informações prestadas e documentos apresentados correspondem à realidade, assumindo total responsabilidade pelas informações constantes neste processo.

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
        "tie.numero": "numero_tie",
        "tie.data_emissao": "emissao_tie",
        "tie.validade": "validade_tie",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional para Requerimento de Segunda Via de TIE/TIEM com seleção de motivos e mapeamento de dados do documento original.',
    'REQUERIMENTO',
    1,
    'out'
);

-- Link template to all process types as a mandatory document
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT id, (SELECT id FROM public.document_templates WHERE name = 'Requerimento de Segunda Via TIE/TIEM' LIMIT 1), true
        FROM public.process_types;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('SEGUNDA_VIA_TEMPLATE_READY', 'Template de Requerimento de Segunda Via TIE/TIEM implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
