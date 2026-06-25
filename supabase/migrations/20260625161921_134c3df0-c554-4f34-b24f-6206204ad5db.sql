
CREATE TABLE IF NOT EXISTS public.process_document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_document_id UUID NOT NULL REFERENCES public.process_documents(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  detected_document_type TEXT,
  ocr_status TEXT NOT NULL DEFAULT 'pendente',
  ocr_text TEXT,
  extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC,
  validation_status TEXT NOT NULL DEFAULT 'pendente',
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pdu_ocr_status_chk CHECK (ocr_status IN ('pendente','processando','concluido','falhou','ignorado')),
  CONSTRAINT pdu_validation_chk CHECK (validation_status IN ('pendente','conferido','baixa_confianca','divergente','ausente','falhou'))
);

CREATE INDEX IF NOT EXISTS idx_pdu_process_document ON public.process_document_uploads(process_document_id);
CREATE INDEX IF NOT EXISTS idx_pdu_process ON public.process_document_uploads(process_id);
CREATE INDEX IF NOT EXISTS idx_pdu_company ON public.process_document_uploads(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_document_uploads TO authenticated;
GRANT ALL ON public.process_document_uploads TO service_role;

ALTER TABLE public.process_document_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdu_select_company" ON public.process_document_uploads
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "pdu_insert_company" ON public.process_document_uploads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "pdu_update_company" ON public.process_document_uploads
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "pdu_delete_company" ON public.process_document_uploads
  FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE TRIGGER trg_pdu_updated_at
  BEFORE UPDATE ON public.process_document_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for process-document-uploads bucket
CREATE POLICY "pdu_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'process-document-uploads'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1] = public.current_user_company_id()::text
    )
  );

CREATE POLICY "pdu_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'process-document-uploads'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1] = public.current_user_company_id()::text
    )
  );

CREATE POLICY "pdu_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'process-document-uploads'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1] = public.current_user_company_id()::text
    )
  );

CREATE POLICY "pdu_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'process-document-uploads'
    AND (
      public.is_admin_master()
      OR (storage.foldername(name))[1] = public.current_user_company_id()::text
    )
  );
