-- Insert Requerimento de Vistoria Técnica Template
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
    'Requerimento de Vistoria Técnica',
    '# REQUERIMENTO DE VISTORIA TÉCNICA

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}  **RG:** {{cliente.rg}}
**Endereço:** {{cliente.endereco}}
**Cidade/UF:** {{cliente.cidade_uf}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento Total:** {{embarcacao.comprimento}} m
**Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m

## 3. DADOS DO MOTOR
**Fabricante:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 4. TIPO DE VISTORIA SOLICITADA
( ) Vistoria Inicial
( ) Vistoria de Renovação
( ) Vistoria de Alteração de Motor
( ) Vistoria de Regularização
( ) Vistoria de Segurança
( ) Vistoria de Transferência

## 5. SOLICITAÇÃO TÉCNICA
O requerente solicita a realização de **VISTORIA TÉCNICA** da embarcação acima identificada, declarando que as informações prestadas e documentos apresentados correspondem à realidade, assumindo total responsabilidade pelas informações constantes neste processo e pela segurança da navegação.

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
        "embarcacao.nome": "nome_embarcacao",
        "embarcacao.inscricao": "inscricao_embarcacao",
        "embarcacao.tipo": "tipo_embarcacao",
        "embarcacao.material": "material_casco",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template profissional para Requerimento de Vistoria Técnica com suporte a múltiplos tipos de inspeção naval.',
    'REQUERIMENTO',
    1,
    'out'
);

-- Link template to all process types as a mandatory document
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT id, (SELECT id FROM public.document_templates WHERE name = 'Requerimento de Vistoria Técnica' LIMIT 1), true
        FROM public.process_types;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('VISTORIA_TEMPLATE_READY', 'Template de Requerimento de Vistoria Técnica implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
