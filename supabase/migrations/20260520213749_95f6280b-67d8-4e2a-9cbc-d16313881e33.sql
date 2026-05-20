-- 1. Popular Categorias de Documentos
INSERT INTO public.document_categories (id, name, description) VALUES
  (gen_random_uuid(), 'Registro', 'Documentos de propriedade e inscrição da embarcação'),
  (gen_random_uuid(), 'Certificados', 'Certificados de segurança e conformidade técnica'),
  (gen_random_uuid(), 'Engenharia', 'Plantas, memoriais e cálculos técnicos'),
  (gen_random_uuid(), 'Financeiro', 'Taxas, comprovantes e faturamento'),
  (gen_random_uuid(), 'Tripulação', 'Documentos de pessoal e qualificação'),
  (gen_random_uuid(), 'Rádio/Anatel', 'Licenças e certificados de comunicações')
ON CONFLICT (name) DO NOTHING;

-- 2. Popular Tipos de Processo
INSERT INTO public.process_types (id, name, description, category) VALUES
  (gen_random_uuid(), 'Registro Inicial', 'Inscrição de embarcação nova nos órgãos competentes', 'Registro'),
  (gen_random_uuid(), 'Transferência de Propriedade', 'Mudança de titularidade da embarcação', 'Registro'),
  (gen_random_uuid(), 'Renovação TIE/TIEM', 'Atualização do Título de Inscrição de Embarcação', 'Registro'),
  (gen_random_uuid(), 'Alteração de Motor', 'Regularização de troca ou inclusão de motorização', 'Engenharia'),
  (gen_random_uuid(), 'Vistoria Técnica', 'Processo de inspeção para certificados de segurança', 'Certificados'),
  (gen_random_uuid(), 'Licença Rádio/Anatel', 'Emissão ou renovação de licença de estação', 'Rádio/Anatel'),
  (gen_random_uuid(), 'Regularização', 'Correção de pendências administrativas ou técnicas', 'Registro'),
  (gen_random_uuid(), 'Segunda Via', 'Emissão de via substituta de documentos perdidos', 'Registro'),
  (gen_random_uuid(), 'Memorial Técnico', 'Elaboração e aprovação de documentação técnica', 'Engenharia')
ON CONFLICT (name) DO NOTHING;

-- 3. Popular Templates Reais
-- Primeiro pegamos os IDs das categorias para vincular corretamente
DO $$
DECLARE
    cat_registro UUID;
    cat_engenharia UUID;
BEGIN
    SELECT id INTO cat_registro FROM public.document_categories WHERE name = 'Registro' LIMIT 1;
    SELECT id INTO cat_engenharia FROM public.document_categories WHERE name = 'Engenharia' LIMIT 1;

    INSERT INTO public.document_templates (id, name, description, category_id, is_active) VALUES
      (gen_random_uuid(), 'BCE', 'Boletim de Cadastro de Embarcação', cat_registro, true),
      (gen_random_uuid(), 'BADE/BSADE', 'Boletim de Atualização de Dados de Embarcação', cat_registro, true),
      (gen_random_uuid(), 'Requerimento DPC-2211', 'Requerimento Geral à Marinha do Brasil', cat_registro, true),
      (gen_random_uuid(), 'Procuração', 'Poderes específicos para trâmites navais', cat_registro, true),
      (gen_random_uuid(), 'Declaração de Responsabilidade', 'Assunção de responsabilidade técnica ou civil', cat_registro, true),
      (gen_random_uuid(), 'Termo de Responsabilidade', 'Termo de compromisso do proprietário', cat_registro, true),
      (gen_random_uuid(), 'Memorial Técnico', 'Documento técnico descritivo da embarcação', cat_engenharia, true),
      (gen_random_uuid(), 'Requerimento Renovação', 'Solicitação específica para renovação de TIE', cat_registro, true),
      (gen_random_uuid(), 'Requerimento Transferência', 'Solicitação específica para transferência', cat_registro, true)
    ON CONFLICT (name) DO NOTHING;
END $$;

-- 4. Vincular Checklist Automático (Pacotes Documentais)
-- Vamos vincular alguns documentos obrigatórios aos tipos de processo populares
DO $$
DECLARE
    type_registro UUID;
    type_transf UUID;
    temp_bce UUID;
    temp_requerimento UUID;
    temp_procuracao UUID;
    temp_bade UUID;
    temp_memorial UUID;
BEGIN
    -- IDs de Tipos
    SELECT id INTO type_registro FROM public.process_types WHERE name = 'Registro Inicial' LIMIT 1;
    SELECT id INTO type_transf FROM public.process_types WHERE name = 'Transferência de Propriedade' LIMIT 1;
    
    -- IDs de Templates
    SELECT id INTO temp_bce FROM public.document_templates WHERE name = 'BCE' LIMIT 1;
    SELECT id INTO temp_requerimento FROM public.document_templates WHERE name = 'Requerimento DPC-2211' LIMIT 1;
    SELECT id INTO temp_procuracao FROM public.document_templates WHERE name = 'Procuração' LIMIT 1;
    SELECT id INTO temp_bade FROM public.document_templates WHERE name = 'BADE/BSADE' LIMIT 1;
    SELECT id INTO temp_memorial FROM public.document_templates WHERE name = 'Memorial Técnico' LIMIT 1;

    -- Checklist para Registro Inicial
    IF type_registro IS NOT NULL THEN
      INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, document_role, order_index) VALUES
        (type_registro, temp_bce, true, 'gerado', 1),
        (type_registro, temp_requerimento, true, 'gerado', 2),
        (type_registro, temp_procuracao, false, 'upload', 3),
        (type_registro, temp_memorial, true, 'upload', 4)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Checklist para Transferência
    IF type_transf IS NOT NULL THEN
      INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, document_role, order_index) VALUES
        (type_transf, temp_bade, true, 'gerado', 1),
        (type_transf, temp_requerimento, true, 'gerado', 2),
        (type_transf, temp_procuracao, true, 'upload', 3)
      ON CONFLICT DO NOTHING;
    END IF;
END $$;
