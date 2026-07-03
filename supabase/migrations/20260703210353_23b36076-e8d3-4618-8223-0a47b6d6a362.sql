CREATE POLICY "company members update certificates" ON public.signature_evidence_certificates
FOR UPDATE TO authenticated
USING ((company_id = current_user_company_id()) OR is_admin_master())
WITH CHECK ((company_id = current_user_company_id()) OR is_admin_master());