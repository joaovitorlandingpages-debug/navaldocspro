-- Insert Declaração de Uso e Finalidade Template
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
    'Declaração de Uso e Finalidade da Embarcação',
    '# DECLARAÇÃO DE USO E FINALIDADE DA EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Comprimento:** {{embarcacao.comprimento}} m  **Material:** {{embarcacao.material}}

## 3. FINALIDADE OPERACIONAL E USO
**Tipo de Utilização:**
( ) Recreio
( ) Pesca
( ) Transporte
( ) Turismo
( ) Apoio Operacional
( ) Serviço Técnico
( ) Uso Particular
( ) Uso Comercial

**Finalidade Principal:** {{operacao.finalidade}}
**Categoria de Navegação:** {{operacao.categoria}}
**Área de Operação:** {{operacao.area_navegacao}}

## 4. DADOS DE PROPULSÃO (RESUMO)
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Potência:** {{motor.potencia}} HP

## 5. DECLARAÇÃO
Declara-se, para os devidos fins, que a embarcação acima identificada será utilizada conforme a finalidade operacional descrita neste documento, atendendo às características e limitações compatíveis com sua categoria de navegação, assumindo o declarante total responsabilidade pelo uso adequado da embarcação perante a Autoridade Marítima.

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
        "cliente.endereco": "endereco_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.material": "material_casco",
        "operacao.finalidade": "finalidade_uso_embarcacao",
        "operacao.categoria": "categoria_navegacao_uso",
        "operacao.area_navegacao": "area_navegacao_operacao",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.potencia": "potencia_motor",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional para Declaração de Uso e Finalidade com mapeamento de categorias de navegação e áreas de operação.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Uso e Finalidade da Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('FINALIDADE_TEMPLATE_READY', 'Template de Declaração de Uso e Finalidade implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
