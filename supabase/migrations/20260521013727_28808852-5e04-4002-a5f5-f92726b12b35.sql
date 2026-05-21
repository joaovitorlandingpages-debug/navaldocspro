-- Insert Declaração de Material e Construção Template
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
    'Declaração de Material e Construção da Embarcação',
    '# DECLARAÇÃO DE MATERIAL E CONSTRUÇÃO DA EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Comprimento:** {{embarcacao.comprimento}} m  **Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m
**Capacidade:** {{embarcacao.capacidade}} pessoas

## 3. DADOS TÉCNICOS DA CONSTRUÇÃO
**Estaleiro Construtor:** {{construcao.estaleiro}}
**Material Principal:** {{construcao.material_principal}}
**Ano de Construção:** {{construcao.ano}}
**Método Construtivo:** {{construcao.metodo}}

## 4. TIPO DE CONSTRUÇÃO / MATERIAL
( ) Fibra (PRFV)
( ) Alumínio
( ) Madeira
( ) Aço
( ) Construção Mista

## 5. DADOS DE PROPULSÃO (RESUMO)
**Fabricante Motor:** {{motor.fabricante}}
**Modelo:** {{motor.modelo}}
**Potência:** {{motor.potencia}} HP

## 6. DECLARAÇÃO TÉCNICA
Declara-se, para os devidos fins, que a embarcação acima identificada foi construída conforme as características técnicas e estruturais descritas neste documento, utilizando os materiais informados e atendendo às informações técnicas constantes no processo, garantindo a integridade estrutural para a finalidade de uso declarada.

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
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "embarcacao.material": "material_casco",
        "embarcacao.capacidade": "capacidade_total",
        "construcao.estaleiro": "estaleiro_construtor",
        "construcao.material_principal": "material_principal_const",
        "construcao.ano": "ano_construcao",
        "construcao.metodo": "metodo_construtivo",
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
    'Template técnico profissional para Declaração de Material e Construção com detalhamento de materiais, estaleiro e método construtivo.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Material e Construção da Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('MATERIAL_TEMPLATE_READY', 'Template de Declaração de Material e Construção implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
