-- Update DPEM Template
UPDATE public.document_templates 
SET 
    name = 'DPEM — Seguro Obrigatório de Embarcação',
    base_content = '# DPEM — SEGURO OBRIGATÓRIO DE DANOS PESSOAIS CAUSADOS POR EMBARCAÇÕES

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Comprimento:** {{embarcacao.comprimento}} m  **Material:** {{embarcacao.material}}

## 3. DADOS DO MOTOR
**Fabricante:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 4. DADOS DO SEGURO (DPEM)
**Número da Apólice:** {{dpem.apolice}}
**Categoria do Seguro:** {{dpem.categoria}}
**Período de Cobertura / Validade:** {{dpem.validade}}

## 5. DECLARAÇÃO
O requerente declara que a embarcação acima identificada possui cobertura obrigatória de seguro DPEM conforme legislação aplicável, assumindo total responsabilidade pelas informações constantes neste processo perante a Autoridade Marítima.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Requerente / Proprietário

---
**Processo Interno:** {{processo.numero}}
**Empresa Responsável:** {{empresa.nome}} - CNPJ: {{empresa.cnpj}}',
    fields_config = '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.material": "material_casco",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "dpem.apolice": "numero_apolice_dpem",
        "dpem.categoria": "categoria_seguro_dpem",
        "dpem.validade": "validade_dpem",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    description = 'Template profissional para DPEM — Seguro Obrigatório de Embarcação com mapeamento de apólice e validade.',
    category = 'SEGURO',
    version_number = 1,
    document_type_io = 'out'
WHERE name = 'DPEM' OR name = 'DPEM — Seguro Obrigatório de Embarcação';

-- Link template to all process types as a mandatory document if not already linked
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT pt.id, dt.id, true
        FROM public.process_types pt
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'DPEM — Seguro Obrigatório de Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('DPEM_TEMPLATE_READY', 'Template de DPEM implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
