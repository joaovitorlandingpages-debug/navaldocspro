
-- 1) Extend document_templates with code + global flag (idempotent)
ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_company_code_uniq
  ON public.document_templates (company_id, code)
  WHERE code IS NOT NULL;

-- 2) document_template_rules
CREATE TABLE IF NOT EXISTS public.document_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('fill','validation','calculated','dependency')),
  rule_key text NOT NULL,
  rule_expression jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_template_rules TO authenticated;
GRANT ALL ON public.document_template_rules TO service_role;

ALTER TABLE public.document_template_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rules_select_by_template_visibility"
  ON public.document_template_rules FOR SELECT
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1 FROM public.document_templates t
      WHERE t.id = template_id
        AND (
          (t.is_global = true AND t.is_active = true)
          OR t.company_id = public.current_user_company_id()
        )
    )
  );

CREATE POLICY "rules_write_by_owner_or_admin"
  ON public.document_template_rules FOR ALL
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1 FROM public.document_templates t
      WHERE t.id = template_id
        AND t.company_id = public.current_user_company_id()
    )
  )
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1 FROM public.document_templates t
      WHERE t.id = template_id
        AND t.company_id = public.current_user_company_id()
    )
  );

CREATE TRIGGER document_template_rules_updated_at
  BEFORE UPDATE ON public.document_template_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) document_generation_logs
CREATE TABLE IF NOT EXISTS public.document_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  process_id uuid,
  document_template_id uuid,
  generated_document_id uuid,
  document_name text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doc_gen_logs_company_idx ON public.document_generation_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS doc_gen_logs_process_idx ON public.document_generation_logs (process_id, created_at DESC);
CREATE INDEX IF NOT EXISTS doc_gen_logs_event_idx ON public.document_generation_logs (event_type);

GRANT SELECT, INSERT ON public.document_generation_logs TO authenticated;
GRANT ALL ON public.document_generation_logs TO service_role;

ALTER TABLE public.document_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_gen_logs_select_own_company_or_admin"
  ON public.document_generation_logs FOR SELECT
  USING (
    public.is_admin_master()
    OR company_id = public.current_user_company_id()
  );

CREATE POLICY "doc_gen_logs_insert_own_company"
  ON public.document_generation_logs FOR INSERT
  WITH CHECK (
    public.is_admin_master()
    OR company_id = public.current_user_company_id()
    OR company_id IS NULL
  );
