-- Insert Requerimento de Registro Inicial Template
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
    'Requerimento de Registro Inicial de Embarcação',
    '# REQUERIMENTO DE REGISTRO INICIAL DE EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}
**Cidade/UF:** {{cliente.cidade_uf}}  **CEP:** {{cliente.cep}}
**Telefone:** {{cliente.telefone}}  **E-mail:** {{cliente.email}}

## 2. DADOS DA EMBARCAÇÃO
**Nome Sugerido:** {{embarcacao.nome}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento Total:** {{embarcacao.comprimento}} m
**Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m
**Arqueação Bruta (AB):** {{embarcacao.ab}}
**Capacidade de Passageiros:** {{embarcacao.capacidade}}
**Tripulação:** {{embarcacao.tripulacao}}

## 3. DADOS DO MOTOR
**Fabricante:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP
**Combustível:** {{motor.combustivel}}

## 4. FINALIDADE E USO
**Atividade:** {{embarcacao.atividade}}
**Área de Navegação:** {{embarcacao.area_navegacao}}

## 5. SOLICITAÇÃO
O requerente acima identificado solicita a V.S.ª o **REGISTRO INICIAL** da embarcação descrita, declarando que as informações apresentadas e documentos anexados correspondem à realidade, assumindo total responsabilidade pelas informações constantes neste processo.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Requerente / Representante Legal

---
**Responsável Técnico:** {{engenheiro.nome}} - CREA: {{engenheiro.crea}}
**Processo Interno:** {{processo.numero}}',
    '{
        "cliente.nome": "nome_cliente",
        "cliente.cpf_cnpj": "documento_cliente",
        "cliente.rg": "rg_cliente",
        "cliente.endereco": "endereco_cliente",
        "cliente.cidade_uf": "cidade_uf_cliente",
        "cliente.cep": "cep_cliente",
        "cliente.telefone": "telefone_cliente",
        "cliente.email": "email_cliente",
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.material": "material_casco",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "embarcacao.ab": "ab_embarcacao",
        "embarcacao.capacidade": "capacidade_passageiros",
        "embarcacao.tripulacao": "tripulacao_embarcacao",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "motor.combustivel": "combustivel_motor",
        "embarcacao.atividade": "atividade_uso",
        "embarcacao.area_navegacao": "area_navegacao",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional para Requerimento de Registro Inicial de Embarcação com mapeamento completo de dados técnicos e do proprietário.',
    'REQUERIMENTO',
    1,
    'out'
);

-- Link template to all process types as a mandatory document
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT id, (SELECT id FROM public.document_templates WHERE name = 'Requerimento de Registro Inicial de Embarcação' LIMIT 1), true
        FROM public.process_types;
    END IF;
END $$;

-- Log the event with correct columns
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('REGISTRO_INICIAL_TEMPLATE_READY', 'Template de Requerimento de Registro Inicial implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
