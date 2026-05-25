-- 1. Create secure helper function for company_id
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Audit and Fix enterprise_audit_logs
DROP POLICY IF EXISTS "Users can view enterprise audit logs of their company" ON public.enterprise_audit_logs;
CREATE POLICY "Users can view enterprise audit logs of their company"
ON public.enterprise_audit_logs
FOR SELECT
USING (company_id = public.current_company_id());

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Fix process_assignees
DROP POLICY IF EXISTS "View assignees" ON public.process_assignees;
CREATE POLICY "Users can view assignees for their company processes"
ON public.process_assignees
FOR SELECT
USING (
  process_id IN (
    SELECT id FROM public.processes WHERE company_id = public.current_company_id()
  )
);

ALTER TABLE public.process_assignees ENABLE ROW LEVEL SECURITY;

-- 4. Fix system_backlog & system_deploys (Admin Master Only)
DROP POLICY IF EXISTS "Only admin masters can manage backlog" ON public.system_backlog;
DROP POLICY IF EXISTS "Admins can manage backlog" ON public.system_backlog;
CREATE POLICY "Only admin masters can manage backlog"
ON public.system_backlog
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin_master', 'admin_master_global')
  )
);

DROP POLICY IF EXISTS "Only admin masters can manage deploys" ON public.system_deploys;
DROP POLICY IF EXISTS "Admins can manage deploys" ON public.system_deploys;
CREATE POLICY "Only admin masters can manage deploys"
ON public.system_deploys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin_master', 'admin_master_global')
  )
);

-- 5. Hardening feature_flags & system_settings
DROP POLICY IF EXISTS "Everyone can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- 6. Storage Policy Hardening (Multi-tenant isolation)
-- OCR Bucket
DROP POLICY IF EXISTS "Private OCR storage isolation" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload OCR documents" ON storage.objects;
CREATE POLICY "Private OCR storage isolation"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'ocr-documents' 
  AND (storage.foldername(name))[1] = (public.current_company_id())::text
);

-- 7. Fix SECURITY DEFINER functions (Set search_path for all)
ALTER FUNCTION public.update_automation_stats() SET search_path = public;
ALTER FUNCTION public.seed_demo_data(p_company_id uuid) SET search_path = public;
ALTER FUNCTION public.create_document_version() SET search_path = public;
ALTER FUNCTION public.log_security_event(uuid, text, text, uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.initialize_company_usage() SET search_path = public;
ALTER FUNCTION public.increment_ocr_usage(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_enterprise_audit_log() SET search_path = public;
ALTER FUNCTION public.track_usage(text, text, integer, jsonb) SET search_path = public;

-- 8. Fix document_fields (Isolation)
DROP POLICY IF EXISTS "Users can view fields for accessible templates" ON public.document_fields;
DROP POLICY IF EXISTS "Users can only view fields for their company templates" ON public.document_fields;
CREATE POLICY "Users can only view fields for their company templates"
ON public.document_fields
FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.document_templates 
    WHERE company_id = public.current_company_id() 
    OR company_id IS NULL 
  )
);

-- 9. General RLS Hardening for Tables with USING(true)
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
CREATE POLICY "Authenticated users can view plans"
ON public.plans FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can view system health" ON public.system_health;
DROP POLICY IF EXISTS "Authenticated users can view system health" ON public.system_health;
CREATE POLICY "Authenticated users can view system health"
ON public.system_health FOR SELECT USING (auth.role() = 'authenticated');

-- 10. Log completion
INSERT INTO public.system_logs (event_type, module, message)
VALUES ('SECURITY_REMEDIATION', 'SECURITY', 'Enterprise security hardening and multi-tenant isolation applied');
