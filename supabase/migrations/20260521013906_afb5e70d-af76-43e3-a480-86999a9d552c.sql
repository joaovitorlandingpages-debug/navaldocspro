-- Insert Declaração de Navegação e Área Operacional Template
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
    'Declaração de Navegação e Área Operacional',
    '# DECLARAÇÃO DE NAVEGAÇÃO E ÁREA OPERACIONAL

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Comprimento:** {{embarcacao.comprimento}} m  **Capacidade:** {{embarcacao.capacidade}} pessoas

## 3. DADOS DE NAVEGAÇÃO E OPERAÇÃO
**Categoria de Navegação:**
( ) Interior
( ) Costeira
( ) Oceânica
( ) Apoio Portuário
( ) Turismo Náutico
( ) Pesca
( ) Recreio
( ) Transporte

**Área Operacional Especificada:** {{operacao.area_operacional}}
**Finalidade da Navegação:** {{operacao.finalidade}}
**Limites de Operação:** {{operacao.limite_operacao}}

## 4. DADOS TÉCNICOS DE PROPULSÃO
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Potência:** {{motor.potencia}} HP

## 5. DECLARAÇÃO TÉCNICA
Declara-se, para os devidos fins, que a embarcação acima identificada está apta para operar na área de navegação especificada neste documento, conforme características técnicas e operacionais apresentadas neste processo, respeitando rigorosamente os limites de mar aberto ou águas abrigadas definidos pela Autoridade Marítima.

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
        "embarcacao.capacidade": "capacidade_total",
        "operacao.area_operacional": "area_operacional_especifica",
        "operacao.finalidade": "finalidade_navegacao_uso",
        "operacao.limite_operacao": "limites_operacao_doc",
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
    'Template técnico profissional para Declaração de Navegação e Área Operacional com mapeamento de limites e áreas de mar.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Navegação e Área Operacional' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('AREA_OPERACIONAL_TEMPLATE_READY', 'Template de Área Operacional implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
