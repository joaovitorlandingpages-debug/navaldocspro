-- Insert Declaração de Responsabilidade sobre Documentos e Informações Template
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
    'Declaração de Responsabilidade sobre Documentos e Informações Apresentadas',
    '# DECLARAÇÃO DE RESPONSABILIDADE SOBRE DOCUMENTOS E INFORMAÇÕES APRESENTADAS

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO DECLARANTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO E PROCESSO
**Nome da Embarcação:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Número do Processo:** {{processo.numero}}
**Tipo de Processo:** {{processo.tipo}}

## 3. TERMO DE RESPONSABILIDADE
Declaro, para os devidos fins, que todos os documentos, informações técnicas e dados apresentados neste processo correspondem à realidade, assumindo integral responsabilidade civil, administrativa e criminal pelas informações fornecidas perante os órgãos competentes.

## 4. ESCOPO DA RESPONSABILIDADE
( ) Responsabilidade Geral
( ) Responsabilidade Técnica
( ) Responsabilidade Documental
( ) Responsabilidade Operacional
( ) Responsabilidade de Regularização

## 5. DECLARAÇÃO DE VERACIDADE
O declarante acima identificado afirma que as cópias de documentos anexadas conferem com os originais e que não houve omissão de fatos que possam influenciar na análise técnica ou jurídica deste processo pela Autoridade Marítima.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Declarante / Requerente

---
**Responsável Técnico (se aplicável):** {{engenheiro.nome}} - CREA: {{engenheiro.crea}}
**Empresa Responsável:** {{empresa.nome}} - CNPJ: {{empresa.cnpj}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "processo.numero": "numero_processo",
        "processo.tipo": "tipo_processo_naval",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional jurídico-operacional para Declaração de Responsabilidade sobre a veracidade de documentos e informações.',
    'DECLARACAO',
    1,
    'out'
);

-- Link template to all process types as a mandatory document
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT pt.id, dt.id, true
        FROM public.process_types pt
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Responsabilidade sobre Documentos e Informações Apresentadas' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('RESPONSABILIDADE_TEMPLATE_READY', 'Template de Responsabilidade Documental implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
