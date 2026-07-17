
-- Fix P0: template_versions leaked cross-tenant + anon
DROP POLICY IF EXISTS "anyone_read_versions" ON public.template_versions;
CREATE POLICY "tenant_read_template_versions"
  ON public.template_versions FOR SELECT
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1 FROM public.document_templates dt
      WHERE dt.id = template_versions.template_id
        AND (dt.company_id IS NULL OR dt.company_id = public.current_user_company_id())
    )
  );

-- Fix P1: document_template_fields leaked cross-tenant to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can read template fields" ON public.document_template_fields;
CREATE POLICY "tenant_read_template_fields"
  ON public.document_template_fields FOR SELECT
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1 FROM public.document_templates dt
      WHERE dt.id = document_template_fields.template_id
        AND (dt.company_id IS NULL OR dt.company_id = public.current_user_company_id())
    )
  );
