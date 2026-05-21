-- Insert Declaração de Potência e Motorização Template
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
    'Declaração de Potência e Motorização',
    '# DECLARAÇÃO DE POTÊNCIA E MOTORIZAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO / REQUERENTE
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}
**Comprimento:** {{embarcacao.comprimento}} m

## 3. DADOS TÉCNICOS DA MOTORIZAÇÃO
**Fabricante:** {{motor.fabricante}}
**Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}
**Potência:** {{motor.potencia}} HP
**Tipo de Combustível:** {{motor.tipo_combustivel}}
**Quantidade de Motores:** {{motor.quantidade}}

## 4. TIPO DE DECLARAÇÃO
( ) Declaração de Motor Novo
( ) Declaração de Alteração de Motor
( ) Declaração de Potência
( ) Declaração de Regularização
( ) Declaração de Motorização Técnica

## 5. DECLARAÇÃO TÉCNICA
Declara-se, para os devidos fins, que a motorização instalada na embarcação acima identificada corresponde às características técnicas apresentadas neste processo, atendendo às informações e documentos analisados, garantindo a compatibilidade técnica entre casco e motor.

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
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "motor.tipo_combustivel": "combustivel_motor",
        "motor.quantidade": "quantidade_motores",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template técnico profissional para Declaração de Potência e Motorização com detalhamento de motores e combustível.',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Declaração de Potência e Motorização' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('MOTOR_DECLARATION_TEMPLATE_READY', 'Template de Declaração de Potência e Motorização implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
