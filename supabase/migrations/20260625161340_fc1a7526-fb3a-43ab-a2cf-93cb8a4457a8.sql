
-- Bloco 5: process_documents table
CREATE TABLE IF NOT EXISTS public.process_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  company_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  is_required BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'suggested',
  selected_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  final_pdf_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT process_documents_status_chk CHECK (status IN (
    'pendente','em_preenchimento','aguardando_revisao','aguardando_aprovacao',
    'aprovado','pdf_gerado','rejeitado','ignorado'
  )),
  CONSTRAINT process_documents_unique UNIQUE (process_id, template_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_documents TO authenticated;
GRANT ALL ON public.process_documents TO service_role;

ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pd_select_company" ON public.process_documents FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "pd_insert_company" ON public.process_documents FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "pd_update_company" ON public.process_documents FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "pd_delete_company" ON public.process_documents FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE INDEX IF NOT EXISTS idx_process_documents_process ON public.process_documents(process_id);
CREATE INDEX IF NOT EXISTS idx_process_documents_company ON public.process_documents(company_id);

CREATE TRIGGER trg_process_documents_updated_at
  BEFORE UPDATE ON public.process_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
