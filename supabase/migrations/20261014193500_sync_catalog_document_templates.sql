-- ====================================================================
-- MIGRATION: 20261014193500_sync_catalog_document_templates.sql
-- SINCRONIZAÇÃO E RESOLUÇÃO DOS MODELOS DO CATÁLOGO NAVALDOCS PRO
-- ====================================================================
-- Versão Corrigida: Substituição de ON CONFLICT (name) por blocos condicionais
-- seguros que não dependem de constraint de unicidade preexistente em 'name',
-- garantindo execução sequencial limpa em instalações novas e testes.
-- ====================================================================

DO $$
BEGIN

  -- 1. Procuração Específica para Capitania dos Portos (slug: proc-representacao-naval)
  UPDATE public.document_templates
     SET code = 'proc-representacao-naval',
         is_global = true,
         is_active = true,
         lifecycle_status = 'published',
         validation_status = 'ativo',
         document_type_io = 'out',
         updated_at = now()
   WHERE company_id IS NULL
     AND (id = '685e8d1f-94dd-4b21-8d29-37573cffb0ac' OR name = 'Procuração para Representação em Processo Naval');

  -- 2. Declaração de Perda / Extravio de TIE (slug: decl-perda-extravio) - Mantido em revisão
  UPDATE public.document_templates
     SET code = 'decl-perda-extravio',
         is_global = true,
         is_active = false,
         lifecycle_status = 'draft',
         validation_status = 'em_revisao',
         document_type_io = 'out',
         updated_at = now()
   WHERE company_id IS NULL
     AND (id = '4208cf0a-0b13-4ba1-b600-06ab46eeb103' OR name = 'Declaração de Extravio ou Perda de Documento');

  -- 3. Requerimento Padrão do Interessado (slug: req-padrao-cpes / code: REQ-001)
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE (code = 'req-padrao-cpes' OR name = 'Requerimento Padrão do Interessado') AND company_id IS NULL) THEN
    INSERT INTO public.document_templates (
      name, code, category, document_type_io, is_global, is_active, lifecycle_status, validation_status, description, regional_scope
    ) VALUES (
      'Requerimento Padrão do Interessado',
      'req-padrao-cpes',
      'esporte_recreio',
      'out',
      true,
      true,
      'published',
      'ativo',
      'Requerimento oficial de solicitação de serviços de registro e emissão de TIE/TIEM perante a Capitania dos Portos / Del / Agência (NORMAM-211/DPC, Anexo 2-E).',
      'Nacional'
    );
  ELSE
    UPDATE public.document_templates
       SET code = 'req-padrao-cpes',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           updated_at = now()
     WHERE (code = 'req-padrao-cpes' OR name = 'Requerimento Padrão do Interessado')
       AND company_id IS NULL;
  END IF;

  -- 4. Declaração de Residência do Proprietário (slug: decl-residencia-naval / code: DEC-RES)
  UPDATE public.document_templates
     SET code = 'decl-residencia-naval',
         is_global = true,
         is_active = true,
         lifecycle_status = 'published',
         validation_status = 'ativo',
         document_type_io = 'out',
         updated_at = now()
   WHERE company_id IS NULL
     AND (code = 'DECL_RES_NAVAL' OR name = 'Declaração de Residência');

  -- 5. Requerimento Específico para Moto Aquática (Jet Ski) (slug: req-moto-aquatica / code: REQ-JET)
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE (code = 'req-moto-aquatica' OR name = 'Requerimento Específico para Moto Aquática (Jet Ski)') AND company_id IS NULL) THEN
    INSERT INTO public.document_templates (
      name, code, category, document_type_io, is_global, is_active, lifecycle_status, validation_status, description, regional_scope
    ) VALUES (
      'Requerimento Específico para Moto Aquática (Jet Ski)',
      'req-moto-aquatica',
      'moto_aquatica',
      'out',
      true,
      true,
      'published',
      'ativo',
      'Formulário de inscrição, renovação ou transferência com parâmetros técnicos dedicados a motonáutica (NORMAM-212/DPC, Anexo 3-B).',
      'Nacional'
    );
  ELSE
    UPDATE public.document_templates
       SET code = 'req-moto-aquatica',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           updated_at = now()
     WHERE (code = 'req-moto-aquatica' OR name = 'Requerimento Específico para Moto Aquática (Jet Ski)')
       AND company_id IS NULL;
  END IF;

  -- 6. Requerimento de Embarcação Profissional / Comercial (slug: req-comercial-prof / code: REQ-PROF)
  IF NOT EXISTS (SELECT 1 FROM public.document_templates WHERE (code = 'req-comercial-prof' OR name = 'Requerimento de Embarcação Profissional / Comercial') AND company_id IS NULL) THEN
    INSERT INTO public.document_templates (
      name, code, category, document_type_io, is_global, is_active, lifecycle_status, validation_status, description, regional_scope
    ) VALUES (
      'Requerimento de Embarcação Profissional / Comercial',
      'req-comercial-prof',
      'profissional',
      'out',
      true,
      true,
      'published',
      'ativo',
      'Requerimento de inscrição ou vistoria para embarcações de pesca, passageiros ou transporte comercial (NORMAM-201/DPC, Anexo 2-A).',
      'Nacional'
    );
  ELSE
    UPDATE public.document_templates
       SET code = 'req-comercial-prof',
           is_global = true,
           is_active = true,
           lifecycle_status = 'published',
           updated_at = now()
     WHERE (code = 'req-comercial-prof' OR name = 'Requerimento de Embarcação Profissional / Comercial')
       AND company_id IS NULL;
  END IF;

END $$;

