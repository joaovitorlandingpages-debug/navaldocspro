-- Insert Declaração de Construção Própria Template
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
    'Declaração de Construção Própria de Embarcação',
    '# DECLARAÇÃO DE CONSTRUÇÃO PRÓPRIA DE EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO CONSTRUTOR / PROPRIETÁRIO
**Nome:** {{cliente.nome}}
**CPF:** {{cliente.cpf}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome Sugerido:** {{embarcacao.nome}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento Total:** {{embarcacao.comprimento}} m
**Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m
**Capacidade de Passageiros:** {{embarcacao.capacidade}}

## 3. CARACTERÍSTICAS DA CONSTRUÇÃO
**Material Principal Utilizado:** {{construcao.material_principal}}
**Método Construtivo:** {{construcao.metodo}}
**Ano de Início/Conclusão:** {{construcao.ano}}
**Local da Construção:** {{construcao.local}}

## 4. TIPO DE CONSTRUÇÃO
( ) Construção Artesanal
( ) Construção Particular
( ) Construção Experimental
( ) Construção Própria para Regularização
( ) Construção Própria Inicial

## 5. DADOS DE PROPULSÃO
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 6. DECLARAÇÃO TÉCNICA E RESPONSABILIDADE
Declaro, para os devidos fins, que a embarcação acima identificada foi construída por meios próprios, conforme características técnicas e materiais descritos neste documento, assumindo integral responsabilidade pelas informações apresentadas neste processo perante a Autoridade Marítima.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Construtor / Proprietário

---
**Responsável Técnico:** {{engenheiro.nome}} - CREA: {{engenheiro.crea}}
**Processo Interno:** {{processo.numero}}
**Empresa Responsável:** {{empresa.nome}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.material": "material_casco",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "embarcacao.capacidade": "capacidade_total",
        "construcao.material_principal": "material_principal_const",
        "construcao.metodo": "metodo_construtivo",
        "construcao.ano": "ano_construcao",
        "construcao.local": "local_construcao",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template técnico-operacional profissional para Declaração de Construção Própria de Embarcação.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Construção Própria de Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('CONSTRUCAO_PROPRIA_TEMPLATE_READY', 'Template de Construção Própria implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
