
-- 1) automation_logs: add company_id and proper policies
ALTER TABLE public.automation_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.automation_logs al
SET company_id = p.company_id
FROM public.processes p
WHERE al.process_id = p.id AND al.company_id IS NULL;

CREATE INDEX IF NOT EXISTS automation_logs_company_id_idx ON public.automation_logs(company_id);

DROP POLICY IF EXISTS "Users can view automation logs for their company" ON public.automation_logs;
CREATE POLICY "automation_logs_select_company" ON public.automation_logs
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "automation_logs_insert_company" ON public.automation_logs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "automation_logs_update_company" ON public.automation_logs
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "automation_logs_delete_admin" ON public.automation_logs
  FOR DELETE TO authenticated
  USING (public.is_admin_master());

-- 2) Restrict public reads on catalog tables
DROP POLICY IF EXISTS "Process types are viewable by everyone" ON public.process_types;
CREATE POLICY "process_types_select_authenticated" ON public.process_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Process document packages are viewable by everyone" ON public.process_document_packages;
CREATE POLICY "process_document_packages_select_authenticated" ON public.process_document_packages
  FOR SELECT TO authenticated USING (true);

-- 3) Remove redundant broad policy on document_templates (scoped policy remains)
DROP POLICY IF EXISTS "Templates visible to all authenticated" ON public.document_templates;

-- 4) Restrict system_backlog read to admin only
DROP POLICY IF EXISTS "Backlog readable by authenticated" ON public.system_backlog;
CREATE POLICY "system_backlog_select_admin" ON public.system_backlog
  FOR SELECT TO authenticated USING (public.is_admin_master());

-- 5) Storage policies: customer-documents DELETE/UPDATE scoped by company folder
CREATE POLICY "customer_documents_delete_company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND ((storage.foldername(name))[1] = (public.current_user_company_id())::text
         OR public.is_admin_master())
  );

CREATE POLICY "customer_documents_update_company" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND ((storage.foldername(name))[1] = (public.current_user_company_id())::text
         OR public.is_admin_master())
  );

-- process-attachments DELETE/UPDATE scoped by company folder
CREATE POLICY "process_attachments_delete_company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'process-attachments'
    AND ((storage.foldername(name))[1] = (public.current_user_company_id())::text
         OR public.is_admin_master())
  );

CREATE POLICY "process_attachments_update_company" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'process-attachments'
    AND ((storage.foldername(name))[1] = (public.current_user_company_id())::text
         OR public.is_admin_master())
  );

-- 6) Fix function search_path on check_process_consistency
CREATE OR REPLACE FUNCTION public.check_process_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    RETURN NEW;
END;
$function$;

-- 7) Revoke EXECUTE from public/anon/authenticated on internal trigger and admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_automation_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_process_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_process_automation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_ocr_timeline_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_document_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_company_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_process_compliance_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_protocol_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_document_template_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_enterprise_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_process_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.duplicate_document(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_ocr_usage(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_system_event(text, text, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.track_usage(text, text, integer, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_system_readiness() FROM PUBLIC, anon;
