
ALTER TABLE public.signature_evidence_certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.signature_evidence_certificates ADD COLUMN IF NOT EXISTS events_snapshot JSONB;

-- Storage policies for signed-documents bucket (path: <company_id>/...)
CREATE POLICY "company members read signed-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-documents'
  AND (
    (storage.foldername(name))[1] = public.current_user_company_id()::text
    OR public.is_admin_master()
  )
);

CREATE POLICY "company members write signed-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signed-documents'
  AND (
    (storage.foldername(name))[1] = public.current_user_company_id()::text
    OR public.is_admin_master()
  )
);

CREATE POLICY "company members update signed-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signed-documents'
  AND (
    (storage.foldername(name))[1] = public.current_user_company_id()::text
    OR public.is_admin_master()
  )
);
