-- Sprint 4D F.2.d.b — Tabela de mapeamento de modelos do Processo Guiado (PFW).
-- Nenhum template é publicado por esta migration. Apenas cria a estrutura de mapeamento;
-- os mapeamentos entram como inativos e devem ser ativados manualmente por admin.

CREATE TABLE public.process_document_template_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = global
  service_kind text NOT NULL,           -- ServiceKind (renovacao, transferencia, ...)
  document_label text NOT NULL,         -- rótulo em ServiceDef.generatedDocs[i]
  process_type text NOT NULL,           -- ServiceDef.processType
  document_category text,               -- categoria canônica do documento
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE RESTRICT,
  required boolean NOT NULL DEFAULT true,
  region_tag text,                      -- NULL = qualquer região
  is_active boolean NOT NULL DEFAULT false, -- ativação manual pelo admin
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Um único mapeamento ATIVO por escopo (empresa|global, serviço, documento, região).
CREATE UNIQUE INDEX process_document_template_mappings_unique_active
  ON public.process_document_template_mappings (
    COALESCE(company_id::text, 'GLOBAL'),
    service_kind,
    document_label,
    COALESCE(region_tag, 'ANY')
  )
  WHERE is_active = true;

CREATE INDEX process_document_template_mappings_service_idx
  ON public.process_document_template_mappings (service_kind, document_label);
CREATE INDEX process_document_template_mappings_company_idx
  ON public.process_document_template_mappings (company_id);
CREATE INDEX process_document_template_mappings_template_idx
  ON public.process_document_template_mappings (template_id);

-- Validação: só permite mapeamento ATIVO apontando para template publicado.
CREATE OR REPLACE FUNCTION public.validate_pdtm_template_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lifecycle text;
  v_company uuid;
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  SELECT lifecycle_status::text, company_id
    INTO v_lifecycle, v_company
    FROM public.document_templates
   WHERE id = NEW.template_id;

  IF v_lifecycle IS NULL THEN
    RAISE EXCEPTION 'Template % não encontrado', NEW.template_id;
  END IF;

  IF v_lifecycle <> 'published' THEN
    RAISE EXCEPTION 'Somente templates publicados podem ser ativados no mapeamento (template % está em %)', NEW.template_id, v_lifecycle;
  END IF;

  -- Escopo: mapeamento de empresa só pode apontar para template dessa empresa OU global.
  IF NEW.company_id IS NOT NULL AND v_company IS NOT NULL AND v_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Cross-tenant bloqueado: template pertence a outra empresa';
  END IF;

  -- Mapeamento global só pode apontar para template global.
  IF NEW.company_id IS NULL AND v_company IS NOT NULL THEN
    RAISE EXCEPTION 'Mapeamento global deve apontar para template global (company_id IS NULL)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pdtm_validate_template
  BEFORE INSERT OR UPDATE ON public.process_document_template_mappings
  FOR EACH ROW EXECUTE FUNCTION public.validate_pdtm_template_published();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_pdtm_updated_at
  BEFORE UPDATE ON public.process_document_template_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_document_template_mappings TO authenticated;
GRANT ALL ON public.process_document_template_mappings TO service_role;

-- RLS
ALTER TABLE public.process_document_template_mappings ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários veem mapeamentos globais + da própria empresa; admin_master vê tudo.
CREATE POLICY "pdtm_select_scope" ON public.process_document_template_mappings
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR company_id IS NULL
    OR company_id = public.current_user_company_id()
  );

-- INSERT/UPDATE/DELETE em mapeamento GLOBAL: apenas admin_master.
-- INSERT/UPDATE/DELETE em mapeamento de EMPRESA: admin_master ou usuário da empresa.
CREATE POLICY "pdtm_insert_scope" ON public.process_document_template_mappings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_master()
    OR (company_id IS NOT NULL AND company_id = public.current_user_company_id())
  );

CREATE POLICY "pdtm_update_scope" ON public.process_document_template_mappings
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR (company_id IS NOT NULL AND company_id = public.current_user_company_id())
  )
  WITH CHECK (
    public.is_admin_master()
    OR (company_id IS NOT NULL AND company_id = public.current_user_company_id())
  );

CREATE POLICY "pdtm_delete_scope" ON public.process_document_template_mappings
  FOR DELETE TO authenticated
  USING (
    public.is_admin_master()
    OR (company_id IS NOT NULL AND company_id = public.current_user_company_id())
  );