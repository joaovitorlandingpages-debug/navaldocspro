-- Insert Relatório de Vistoria Operacional Template
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
    'Relatório de Vistoria Operacional de Embarcação',
    '# RELATÓRIO DE VISTORIA OPERACIONAL DE EMBARCAÇÃO

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

## 3. DADOS DO MOTOR E PROPULSÃO
**Fabricante:** {{motor.fabricante}}  **Modelo:** {{motor.modelo}}
**Número de Série:** {{motor.numero_serie}}  **Potência:** {{motor.potencia}} HP

## 4. DADOS DA VISTORIA
**Tipo de Vistoria:** {{vistoria.tipo}}
**Data da Realização:** {{vistoria.data}}
**Resultado Final:** {{vistoria.resultado}}

## 5. CHECKLIST TÉCNICO DE VERIFICAÇÃO
[X] Casco e Estrutura: {{checklist.casco}}
[X] Sistema de Motorização: {{checklist.motor}}
[X] Documentação Obrigatória: {{checklist.documentacao}}
[X] Itens de Segurança (Coletes/Extintores): {{checklist.seguranca}}
[X] Iluminação e Sinalização: {{checklist.iluminacao}}
[X] Rádio e Comunicação: {{checklist.comunicacao}}

## 6. PARECER TÉCNICO
Foi realizada vistoria operacional na embarcação acima identificada, verificando-se suas condições estruturais, operacionais e documentais conforme informações e documentos apresentados neste processo.

**Observações Técnicas:**
{{vistoria.observacoes}}

## 7. CONCLUSÃO
Considerando os itens verificados, a embarcação encontra-se em condições satisfatórias para a navegação e operação na categoria pretendida.

{{localidade.cidade}}, {{data.extenso}}

__________________________________________________
**{{engenheiro.nome}}**
Vistoriador / Responsável Técnico - CREA: {{engenheiro.crea}}

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
        "vistoria.tipo": "tipo_vistoria_op",
        "vistoria.data": "data_vistoria_op",
        "vistoria.resultado": "resultado_vistoria_op",
        "checklist.casco": "status_casco",
        "checklist.motor": "status_motor",
        "checklist.documentacao": "status_documentacao",
        "checklist.seguranca": "status_seguranca",
        "checklist.iluminacao": "status_iluminacao",
        "checklist.comunicacao": "status_comunicacao",
        "vistoria.observacoes": "obs_tecnicas_vistoria",
        "engenheiro.nome": "nome_engenheiro",
        "engenheiro.crea": "crea_engenheiro",
        "empresa.nome": "nome_empresa",
        "empresa.cnpj": "cnpj_empresa",
        "processo.numero": "numero_processo",
        "localidade.capitania": "capitania_destino",
        "localidade.cidade": "cidade_assinatura",
        "data.extenso": "data_atual_extenso"
    }',
    'Template técnico profissional para Relatório de Vistoria Operacional com checklist completo de segurança e estrutura.',
    'RELATORIO',
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
        CROSS JOIN (SELECT id FROM public.document_templates WHERE name = 'Relatório de Vistoria Operacional de Embarcação' LIMIT 1) dt
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log the event
INSERT INTO public.system_logs (event_type, message, module, metadata)
VALUES ('RELATORIO_VISTORIA_TEMPLATE_READY', 'Template de Relatório de Vistoria Operacional implantado e conectado com sucesso.', 'document_automation', '{"version": "1.0"}');
