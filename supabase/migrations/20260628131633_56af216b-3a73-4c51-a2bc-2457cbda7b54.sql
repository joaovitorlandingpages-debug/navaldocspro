
CREATE TABLE IF NOT EXISTS public.company_pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_template text NOT NULL DEFAULT 'classico',
  category text NOT NULL DEFAULT 'corporativo',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  document_type text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_pdf_templates_company ON public.company_pdf_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_pdf_templates_doctype ON public.company_pdf_templates(company_id, document_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_pdf_templates TO authenticated;
GRANT ALL ON public.company_pdf_templates TO service_role;

ALTER TABLE public.company_pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read templates"
  ON public.company_pdf_templates FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "company members insert templates"
  ON public.company_pdf_templates FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "company members update templates"
  ON public.company_pdf_templates FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "company members delete templates"
  ON public.company_pdf_templates FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE TRIGGER trg_company_pdf_templates_updated
  BEFORE UPDATE ON public.company_pdf_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS document_template_map jsonb NOT NULL DEFAULT '{}'::jsonb;
