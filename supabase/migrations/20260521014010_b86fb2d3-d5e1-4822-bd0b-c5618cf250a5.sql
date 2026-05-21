-- Insert Declaração de Procedência e Propriedade Template
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
    'Declaração de Procedência e Propriedade da Embarcação',
    '# DECLARAÇÃO DE PROCEDÊNCIA E PROPRIEDADE DA EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO (DECLARANTE)
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DO VENDEDOR / ORIGEM
**Nome:** {{vendedor.nome}}
**CPF/CNPJ:** {{vendedor.cpf_cnpj}}  **RG:** {{vendedor.rg}}

## 3. IDENTIFICAÇÃO DA EMBARCAÇÃO E MOTOR
**Nome da Embarcação:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}  **Comprimento:** {{embarcacao.comprimento}} m
**Material do Casco:** {{embarcacao.material}}

**Dados do Motor:** {{motor.fabricante}} {{motor.modelo}} - Série: {{motor.numero_serie}}

## 4. TIPO DE PROCEDÊNCIA
( ) Compra Particular
( ) Compra de Estaleiro
( ) Transferência de Propriedade
( ) Construção Própria
( ) Regularização
( ) Embarcação Antiga sem Registro

## 5. DECLARAÇÃO DE PROPRIEDADE
Declaro, para os devidos fins, que a embarcação acima identificada é de minha legítima propriedade, possuindo procedência lícita e documentação compatível com as informações apresentadas neste processo, assumindo integral responsabilidade civil e criminal pelas declarações prestadas perante a Autoridade Marítima.

## 6. HISTÓRICO DE AQUISIÇÃO / OBSERVAÇÕES
{{procedencia.historico_aquisicao}}

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Declarante / Requerente

---
**Processo Interno:** {{processo.numero}}
**Empresa Responsável:** {{empresa.nome}} - CNPJ: {{empresa.cnpj}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "vendedor.nome": "nome_vendedor",
        "vendedor.cpf_cnpj": "documento_vendedor",
        "vendedor.rg": "rg_vendedor",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.material": "material_casco",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "procedencia.historico_aquisicao": "historico_aquisicao_obs",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional jurídico-operacional para Declaração de Procedência e Propriedade da Embarcação.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Procedência e Propriedade da Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('PROCEDENCIA_TEMPLATE_READY', 'Template de Procedência e Propriedade implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
