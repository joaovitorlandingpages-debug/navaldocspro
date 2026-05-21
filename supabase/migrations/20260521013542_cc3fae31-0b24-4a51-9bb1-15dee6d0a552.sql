-- Insert Laudo Técnico Template
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
    'Laudo Técnico de Embarcação',
    '# LAUDO TÉCNICO DE EMBARCAÇÃO

Ao Senhor Comandante da Capitania, Delegacia ou Agência em: {{localidade.capitania}}

## 1. IDENTIFICAÇÃO DO PROPRIETÁRIO
**Nome/Razão Social:** {{cliente.nome}}
**CPF/CNPJ:** {{cliente.cpf_cnpj}}
**Endereço:** {{cliente.endereco}}

## 2. IDENTIFICAÇÃO DA EMBARCAÇÃO
**Nome:** {{embarcacao.nome}}
**Inscrição/BIE:** {{embarcacao.inscricao}}
**Tipo:** {{embarcacao.tipo}}  **Material do Casco:** {{embarcacao.material}}
**Comprimento Total:** {{embarcacao.comprimento}} m
**Boca:** {{embarcacao.boca}} m  **Pontal:** {{embarcacao.pontal}} m

## 3. DADOS TÉCNICOS E PROPULSÃO
**Fabricante Motor:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 4. ANÁLISE TÉCNICA E CONDIÇÃO OPERACIONAL
**Tipo de Laudo:** {{laudo.tipo}}

**Análise:** 
Após análise técnica da embarcação acima identificada, verificou-se que suas características estruturais, operacionais e de motorização encontram-se compatíveis com as informações apresentadas neste processo, conforme documentação técnica analisada.

**Observações Técnicas:**
{{laudo.observacoes}}

## 5. CONCLUSÃO TÉCNICA
Certifica-se que a embarcação em apreço apresenta condições técnicas satisfatórias para a finalidade requerida, cumprindo as normas de segurança e estabilidade vigentes.

Nestes Termos,
Pede Deferimento.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{engenheiro.nome}}**
Responsável Técnico - CREA: {{engenheiro.crea}}

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
        "embarcacao.material": "material_casco",
        "embarcacao.comprimento": "comprimento_total",
        "embarcacao.boca": "boca_m",
        "embarcacao.pontal": "pontal_m",
        "motor.fabricante": "fabricante_motor",
        "motor.modelo": "modelo_motor",
        "motor.numero_serie": "serie_motor",
        "motor.potencia": "potencia_motor",
        "laudo.tipo": "tipo_laudo_selecionado",
        "laudo.observacoes": "observacoes_tecnicas_laudo",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template técnico profissional para Laudo Técnico de Embarcação com análise de estrutura, motor e segurança.',
    'LAUDO',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Laudo Técnico de Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('LAUDO_TEMPLATE_READY', 'Template de Laudo Técnico implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
