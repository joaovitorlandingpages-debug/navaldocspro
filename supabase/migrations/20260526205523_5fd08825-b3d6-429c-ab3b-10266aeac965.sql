-- 1. Create secure helper function for company_id
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.current_user_company_id() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated;

-- 2. Hardening enterprise_audit_logs
DROP POLICY IF EXISTS "Users can view enterprise audit logs of their company" ON public.enterprise_audit_logs;
CREATE POLICY "Users can view enterprise audit logs of their company"
ON public.enterprise_audit_logs
FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'));

-- 3. Hardening ocr_usage
DROP POLICY IF EXISTS "OCR logs visible to company admin" ON public.ocr_usage;
DROP POLICY IF EXISTS "OCR usage visible to company" ON public.ocr_usage;
CREATE POLICY "OCR usage visible to own company"
ON public.ocr_usage
FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'));

-- 4. Storage Security: ocr-documents bucket
-- Ensure bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'ocr-documents';

-- Drop old insecure policies
DROP POLICY IF EXISTS "Authenticated users can upload OCR documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view OCR documents" ON storage.objects;

-- Create secure multi-tenant storage policies
CREATE POLICY "OCR storage prefix isolation - select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = (public.current_user_company_id())::text);

CREATE POLICY "OCR storage prefix isolation - insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = (public.current_user_company_id())::text);

-- 5. Hardening process_assignees
DROP POLICY IF EXISTS "View assignees" ON public.process_assignees;
DROP POLICY IF EXISTS "Manage assignees" ON public.process_assignees;
CREATE POLICY "Users can view assignees in their company processes"
ON public.process_assignees
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.processes p 
  WHERE p.id = process_assignees.process_id 
  AND (p.company_id = public.current_user_company_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'))
));

CREATE POLICY "Users can manage assignees in their company processes"
ON public.process_assignees
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.processes p 
  WHERE p.id = process_assignees.process_id 
  AND (p.company_id = public.current_user_company_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'))
));

-- 6. Hardening system_backlog
DROP POLICY IF EXISTS "Roadmap readable by all authenticated users" ON public.system_roadmap;
DROP POLICY IF EXISTS "Only admin masters can manage backlog" ON public.system_backlog;
DROP POLICY IF EXISTS "Admins can manage backlog" ON public.system_backlog;
CREATE POLICY "Backlog manageable by admin master only"
ON public.system_backlog
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'));

CREATE POLICY "Backlog readable by authenticated"
ON public.system_backlog
FOR SELECT
TO authenticated
USING (true);

-- 7. Hardening system_deploys
DROP POLICY IF EXISTS "Only admin masters can manage deploys" ON public.system_deploys;
DROP POLICY IF EXISTS "Admins can manage deploys" ON public.system_deploys;
CREATE POLICY "Deploys manageable by admin master only"
ON public.system_deploys
FOR ALL
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'));

-- 8. Hardening feature_flags and system_settings
DROP POLICY IF EXISTS "Everyone can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
CREATE POLICY "Feature flags readable by authenticated"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "System settings readable by authenticated"
ON public.system_settings
FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'));

-- 9. Hardening SECURITY DEFINER functions and search_path
-- Fix increment_ocr_usage
CREATE OR REPLACE FUNCTION public.increment_ocr_usage(company_id_param UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.usage_metrics (company_id, ocr_usage)
    VALUES (company_id_param, amount)
    ON CONFLICT (company_id)
    DO UPDATE SET
        ocr_usage = public.usage_metrics.ocr_usage + amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix initialize_company_usage
CREATE OR REPLACE FUNCTION public.initialize_company_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usage_metrics (company_id)
    VALUES (NEW.id)
    ON CONFLICT (company_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Hardening other security definer functions found
ALTER FUNCTION public.process_enterprise_audit_log() SET search_path = public;
ALTER FUNCTION public.create_document_version() SET search_path = public;
ALTER FUNCTION public.update_automation_stats() SET search_path = public;

-- 10. Fix document_fields isolation
DROP POLICY IF EXISTS "Users can view document fields" ON public.document_fields;
CREATE POLICY "Users can view document fields of their company or global"
ON public.document_fields
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.document_templates dt
    WHERE dt.id = document_fields.template_id
    AND (dt.company_id = public.current_user_company_id() OR dt.company_id IS NULL OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_master', 'admin_master_global'))
));

-- 11. Log remediation
INSERT INTO public.enterprise_audit_logs (company_id, user_id, action, entity_type)
VALUES (
    NULL, 
    auth.uid(), 
    'SECURITY_REMEDIATION_COMPLETE', 
    'SECURITY'
);
