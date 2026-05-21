-- Insert Declaração de Capacidade e Lotação Template
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
    'Declaração de Capacidade e Lotação da Embarcação',
    '# DECLARAÇÃO DE CAPACIDADE E LOTAÇÃO DA EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento:** {{embarcacao.comprimento}} m  **Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m

## 3. DADOS DE CAPACIDADE E LOTAÇÃO
**Capacidade Máxima (AB):** {{embarcacao.capacidade}}
**Lotação Máxima Permitida:** {{lotacao.max_pessoas}} pessoas
**Categoria de Navegação:** {{lotacao.categoria_navegacao}}
**Tipo de Operação:** {{lotacao.tipo_operacao}}

## 4. TIPO DE DECLARAÇÃO
( ) Lotação Inicial
( ) Atualização de Capacidade
( ) Regularização de Lotação
( ) Alteração Técnica
( ) Declaração de Segurança Operacional

## 5. DADOS DE PROPULSÃO (RESUMO)
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Potência:** {{motor.potencia}} HP

## 6. DECLARAÇÃO TÉCNICA
Declara-se, para os devidos fins, que a embarcação acima identificada possui capacidade e lotação compatíveis com suas características técnicas e categoria operacional, conforme análise técnica e documentos apresentados neste processo, atendendo às normas de estabilidade e segurança da Autoridade Marítima.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{engenheiro.nome}}**
Responsável Técnico - CREA: {{engenheiro.crea}}

---
**Processo Interno:** {{processo.numero}}
**Empresa:** {{empresa.nome}} - CNPJ: {{empresa.cnpj}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.endereco": "endereco_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.material": "material_casco",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "embarcacao.capacidade": "capacidade_total",
        "lotacao.max_pessoas": "lotacao_maxima_permitida",
        "lotacao.categoria_navegacao": "categoria_navegacao_lot",
        "lotacao.tipo_operacao": "tipo_operacao_lot",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.potencia": "potencia_motor",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template técnico profissional para Declaração de Capacidade e Lotação com mapeamento de limites operacionais e estabilidade.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Capacidade e Lotação da Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('LOTACAO_TEMPLATE_READY', 'Template de Declaração de Capacidade e Lotação implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
