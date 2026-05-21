-- Update Certificado de Segurança da Navegação (CSN) Template if it exists
UPDATE public.document_templates 
SET 
    base_content = '# CERTIFICADO DE SEGURANÇA DA NAVEGAÇÃO (CSN)

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento Total:** {{embarcacao.comprimento}} m
**Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m
**Capacidade Total:** {{embarcacao.capacidade}} pessoas

## 2. IDENTIFICAÇÃO DO PROPRIETÁRIO
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 3. DADOS TÉCNICOS E PROPULSÃO
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 4. CATEGORIA E VALIDADE
**Categoria de Navegação:** {{seguranca.categoria_navegacao}}
**Lotação Permitida:** {{seguranca.lotacao}}
**Validade do Certificado:** {{seguranca.validade}}

## 5. DECLARAÇÃO TÉCNICA
Certifica-se que a embarcação acima identificada atende às condições mínimas de segurança da navegação exigidas para sua categoria operacional, conforme informações técnicas e documentos apresentados neste processo, estando apta a navegar nos limites estabelecidos pela Autoridade Marítima.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{cliente.nome}}**
Proprietário / Requerente

---
**Responsável Técnico:** {{engenheiro.nome}} - CREA: {{engenheiro.crea}}
**Processo Interno:** {{processo.numero}}
**Empresa:** {{empresa.nome}}',
    fields_config = '{
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
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "seguranca.categoria_navegacao": "categoria_nav",
        "seguranca.lotacao": "lotacao_max",
        "seguranca.validade": "validade_csn",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    description = 'Template técnico profissional para Certificado de Segurança da Navegação (CSN) com mapeamento de capacidades e categorias.',
    category = 'CERTIFICADO',
    version_number = 1,
    document_type_io = 'out'
WHERE name = 'Certificado de Segurança da Navegação (CSN)';

-- Link template to all process types as a mandatory document if not already linked
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'process_type_documents') THEN
        INSERT INTO public.process_type_documents (process_type_id, document_template_id, is_mandatory)
        SELECT pt.id, dt.id, true
        FROM public.process_types pt
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Certificado de Segurança da Navegação (CSN)' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('CSN_TEMPLATE_READY', 'Template de CSN atualizado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
